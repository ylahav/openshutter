import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/** Nest HTTP exception response body (string or object with message/error). */
interface HttpExceptionResponseBody {
  message?: string | string[];
  error?: string | { message?: string; code?: string };
}

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
        const resp = exceptionResponse as HttpExceptionResponseBody;
        const errorObj = typeof resp.error === 'object' && resp.error !== null ? resp.error : null;
        if (errorObj?.message) {
          message = typeof errorObj.message === 'string' ? errorObj.message : exception.message;
        } else if (resp.message) {
          message = Array.isArray(resp.message) ? resp.message[0] : resp.message;
        } else {
          message = exception.message;
        }
        if (resp.error) {
          response.status(status).json({
            statusCode: status,
            message,
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
