import { Injectable, Logger } from '@nestjs/common';
import { BaseAIProvider } from './base.provider';
import { TagSuggestion, SuggestTagsOptions } from '../types';
import * as fs from 'fs/promises';
import sharp from 'sharp';

/**
 * Google Cloud Vision API provider for AI tagging.
 *
 * Uses the public **Vision REST API** with an **API key** (no `@google-cloud/vision` package).
 *
 * Setup:
 * 1. Google Cloud Console → enable **Cloud Vision API** for your project.
 * 2. **APIs & Services → Credentials → Create credentials → API key**.
 * 3. Restrict the key (Vision API only; optional IP restriction for your server).
 * 4. Set `GOOGLE_CLOUD_VISION_API_KEY` on the **Nest backend** process (PM2 env, systemd, etc.).
 *
 * @see https://cloud.google.com/vision/docs/labels
 */
@Injectable()
export class GoogleVisionProvider extends BaseAIProvider {
  private readonly logger = new Logger(GoogleVisionProvider.name);
  private readonly maxVisionDimension = 1600;
  private readonly maxVisionBytes = 4 * 1024 * 1024; // Keep payload comfortably below API limits once base64 encoded.
  private readonly stopTerms = new Set([
    'photography',
    'photo caption',
    'image',
    'stock photography',
  ]);

  private normalizeLabel(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getApiKey(): string | null {
    const k = process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim();
    return k || null;
  }

  async isAvailable(): Promise<boolean> {
    return this.getApiKey() !== null;
  }

  async suggestTags(imagePath: string, options: SuggestTagsOptions): Promise<TagSuggestion[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Google Cloud Vision API key not configured (GOOGLE_CLOUD_VISION_API_KEY).');
    }

    try {
      const imageBuffer = await fs.readFile(imagePath);
      const prepareForVision = async (buffer: Buffer): Promise<Buffer> => {
        let out = buffer;

        // First pass: normalize orientation and cap dimensions.
        out = await sharp(out)
          .rotate()
          .resize({
            width: this.maxVisionDimension,
            height: this.maxVisionDimension,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();

        // Second pass: if still too large, reduce dimensions/quality further.
        if (out.length > this.maxVisionBytes) {
          out = await sharp(out)
            .resize({
              width: 1200,
              height: 1200,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .jpeg({ quality: 75, mozjpeg: true })
            .toBuffer();
        }

        return out;
      };

      const normalizedBuffer = await prepareForVision(imageBuffer);
      this.logger.debug(
        `Vision preprocess: ${imageBuffer.length} -> ${normalizedBuffer.length} bytes (${imagePath})`,
      );
      const maxResults = options.maxSuggestions || 10;
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`;
      const callVision = async (buffer: Buffer): Promise<any> => {
        const body = {
          requests: [
            {
              image: { content: buffer.toString('base64') },
              features: [
                { type: 'LABEL_DETECTION', maxResults: Math.max(maxResults, 25) },
                { type: 'OBJECT_LOCALIZATION', maxResults: Math.max(maxResults, 15) },
                { type: 'LANDMARK_DETECTION', maxResults: 10 },
                { type: 'WEB_DETECTION', maxResults: Math.max(maxResults, 20) },
              ],
            },
          ],
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const rawText = await res.text();
        let data: any;
        try {
          data = JSON.parse(rawText);
        } catch {
          this.logger.error(`Vision API non-JSON response (${res.status}): ${rawText.slice(0, 500)}`);
          throw new Error(`Google Vision API returned invalid JSON (HTTP ${res.status})`);
        }

        if (!res.ok) {
          const msg = data?.error?.message || rawText.slice(0, 300);
          this.logger.error(`Vision API HTTP ${res.status}: ${msg}`);
          throw new Error(
            `Google Vision API error (${res.status}): ${msg}. Ensure Cloud Vision API is enabled and the key is allowed to call it.`,
          );
        }

        const err = data.responses?.[0]?.error;
        if (err) {
          this.logger.error(`Vision API response error: ${err.message || JSON.stringify(err)}`);
          throw new Error(err.message || 'Google Vision API returned an error in the response body');
        }
        return data;
      };

      let data: any;
      try {
        data = await callVision(normalizedBuffer);
      } catch (firstError) {
        const msg = firstError instanceof Error ? firstError.message : String(firstError);
        // Some images downloaded from remote storage are valid files but not accepted by Vision as-is.
        // Transcode to baseline RGB JPEG and retry once.
        if (/bad image data/i.test(msg)) {
          this.logger.warn(`Vision rejected original bytes, retrying with JPEG transcode: ${imagePath}`);
          const transcoded = await sharp(normalizedBuffer)
            .rotate() // respect orientation metadata
            .jpeg({ quality: 92, mozjpeg: true })
            .toBuffer();
          data = await callVision(transcoded);
        } else {
          throw firstError;
        }
      }

      const response = data.responses?.[0] || {};
      const labels = response.labelAnnotations || [];
      const objects = response.localizedObjectAnnotations || [];
      const landmarks = response.landmarkAnnotations || [];
      const webEntities = response.webDetection?.webEntities || [];

      // Merge different Vision signals into one candidate pool, with mild source weighting.
      const scored = new Map<string, { label: string; score: number }>();
      const upsert = (raw: string | undefined, rawScore: number | undefined, sourceWeight: number) => {
        if (!raw) return;
        const normalized = this.normalizeLabel(raw);
        if (!normalized || normalized.length < 2 || this.stopTerms.has(normalized)) return;
        const baseScore = typeof rawScore === 'number' ? rawScore : 0;
        const score = Math.max(0, Math.min(1, baseScore * sourceWeight));
        if (score <= 0) return;
        const prev = scored.get(normalized);
        if (!prev || score > prev.score) {
          scored.set(normalized, { label: normalized, score });
        }
      };

      for (const item of labels) upsert(item.description, item.score, 1.0);
      for (const item of objects) upsert(item.name, item.score, 1.0);
      for (const item of landmarks) upsert(item.description, item.score, 1.05);
      for (const item of webEntities) upsert(item.description, item.score, 0.85);

      const suggestions: TagSuggestion[] = Array.from(scored.values()).map((x) => ({
        label: x.label,
        confidence: x.score,
        category: undefined,
        isNewTag: true,
      }));

      const minConfidence = options.minConfidence || 0.5;
      const filtered = this.filterByConfidence(suggestions, minConfidence);
      const sorted = this.sortByConfidence(filtered);
      return this.limitSuggestions(sorted, maxResults);
    } catch (error) {
      this.logger.error(`Error calling Google Vision API: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
