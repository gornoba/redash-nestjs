import { Test } from '@nestjs/testing';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { CreateDataSourceCommand } from '../commands/create-data-source.command';
import { CreateDataSourceHandler } from '../commands/handlers/create-data-source.handler';
import { GetDataSourcesQuery } from '../queries/get-data-sources.query';
import { GetDataSourcesHandler } from '../queries/handlers/get-data-sources.handler';
import { DataSourceRepository } from '../repositories/data-source.repository';
import { DataSourceService } from '../services/data-source.service';

describe('DataSource CQRS handlers', () => {
  let createHandler: CreateDataSourceHandler;
  let listHandler: GetDataSourcesHandler;
  let service: jest.Mocked<DataSourceService>;
  let repository: jest.Mocked<DataSourceRepository>;

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
      providers: [
        CreateDataSourceHandler,
        GetDataSourcesHandler,
        {
          provide: DataSourceService,
          useValue: {
            buildDetailResponse: jest.fn(),
            ensureUniqueName: jest.fn(),
            getDefinitionOrThrow: jest.fn(),
            normalizeOptions: jest.fn(),
            serializeOptions: jest.fn(),
          },
        },
        {
          provide: DataSourceRepository,
          useValue: {
            createDataSource: jest.fn((value: unknown) => value),
            createDataSourceWithDefaultGroup: jest.fn(),
            getDataSources: jest.fn(),
            getDataSourceGroupsByDataSourceIds: jest.fn(),
            getDefaultGroup: jest.fn(),
          },
        },
      ],
    }).compile();

    createHandler = moduleRef.get(CreateDataSourceHandler);
    listHandler = moduleRef.get(GetDataSourcesHandler);
    service = moduleRef.get(DataSourceService);
    repository = moduleRef.get(DataSourceRepository);
  });

  it('CreateDataSourceHandler는 생성 orchestration을 직접 수행해야 한다', async () => {
    const payload = {
      name: 'Warehouse',
      type: 'pg',
      options: { host: 'localhost' },
    };
    const definition = {
      syntax: 'sql',
      supports_auto_limit: true,
    };
    const entity = { type: 'pg' };
    const savedDataSource = {
      id: 5,
      encryptedOptions: 'encrypted',
      name: 'Warehouse',
      queueName: 'queries',
      scheduledQueueName: 'scheduled_queries',
      type: 'pg',
    };

    service.getDefinitionOrThrow.mockReturnValue(definition as never);
    service.ensureUniqueName.mockResolvedValue(undefined);
    service.normalizeOptions.mockReturnValue({ host: 'localhost' });
    service.serializeOptions.mockReturnValue('encrypted');
    service.buildDetailResponse.mockResolvedValue({ id: 5 } as never);
    repository.getDefaultGroup.mockResolvedValue({ id: 1 } as never);
    repository.createDataSource.mockReturnValue(entity as never);
    repository.createDataSourceWithDefaultGroup.mockResolvedValue(
      savedDataSource as never,
    );

    await expect(
      createHandler.execute(
        new CreateDataSourceCommand(user, payload as never),
      ),
    ).resolves.toEqual({ id: 5 });

    expect(service.ensureUniqueName.mock.calls).toEqual([
      [user.orgId, payload.name],
    ]);
    expect(repository.createDataSource.mock.calls[0]?.[0]).toMatchObject({
      encryptedOptions: 'encrypted',
      name: 'Warehouse',
      orgId: user.orgId,
      scheduledQueueName: 'scheduled_queries',
      type: 'pg',
    });
    expect(service.buildDetailResponse.mock.calls).toEqual([[savedDataSource]]);
  });

  it('GetDataSourcesHandler는 목록 read flow를 handler 안에서 조합해야 한다', async () => {
    repository.getDataSources.mockResolvedValue([
      { id: 2, name: 'Warehouse', type: 'pg' },
    ] as never);
    repository.getDataSourceGroupsByDataSourceIds.mockResolvedValue([
      {
        dataSourceId: 2,
        groupId: 1,
        group: {
          permissions: ['view_query', 'execute_query'],
        },
        viewOnly: false,
      },
    ] as never);
    service.getDefinitionOrThrow.mockReturnValue({
      supports_auto_limit: true,
      syntax: 'sql',
    } as never);

    await expect(
      listHandler.execute(new GetDataSourcesQuery(user)),
    ).resolves.toEqual([
      expect.objectContaining({
        can_execute_query: true,
        can_view_query: true,
        id: 2,
        name: 'Warehouse',
        type: 'pg',
      }),
    ]);

    expect(repository.getDataSources.mock.calls).toEqual([[user.orgId]]);
    expect(repository.getDataSourceGroupsByDataSourceIds.mock.calls).toEqual([
      [[2]],
    ]);
  });
});
