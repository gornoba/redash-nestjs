import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { MailService } from '@app/common/mail/services/mail.service';
import { VerificationRepository } from '../repositories/verification.repository';
import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let repository: jest.Mocked<VerificationRepository>;
  let mailService: jest.Mocked<MailService>;
  let jwtService: jest.Mocked<JwtService>;

  const currentUser: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1, 2],
    permissions: ['admin'],
    profileImageUrl: 'https://example.com/avatar.png',
    isEmailVerified: false,
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: VerificationRepository,
          useValue: {
            findActiveUserById: jest.fn(),
            markVerificationEmailRequested: jest.fn(),
            markEmailVerified: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDASH_BASE_URL') {
                return 'http://localhost:3000';
              }

              if (key === 'JWT_ACCESS_SECRET') {
                return 'jwt-access-secret';
              }

              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(VerificationService);
    repository = moduleRef.get(VerificationRepository);
    mailService = moduleRef.get(MailService);
    jwtService = moduleRef.get(JwtService);
  });

  it('미인증 사용자에게 인증 메일을 보내야 한다', async () => {
    repository.findActiveUserById.mockResolvedValue({
      id: 1,
      name: '관리자',
      email: 'admin@example.com',
      details: {
        is_email_verified: false,
      },
    } as never);
    jwtService.signAsync.mockResolvedValue('verification-token');

    await expect(service.resendVerificationEmail(currentUser)).resolves.toEqual(
      {
        message:
          'Please check your email inbox in order to verify your email address.',
      },
    );

    expect(mailService.sendMail.mock.calls).toHaveLength(1);
    expect(mailService.sendMail.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        html: expect.stringContaining(
          'http://localhost:3000/verify/verification-token',
        ),
        text: expect.stringContaining(
          'http://localhost:3000/verify/verification-token',
        ),
      }),
    );
    expect(repository.markVerificationEmailRequested.mock.calls).toEqual([[1]]);
  });

  it('이미 인증된 사용자는 메일을 다시 보내지 않아야 한다', async () => {
    repository.findActiveUserById.mockResolvedValue({
      id: 1,
      name: '관리자',
      email: 'admin@example.com',
      details: {
        is_email_verified: true,
      },
    } as never);

    await service.resendVerificationEmail(currentUser);

    expect(mailService.sendMail.mock.calls).toHaveLength(0);
    expect(repository.markVerificationEmailRequested.mock.calls).toHaveLength(
      0,
    );
  });

  it('유효한 토큰이면 이메일 인증을 완료해야 한다', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 1,
    } as never);

    await expect(service.verifyEmail('valid-token')).resolves.toEqual({
      message: '이메일 인증이 완료되었습니다.',
    });

    expect(repository.markEmailVerified.mock.calls).toEqual([[1]]);
  });

  it('유효하지 않은 토큰이면 예외를 던져야 한다', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(service.verifyEmail('bad-token')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
