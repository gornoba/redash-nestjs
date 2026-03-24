import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

import {
  isScheduledQueryDue,
  normalizeQuerySchedule,
} from '@app/common/query/query-schedule.util';
import {
  ADMIN_STATUS_REDIS_KEY,
  QUERY_EXECUTION_QUEUE,
  SCHEDULED_QUERY_EXECUTION_JOB,
  type QueryExecutionJobPayload,
} from '@app/common/queue/queue.constants';
import { ScheduleDashboardRepository } from '../repositories/schedule-dashboard.repository';
import { ScheduleQueryRepository } from '../repositories/schedule-query.repository';

@Injectable()
export class ScheduledQueryDispatchService {
  private readonly logger = new Logger(ScheduledQueryDispatchService.name);

  constructor(
    @InjectQueue(QUERY_EXECUTION_QUEUE)
    private readonly queryExecutionQueue: Queue,
    private readonly scheduleDashboardRepository: ScheduleDashboardRepository,
    private readonly scheduleQueryRepository: ScheduleQueryRepository,
  ) {}

  async dispatchDueQueries(now = new Date()) {
    const [scheduledQueries, scheduledDashboards] = await Promise.all([
      this.scheduleQueryRepository.getScheduledQueries(),
      this.scheduleDashboardRepository.getScheduledDashboards(),
    ]);
    let enqueuedCount = 0;
    const dueQueryIds: number[] = [];

    this.logger.log({
      event: 'scan_started',
      now: now.toISOString(),
      scheduledQueryCount: scheduledQueries.length,
      scheduledDashboardCount: scheduledDashboards.length,
    });

    for (const query of scheduledQueries) {
      if (
        !isScheduledQueryDue(
          {
            schedule: query.schedule,
            scheduleFailures: query.scheduleFailures,
            updatedAt: query.updatedAt,
          },
          now,
        )
      ) {
        continue;
      }

      dueQueryIds.push(query.id);
      const scheduledJobId = this.buildScheduledJobId(query.id);
      const existingJob = await this.queryExecutionQueue.getJob(scheduledJobId);

      if (existingJob) {
        this.logger.log({
          event: 'query_enqueue_skipped',
          jobId: scheduledJobId,
          queryId: query.id,
          reason: 'already_queued_or_running',
        });
        continue;
      }

      const payload: QueryExecutionJobPayload = {
        dataSourceId: query.dataSourceId!,
        orgId: query.orgId,
        persistLatestQueryData: true,
        queryId: query.id,
        queryText: query.queryText,
        requestedByUserId: query.userId,
      };

      const job = await this.queryExecutionQueue.add(
        SCHEDULED_QUERY_EXECUTION_JOB,
        payload,
        {
          jobId: scheduledJobId,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      enqueuedCount += 1;
      this.logger.log({
        dataSourceId: query.dataSourceId,
        event: 'query_enqueued',
        executionJobId: String(job.id ?? ''),
        interval: normalizeQuerySchedule(query.schedule)?.interval ?? null,
        queryId: query.id,
      });
    }

    for (const dashboard of scheduledDashboards) {
      if (
        !isScheduledQueryDue(
          {
            schedule: dashboard.schedule,
            scheduleFailures: 0,
            updatedAt: dashboard.updatedAt,
          },
          now,
        )
      ) {
        continue;
      }

      await this.scheduleDashboardRepository.markDashboardRefreshExecuted(
        dashboard.id,
        now,
      );

      for (const query of dashboard.queries) {
        const scheduledJobId = this.buildScheduledJobId(query.id);
        const existingJob =
          await this.queryExecutionQueue.getJob(scheduledJobId);

        if (existingJob) {
          this.logger.log({
            dashboardId: dashboard.id,
            event: 'dashboard_query_enqueue_skipped',
            jobId: scheduledJobId,
            queryId: query.id,
            reason: 'already_queued_or_running',
          });
          continue;
        }

        const payload: QueryExecutionJobPayload = {
          dataSourceId: query.dataSourceId,
          orgId: query.orgId,
          persistLatestQueryData: true,
          queryId: query.id,
          queryText: query.queryText,
          requestedByUserId: query.userId,
        };

        const job = await this.queryExecutionQueue.add(
          SCHEDULED_QUERY_EXECUTION_JOB,
          payload,
          {
            jobId: scheduledJobId,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );

        enqueuedCount += 1;
        this.logger.log({
          dashboardId: dashboard.id,
          dataSourceId: query.dataSourceId,
          event: 'dashboard_query_enqueued',
          executionJobId: String(job.id ?? ''),
          interval:
            normalizeQuerySchedule(dashboard.schedule)?.interval ?? null,
          queryId: query.id,
        });
      }
    }

    const redisClient = await this.queryExecutionQueue.client;
    await redisClient.hset(
      ADMIN_STATUS_REDIS_KEY,
      'last_refresh_at',
      `${now.getTime() / 1000}`,
      'outdated_queries_count',
      `${dueQueryIds.length}`,
      'query_ids',
      JSON.stringify(dueQueryIds),
    );

    this.logger.log({
      enqueuedCount,
      event: 'scan_completed',
      now: now.toISOString(),
      scheduledQueryCount: scheduledQueries.length,
    });

    return {
      enqueuedCount,
      scannedCount: scheduledQueries.length + scheduledDashboards.length,
    };
  }

  private buildScheduledJobId(queryId: number) {
    return `scheduled-query-${queryId}`;
  }
}
