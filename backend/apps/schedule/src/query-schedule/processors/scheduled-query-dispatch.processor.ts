import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { buildWorkerJobLogContext } from '@app/common/queue/queue-job-logger.util';
import {
  SCHEDULED_QUERY_EXECUTION_QUEUE,
  SCHEDULED_QUERY_SCAN_JOB,
} from '@app/common/queue/queue.constants';
import { ScheduledQueryDispatchService } from '../services/scheduled-query-dispatch.service';
import { ScheduleHeartbeatService } from '../services/schedule-heartbeat.service';

@Injectable()
@Processor(SCHEDULED_QUERY_EXECUTION_QUEUE, { concurrency: 1 })
export class ScheduledQueryDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledQueryDispatchProcessor.name);

  constructor(
    private readonly scheduledQueryDispatchService: ScheduledQueryDispatchService,
    private readonly scheduleHeartbeatService: ScheduleHeartbeatService,
  ) {
    super();
  }

  async process(job: Job<Record<string, never>>) {
    this.logger.log({
      ...buildWorkerJobLogContext(SCHEDULED_QUERY_EXECUTION_QUEUE, job),
      event: 'process_started',
    });

    if (job.name !== SCHEDULED_QUERY_SCAN_JOB) {
      this.logger.warn({
        ...buildWorkerJobLogContext(SCHEDULED_QUERY_EXECUTION_QUEUE, job),
        event: 'unknown_job_skipped',
      });
      return null;
    }

    return this.scheduledQueryDispatchService.dispatchDueQueries();
  }

  @OnWorkerEvent('active')
  onActive(job: Job<Record<string, never>>) {
    this.scheduleHeartbeatService.markJobActive(
      SCHEDULED_QUERY_EXECUTION_QUEUE,
      job,
    );
    this.logger.log({
      ...buildWorkerJobLogContext(SCHEDULED_QUERY_EXECUTION_QUEUE, job),
      event: 'active',
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<Record<string, never>>, result: unknown) {
    this.scheduleHeartbeatService.markJobCompleted(
      SCHEDULED_QUERY_EXECUTION_QUEUE,
      job,
    );
    this.logger.log({
      ...buildWorkerJobLogContext(SCHEDULED_QUERY_EXECUTION_QUEUE, job),
      event: 'completed',
      resultSummary: result,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<Record<string, never>> | undefined, error: Error) {
    this.scheduleHeartbeatService.markJobFailed(
      SCHEDULED_QUERY_EXECUTION_QUEUE,
      job,
    );
    this.logger.error({
      ...buildWorkerJobLogContext(SCHEDULED_QUERY_EXECUTION_QUEUE, job),
      errorMessage: error.message,
      event: 'failed',
    });
  }
}
