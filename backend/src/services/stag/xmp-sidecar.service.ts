import fs from 'fs/promises';
import path from 'path';
import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { storageConfigService } from '../storage/config';
import { extractStorageServePath } from '../storage/storage-serve-url';

type WriteResult =
  | { written: true; path: string; tagsCount: number }
  | { written: false; reason: string };

export class XmpSidecarService {
  private static readonly logger = new Logger(XmpSidecarService.name);

  private static xmlEscape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private static toTagName(v: unknown): string | null {
    if (!v) return null;
    if (typeof v === 'string') {
      const t = v.trim();
      return t.length > 0 ? t : null;
    }
    if (typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const en = typeof obj.en === 'string' ? obj.en.trim() : '';
      if (en) return en;
      const first = Object.values(obj).find((x) => typeof x === 'string' && (x as string).trim().length > 0);
      if (typeof first === 'string') return first.trim();
    }
    return null;
  }

  private static async resolveLocalPhotoAbsolutePath(photo: any): Promise<string | null> {
    const storage = photo?.storage || {};
    const provider = storage.provider || 'local';
    if (provider !== 'local') return null;

    let relOrAbsPath = '';
    if (typeof storage.path === 'string' && storage.path.trim()) {
      relOrAbsPath = storage.path.trim();
    } else if (typeof storage.url === 'string') {
      relOrAbsPath = extractStorageServePath(storage.url) ?? '';
    }
    if (!relOrAbsPath) return null;

    const cfg = await storageConfigService.getConfig('local');
    const basePathRaw =
      cfg?.config?.basePath ||
      process.env.LOCAL_STORAGE_PATH ||
      './uploads';
    const basePath = path.isAbsolute(basePathRaw)
      ? basePathRaw
      : path.join(process.cwd(), basePathRaw);

    return path.isAbsolute(relOrAbsPath)
      ? relOrAbsPath
      : path.join(basePath, relOrAbsPath);
  }

  static async writePhotoTagsSidecar(params: {
    db: any;
    photo: any;
    tagIds: string[];
    prefix?: string;
  }): Promise<WriteResult> {
    const { db, photo } = params;
    const uniqueIds = Array.from(new Set((params.tagIds || []).filter(Boolean)));
    if (uniqueIds.length === 0) {
      return { written: false, reason: 'No tags to write' };
    }

    const absPhotoPath = await this.resolveLocalPhotoAbsolutePath(photo);
    if (!absPhotoPath) {
      return { written: false, reason: 'Photo is not in local storage or path is missing' };
    }

    const objectIds = uniqueIds
      .map((id) => {
        try {
          return new Types.ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const tags = await db
      .collection('tags')
      .find({ _id: { $in: objectIds }, isActive: true })
      .project({ name: 1 })
      .toArray();

    const tagNames: string[] = Array.from(
      new Set(
        tags
          .map((t: any) => this.toTagName(t?.name))
          .filter((n: string | null): n is string => !!n),
      ),
    );

    if (tagNames.length === 0) {
      return { written: false, reason: 'No tag names resolved for XMP' };
    }

    const prefix = (params.prefix ?? process.env.STAG_XMP_PREFIX ?? 'st').trim();
    const subjectBag = tagNames.map((n) => `        <rdf:li>${this.xmlEscape(n)}</rdf:li>`).join('\n');
    const hierarchicalBag = prefix
      ? tagNames
          .map((n) => `        <rdf:li>${this.xmlEscape(`${prefix}|${n}`)}</rdf:li>`)
          .join('\n')
      : '';

    const xmp = `<?xml version="1.0" encoding="utf-8"?>
<x:xmpmeta x:xmptk="OpenShutter STAG" xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:lr="http://ns.adobe.com/lightroom/1.0/">
      <dc:subject>
        <rdf:Bag>
${subjectBag}
        </rdf:Bag>
      </dc:subject>
      <lr:hierarchicalSubject>
        <rdf:Bag>
${hierarchicalBag}
        </rdf:Bag>
      </lr:hierarchicalSubject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
`;

    const ext = path.extname(absPhotoPath);
    const xmpPath = ext
      ? absPhotoPath.slice(0, -ext.length) + '.xmp'
      : absPhotoPath + '.xmp';

    await fs.mkdir(path.dirname(xmpPath), { recursive: true });
    await fs.writeFile(xmpPath, xmp, 'utf8');
    this.logger.debug(`Wrote XMP sidecar: ${xmpPath} (${tagNames.length} tags)`);
    return { written: true, path: xmpPath, tagsCount: tagNames.length };
  }
}
