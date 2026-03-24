import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { CreateGroupCommand } from '../create-group.command';
import { GroupsRepository } from '../../repositories/groups.repository';
import { GroupsService } from '../../services/groups.service';
import { CreateGroupHandler } from './create-group.handler';

describe('CreateGroupHandler', () => {
  let handler: CreateGroupHandler;
  let repository: jest.Mocked<GroupsRepository>;
  let service: jest.Mocked<GroupsService>;

  const currentUser: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    permissions: ['list_users'],
    profileImageUrl: '',
    isEmailVerified: true,
    roles: ['admin'],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CreateGroupHandler,
        {
          provide: GroupsRepository,
          useValue: {
            createGroup: jest.fn((value: unknown) => value),
            findGroupByName: jest.fn(),
            saveGroup: jest.fn(),
          },
        },
        {
          provide: GroupsService,
          useValue: {
            ensureAdmin: jest.fn(),
            serializeGroup: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = moduleRef.get(CreateGroupHandler);
    repository = moduleRef.get(GroupsRepository);
    service = moduleRef.get(GroupsService);
  });

  it('생성 orchestration을 handler가 직접 수행해야 한다', async () => {
    repository.findGroupByName.mockResolvedValue(null);
    repository.saveGroup.mockResolvedValue({
      id: 3,
      name: 'Ops',
      type: 'regular',
      createdAt: new Date('2026-03-17T00:00:00.000Z'),
      permissions: [],
    } as never);
    service.serializeGroup.mockReturnValue({ id: 3 } as never);

    await expect(
      handler.execute(
        new CreateGroupCommand(currentUser, { name: 'Ops' } as never),
      ),
    ).resolves.toEqual({
      group: { id: 3 },
    });

    expect(repository.createGroup.mock.calls[0]?.[0]).toMatchObject({
      name: 'Ops',
      orgId: 1,
      permissions: [],
      type: 'regular',
    });
  });
});
