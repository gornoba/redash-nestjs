import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';

import { LogInterceptor } from './log.interceptor';

describe('LogInterceptor', () => {
  it('passes through successful responses', (done) => {
    const interceptor = new LogInterceptor();
    const next: CallHandler = {
      handle: () => of({ ok: true }),
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          id: 'req-1',
          method: 'GET',
          url: '/health',
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
    } as ExecutionContext;

    interceptor.intercept(context, next).subscribe({
      next: (value) => {
        expect(value).toEqual({ ok: true });
      },
      complete: done,
    });
  });

  it('passes through failed responses', (done) => {
    const interceptor = new LogInterceptor();
    const next: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };
    const context = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({
          id: 'req-2',
          method: 'GET',
          url: '/health',
        }),
        getResponse: () => ({
          statusCode: 500,
        }),
      }),
    } as ExecutionContext;

    interceptor.intercept(context, next).subscribe({
      error: (error) => {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe('boom');
        }
        done();
      },
    });
  });
});
