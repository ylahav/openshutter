import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Detect image type from the first bytes of the buffer (magic bytes).
 * Returns the MIME type string if recognised, otherwise null.
 */
function detectMimeFromBuffer(buf: Buffer): string | null {
  if (!buf || buf.length < 4) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';

  // GIF: GIF87a or GIF89a
  if (
    buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61
  ) return 'image/gif';

  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf.length >= 12 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';

  // HEIC / HEIF: ftyp box at offset 4 with brand heic, heix, mif1, msf1, etc.
  if (buf.length >= 12) {
    const ftyp = buf.slice(4, 8).toString('ascii');
    const brand = buf.slice(8, 12).toString('ascii');
    if (ftyp === 'ftyp') {
      if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic';
      if (['mif1', 'msf1'].includes(brand)) return 'image/heif';
    }
  }

  return null;
}

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (file) {
      // Validate file size
      if (file.size > this.maxFileSize) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`,
        );
      }

      // Validate declared MIME type
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
        );
      }

      // Validate actual file content via magic bytes (prevents MIME-type spoofing)
      if (file.buffer) {
        const detected = detectMimeFromBuffer(file.buffer as Buffer);
        if (!detected) {
          throw new BadRequestException('File content does not appear to be a supported image format');
        }
        const normalised = detected === 'image/jpeg' ? 'image/jpeg' : detected;
        const declaredNorm = file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
        if (normalised !== declaredNorm) {
          throw new BadRequestException(
            'File content does not match the declared MIME type',
          );
        }
      }
    }

    return next.handle();
  }
}
