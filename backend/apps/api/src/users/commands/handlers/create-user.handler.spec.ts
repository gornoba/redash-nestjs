import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { CreateUserCommand } from '../create-user.command';
import { UsersRepository } from '../../repositories/users.repository';
import { UsersService } from '../../services/users.service';
import { CreateUserHandler } from './create-user.handler';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let repository: jest.Mocked<UsersRepository>;
  let service: jest.Mocked<UsersService>;

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
        CreateUserHandler,
        {
          provide: UsersRepository,
          useValue: {
            createInvitedUser: jest.fn(),
            findUserByEmail: jest.fn(),
            getDefaultGroup: jest.fn(),
            getOrganizationById: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            buildLink: jest.fn(),
            serializeUserSummary: jest.fn(),
            sendInvitationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = moduleRef.get(CreateUserHandler);
    repository = moduleRef.get(UsersRepository);
    service = moduleRef.get(UsersService);
  });

  it('생성 orchestration을 handler가 직접 수행해야 한다', async () => {
    repository.findUserByEmail.mockResolvedValue(null);
    repository.getDefaultGroup.mockResolvedValue({
      id: 7,
      name: 'default',
    } as never);
    repository.getOrganizationById.mockResolvedValue({
      name: 'Redash',
    } as never);
    repository.createInvitedUser.mockResolvedValue({
      id: 5,
      name: 'Tester',
      email: 'tester@example.com',
      profileImageUrl: null,
      disabledAt: null,
      details: {
        is_invitation_pending: true,
      },
      createdAt: new Date('2026-03-17T00:00:00.000Z'),
    } as never);
    service.buildLink.mockResolvedValue('https://example.com/invite/token');
    service.sendInvitationEmail.mockResolvedValue(true);
    service.serializeUserSummary.mockReturnValue({
      id: 5,
      name: 'Tester',
      email: 'tester@example.com',
      profile_image_url: 'https://example.com/avatar.png',
      is_disabled: false,
      is_invitation_pending: true,
      groups: [
        {
          id: 7,
          name: 'default',
        },
      ],
      created_at: '2026-03-17T00:00:00.000Z',
      active_at: null,
    } as never);

    await expect(
      handler.execute(
        new CreateUserCommand(currentUser, {
          name: 'Tester',
          email: 'tester@example.com',
        } as never),
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        email: 'tester@example.com',
        id: 5,
      }),
    );

    expect(repository.createInvitedUser.mock.calls[0]?.[0]).toMatchObject({
      defaultGroupId: 7,
      email: 'tester@example.com',
      name: 'Tester',
      orgId: 1,
    });
    expect(service.serializeUserSummary.mock.calls[0]?.[1]).toEqual([
      {
        id: 7,
        name: 'default',
      },
    ]);
  });
});
