import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let redisClient: {
    hgetall: jest.Mock;
    info: jest.Mock;
    keys: jest.Mock;
  };
  let queryExecutionQueue: {
    client: Promise<typeof redisClient>;
    getJobCounts: jest.Mock;
    getJobs: jest.Mock;
    name: string;
  };
  let scheduledQueryQueue: {
    getJobCounts: jest.Mock;
    getJobs: jest.Mock;
    name: string;
  };
  let alertEvaluationQueue: {
    getJobCounts: jest.Mock;
    getJobs: jest.Mock;
    name: string;
  };
  let schemaRefreshQueue: {
    getJobCounts: jest.Mock;
    getJobs: jest.Mock;
    name: string;
  };
  let notificationDispatchQueue: {
    getJobCounts: jest.Mock;
    getJobs: jest.Mock;
    name: string;
  };
  let queryRepository: {
    getAdminOutdatedQueriesByIds: jest.Mock;
  };

  beforeEach(() => {
    redisClient = {
      hgetall: jest.fn(),
      info: jest.fn(),
      keys: jest.fn(),
    };

    queryExecutionQueue = {
      client: Promise.resolve(redisClient),
      getJobCounts: jest.fn(),
      getJobs: jest.fn(),
      name: 'queries',
    };
    scheduledQueryQueue = {
      getJobCounts: jest.fn(),
      getJobs: jest.fn(),
      name: 'scheduled_queries',
    };
    alertEvaluationQueue = {
      getJobCounts: jest.fn(),
      getJobs: jest.fn(),
      name: 'alerts',
    };
    schemaRefreshQueue = {
      getJobCounts: jest.fn(),
      getJobs: jest.fn(),
      name: 'schemas',
    };
    notificationDispatchQueue = {
      getJobCounts: jest.fn(),
      getJobs: jest.fn(),
      name: 'notifications',
    };
    queryRepository = {
      getAdminOutdatedQueriesByIds: jest.fn(),
    };

    const emptyCounts = {
      delayed: 0,
      paused: 0,
      prioritized: 0,
      waiting: 0,
      'waiting-children': 0,
    };

    for (const queue of [
      queryExecutionQueue,
      scheduledQueryQueue,
      alertEvaluationQueue,
      schemaRefreshQueue,
      notificationDispatchQueue,
    ]) {
      queue.getJobCounts.mockResolvedValue(emptyCounts);
      queue.getJobs.mockResolvedValue([]);
    }

    service = new AdminService(
      queryExecutionQueue as never,
      scheduledQueryQueue as never,
      alertEvaluationQueue as never,
      schemaRefreshQueue as never,
      notificationDispatchQueue as never,
      { count: jest.fn().mockResolvedValue(2) } as never,
      {
        count: jest.fn().mockResolvedValue(5),
        createQueryBuilder: jest.fn(),
      } as never,
      { count: jest.fn().mockResolvedValue(7) } as never,
      { count: jest.fn().mockResolvedValue(3) } as never,
      { options: { type: 'sqlite' } } as never,
      queryRepository as never,
    );
  });

  it('outdated query ids를 Redis에서 읽어 실제 query 목록을 반환해야 한다', async () => {
    redisClient.hgetall.mockResolvedValue({
      last_refresh_at: '1773636540',
      query_ids: '[12,45]',
    });

    queryRepository.getAdminOutdatedQueriesByIds.mockResolvedValue([
      { id: 12 },
      { id: 45 },
    ] as never);

    await expect(service.getOutdatedQueries()).resolves.toEqual({
      queries: [{ id: 12 }, { id: 45 }],
      updated_at: 1773636540,
    });

    expect(queryRepository.getAdminOutdatedQueriesByIds).toHaveBeenCalledWith([
      12, 45,
    ]);
  });

  it('queue 상태와 worker heartbeat를 jobs 응답으로 조합해야 한다', async () => {
    queryExecutionQueue.getJobCounts.mockResolvedValue({
      delayed: 1,
      paused: 0,
      prioritized: 0,
      waiting: 2,
      'waiting-children': 0,
    });
    queryExecutionQueue.getJobs.mockResolvedValue([
      {
        data: {
          dataSourceId: 9,
          orgId: 3,
          persistLatestQueryData: true,
          queryId: 21,
          requestedByUserId: 8,
        },
        id: 'job-1',
        name: 'scheduled-execute',
        processedOn: Date.parse('2026-03-16T04:50:00.000Z'),
        timestamp: Date.parse('2026-03-16T04:49:00.000Z'),
      },
    ]);
    redisClient.keys.mockResolvedValue(['redash:workers:worker@test:1']);
    redisClient.hgetall.mockResolvedValueOnce({
      birth_date: '2026-03-16T04:40:00.000Z',
      current_job: 'queries:scheduled-execute',
      failed_jobs: '1',
      hostname: 'test',
      last_heartbeat: '2026-03-16T04:50:30.000Z',
      name: 'worker@test:1',
      pid: '1',
      queues: 'queries, schemas, notifications',
      state: 'processing',
      successful_jobs: '4',
      total_working_time: '630',
    });

    const result = await service.getJobs();

    expect(result.queues.queries.queued).toBe(3);
    expect(result.queues.queries.started[0]).toMatchObject({
      id: 'job-1',
      meta: {
        data_source_id: 9,
        org_id: 3,
        query_id: 21,
        scheduled: true,
        user_id: 8,
      },
    });
    expect(result.workers).toEqual([
      expect.objectContaining({
        name: 'worker@test:1',
        state: 'processing',
        successful_jobs: 4,
      }),
    ]);
  });
});
