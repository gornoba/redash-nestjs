import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { OrganizationRepository } from '../repositories/organization.repository';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let repository: jest.Mocked<OrganizationRepository>;

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

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: OrganizationRepository,
          useValue: {
            getStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(OrganizationService);
    repository = moduleRef.get(OrganizationRepository);
  });

  it('조직 상태 카운터를 리포지토리에서 조회해야 한다', async () => {
    repository.getStatus.mockResolvedValue({
      object_counters: {
        users: 1,
        alerts: 0,
        data_sources: 0,
        queries: 0,
        dashboards: 0,
      },
    });

    await expect(service.getStatus(authenticatedUser)).resolves.toEqual({
      object_counters: {
        users: 1,
        alerts: 0,
        data_sources: 0,
        queries: 0,
        dashboards: 0,
      },
    });
  });
});
