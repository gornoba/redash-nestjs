import { InjectQueue } from '@nestjs/bullmq';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';

import {
  ADMIN_STATUS_REDIS_KEY,
  ADMIN_WORKER_HEARTBEAT_KEY_PREFIX,
  ALERT_EVALUATION_QUEUE,
  NOTIFICATION_DISPATCH_QUEUE,
  QUERY_EXECUTION_QUEUE,
  SCHEMA_REFRESH_QUEUE,
  SCHEDULED_QUERY_EXECUTION_JOB,
  SCHEDULED_QUERY_EXECUTION_QUEUE,
  type QueryExecutionJobPayload,
} from '@app/common/queue/queue.constants';
import { DashboardEntity } from '@app/database/entities/dashboard.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { WidgetEntity } from '@app/database/entities/widget.entity';
import { QueryRepository } from '../../query/repositories/query.repository';

function findRedisInfoLine(info: string, key: string) {
  const matchingLine = info
    .split('\n')
    .find((line) => line.startsWith(`${key}:`));

  if (!matchingLine) {
    return null;
  }

  return matchingLine.slice(key.length + 1).trim();
}

function parseRedisInfoNumber(
  info: string,
  key: string,
  fallbackValue: number,
) {
  const rawValue = findRedisInfoLine(info, key);

  if (!rawValue) {
    return fallbackValue;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function parseRedisInfoString(
  info: string,
  key: string,
  fallbackValue: string,
) {
  const rawValue = findRedisInfoLine(info, key);

  if (!rawValue) {
    return fallbackValue;
  }

  return rawValue || fallbackValue;
}

function parseRedisNumber(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function parseWorkerNumber(value: string | undefined) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectQueue(QUERY_EXECUTION_QUEUE)
    private readonly queryExecutionQueue: Queue,
    @InjectQueue(SCHEDULED_QUERY_EXECUTION_QUEUE)
    private readonly scheduledQueryQueue: Queue,
    @InjectQueue(ALERT_EVALUATION_QUEUE)
    private readonly alertEvaluationQueue: Queue,
    @InjectQueue(SCHEMA_REFRESH_QUEUE)
    private readonly schemaRefreshQueue: Queue,
    @InjectQueue(NOTIFICATION_DISPATCH_QUEUE)
    private readonly notificationDispatchQueue: Queue,
    @InjectRepository(DashboardEntity)
    private readonly dashboardRepository: Repository<DashboardEntity>,
    @InjectRepository(QueryEntity)
    private readonly queryRepositoryEntity: Repository<QueryEntity>,
    @InjectRepository(QueryResultEntity)
    private readonly queryResultRepository: Repository<QueryResultEntity>,
    @InjectRepository(WidgetEntity)
    private readonly widgetRepository: Repository<WidgetEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly queryRepository: QueryRepository,
  ) {}

  async getStatus() {
    const redisClient = await this.queryExecutionQueue.client;
    const [redisInfo, managerStatus, queueSizes] = await Promise.all([
      redisClient.info('memory'),
      redisClient.hgetall(ADMIN_STATUS_REDIS_KEY),
      this.getQueueSizes(),
    ]);
    const [
      queriesCount,
      queryResultsCount,
      unusedQueryResultsCount,
      dashboardsCount,
      widgetsCount,
      databaseMetrics,
    ] = await Promise.all([
      this.queryRepositoryEntity.count(),
      this.queryResultRepository.count(),
      this.getUnusedQueryResultsCount(),
      this.dashboardRepository.count(),
      this.widgetRepository.count(),
      this.getDatabaseMetrics(),
    ]);

    return {
      dashboards_count: dashboardsCount,
      database_metrics: {
        metrics: databaseMetrics,
      },
      manager: {
        last_refresh_at: parseRedisNumber(managerStatus.last_refresh_at),
        outdated_queries_count: parseWorkerNumber(
          managerStatus.outdated_queries_count,
        ),
        queues: queueSizes,
        started_at: parseRedisNumber(managerStatus.started_at),
      },
      queries_count: queriesCount,
      query_results_count: queryResultsCount,
      redis_used_memory: parseRedisInfoNumber(redisInfo, 'used_memory', 0),
      redis_used_memory_human: parseRedisInfoString(
        redisInfo,
        'used_memory_human',
        '0B',
      ),
      unused_query_results_count: unusedQueryResultsCount,
      version: '10.1.0',
      widgets_count: widgetsCount,
    };
  }

  async getOutdatedQueries() {
    const redisClient = await this.queryExecutionQueue.client;
    const managerStatus = await redisClient.hgetall(ADMIN_STATUS_REDIS_KEY);
    const queryIds = this.parseQueryIds(managerStatus.query_ids);

    return {
      queries:
        await this.queryRepository.getAdminOutdatedQueriesByIds(queryIds),
      updated_at: parseRedisNumber(managerStatus.last_refresh_at),
    };
  }

  async getJobs() {
    const [queues, workers] = await Promise.all([
      this.getQueuesStatus(),
      this.getWorkers(),
    ]);

    return {
      queues,
      workers,
    };
  }

  private async getQueueSizes() {
    const queueEntries = await Promise.all(
      this.getMonitoredQueues().map(async (queue) => {
        const counts = await queue.getJobCounts(
          'waiting',
          'delayed',
          'paused',
          'prioritized',
          'waiting-children',
        );
        const size =
          counts.waiting +
          counts.delayed +
          counts.paused +
          counts.prioritized +
          counts['waiting-children'];

        return [queue.name, { size }] as const;
      }),
    );

    return Object.fromEntries(queueEntries);
  }

  private async getQueuesStatus() {
    const queueEntries = await Promise.all(
      this.getMonitoredQueues().map(async (queue) => {
        const [startedJobs, counts] = await Promise.all([
          queue.getJobs(['active']),
          queue.getJobCounts(
            'waiting',
            'delayed',
            'paused',
            'prioritized',
            'waiting-children',
          ),
        ]);

        return [
          queue.name,
          {
            name: queue.name,
            queued:
              counts.waiting +
                counts.delayed +
                counts.paused +
                counts.prioritized +
                counts['waiting-children'] +
                queue.name ===
              'scheduled_queries'
                ? -1
                : 0,
            started: startedJobs.map((job: Job) =>
              this.serializeStartedJob(queue.name, job),
            ),
          },
        ] as const;
      }),
    );

    return Object.fromEntries(queueEntries);
  }

  private async getWorkers() {
    const redisClient = await this.queryExecutionQueue.client;
    const workerKeys = await redisClient.keys(
      `${ADMIN_WORKER_HEARTBEAT_KEY_PREFIX}:*`,
    );

    if (workerKeys.length === 0) {
      return [];
    }

    const workerEntries = await Promise.all(
      workerKeys.map(async (key) => {
        const worker = await redisClient.hgetall(key);

        return {
          birth_date: worker.birth_date ?? new Date().toISOString(),
          current_job: worker.current_job || null,
          failed_jobs: parseWorkerNumber(worker.failed_jobs),
          hostname: worker.hostname ?? 'unknown',
          name: worker.name ?? key,
          pid: parseWorkerNumber(worker.pid),
          queues: worker.queues ?? '',
          state: worker.state ?? 'started',
          successful_jobs: parseWorkerNumber(worker.successful_jobs),
          total_working_time: parseWorkerNumber(worker.total_working_time),
        };
      }),
    );

    return workerEntries.sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }

  private async getDatabaseMetrics() {
    if (this.dataSource.options.type !== 'postgres') {
      return [];
    }

    try {
      const queryResultsSizeRows: unknown = await this.dataSource.query(
        "select pg_total_relation_size('query_results') as size",
      );
      const databaseSizeRows: unknown = await this.dataSource.query(
        'select pg_database_size(current_database()) as size',
      );

      return [
        ['Query Results Size', this.extractSizeValue(queryResultsSizeRows)],
        ['Redash DB Size', this.extractSizeValue(databaseSizeRows)],
      ] as Array<[string, number]>;
    } catch {
      return [];
    }
  }

  private async getUnusedQueryResultsCount() {
    return this.queryResultRepository
      .createQueryBuilder('queryResult')
      .leftJoin(
        QueryEntity,
        'query',
        'query.latest_query_data_id = queryResult.id',
      )
      .where('query.id IS NULL')
      .getCount();
  }

  private getMonitoredQueues() {
    return [
      this.alertEvaluationQueue,
      this.notificationDispatchQueue,
      this.queryExecutionQueue,
      this.scheduledQueryQueue,
      this.schemaRefreshQueue,
    ];
  }

  private parseQueryIds(value: string | undefined) {
    if (!value) {
      return [];
    }

    try {
      const parsedValue: unknown = JSON.parse(value);

      return Array.isArray(parsedValue)
        ? parsedValue
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item > 0)
        : [];
    } catch {
      return [];
    }
  }

  private serializeStartedJob(queueName: string, job: Job) {
    const rawPayload: unknown = job.data;
    const typedPayload =
      rawPayload && typeof rawPayload === 'object'
        ? (rawPayload as Partial<QueryExecutionJobPayload>)
        : {};

    return {
      enqueued_at:
        typeof job.timestamp === 'number'
          ? new Date(job.timestamp).toISOString()
          : null,
      id: String(job.id ?? ''),
      meta: {
        data_source_id:
          typeof typedPayload.dataSourceId === 'number'
            ? typedPayload.dataSourceId
            : null,
        org_id:
          typeof typedPayload.orgId === 'number' ? typedPayload.orgId : null,
        query_id:
          typeof typedPayload.queryId === 'number'
            ? typedPayload.queryId
            : null,
        scheduled: job.name === SCHEDULED_QUERY_EXECUTION_JOB,
        user_id:
          typeof typedPayload.requestedByUserId === 'number'
            ? typedPayload.requestedByUserId
            : null,
      },
      name: job.name,
      origin: queueName,
      started_at:
        typeof job.processedOn === 'number'
          ? new Date(job.processedOn).toISOString()
          : null,
    };
  }

  private extractSizeValue(rows: unknown) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return 0;
    }

    const [firstRow] = rows as unknown[];

    if (!firstRow || typeof firstRow !== 'object' || !('size' in firstRow)) {
      return 0;
    }

    const rawValue = (firstRow as { size: unknown }).size;
    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }
}
