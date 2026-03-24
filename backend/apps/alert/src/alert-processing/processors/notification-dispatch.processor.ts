import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { buildWorkerJobLogContext } from '@app/common/queue/queue-job-logger.util';
import {
  NOTIFICATION_DISPATCH_JOB,
  NOTIFICATION_DISPATCH_QUEUE,
  type NotificationDispatchJobPayload,
} from '@app/common/queue/queue.constants';
import { AlertHeartbeatService } from '../services/alert-heartbeat.service';
import { NotificationDispatchService } from '../services/notification-dispatch.service';

@Injectable()
@Processor(NOTIFICATION_DISPATCH_QUEUE, { concurrency: 5 })
export class NotificationDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationDispatchProcessor.name);

  constructor(
    private readonly notificationDispatchService: NotificationDispatchService,
    private readonly alertHeartbeatService: AlertHeartbeatService,
  ) {
    super();
  }

  async process(job: Job<NotificationDispatchJobPayload>) {
    this.logger.log({
      ...buildWorkerJobLogContext(NOTIFICATION_DISPATCH_QUEUE, job),
      event: 'process_started',
    });

    if (job.name !== NOTIFICATION_DISPATCH_JOB) {
      return;
    }

    await this.notificationDispatchService.dispatch(job.data);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<NotificationDispatchJobPayload>) {
    this.alertHeartbeatService.markJobActive(NOTIFICATION_DISPATCH_QUEUE, job);
    this.logger.log({
      ...buildWorkerJobLogContext(NOTIFICATION_DISPATCH_QUEUE, job),
      event: 'active',
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<NotificationDispatchJobPayload>) {
    this.alertHeartbeatService.markJobCompleted(
      NOTIFICATION_DISPATCH_QUEUE,
      job,
    );
    this.logger.log({
      ...buildWorkerJobLogContext(NOTIFICATION_DISPATCH_QUEUE, job),
      event: 'completed',
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationDispatchJobPayload> | undefined, error: Error) {
    this.alertHeartbeatService.markJobFailed(NOTIFICATION_DISPATCH_QUEUE, job);
    this.logger.error({
      ...buildWorkerJobLogContext(NOTIFICATION_DISPATCH_QUEUE, job),
      errorMessage: error.message,
      event: 'failed',
    });
  }
}
