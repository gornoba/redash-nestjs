import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { hostname } from 'os';

import {
  ADMIN_WORKER_HEARTBEAT_KEY_PREFIX,
  SCHEDULED_QUERY_EXECUTION_QUEUE,
} from '@app/common/queue/queue.constants';

@Injectable()
export class ScheduleHeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly startedAt = new Date();
  private readonly workerName = `schedule@${hostname()}:${process.pid}`;
  private readonly workerQueues = 'scheduled_queries';
  private readonly activeJobs = new Map<string, string>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private failedJobs = 0;
  private successfulJobs = 0;

  constructor(
    @InjectQueue(SCHEDULED_QUERY_EXECUTION_QUEUE)
    private readonly scheduledQueryQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.writeHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      void this.writeHeartbeat();
    }, 30_000);
  }

  async onModuleDestroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    try {
      const redisClient = await this.scheduledQueryQueue.client;
      await redisClient.del(this.workerKey);
    } catch {
      // Ignore shutdown cleanup failures.
    }
  }

  markJobActive(queueName: string, job: Job<unknown>) {
    this.activeJobs.set(
      `${queueName}:${String(job.id ?? '')}`,
      `${queueName}:${job.name}`,
    );
    void this.writeHeartbeat('processing');
  }

  markJobCompleted(queueName: string, job: Job<unknown>) {
    this.activeJobs.delete(`${queueName}:${String(job.id ?? '')}`);
    this.successfulJobs += 1;
    void this.writeHeartbeat();
  }

  markJobFailed(queueName: string, job?: Job<unknown>) {
    if (job) {
      this.activeJobs.delete(`${queueName}:${String(job.id ?? '')}`);
    }

    this.failedJobs += 1;
    void this.writeHeartbeat();
  }

  private get workerKey() {
    return `${ADMIN_WORKER_HEARTBEAT_KEY_PREFIX}:${this.workerName}`;
  }

  private get currentJob() {
    const currentJobs = Array.from(this.activeJobs.values()).slice(0, 3);
    return currentJobs.length > 0 ? currentJobs.join(', ') : '';
  }

  private get currentState() {
    return this.activeJobs.size > 0 ? 'processing' : 'started';
  }

  private async writeHeartbeat(state = this.currentState) {
    const redisClient = await this.scheduledQueryQueue.client;
    await redisClient.hset(
      this.workerKey,
      'birth_date',
      this.startedAt.toISOString(),
      'current_job',
      this.currentJob,
      'failed_jobs',
      `${this.failedJobs}`,
      'hostname',
      hostname(),
      'last_heartbeat',
      new Date().toISOString(),
      'name',
      this.workerName,
      'pid',
      `${process.pid}`,
      'queues',
      this.workerQueues,
      'state',
      state,
      'successful_jobs',
      `${this.successfulJobs}`,
      'total_working_time',
      `${Math.floor((Date.now() - this.startedAt.getTime()) / 1000)}`,
    );
    await redisClient.expire(this.workerKey, 90);
  }
}
