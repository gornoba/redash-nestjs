import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { QueryService } from './query.service';

describe('QueryService', () => {
  let service: QueryService;
  let queryExecutionQueue: {
    add: jest.Mock;
    getJob: jest.Mock;
  };
  let queryRepository: {
    getAccessibleDataSource: jest.Mock;
    canAccessDataSource: jest.Mock;
    getQueryResultById: jest.Mock;
    resolvePersistedExecutionTargetQueryId: jest.Mock;
  };

  const user: AuthenticatedUser = {
    id: 7,
    name: '작성자',
    email: 'writer@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    permissions: ['execute_query', 'view_query'],
    profileImageUrl: '',
    isEmailVerified: true,
    roles: ['admin'],
  };

  beforeEach(() => {
    queryExecutionQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
    };
    queryRepository = {
      getAccessibleDataSource: jest.fn().mockResolvedValue({ id: 10 }),
      canAccessDataSource: jest.fn().mockResolvedValue(true),
      getQueryResultById: jest.fn(),
      resolvePersistedExecutionTargetQueryId: jest.fn().mockResolvedValue(3),
    };

    service = new QueryService(
      queryExecutionQueue as never,
      queryRepository as never,
    );
  });

  it('완료된 작업 상태 조회 시 query_result_id 만 반환해야 한다', async () => {
    queryExecutionQueue.getJob.mockResolvedValue({
      data: {
        dataSourceId: 10,
        orgId: 1,
        persistLatestQueryData: false,
      },
      getState: jest.fn().mockResolvedValue('completed'),
      returnvalue: {
        query_result_id: 91,
        retrieved_at: '2026-03-18T01:02:03.000Z',
      },
    });

    await expect(
      service.getQueryExecutionJobStatus(user, 'job-1'),
    ).resolves.toEqual({
      error: null,
      job_id: 'job-1',
      query_result_id: 91,
      state: 'completed',
    });
  });

  it('작업이 없으면 not found 를 던져야 한다', async () => {
    queryExecutionQueue.getJob.mockResolvedValue(undefined);

    await expect(
      service.getQueryExecutionJobStatus(user, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('다른 조직의 작업이면 forbidden 을 던져야 한다', async () => {
    queryExecutionQueue.getJob.mockResolvedValue({
      data: {
        dataSourceId: 10,
        orgId: 999,
        persistLatestQueryData: false,
      },
      getState: jest.fn(),
    });

    await expect(
      service.getQueryExecutionJobStatus(user, 'job-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('결과 조회를 repository 로 위임해야 한다', async () => {
    queryRepository.getQueryResultById.mockResolvedValue({ id: 12 });

    await expect(service.getQueryExecutionResult(user, 12)).resolves.toEqual({
      id: 12,
    });
    expect(queryRepository.getQueryResultById).toHaveBeenCalledWith(user, 12);
  });

  it('수동 쿼리 실행은 latest query result 저장 없이 큐에 넣어야 한다', async () => {
    queryExecutionQueue.add.mockResolvedValue({ id: 'job-9' });

    await expect(
      service.executeQuery(user, {
        data_source_id: 10,
        query: 'select 1',
        query_id: 3,
      }),
    ).resolves.toEqual({
      job_id: 'job-9',
      state: 'queued',
    });

    expect(queryExecutionQueue.add).toHaveBeenCalledWith(
      'execute',
      expect.objectContaining({
        dataSourceId: 10,
        orgId: 1,
        persistLatestQueryData: false,
        queryId: null,
        queryText: 'select 1',
        requestedByUserId: 7,
      }),
      expect.any(Object),
    );
    expect(
      queryRepository.resolvePersistedExecutionTargetQueryId,
    ).not.toHaveBeenCalled();
  });

  it('latest query result 저장이 요청되면 owner/admin 검증 뒤 query_id 를 유지해야 한다', async () => {
    queryExecutionQueue.add.mockResolvedValue({ id: 'job-10' });

    await expect(
      service.executeQuery(user, {
        data_source_id: 10,
        persist_latest_query_data: true,
        query: 'select 1',
        query_id: 3,
      }),
    ).resolves.toEqual({
      job_id: 'job-10',
      state: 'queued',
    });

    expect(
      queryRepository.resolvePersistedExecutionTargetQueryId,
    ).toHaveBeenCalledWith(user, 3, 10);
    expect(queryExecutionQueue.add).toHaveBeenCalledWith(
      'execute',
      expect.objectContaining({
        persistLatestQueryData: true,
        queryId: 3,
      }),
      expect.any(Object),
    );
  });
});
