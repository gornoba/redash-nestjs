import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { CreateDataSourceCommand } from '../commands/create-data-source.command';
import { GetDataSourcesQuery } from '../queries/get-data-sources.query';
import { DataSourceController } from './data-source.controller';

describe('DataSourceController', () => {
  let controller: DataSourceController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;

  const user: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    permissions: ['list_data_sources'],
    profileImageUrl: '',
    isEmailVerified: true,
    roles: ['admin'],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DataSourceController],
      providers: [
        {
          provide: CommandBus,
          useValue: {
            execute: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(DataSourceController);
    commandBus = moduleRef.get(CommandBus);
    queryBus = moduleRef.get(QueryBus);
  });

  it('목록 조회를 GetDataSourcesQuery 로 위임해야 한다', async () => {
    queryBus.execute.mockResolvedValue([{ id: 1 }] as never);

    const result: unknown = await controller.getDataSources(user);

    expect(result).toEqual([{ id: 1 }]);
    expect(queryBus.execute.mock.calls).toHaveLength(1);
    expect(queryBus.execute.mock.calls[0]?.[0]).toBeInstanceOf(
      GetDataSourcesQuery,
    );
    expect(queryBus.execute.mock.calls[0]?.[0]).toMatchObject({ user });
  });

  it('생성을 CreateDataSourceCommand 로 위임해야 한다', async () => {
    const payload = {
      name: 'Warehouse',
      type: 'pg',
      options: {
        host: 'localhost',
      },
    };

    commandBus.execute.mockResolvedValue({ id: 10 } as never);

    const result: unknown = await controller.createDataSource(
      user,
      payload as never,
    );

    expect(result).toEqual({ id: 10 });
    expect(commandBus.execute.mock.calls).toHaveLength(1);
    expect(commandBus.execute.mock.calls[0]?.[0]).toBeInstanceOf(
      CreateDataSourceCommand,
    );
    expect(commandBus.execute.mock.calls[0]?.[0]).toMatchObject({
      payload,
      user,
    });
  });
});
