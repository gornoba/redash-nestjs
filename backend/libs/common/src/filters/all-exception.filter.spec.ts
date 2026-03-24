import { ArgumentsHost, ConflictException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

import { AllExceptionsFilter } from './all-exception.filter';

describe('AllExceptionsFilter', () => {
  it('returns standardized conflict response for http exceptions', () => {
    const status = jest.fn().mockReturnThis();
    const send = jest.fn();
    const response = { status, send };
    const request = {
      id: 'req-1',
      method: 'POST',
      url: '/api/setup',
      query: {},
      params: {},
      body: { password: 'secret123' },
    };

    const host = {
      getType: jest.fn().mockReturnValue('http'),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    const httpAdapterHost = {
      httpAdapter: {},
    } as HttpAdapterHost;

    const filter = new AllExceptionsFilter(httpAdapterHost);

    filter.catch(new ConflictException('이미 설정이 완료되었습니다.'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        error: 'ConflictException',
        message: '이미 설정이 완료되었습니다.',
        path: '/api/setup',
      }),
    );
  });
});
