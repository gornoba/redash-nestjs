import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import {
  ADMIN_STATUS_REDIS_KEY,
  SCHEDULED_QUERY_EXECUTION_QUEUE,
  SCHEDULED_QUERY_SCAN_JOB,
} from '@app/common/queue/queue.constants';

const SCHEDULED_QUERY_SCAN_EVERY_MS = 60_000;
const SCHEDULED_QUERY_SCAN_JOB_ID = 'scheduled-query-scan';

@Injectable()
export class ScheduledQuerySchedulerService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledQuerySchedulerService.name);

  constructor(
    @InjectQueue(SCHEDULED_QUERY_EXECUTION_QUEUE)
    private readonly scheduledQueryQueue: Queue,
  ) {}

  async onModuleInit() {
    const redisClient = await this.scheduledQueryQueue.client;
    await redisClient.hset(
      ADMIN_STATUS_REDIS_KEY,
      'started_at',
      `${Date.now() / 1000}`,
    );

    await this.scheduledQueryQueue.add(
      SCHEDULED_QUERY_SCAN_JOB,
      {},
      {
        jobId: SCHEDULED_QUERY_SCAN_JOB_ID,
        removeOnComplete: true,
        removeOnFail: true,
        repeat: {
          every: SCHEDULED_QUERY_SCAN_EVERY_MS,
        },
      },
    );

    this.logger.log({
      event: 'scheduled_query_scan_registered',
      everyMs: SCHEDULED_QUERY_SCAN_EVERY_MS,
      jobId: SCHEDULED_QUERY_SCAN_JOB_ID,
      queueName: SCHEDULED_QUERY_EXECUTION_QUEUE,
    });
  }
}
