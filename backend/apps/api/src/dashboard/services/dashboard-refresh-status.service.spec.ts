import { ForbiddenException, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { DashboardRefreshStatusService } from './dashboard-refresh-status.service';

describe('DashboardRefreshStatusService', () => {
  let service: DashboardRefreshStatusService;
  let queryExecutionQueue: {
    client: Promise<{
      get: jest.Mock;
      set: jest.Mock;
    }>;
    getJob: jest.Mock;
  };
  let dashboardRepository: {
    assertAccessibleDashboard: jest.Mock;
  };

  const redisClient = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const user: AuthenticatedUser = {
    id: 7,
    name: '작성자',
    email: 'writer@example.com',
    orgId: 1,
    orgSlug: 'default',
    groupIds: [1],
    permissions: ['execute_query', 'list_dashboards'],
    profileImageUrl: '',
    isEmailVerified: true,
    roles: ['admin'],
  };

  beforeEach(() => {
    redisClient.get.mockReset();
    redisClient.set.mockReset();

    queryExecutionQueue = {
      client: Promise.resolve(redisClient),
      getJob: jest.fn(),
    };
    dashboardRepository = {
      assertAccessibleDashboard: jest.fn().mockResolvedValue(undefined),
    };

    service = new DashboardRefreshStatusService(
      queryExecutionQueue as never,
      dashboardRepository as never,
    );
  });

  it('refresh 생성 시 dashboard_refresh_id 와 총 작업 수를 저장해야 한다', async () => {
    const result = await service.createRefresh(user, 11, ['job-1', 'job-2']);

    expect(result.dashboard_id).toBe(11);
    expect(result.state).toBe('queued');
    expect(result.total_jobs).toBe(2);
    expect(result.dashboard_refresh_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(redisClient.set).toHaveBeenCalledTimes(1);
  });

  it('모든 job 이 끝나면 completed 상태를 반환해야 한다', async () => {
    redisClient.get.mockResolvedValue(
      JSON.stringify({
        dashboard_id: 11,
        job_ids: ['job-1', 'job-2'],
        org_id: 1,
        total_jobs: 2,
      }),
    );
    queryExecutionQueue.getJob
      .mockResolvedValueOnce({
        getState: jest.fn().mockResolvedValue('completed'),
      })
      .mockResolvedValueOnce({
        getState: jest.fn().mockResolvedValue('completed'),
      });

    await expect(
      service.getRefreshStatus(user, '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb'),
    ).resolves.toEqual({
      completed_jobs: 2,
      dashboard_id: 11,
      dashboard_refresh_id: '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb',
      error: null,
      failed_jobs: 0,
      state: 'completed',
      total_jobs: 2,
    });
  });

  it('실패한 job 이 있으면 failed 상태와 에러를 반환해야 한다', async () => {
    redisClient.get.mockResolvedValue(
      JSON.stringify({
        dashboard_id: 11,
        job_ids: ['job-1', 'job-2'],
        org_id: 1,
        total_jobs: 2,
      }),
    );
    queryExecutionQueue.getJob
      .mockResolvedValueOnce({
        getState: jest.fn().mockResolvedValue('active'),
      })
      .mockResolvedValueOnce({
        failedReason: 'boom',
        getState: jest.fn().mockResolvedValue('failed'),
      });

    await expect(
      service.getRefreshStatus(user, '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb'),
    ).resolves.toEqual({
      completed_jobs: 0,
      dashboard_id: 11,
      dashboard_refresh_id: '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb',
      error: 'boom',
      failed_jobs: 1,
      state: 'failed',
      total_jobs: 2,
    });
  });

  it('다른 조직의 refresh 는 forbidden 이어야 한다', async () => {
    redisClient.get.mockResolvedValue(
      JSON.stringify({
        dashboard_id: 11,
        job_ids: [],
        org_id: 999,
        total_jobs: 0,
      }),
    );

    await expect(
      service.getRefreshStatus(user, '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('저장된 refresh 가 없으면 not found 여야 한다', async () => {
    redisClient.get.mockResolvedValue(null);

    await expect(
      service.getRefreshStatus(user, '1d72a0fa-a883-4c7f-b9b7-f43e294d99bb'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
