import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { CreateGroupCommand } from '../commands/create-group.command';
import { GetGroupsQuery } from '../queries/get-groups.query';
import { GroupsController } from './groups.controller';

describe('GroupsController', () => {
  let controller: GroupsController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;

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
      controllers: [GroupsController],
      providers: [
        {
          provide: CommandBus,
          useValue: { execute: jest.fn() },
        },
        {
          provide: QueryBus,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = moduleRef.get(GroupsController);
    commandBus = moduleRef.get(CommandBus);
    queryBus = moduleRef.get(QueryBus);
  });

  it('getGroups를 GetGroupsQuery로 위임해야 한다', async () => {
    queryBus.execute.mockResolvedValue({ items: [] } as never);

    await expect(controller.getGroups(currentUser)).resolves.toEqual({
      items: [],
    });

    expect(queryBus.execute.mock.calls[0]?.[0]).toBeInstanceOf(GetGroupsQuery);
  });

  it('createGroup을 CreateGroupCommand로 위임해야 한다', async () => {
    commandBus.execute.mockResolvedValue({ group: { id: 1 } } as never);

    await expect(
      controller.createGroup(currentUser, { name: 'Ops' } as never),
    ).resolves.toEqual({
      group: { id: 1 },
    });

    expect(commandBus.execute.mock.calls[0]?.[0]).toBeInstanceOf(
      CreateGroupCommand,
    );
  });
});
