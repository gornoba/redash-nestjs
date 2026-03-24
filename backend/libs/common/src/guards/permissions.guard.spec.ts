import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  function createExecutionContext(user?: { permissions: string[] }) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as never;
  }

  it('필수 권한이 없으면 통과시켜야 한다', () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as never as Reflector);

    expect(guard.canActivate(createExecutionContext())).toBe(true);
  });

  it('사용자 정보가 없으면 403을 던져야 한다', () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(['list_dashboards']),
    } as never as Reflector);

    expect(() => guard.canActivate(createExecutionContext())).toThrow(
      ForbiddenException,
    );
  });

  it('필수 권한이 없으면 403을 던져야 한다', () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(['list_dashboards']),
    } as never as Reflector);

    expect(() =>
      guard.canActivate(
        createExecutionContext({ permissions: ['view_query'] }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('필수 권한이 있으면 통과시켜야 한다', () => {
    const guard = new PermissionsGuard({
      getAllAndOverride: jest.fn().mockReturnValue(['list_dashboards']),
    } as never as Reflector);

    expect(
      guard.canActivate(
        createExecutionContext({
          permissions: ['list_dashboards', 'view_query'],
        }),
      ),
    ).toBe(true);
  });
});
