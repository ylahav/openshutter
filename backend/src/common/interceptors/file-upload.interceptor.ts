import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

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

      // Validate MIME type
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
        );
      }
    }

    return next.handle();
  }
}
