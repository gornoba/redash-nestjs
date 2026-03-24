import { ScheduleDashboardRepository } from '../repositories/schedule-dashboard.repository';
import { ScheduleQueryRepository } from '../repositories/schedule-query.repository';
import { ScheduledQueryDispatchService } from './scheduled-query-dispatch.service';

describe('ScheduledQueryDispatchService', () => {
  let service: ScheduledQueryDispatchService;
  let redisClient: {
    hset: jest.Mock;
  };
  let queryExecutionQueue: {
    add: jest.Mock;
    client: Promise<typeof redisClient>;
    getJob: jest.Mock;
  };
  let scheduleDashboardRepository: jest.Mocked<ScheduleDashboardRepository>;
  let scheduleQueryRepository: jest.Mocked<ScheduleQueryRepository>;

  beforeEach(() => {
    redisClient = {
      hset: jest.fn().mockResolvedValue(1),
    };

    queryExecutionQueue = {
      add: jest.fn().mockResolvedValue({ id: 'scheduled-query-1' }),
      client: Promise.resolve(redisClient),
      getJob: jest.fn().mockResolvedValue(null),
    };

    scheduleDashboardRepository = {
      getScheduledDashboards: jest.fn().mockResolvedValue([]),
      markDashboardRefreshExecuted: jest.fn().mockResolvedValue(undefined),
    } as never;

    scheduleQueryRepository = {
      getScheduledQueries: jest.fn(),
    } as never;

    service = new ScheduledQueryDispatchService(
      queryExecutionQueue as never,
      scheduleDashboardRepository,
      scheduleQueryRepository,
    );
  });

  it('실행 대상인 scheduled query만 worker 실행 큐로 enqueue해야 한다', async () => {
    scheduleQueryRepository.getScheduledQueries.mockResolvedValue([
      {
        dataSourceId: 10,
        id: 1,
        orgId: 1,
        queryText: 'select 1',
        schedule: {
          interval: 300,
          last_execute: null,
        },
        scheduleFailures: 0,
        updatedAt: new Date('2026-03-16T00:00:00.000Z'),
        userId: 7,
      },
      {
        dataSourceId: 10,
        id: 2,
        orgId: 1,
        queryText: 'select 2',
        schedule: {
          interval: 300,
          last_execute: '2026-03-16T00:03:30.000Z',
        },
        scheduleFailures: 0,
        updatedAt: new Date('2026-03-16T00:00:00.000Z'),
        userId: 7,
      },
    ] as never);

    await expect(
      service.dispatchDueQueries(new Date('2026-03-16T00:05:01.000Z')),
    ).resolves.toEqual({
      enqueuedCount: 1,
      scannedCount: 2,
    });

    expect(queryExecutionQueue.add).toHaveBeenCalledTimes(1);
    expect(queryExecutionQueue.add).toHaveBeenCalledWith(
      'scheduled-execute',
      expect.any(Object),
      expect.objectContaining({
        jobId: 'scheduled-query-1',
      }),
    );
    expect(redisClient.hset).toHaveBeenCalledWith(
      'redash:status',
      'last_refresh_at',
      '1773619501',
      'outdated_queries_count',
      '1',
      'query_ids',
      '[1]',
    );
  });

  it('이미 대기 중인 scheduled query는 중복 enqueue하지 않아야 한다', async () => {
    scheduleQueryRepository.getScheduledQueries.mockResolvedValue([
      {
        dataSourceId: 10,
        id: 1,
        orgId: 1,
        queryText: 'select 1',
        schedule: {
          interval: 300,
          last_execute: null,
        },
        scheduleFailures: 0,
        updatedAt: new Date('2026-03-16T00:00:00.000Z'),
        userId: 7,
      },
    ] as never);
    queryExecutionQueue.getJob.mockResolvedValue({ id: 'scheduled-query-1' });

    await expect(
      service.dispatchDueQueries(new Date('2026-03-16T00:05:01.000Z')),
    ).resolves.toEqual({
      enqueuedCount: 0,
      scannedCount: 1,
    });

    expect(queryExecutionQueue.add).not.toHaveBeenCalled();
    expect(queryExecutionQueue.getJob).toHaveBeenCalledWith(
      'scheduled-query-1',
    );
    expect(redisClient.hset).toHaveBeenCalledWith(
      'redash:status',
      'last_refresh_at',
      '1773619501',
      'outdated_queries_count',
      '1',
      'query_ids',
      '[1]',
    );
  });

  it('대시보드 refresh schedule 과 query schedule 이 같은 쿼리를 가리키면 한 번만 enqueue해야 한다', async () => {
    scheduleQueryRepository.getScheduledQueries.mockResolvedValue([
      {
        dataSourceId: 10,
        id: 7,
        orgId: 1,
        queryText: 'select 7',
        schedule: {
          interval: 60,
          last_execute: null,
        },
        scheduleFailures: 0,
        updatedAt: new Date('2026-03-16T00:00:00.000Z'),
        userId: 7,
      },
    ] as never);
    scheduleDashboardRepository.getScheduledDashboards.mockResolvedValue([
      {
        id: 99,
        queries: [
          {
            dataSourceId: 10,
            id: 7,
            orgId: 1,
            queryText: 'select 7',
            userId: 7,
          },
        ],
        schedule: {
          interval: 60,
          last_execute: null,
        },
        updatedAt: new Date('2026-03-16T00:00:00.000Z'),
      },
    ] as never);
    queryExecutionQueue.getJob
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'scheduled-query-7' });

    await expect(
      service.dispatchDueQueries(new Date('2026-03-16T00:01:01.000Z')),
    ).resolves.toEqual({
      enqueuedCount: 1,
      scannedCount: 2,
    });

    expect(queryExecutionQueue.add).toHaveBeenCalledTimes(1);
    expect(
      scheduleDashboardRepository.markDashboardRefreshExecuted.mock.calls[0],
    ).toEqual([99, new Date('2026-03-16T00:01:01.000Z')]);
  });
});
