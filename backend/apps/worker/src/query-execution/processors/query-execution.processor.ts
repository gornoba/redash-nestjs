import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { Queue } from 'bullmq';

import {
  ALERT_EVALUATION_JOB,
  ALERT_EVALUATION_QUEUE,
  QUERY_EXECUTION_QUEUE,
  type QueryExecutionJobPayload,
  SCHEDULED_QUERY_EXECUTION_JOB,
} from '@app/common/queue/queue.constants';
import { buildWorkerJobLogContext } from '@app/common/queue/queue-job-logger.util';
import { FailureTrackingService } from '../services/failure-tracking.service';
import { QueryExecutionLockService } from '../services/query-execution-lock.service';
import { QueryExecutionService } from '../services/query-execution.service';
import { ScheduledQueryExecutionService } from '../services/scheduled-query-execution.service';
import { WorkerHeartbeatService } from '../services/worker-heartbeat.service';

@Injectable()
@Processor(QUERY_EXECUTION_QUEUE, { concurrency: 5 })
export class QueryExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(QueryExecutionProcessor.name);

  constructor(
    private readonly failureTrackingService: FailureTrackingService,
    private readonly workerHeartbeatService: WorkerHeartbeatService,
    private readonly queryExecutionLockService: QueryExecutionLockService,
    private readonly queryExecutionService: QueryExecutionService,
    private readonly scheduledQueryExecutionService: ScheduledQueryExecutionService,
    @InjectQueue(ALERT_EVALUATION_QUEUE)
    private readonly alertEvaluationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<QueryExecutionJobPayload>) {
    this.logger.log({
      ...buildWorkerJobLogContext(QUERY_EXECUTION_QUEUE, job),
      event: 'process_started',
    });

    const owner = String(job.id ?? `${Date.now()}`);
    const lockKey = this.queryExecutionLockService.buildLockKey(
      job.data.dataSourceId,
      job.data.queryText,
    );
    const acquired = await this.queryExecutionLockService.acquire(
      lockKey,
      owner,
    );

    if (!acquired) {
      throw new Error('동일한 쿼리가 이미 실행 중입니다.');
    }

    try {
      const isScheduledJob = job.name === SCHEDULED_QUERY_EXECUTION_JOB;
      const result = isScheduledJob
        ? await this.scheduledQueryExecutionService.executeScheduled(job.data)
        : await this.queryExecutionService.execute(job.data);

      if (job.data.queryId) {
        await this.alertEvaluationQueue.add(
          ALERT_EVALUATION_JOB,
          { queryId: job.data.queryId },
          {
            removeOnComplete: 1000,
            removeOnFail: 1000,
          },
        );
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '쿼리 실행에 실패했습니다.';

      if (job.name === SCHEDULED_QUERY_EXECUTION_JOB) {
        await this.failureTrackingService.recordFailure(
          job.data.queryId,
          errorMessage,
        );
      }
      this.logger.warn(errorMessage);
      throw error;
    } finally {
      await this.queryExecutionLockService.release(lockKey, owner);
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job<QueryExecutionJobPayload>) {
    this.workerHeartbeatService.markJobActive(QUERY_EXECUTION_QUEUE, job);
    this.logger.log({
      ...buildWorkerJobLogContext(QUERY_EXECUTION_QUEUE, job),
      event: 'active',
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<QueryExecutionJobPayload>, result: unknown) {
    this.workerHeartbeatService.markJobCompleted(QUERY_EXECUTION_QUEUE, job);
    this.logger.log({
      ...buildWorkerJobLogContext(QUERY_EXECUTION_QUEUE, job),
      event: 'completed',
      resultSummary:
        result !== null && typeof result === 'object' && 'id' in result
          ? result
          : undefined,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<QueryExecutionJobPayload> | undefined, error: Error) {
    this.workerHeartbeatService.markJobFailed(QUERY_EXECUTION_QUEUE, job);
    this.logger.error({
      ...buildWorkerJobLogContext(QUERY_EXECUTION_QUEUE, job),
      errorMessage: error.message,
      event: 'failed',
    });
  }
}
