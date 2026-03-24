import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { CreateUserCommand } from '../commands/create-user.command';
import { GetUserQuery } from '../queries/get-user.query';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  let controller: UsersController;
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
      controllers: [UsersController],
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

    controller = moduleRef.get(UsersController);
    commandBus = moduleRef.get(CommandBus);
    queryBus = moduleRef.get(QueryBus);
  });

  it('createUser를 CreateUserCommand로 위임해야 한다', async () => {
    const payload = {
      name: 'Tester',
      email: 'tester@example.com',
    };

    commandBus.execute.mockResolvedValue({ id: 3 } as never);

    await expect(
      controller.createUser(currentUser, payload as never),
    ).resolves.toEqual({ id: 3 });

    expect(commandBus.execute.mock.calls[0]?.[0]).toBeInstanceOf(
      CreateUserCommand,
    );
  });

  it('getUser를 GetUserQuery로 위임해야 한다', async () => {
    queryBus.execute.mockResolvedValue({ user: { id: 2 } } as never);

    await expect(
      controller.getUser(currentUser, { userId: 2 }),
    ).resolves.toEqual({
      user: { id: 2 },
    });

    expect(queryBus.execute.mock.calls[0]?.[0]).toBeInstanceOf(GetUserQuery);
  });
});
