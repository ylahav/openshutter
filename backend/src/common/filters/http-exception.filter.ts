import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        // Handle nested error structure: { error: { message: '...', code: '...' } }
        const resp = exceptionResponse as any;
        if (resp.error?.message) {
          message = resp.error.message;
        } else if (resp.message) {
          message = resp.message;
        } else {
          message = exception.message;
        }
        // If there's an error object with code, include it in response
        if (resp.error) {
          response.status(status).json({
            statusCode: status,
            error: resp.error,
            timestamp: new Date().toISOString(),
          });
          return;
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
