import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';

import { ACCESS_TOKEN_COOKIE_NAME } from '@app/common/auth/auth.constants';
import { CurrentUserService } from '@app/common/current-user/current-user.service';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let repository: jest.Mocked<AuthRepository>;
  let currentUserService: jest.Mocked<CurrentUserService>;
  let jwtService: jest.Mocked<JwtService>;

  const authenticatedUser: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1, 2],
    permissions: ['admin', 'list_dashboards'],
    profileImageUrl: 'https://example.com/avatar.png',
    isEmailVerified: true,
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            hasAnyOrganization: jest.fn(),
            findActiveUserByEmail: jest.fn(),
            updateUserLoginInfo: jest.fn(),
          },
        },
        {
          provide: CurrentUserService,
          useValue: {
            getAuthenticatedUserById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    repository = moduleRef.get(AuthRepository);
    currentUserService = moduleRef.get(CurrentUserService);
    jwtService = moduleRef.get(JwtService);
  });

  it('유효한 자격 증명으로 로그인해야 한다', async () => {
    const passwordHash = await hash('secret123', 10);

    repository.hasAnyOrganization.mockResolvedValue(true);
    repository.findActiveUserByEmail.mockResolvedValue({
      id: 1,
      details: {},
      passwordHash,
    } as never);
    repository.updateUserLoginInfo.mockResolvedValue({} as never);
    currentUserService.getAuthenticatedUserById.mockResolvedValue(
      authenticatedUser,
    );
    jwtService.signAsync.mockResolvedValue('signed-access-token');

    await expect(
      service.login({
        email: 'admin@example.com',
        password: 'secret123',
        orgSlug: 'default',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-access-token',
      tokenType: 'Bearer',
      expiresIn: '24h',
      user: authenticatedUser,
    });
  });

  it('비밀번호가 틀리면 예외를 던져야 한다', async () => {
    const passwordHash = await hash('secret123', 10);

    repository.hasAnyOrganization.mockResolvedValue(true);
    repository.findActiveUserByEmail.mockResolvedValue({
      id: 1,
      details: {},
      passwordHash,
    } as never);

    await expect(
      service.login({
        email: 'admin@example.com',
        password: 'wrong-password',
        orgSlug: 'default',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('초기 설정 전에는 로그인할 수 없어야 한다', async () => {
    repository.hasAnyOrganization.mockResolvedValue(false);

    await expect(
      service.login({
        email: 'admin@example.com',
        password: 'secret123',
        orgSlug: 'default',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.findActiveUserByEmail.mock.calls).toHaveLength(0);
  });

  it('액세스 토큰 쿠키 옵션은 공통 기본값을 사용해야 한다', () => {
    expect(service.getAccessTokenCookieOptions()).toEqual({
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
  });

  it('액세스 토큰 쿠키 이름은 공통 기본값을 사용해야 한다', () => {
    expect(service.getAccessTokenCookieName()).toBe(ACCESS_TOKEN_COOKIE_NAME);
  });
});
