import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();
    const startedAt = Date.now();

    this.logger.log({
      requestId: request.id,
      method: request.method,
      path: request.url,
      phase: 'request_started',
    });

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log({
            requestId: request.id,
            method: request.method,
            path: request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - startedAt,
            phase: 'request_completed',
          });
        },
        error: (error: unknown) => {
          this.logger.warn({
            requestId: request.id,
            method: request.method,
            path: request.url,
            statusCode: response.statusCode || 500,
            durationMs: Date.now() - startedAt,
            phase: 'request_failed',
            error: error instanceof Error ? error.name : 'UnknownRequestError',
          });
        },
      }),
    );
  }
}
