import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import {
  ALERT_EVALUATION_JOB,
  ALERT_EVALUATION_QUEUE,
  type AlertEvaluationJobPayload,
} from '@app/common/queue/queue.constants';
import { buildWorkerJobLogContext } from '@app/common/queue/queue-job-logger.util';
import { AlertEvaluationService } from '../services/alert-evaluation.service';
import { AlertHeartbeatService } from '../services/alert-heartbeat.service';

@Injectable()
@Processor(ALERT_EVALUATION_QUEUE, { concurrency: 5 })
export class AlertEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertEvaluationProcessor.name);

  constructor(
    private readonly alertEvaluationService: AlertEvaluationService,
    private readonly alertHeartbeatService: AlertHeartbeatService,
  ) {
    super();
  }

  async process(job: Job<AlertEvaluationJobPayload>) {
    this.logger.log({
      ...buildWorkerJobLogContext(ALERT_EVALUATION_QUEUE, job),
      event: 'process_started',
    });

    if (job.name !== ALERT_EVALUATION_JOB) {
      return;
    }

    await this.alertEvaluationService.processEvaluation(job.data.queryId);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<AlertEvaluationJobPayload>) {
    this.alertHeartbeatService.markJobActive(ALERT_EVALUATION_QUEUE, job);
    this.logger.log({
      ...buildWorkerJobLogContext(ALERT_EVALUATION_QUEUE, job),
      event: 'active',
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<AlertEvaluationJobPayload>) {
    this.alertHeartbeatService.markJobCompleted(ALERT_EVALUATION_QUEUE, job);
    this.logger.log({
      ...buildWorkerJobLogContext(ALERT_EVALUATION_QUEUE, job),
      event: 'completed',
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AlertEvaluationJobPayload> | undefined, error: Error) {
    this.alertHeartbeatService.markJobFailed(ALERT_EVALUATION_QUEUE, job);
    this.logger.error({
      ...buildWorkerJobLogContext(ALERT_EVALUATION_QUEUE, job),
      errorMessage: error.message,
      event: 'failed',
    });
  }
}
