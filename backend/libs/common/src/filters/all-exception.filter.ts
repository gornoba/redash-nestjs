import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

@Catch()
@Injectable()
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(httpAdapterHost: HttpAdapterHost) {
    super(httpAdapterHost.httpAdapter);
  }

  override catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      super.catch(exception, host);
      return;
    }

    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const response = http.getResponse<FastifyReply>();
    const statusCode = this.getStatusCode(exception);
    const responseBody = this.createResponseBody(
      exception,
      request,
      statusCode,
    );

    this.logException(exception, request, statusCode, responseBody.message);

    response.status(statusCode).send(responseBody);
  }

  private getStatusCode(exception: unknown) {
    if (exception instanceof ZodValidationException) {
      return HttpStatus.BAD_REQUEST;
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as
        | { code?: string }
        | undefined;
      if (driverError?.code === '23505') {
        return HttpStatus.CONFLICT;
      }
    }

    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private createResponseBody(
    exception: unknown,
    request: FastifyRequest,
    statusCode: number,
  ): ErrorResponseBody {
    return {
      statusCode,
      error: this.getErrorName(exception, statusCode),
      message: this.getMessage(exception, statusCode),
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  private getErrorName(exception: unknown, statusCode: number) {
    if (exception instanceof ZodValidationException) {
      return 'ValidationError';
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as
        | { code?: string }
        | undefined;
      if (driverError?.code === '23505') {
        return 'Conflict';
      }
    }

    if (exception instanceof HttpException) {
      return exception.name;
    }

    return HttpStatus[statusCode] ?? 'Error';
  }

  private getMessage(exception: unknown, statusCode: number) {
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      return this.formatZodError(
        zodError instanceof ZodError ? zodError : undefined,
      );
    }

    if (exception instanceof ZodSerializationException) {
      return 'Internal server error';
    }

    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as
        | { code?: string }
        | undefined;
      if (driverError?.code === '23505') {
        return '이미 존재하는 리소스입니다.';
      }
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return response;
      }

      if (
        response &&
        typeof response === 'object' &&
        'message' in response &&
        typeof response.message === 'string'
      ) {
        return response.message;
      }

      if (
        response &&
        typeof response === 'object' &&
        'message' in response &&
        Array.isArray(response.message)
      ) {
        return response.message.join(', ');
      }
    }

    if (statusCode >= 500) {
      return 'Internal server error';
    }

    return 'Request failed';
  }

  private formatZodError(error: ZodError | undefined) {
    if (!error) {
      return 'Validation failed';
    }

    return error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${path}${issue.message}`;
      })
      .join(', ');
  }

  private logException(
    exception: unknown,
    request: FastifyRequest,
    statusCode: number,
    message: string,
  ) {
    const payload = {
      requestId: request.id,
      method: request.method,
      path: request.url,
      statusCode,
      message,
      query: request.query,
      params: request.params,
      body: this.sanitizeBody(request.body),
    };

    if (statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(payload, stack);
      return;
    }

    this.logger.warn(payload);
  }

  private sanitizeBody(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return body;
    }

    const sanitized = { ...(body as Record<string, unknown>) };

    if ('password' in sanitized) {
      sanitized.password = '[REDACTED]';
    }

    if ('token' in sanitized) {
      sanitized.token = '[REDACTED]';
    }

    return sanitized;
  }
}
