import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { VisualizationEntity } from '@app/database/entities/visualization.entity';
import { VisualizationRepository } from './visualization.repository';

describe('VisualizationRepository', () => {
  let repository: VisualizationRepository;
  let visualizationRepository: {
    findOneBy: jest.MockedFunction<
      (where: unknown) => Promise<VisualizationEntity | null>
    >;
    remove: jest.MockedFunction<
      (entity: VisualizationEntity) => Promise<VisualizationEntity>
    >;
  };
  let queryRepository: {
    findOne: jest.MockedFunction<
      (options: unknown) => Promise<{ id: number; userId: number } | null>
    >;
  };

  const user: AuthenticatedUser = {
    id: 1,
    name: '관리자',
    email: 'admin@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    permissions: ['edit_query'],
    profileImageUrl: '',
    isEmailVerified: true,
    roles: ['admin'],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VisualizationRepository,
        {
          provide: getRepositoryToken(VisualizationEntity),
          useValue: {
            findOneBy: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(QueryEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(QueryResultEntity),
          useValue: {},
        },
      ],
    }).compile();

    repository = moduleRef.get(VisualizationRepository);
    visualizationRepository = moduleRef.get(
      getRepositoryToken(VisualizationEntity),
    );
    queryRepository = moduleRef.get(getRepositoryToken(QueryEntity));
  });

  it('삭제 전에 직렬화해서 remove 이후 timestamp mutation 영향을 받지 않아야 한다', async () => {
    const visualization = {
      id: 12,
      type: 'TABLE',
      queryId: 34,
      name: 'Table',
      description: '',
      options: '{}',
      createdAt: new Date('2026-03-23T01:00:00.000Z'),
      updatedAt: new Date('2026-03-23T01:10:00.000Z'),
    } as VisualizationEntity;

    visualizationRepository.findOneBy.mockResolvedValue(visualization);
    queryRepository.findOne.mockResolvedValue({
      id: 34,
      userId: 1,
    });
    visualizationRepository.remove.mockImplementation((entity) => {
      entity.createdAt = undefined as never;
      entity.updatedAt = undefined as never;
      return Promise.resolve(entity);
    });

    await expect(repository.deleteVisualization(user, 12)).resolves.toEqual({
      id: 12,
      type: 'TABLE',
      query_id: 34,
      name: 'Table',
      description: '',
      options: {},
      created_at: '2026-03-23T01:00:00.000Z',
      updated_at: '2026-03-23T01:10:00.000Z',
    });
  });
});
