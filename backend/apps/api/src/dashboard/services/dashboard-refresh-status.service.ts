import { InjectQueue } from '@nestjs/bullmq';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Job, Queue } from 'bullmq';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  QUERY_EXECUTION_QUEUE,
  type QueryExecutionJobPayload,
} from '@app/common/queue/queue.constants';
import { DashboardRepository } from '../repositories/dashboard.repository';

const DASHBOARD_REFRESH_KEY_PREFIX = 'dashboard-refresh';
const DASHBOARD_REFRESH_TTL_SECONDS = 60 * 60;

type DashboardRefreshRecord = {
  dashboard_id: number;
  job_ids: string[];
  org_id: number;
  total_jobs: number;
};

type DashboardRefreshState = 'queued' | 'running' | 'completed' | 'failed';
type DashboardRefreshStartState = 'queued' | 'completed';

@Injectable()
export class DashboardRefreshStatusService {
  constructor(
    @InjectQueue(QUERY_EXECUTION_QUEUE)
    private readonly queryExecutionQueue: Queue,
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  async createRefresh(
    user: AuthenticatedUser,
    dashboardId: number,
    jobIds: string[],
  ): Promise<{
    dashboard_id: number;
    dashboard_refresh_id: string;
    state: DashboardRefreshStartState;
    total_jobs: number;
  }> {
    const dashboardRefreshId = randomUUID();
    const record: DashboardRefreshRecord = {
      dashboard_id: dashboardId,
      job_ids: jobIds,
      org_id: user.orgId,
      total_jobs: jobIds.length,
    };

    const client = await this.queryExecutionQueue.client;

    await client.set(
      this.getRefreshKey(dashboardRefreshId),
      JSON.stringify(record),
      'EX',
      DASHBOARD_REFRESH_TTL_SECONDS,
    );

    return {
      dashboard_id: dashboardId,
      dashboard_refresh_id: dashboardRefreshId,
      state: jobIds.length === 0 ? 'completed' : 'queued',
      total_jobs: jobIds.length,
    };
  }

  async getRefreshStatus(user: AuthenticatedUser, dashboardRefreshId: string) {
    const client = await this.queryExecutionQueue.client;
    const serializedRecord = await client.get(
      this.getRefreshKey(dashboardRefreshId),
    );

    if (!serializedRecord) {
      throw new NotFoundException('대시보드 새로고침 작업을 찾을 수 없습니다.');
    }

    const record = this.parseRefreshRecord(serializedRecord);

    if (record.org_id !== user.orgId) {
      throw new ForbiddenException(
        '이 대시보드 새로고침 작업을 조회할 권한이 없습니다.',
      );
    }

    await this.dashboardRepository.assertAccessibleDashboard(
      user,
      record.dashboard_id,
    );

    if (record.total_jobs === 0) {
      return {
        completed_jobs: 0,
        dashboard_id: record.dashboard_id,
        dashboard_refresh_id: dashboardRefreshId,
        error: null,
        failed_jobs: 0,
        state: 'completed' as const,
        total_jobs: 0,
      };
    }

    const statuses = await Promise.all(
      record.job_ids.map((jobId) => this.getJobStatus(jobId)),
    );

    let completedJobs = 0;
    let failedJobs = 0;
    let hasRunningJob = false;
    let error: string | null = null;

    statuses.forEach((status) => {
      if (status.state === 'completed') {
        completedJobs += 1;
        return;
      }

      if (status.state === 'failed') {
        failedJobs += 1;
        error ??= status.error;
        return;
      }

      if (status.state === 'running') {
        hasRunningJob = true;
      }
    });

    const state = this.resolveRefreshState({
      completedJobs,
      failedJobs,
      hasRunningJob,
      totalJobs: record.total_jobs,
    });

    return {
      completed_jobs: completedJobs,
      dashboard_id: record.dashboard_id,
      dashboard_refresh_id: dashboardRefreshId,
      error,
      failed_jobs: failedJobs,
      state,
      total_jobs: record.total_jobs,
    };
  }

  private async getJobStatus(jobId: string) {
    const job = (await this.queryExecutionQueue.getJob(jobId)) as
      | Job<QueryExecutionJobPayload>
      | undefined;

    if (!job) {
      return {
        error: '대시보드 새로고침 작업을 찾을 수 없습니다.',
        state: 'failed' as const,
      };
    }

    const state = await job.getState();

    if (state === 'completed') {
      return {
        error: null,
        state: 'completed' as const,
      };
    }

    if (state === 'failed') {
      return {
        error:
          job.failedReason?.trim() || '대시보드 새로고침 작업이 실패했습니다.',
        state: 'failed' as const,
      };
    }

    return {
      error: null,
      state: state === 'active' ? ('running' as const) : ('queued' as const),
    };
  }

  private resolveRefreshState(params: {
    completedJobs: number;
    failedJobs: number;
    hasRunningJob: boolean;
    totalJobs: number;
  }): DashboardRefreshState {
    if (params.failedJobs > 0) {
      return 'failed';
    }

    if (params.completedJobs === params.totalJobs) {
      return 'completed';
    }

    if (params.hasRunningJob || params.completedJobs > 0) {
      return 'running';
    }

    return 'queued';
  }

  private parseRefreshRecord(serializedRecord: string) {
    try {
      const parsed = JSON.parse(serializedRecord) as DashboardRefreshRecord;

      if (
        typeof parsed.dashboard_id !== 'number' ||
        typeof parsed.org_id !== 'number' ||
        typeof parsed.total_jobs !== 'number' ||
        !Array.isArray(parsed.job_ids)
      ) {
        throw new Error('invalid dashboard refresh record');
      }

      return parsed;
    } catch {
      throw new NotFoundException('대시보드 새로고침 작업을 찾을 수 없습니다.');
    }
  }

  private getRefreshKey(dashboardRefreshId: string) {
    return `${DASHBOARD_REFRESH_KEY_PREFIX}:${dashboardRefreshId}`;
  }
}
