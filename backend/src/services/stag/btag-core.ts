import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { env, pipeline } from '@xenova/transformers';

env.allowLocalModels = true;
env.useBrowserCache = false;

export type InferenceBackend = 'clip' | 'resnet';

export type BtagTaggerOptions = {
  defaultPrefix?: string;
  topK?: number;
  inferenceBackend?: InferenceBackend;
  candidateLabels?: string[];
};

export type TaggingResult = {
  tags: string[];
  xmp: string;
};

type ClassifierResult = { label: string; score: number };

const DEFAULT_OPTIONS: Required<BtagTaggerOptions> = {
  defaultPrefix: 'st|',
  topK: 10,
  inferenceBackend: 'clip',
  candidateLabels: [
    'church',
    'chapel',
    'cathedral',
    'building',
    'interior',
    'room',
    'hall',
    'hallway',
    'aisle',
    'altar',
    'pillar',
    'column',
    'ceiling',
    'floor',
    'tile wall',
    'glass window',
    'stained glass',
    'bench',
    'church bench',
    'wood',
    'stone',
    'marble',
    'metal',
    'door',
    'window',
    'arch',
    'corridor',
    'bathroom',
    'restroom',
    'urinal',
    'sink',
    'faucet',
    'toilet',
    'fountain',
    'wall clock',
    'envelope',
    'doormat',
    'fire screen',
    'space heater',
  ],
};

class ResnetPipelineSingleton {
  private static task = 'image-classification';
  private static model = 'Xenova/resnet-50';
  private static instance: any | null = null;

  static async getInstance() {
    if (!this.instance) {
      this.instance = await (pipeline as any)(this.task as any, this.model);
    }
    return this.instance;
  }
}

class ClipPipelineSingleton {
  private static task = 'zero-shot-image-classification';
  private static model = 'Xenova/clip-vit-base-patch32';
  private static instance: any | null = null;

  static async getInstance() {
    if (!this.instance) {
      this.instance = await (pipeline as any)(this.task as any, this.model);
    }
    return this.instance;
  }
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

function generateXmpFromTags(tags: string[], prefix = 'st|'): string {
  const nsDc = 'http://purl.org/dc/elements/1.1/';
  const nsLr = 'http://ns.adobe.com/lightroom/1.0/';
  const nsRdf = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
  const nsX = 'adobe:ns:meta/';
  const escapedPrefix = xmlEscape(prefix);

  const bag = tags
    .map((tag) => `        <rdf:li>${escapedPrefix}${xmlEscape(tag)}</rdf:li>`)
    .join('\n');

  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="${nsX}" x:xmptk="XMP Core 5.1.2">
  <rdf:RDF xmlns:rdf="${nsRdf}">
    <rdf:Description rdf:about=""
        xmlns:dc="${nsDc}"
        xmlns:lr="${nsLr}">
      <dc:subject>
        <rdf:Bag>
${bag}
        </rdf:Bag>
      </dc:subject>
      <lr:hierarchicalSubject>
        <rdf:Bag>
${bag}
        </rdf:Bag>
      </lr:hierarchicalSubject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

async function inferWithResnet(imagePath: string, topK: number): Promise<string[]> {
  const classifier = await ResnetPipelineSingleton.getInstance();
  const results = (await (classifier as any)(imagePath, { topk: topK })) as ClassifierResult[];
  return uniqueTags(results.map((r) => r.label));
}

async function inferWithClip(
  imagePath: string,
  topK: number,
  candidateLabels: string[],
): Promise<string[]> {
  const classifier = await ClipPipelineSingleton.getInstance();
  const results = (await (classifier as any)(imagePath, candidateLabels, {
    multi_label: true,
  })) as Array<{ label: string; score: number }>;

  const sorted = [...results].sort((a, b) => b.score - a.score);
  return uniqueTags(sorted.slice(0, topK).map((r) => r.label));
}

export async function tagImageFromBuffer(
  imageBuffer: Buffer,
  options: BtagTaggerOptions = {},
): Promise<TaggingResult> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const tmpPath = path.join(
    os.tmpdir(),
    `btag_pkg_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`,
  );

  await fs.writeFile(tmpPath, imageBuffer);

  try {
    const tags =
      config.inferenceBackend === 'clip'
        ? await inferWithClip(tmpPath, config.topK, config.candidateLabels)
        : await inferWithResnet(tmpPath, config.topK);

    return {
      tags,
      xmp: generateXmpFromTags(tags, config.defaultPrefix),
    };
  } finally {
    await fs.unlink(tmpPath).catch(() => {
      // Ignore temp cleanup failures.
    });
  }
}

export class BtagTagger {
  constructor(private readonly options: BtagTaggerOptions = {}) {}

  async tagImageFromBuffer(imageBuffer: Buffer): Promise<TaggingResult> {
    return tagImageFromBuffer(imageBuffer, this.options);
  }
}
