import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { buildWorkerJobLogContext } from '@app/common/queue/queue-job-logger.util';
import { SCHEMA_REFRESH_QUEUE } from '@app/common/queue/queue.constants';
import { SchemaRefreshService } from '../services/schema-refresh.service';
import { WorkerHeartbeatService } from '../services/worker-heartbeat.service';

@Injectable()
@Processor(SCHEMA_REFRESH_QUEUE, { concurrency: 1 })
export class SchemaRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(SchemaRefreshProcessor.name);

  constructor(
    private readonly schemaRefreshService: SchemaRefreshService,
    private readonly workerHeartbeatService: WorkerHeartbeatService,
  ) {
    super();
  }

  process(job: Job<{ dataSourceId: number }>) {
    this.logger.log({
      ...buildWorkerJobLogContext(SCHEMA_REFRESH_QUEUE, job),
      event: 'process_started',
    });
    this.schemaRefreshService.refreshDataSourceSchema(job.data.dataSourceId);
    return Promise.resolve();
  }

  @OnWorkerEvent('active')
  onActive(job: Job<{ dataSourceId: number }>) {
    this.workerHeartbeatService.markJobActive(SCHEMA_REFRESH_QUEUE, job);
    this.logger.log({
      ...buildWorkerJobLogContext(SCHEMA_REFRESH_QUEUE, job),
      event: 'active',
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<{ dataSourceId: number }>) {
    this.workerHeartbeatService.markJobCompleted(SCHEMA_REFRESH_QUEUE, job);
    this.logger.log({
      ...buildWorkerJobLogContext(SCHEMA_REFRESH_QUEUE, job),
      event: 'completed',
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<{ dataSourceId: number }> | undefined, error: Error) {
    this.workerHeartbeatService.markJobFailed(SCHEMA_REFRESH_QUEUE, job);
    this.logger.error({
      ...buildWorkerJobLogContext(SCHEMA_REFRESH_QUEUE, job),
      errorMessage: error.message,
      event: 'failed',
    });
  }
}
