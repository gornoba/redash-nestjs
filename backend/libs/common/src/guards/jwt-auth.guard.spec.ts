import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

import { ACCESS_TOKEN_COOKIE_NAME } from '../auth/auth.constants';
import { CurrentUserService } from '../current-user/current-user.service';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const authenticatedUser: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1, 2],
    permissions: ['admin'],
    profileImageUrl: 'https://example.com/avatar.png',
    isEmailVerified: true,
  };

  function createExecutionContext(request: Record<string, unknown>) {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as never;
  }

  it('공개 라우트는 그대로 통과시켜야 한다', async () => {
    const guard = new JwtAuthGuard(
      {
        getAllAndOverride: jest.fn().mockReturnValue(true),
      } as never as Reflector,
      {} as never as JwtService,
      {} as never as CurrentUserService,
    );

    await expect(
      guard.canActivate(createExecutionContext({ headers: {} })),
    ).resolves.toBe(true);
  });

  it('토큰이 없으면 401을 던져야 한다', async () => {
    const guard = new JwtAuthGuard(
      {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as never as Reflector,
      {} as never as JwtService,
      {} as never as CurrentUserService,
    );

    await expect(
      guard.canActivate(createExecutionContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('Bearer 토큰으로 사용자를 주입해야 한다', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 1 }),
    } as never as JwtService;
    const currentUserService = {
      getAuthenticatedUserById: jest.fn().mockResolvedValue(authenticatedUser),
    } as never as CurrentUserService;
    const request = {
      headers: {
        authorization: 'Bearer signed-token',
      },
      cookies: {
        [ACCESS_TOKEN_COOKIE_NAME]: 'cookie-token',
      },
    };
    const guard = new JwtAuthGuard(
      {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as never as Reflector,
      jwtService,
      currentUserService,
    );

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(request.user).toEqual(authenticatedUser);
  });

  it('쿠키 토큰으로도 사용자를 주입해야 한다', async () => {
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 1 }),
    } as never as JwtService;
    const currentUserService = {
      getAuthenticatedUserById: jest.fn().mockResolvedValue(authenticatedUser),
    } as never as CurrentUserService;
    const request = {
      headers: {},
      cookies: {
        [ACCESS_TOKEN_COOKIE_NAME]: 'cookie-token',
      },
    };
    const guard = new JwtAuthGuard(
      {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as never as Reflector,
      jwtService,
      currentUserService,
    );

    await expect(
      guard.canActivate(createExecutionContext(request)),
    ).resolves.toBe(true);
    expect(request.user).toEqual(authenticatedUser);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('cookie-token');
  });
});
