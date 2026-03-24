import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { IsNull, Not, Repository } from 'typeorm';

import { setQueryScheduleLastExecute } from '@app/common/query/query-schedule.util';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';

@Injectable()
export class WorkerQueryRepository {
  constructor(
    @InjectRepository(DataSourceEntity)
    private readonly dataSourceRepository: Repository<DataSourceEntity>,
    @InjectRepository(QueryEntity)
    private readonly queryRepository: Repository<QueryEntity>,
    @InjectRepository(QueryResultEntity)
    private readonly queryResultRepository: Repository<QueryResultEntity>,
  ) {}

  async getDataSourceOrThrow(orgId: number, dataSourceId: number) {
    const dataSource = await this.dataSourceRepository.findOneBy({
      id: dataSourceId,
      orgId,
    });

    if (!dataSource) {
      throw new NotFoundException('데이터 소스를 찾을 수 없습니다.');
    }

    return dataSource;
  }

  getScheduledQueries() {
    return this.queryRepository.find({
      where: {
        dataSourceId: Not(IsNull()),
        isArchived: false,
        schedule: Not(IsNull()),
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async storeExecutionResult(params: {
    data: {
      columns: Array<{
        friendly_name: string;
        name: string;
        type: string | null;
      }>;
      limit: {
        applied_limit: number;
        did_apply_default_limit: boolean;
        did_cap_limit: boolean;
        requested_limit: number | null;
      };
      rows: Array<Record<string, unknown>>;
      truncated: boolean;
    };
    dataSourceId: number;
    orgId: number;
    persistLatestQueryData: boolean;
    queryId?: number | null;
    queryText: string;
    runtime: number;
  }) {
    const queryHash = createHash('md5')
      .update(params.queryText, 'utf8')
      .digest('hex');

    const result = await this.queryResultRepository.save(
      this.queryResultRepository.create({
        orgId: params.orgId,
        dataSourceId: params.dataSourceId,
        queryHash,
        queryText: params.queryText,
        data: params.data,
        runtime: params.runtime,
        retrievedAt: new Date(),
      }),
    );

    if (params.persistLatestQueryData && params.queryId) {
      await this.queryRepository.update(
        { id: params.queryId, orgId: params.orgId },
        {
          latestQueryDataId: result.id,
        },
      );
    }

    return {
      query_result_id: result.id,
      retrieved_at: result.retrievedAt.toISOString(),
    };
  }

  async recordScheduledExecutionSuccess(queryId: number, retrievedAt: string) {
    const query = await this.queryRepository.findOneBy({
      id: queryId,
    });

    if (!query) {
      return;
    }

    query.schedule = setQueryScheduleLastExecute(query.schedule, retrievedAt);
    query.scheduleFailures = 0;

    await this.queryRepository.save(query);
  }

  async recordScheduledExecutionFailure(queryId: number) {
    await this.queryRepository.increment(
      { id: queryId },
      'scheduleFailures',
      1,
    );
  }
}
