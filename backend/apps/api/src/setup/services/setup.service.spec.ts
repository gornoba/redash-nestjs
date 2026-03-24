import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';

import type { CreateSetupDto } from '../dto/create-setup.dto';
import { SetupRepository } from '../repositories/setup.repository';
import { SetupService } from './setup.service';

describe('SetupService', () => {
  let service: SetupService;
  let repository: jest.Mocked<SetupRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SetupService,
        {
          provide: SetupRepository,
          useValue: {
            getSetupState: jest.fn(),
            createSetup: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(SetupService);
    repository = moduleRef.get(SetupRepository);
  });

  it('설정 상태를 리포지토리에서 조회해야 한다', async () => {
    repository.getSetupState.mockResolvedValue({
      isSetupRequired: true,
      defaults: {
        securityNotifications: true,
        newsletter: true,
      },
    });

    await expect(service.getSetupState()).resolves.toEqual({
      isSetupRequired: true,
      defaults: {
        securityNotifications: true,
        newsletter: true,
      },
    });
  });

  it('설정 생성 결과에 완료 메시지를 포함해야 한다', async () => {
    const payload: CreateSetupDto = {
      name: '관리자',
      email: 'admin@example.com',
      password: 'secret123',
      orgName: '뉴 리대시',
      securityNotifications: true,
      newsletter: true,
    };

    repository.getSetupState.mockResolvedValue({
      isSetupRequired: true,
      defaults: {
        securityNotifications: true,
        newsletter: true,
      },
    });
    repository.createSetup.mockResolvedValue({
      organization: {
        id: 1,
        name: '뉴 리대시',
        slug: 'default',
      },
      user: {
        id: 1,
        name: '관리자',
        email: 'admin@example.com',
      },
    });

    await expect(service.createSetup(payload)).resolves.toEqual({
      message: '설정이 완료되었습니다.',
      organization: {
        id: 1,
        name: '뉴 리대시',
        slug: 'default',
      },
      user: {
        id: 1,
        name: '관리자',
        email: 'admin@example.com',
      },
    });
  });

  it('이미 설정이 완료된 상태면 예외를 던져야 한다', async () => {
    const payload: CreateSetupDto = {
      name: '관리자',
      email: 'admin@example.com',
      password: 'secret123',
      orgName: '뉴 리대시',
      securityNotifications: true,
      newsletter: true,
    };

    repository.getSetupState.mockResolvedValue({
      isSetupRequired: false,
      defaults: {
        securityNotifications: true,
        newsletter: true,
      },
    });

    await expect(service.createSetup(payload)).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(repository.createSetup.mock.calls).toHaveLength(0);
  });
});
