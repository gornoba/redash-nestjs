import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import {
  QUERY_EXECUTION_JOB,
  QUERY_EXECUTION_QUEUE,
  type ExecuteQueryJobQueuedResponse,
  type ExecuteQueryJobStatusResponse,
  type QueryExecutionJobPayload,
} from '@app/common/queue/queue.constants';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import type { SaveQueryRequestDto } from '../dto/query-detail.dto';
import type { ExecuteQueryRequestDto } from '../dto/query-execution.dto';
import type { QueryListQueryDto } from '../dto/query-list-query.schema';
import { QueryRepository } from '../repositories/query.repository';

@Injectable()
export class QueryService {
  constructor(
    @InjectQueue(QUERY_EXECUTION_QUEUE)
    private readonly queryExecutionQueue: Queue,
    private readonly queryRepository: QueryRepository,
  ) {}

  getQueries(
    user: AuthenticatedUser,
    view: 'all' | 'archive' | 'favorites' | 'my',
    params: QueryListQueryDto,
  ) {
    return this.queryRepository.getQueries(user, view, params);
  }

  getQueryTags(user: AuthenticatedUser) {
    return this.queryRepository.getQueryTags(user);
  }

  getQueryDetail(user: AuthenticatedUser, queryId: number) {
    return this.queryRepository.getQueryDetail(user, queryId);
  }

  favoriteQuery(user: AuthenticatedUser, queryId: number) {
    return this.queryRepository.favoriteQuery(user, queryId);
  }

  unfavoriteQuery(user: AuthenticatedUser, queryId: number) {
    return this.queryRepository.unfavoriteQuery(user, queryId);
  }

  archiveQuery(user: AuthenticatedUser, queryId: number) {
    return this.queryRepository.archiveQuery(user, queryId);
  }

  regenerateApiKey(user: AuthenticatedUser, queryId: number) {
    return this.queryRepository.regenerateApiKey(user, queryId);
  }

  forkQuery(user: AuthenticatedUser, queryId: number) {
    return this.queryRepository.forkQuery(user, queryId);
  }

  getPublicQueryResult(queryId: number, apiKey: string) {
    return this.queryRepository.getPublicQueryResult(queryId, apiKey);
  }

  getQueryExecutionResult(user: AuthenticatedUser, queryResultId: number) {
    return this.queryRepository.getQueryResultById(user, queryResultId);
  }

  async getPublicQueryResultCsv(queryId: number, apiKey: string) {
    const result = await this.getPublicQueryResult(queryId, apiKey);
    const columns = result.query_result.data.columns.map(
      (column) => column.name,
    );
    const rows = result.query_result.data.rows.map((row) =>
      columns.map((column) => row[column] ?? ''),
    );

    return [columns, ...rows]
      .map((row) => row.map((cell) => this.escapeCsvValue(cell)).join(','))
      .join('\n');
  }

  createQuery(user: AuthenticatedUser, payload: SaveQueryRequestDto) {
    return this.queryRepository.createQuery(user, payload);
  }

  updateQuery(
    user: AuthenticatedUser,
    queryId: number,
    payload: SaveQueryRequestDto,
  ) {
    return this.queryRepository.updateQuery(user, queryId, payload);
  }

  updateQuerySchedule(
    user: AuthenticatedUser,
    queryId: number,
    schedule: Record<string, unknown> | null,
  ) {
    return this.queryRepository.updateQuerySchedule(user, queryId, schedule);
  }

  async executeQuery(
    user: AuthenticatedUser,
    payload: ExecuteQueryRequestDto,
  ): Promise<ExecuteQueryJobQueuedResponse> {
    const queryText = payload.query.trim();

    if (!queryText) {
      throw new BadRequestException("Can't execute empty query.");
    }

    await this.queryRepository.getAccessibleDataSource(
      user,
      payload.data_source_id,
      {
        permission: 'execute_query',
        requireWriteAccess: true,
      },
    );

    // query_id를 무조건 큐에 넘기면 실행 부수효과로 다른 쿼리의 최신 결과/알림 상태를
    // 건드릴 수 있으므로, 저장 의도가 명시된 경우에만 owner/admin 검증 후 유지한다.
    const persistedQueryId = payload.persist_latest_query_data
      ? await this.queryRepository.resolvePersistedExecutionTargetQueryId(
          user,
          payload.query_id,
          payload.data_source_id,
        )
      : null;

    const job = await this.queryExecutionQueue.add(
      QUERY_EXECUTION_JOB,
      {
        dataSourceId: payload.data_source_id,
        orgId: user.orgId,
        persistLatestQueryData: payload.persist_latest_query_data ?? false,
        queryId: persistedQueryId,
        queryText,
        requestedByUserId: user.id,
      },
      {
        removeOnComplete: {
          age: 60 * 60,
          count: 2_000,
        },
        removeOnFail: {
          age: 24 * 60 * 60,
          count: 5_000,
        },
      },
    );

    return {
      job_id: String(job.id),
      state: 'queued',
    };
  }

  async getQueryExecutionJobStatus(
    user: AuthenticatedUser,
    jobId: string,
  ): Promise<ExecuteQueryJobStatusResponse> {
    const job = (await this.queryExecutionQueue.getJob(jobId)) as
      | Job<QueryExecutionJobPayload>
      | undefined;

    if (!job) {
      throw new NotFoundException('쿼리 실행 작업을 찾을 수 없습니다.');
    }

    await this.ensureJobAccessible(user, job);

    const state = await job.getState();

    if (state === 'completed') {
      const queryResultId = (
        job.returnvalue as { query_result_id?: number } | undefined
      )?.query_result_id;

      return {
        error: null,
        job_id: jobId,
        ...(queryResultId ? { query_result_id: queryResultId } : {}),
        state: 'completed',
      };
    }

    if (state === 'failed') {
      return {
        error: job.failedReason?.trim() || '쿼리 실행 작업이 실패했습니다.',
        job_id: jobId,
        state: 'failed',
      };
    }

    return {
      error: null,
      job_id: jobId,
      state: state === 'active' ? 'running' : 'queued',
    };
  }

  private async ensureJobAccessible(
    user: AuthenticatedUser,
    job: Job<QueryExecutionJobPayload>,
  ) {
    if (job.data.orgId !== user.orgId) {
      throw new ForbiddenException('이 작업을 조회할 권한이 없습니다.');
    }

    const hasAccess = await this.queryRepository.canAccessDataSource(
      user,
      job.data.dataSourceId,
      {
        permission: 'execute_query',
        requireWriteAccess: true,
      },
    );

    if (!hasAccess) {
      throw new ForbiddenException('이 작업을 조회할 권한이 없습니다.');
    }
  }

  private escapeCsvValue(value: unknown) {
    const stringValue =
      value === null || value === undefined
        ? ''
        : typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? `${value}`
            : JSON.stringify(value);

    if (/[",\n\r]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }
}
