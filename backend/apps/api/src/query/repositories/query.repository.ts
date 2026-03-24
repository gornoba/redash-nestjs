import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, SelectQueryBuilder, Repository } from 'typeorm';

import { CurrentUserService } from '@app/common/current-user/current-user.service';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  isUserEmailVerified,
  isUserInvitationPending,
} from '@app/common/utils/user-details';
import { AlertSubscriptionEntity } from '@app/database/entities/alert-subscription.entity';
import { AlertEntity } from '@app/database/entities/alert.entity';
import { FavoriteEntity } from '@app/database/entities/favorite.entity';
import { DataSourceEntity } from '@app/database/entities/data-source.entity';
import { OrganizationEntity } from '@app/database/entities/organization.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { QueryResultEntity } from '@app/database/entities/query-result.entity';
import { UserEntity } from '@app/database/entities/user.entity';
import { VisualizationEntity } from '@app/database/entities/visualization.entity';
import { WidgetEntity } from '@app/database/entities/widget.entity';
import { normalizeOrganizationSettings } from '../../settings/settings.constants';
import type { SaveQueryRequestDto } from '../dto/query-detail.dto';
import type { QueryListQueryDto } from '../dto/query-list-query.schema';
import { resetQueryScheduleLastExecute } from '../utils/query-schedule.util';

type QueryListView = 'all' | 'archive' | 'favorites' | 'my';
type QueryRelationMode = 'full' | 'none' | 'summary';
type SearchMode = 'default' | 'ilike' | 'ranked';
type QueryListOrderDefinition = {
  alias?: string;
  nulls?: 'NULLS LAST';
  orderBy: string;
  select?: string;
};
const QUERY_LIST_LATEST_QUERY_DATA_RETRIEVED_AT_ALIAS =
  'latest_query_data_retrieved_at';
const QUERY_LIST_LATEST_QUERY_DATA_RUNTIME_ALIAS = 'latest_query_data_runtime';

type QueryListLatestQueryDataSummary = {
  retrievedAt: string | null;
  runtime: number | null;
};

type QueryListRawRow = {
  query_id: number | string;
  [QUERY_LIST_LATEST_QUERY_DATA_RETRIEVED_AT_ALIAS]?: Date | string | null;
  [QUERY_LIST_LATEST_QUERY_DATA_RUNTIME_ALIAS]?: number | string | null;
};

function isQuerySafe(options: Record<string, unknown>) {
  const parameters = Array.isArray(options.parameters)
    ? options.parameters
    : [];

  return !parameters.some((parameter) => {
    if (!parameter || typeof parameter !== 'object') {
      return false;
    }

    const typedParameter = parameter as Record<string, unknown>;
    return typedParameter.type === 'text';
  });
}

export function isAdminUser(user: Pick<AuthenticatedUser, 'roles'>) {
  return user.roles.includes('admin');
}

export function canViewDraftQuery(
  user: Pick<AuthenticatedUser, 'id' | 'roles'>,
  ownerId: number,
) {
  return isAdminUser(user) || user.id === ownerId;
}

export function canEditOwnedQuery(
  user: Pick<AuthenticatedUser, 'id' | 'permissions' | 'roles'>,
  ownerId: number,
) {
  return (
    isAdminUser(user) ||
    (user.permissions.includes('edit_query') && user.id === ownerId)
  );
}

export function canScheduleOwnedQuery(
  user: Pick<AuthenticatedUser, 'id' | 'permissions' | 'roles'>,
  ownerId: number,
) {
  return (
    isAdminUser(user) ||
    (user.permissions.includes('schedule_query') && user.id === ownerId)
  );
}

export function canForkQuery(
  user: Pick<AuthenticatedUser, 'permissions' | 'roles'>,
) {
  return isAdminUser(user) || user.permissions.includes('create_query');
}

export function canPersistLatestQueryData(
  user: Pick<AuthenticatedUser, 'id' | 'roles'>,
  ownerId: number,
) {
  return isAdminUser(user) || user.id === ownerId;
}

export function getQueryListOrderDefinition(
  normalizedOrder: string,
): QueryListOrderDefinition | null {
  switch (normalizedOrder) {
    case 'name':
      return {
        alias: 'query_order_name',
        orderBy: 'query_order_name',
        select: 'LOWER(query.name)',
      };
    case 'created_at':
      return {
        orderBy: 'query.createdAt',
      };
    case 'created_by':
      return {
        alias: 'query_order_created_by',
        orderBy: 'query_order_created_by',
        select: 'LOWER(user.name)',
      };
    case 'executed_at':
      return {
        nulls: 'NULLS LAST',
        orderBy: 'latestQueryData.retrievedAt',
      };
    case 'schedule':
      return {
        alias: 'query_order_schedule',
        orderBy: 'query_order_schedule',
        select: "COALESCE((query.schedule::jsonb ->> 'interval')::int, 0)",
      };
    default:
      return null;
  }
}

function normalizeSummaryDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === 'string' ? value : null;
}

function normalizeSummaryRuntime(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function buildQueryListLatestQueryDataSummaryByQueryId(
  rawRows: QueryListRawRow[],
) {
  const summaries = new Map<number, QueryListLatestQueryDataSummary>();

  rawRows.forEach((row) => {
    const queryId = Number(row.query_id);

    if (!Number.isInteger(queryId) || queryId <= 0) {
      return;
    }

    summaries.set(queryId, {
      retrievedAt: normalizeSummaryDate(
        row[QUERY_LIST_LATEST_QUERY_DATA_RETRIEVED_AT_ALIAS],
      ),
      runtime: normalizeSummaryRuntime(
        row[QUERY_LIST_LATEST_QUERY_DATA_RUNTIME_ALIAS],
      ),
    });
  });

  return summaries;
}

export function buildArchivedQueryDetailResponse<
  T extends {
    is_archived: boolean;
    last_modified_by_id: number | null;
    schedule: Record<string, unknown> | null;
    updated_at: string;
    version: number;
  },
>(
  queryDetail: T,
  savedQuery: Pick<QueryEntity, 'lastModifiedById' | 'updatedAt' | 'version'>,
) {
  return {
    ...queryDetail,
    is_archived: true,
    last_modified_by_id: savedQuery.lastModifiedById,
    schedule: null,
    updated_at: savedQuery.updatedAt.toISOString(),
    version: savedQuery.version,
  };
}

@Injectable()
export class QueryRepository {
  constructor(
    @InjectRepository(QueryEntity)
    private readonly queryRepository: Repository<QueryEntity>,
    @InjectRepository(DataSourceEntity)
    private readonly dataSourceRepository: Repository<DataSourceEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    @InjectRepository(QueryResultEntity)
    private readonly queryResultRepository: Repository<QueryResultEntity>,
    @InjectRepository(VisualizationEntity)
    private readonly visualizationRepository: Repository<VisualizationEntity>,
    @InjectRepository(WidgetEntity)
    private readonly widgetRepository: Repository<WidgetEntity>,
    @InjectRepository(AlertEntity)
    private readonly alertRepository: Repository<AlertEntity>,
    @InjectRepository(AlertSubscriptionEntity)
    private readonly alertSubscriptionRepository: Repository<AlertSubscriptionEntity>,
    @InjectRepository(FavoriteEntity)
    private readonly favoriteRepository: Repository<FavoriteEntity>,
    private readonly currentUserService: CurrentUserService,
  ) {}

  async getQueries(
    user: AuthenticatedUser,
    view: QueryListView,
    params: QueryListQueryDto,
  ) {
    if (user.groupIds.length === 0) {
      return {
        count: 0,
        page: params.page,
        page_size: params.page_size,
        results: [],
      };
    }

    const organization = await this.organizationRepository.findOne({
      select: { id: true, settings: true },
      where: { id: user.orgId },
    });
    const organizationSettings = normalizeOrganizationSettings(
      organization?.settings,
    );
    const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
      user,
      {
        permission: 'view_query',
      },
    );

    if (accessibleDataSourceIds.length === 0) {
      return {
        count: 0,
        page: params.page,
        page_size: params.page_size,
        results: [],
      };
    }

    const queryBuilder = this.createAccessibleQueriesQueryBuilder(
      user,
      view,
      accessibleDataSourceIds,
      'summary',
    );
    const countQueryBuilder = this.createAccessibleQueriesQueryBuilder(
      user,
      view,
      accessibleDataSourceIds,
      'none',
    );
    const searchMode = this.applyFilters(
      queryBuilder,
      params,
      organizationSettings.multi_byte_search_enabled,
    );
    this.applyFilters(
      countQueryBuilder,
      params,
      organizationSettings.multi_byte_search_enabled,
    );

    this.applyOrdering(queryBuilder, params.order, searchMode);

    queryBuilder
      .skip((params.page - 1) * params.page_size)
      .take(params.page_size);

    const [{ entities, raw }, count] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      countQueryBuilder.getCount(),
    ]);
    const latestQueryDataSummaryByQueryId =
      buildQueryListLatestQueryDataSummaryByQueryId(raw as QueryListRawRow[]);

    return {
      count,
      page: params.page,
      page_size: params.page_size,
      results: entities.map((query) =>
        this.serializeQuery(
          query,
          latestQueryDataSummaryByQueryId.get(query.id),
        ),
      ),
    };
  }

  async getQueryTags(user: AuthenticatedUser) {
    if (user.groupIds.length === 0) {
      return { tags: [] };
    }

    const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
      user,
      {
        permission: 'view_query',
      },
    );

    if (accessibleDataSourceIds.length === 0) {
      return { tags: [] };
    }

    const visibleIds = await this.createAccessibleQueriesQueryBuilder(
      user,
      'all',
      accessibleDataSourceIds,
      'none',
    )
      .select('query.id', 'id')
      .getRawMany<{ id: number }>();

    const queryIds = visibleIds.map((row) => Number(row.id)).filter(Boolean);

    if (queryIds.length === 0) {
      return { tags: [] };
    }

    const tagRows = await this.queryRepository.query<
      Array<{ count: number | string; name: string }>
    >(
      `
        SELECT tag.name AS name, COUNT(*)::int AS count
        FROM queries AS query
        CROSS JOIN LATERAL unnest(query.tags) AS tag(name)
        WHERE query.id = ANY($1::int[])
        GROUP BY tag.name
        ORDER BY COUNT(*) DESC, tag.name ASC
      `,
      [queryIds],
    );

    return {
      tags: tagRows.map((row) => ({
        name: row.name,
        count: Number(row.count),
      })),
    };
  }

  async getQueryDetail(user: AuthenticatedUser, queryId: number) {
    const accessibleDataSourceIds =
      await this.getAccessibleQueryDetailDataSourceIds(user);

    if (accessibleDataSourceIds.length === 0) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    const query = await this.createAccessibleQueriesQueryBuilder(
      user,
      'all',
      accessibleDataSourceIds,
    )
      .andWhere('query.id = :queryId', { queryId })
      .getOne();

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    return this.serializeQueryDetail(query);
  }

  async getAdminOutdatedQueriesByIds(queryIds: number[]) {
    if (queryIds.length === 0) {
      return [];
    }

    const queries = await this.queryRepository.find({
      where: {
        id: In(queryIds),
      },
      select: {
        id: true,
        name: true,
        schedule: true,
        isArchived: true,
        isDraft: true,
        tags: true,
        createdAt: true,
        user: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
        },
        latestQueryData: {
          id: true,
          retrievedAt: true,
          runtime: true,
        },
      },
      relations: {
        latestQueryData: true,
        user: true,
      },
      order: {
        createdAt: 'DESC',
        id: 'DESC',
      },
    });

    return queries.map((query) => this.serializeAdminOutdatedQuery(query));
  }

  async favoriteQuery(user: AuthenticatedUser, queryId: number) {
    await this.getQueryDetail(user, queryId);

    const existingFavorite = await this.favoriteRepository.findOne({
      select: { id: true },
      where: {
        objectType: 'Query',
        objectId: queryId,
        orgId: user.orgId,
        userId: user.id,
      },
    });

    if (!existingFavorite) {
      await this.favoriteRepository.save(
        this.favoriteRepository.create({
          objectType: 'Query',
          objectId: queryId,
          orgId: user.orgId,
          userId: user.id,
        }),
      );
    }

    return this.getQueryDetail(user, queryId);
  }

  async unfavoriteQuery(user: AuthenticatedUser, queryId: number) {
    await this.getQueryDetail(user, queryId);

    await this.favoriteRepository.delete({
      objectType: 'Query',
      objectId: queryId,
      orgId: user.orgId,
      userId: user.id,
    });

    return this.getQueryDetail(user, queryId);
  }

  async createQuery(user: AuthenticatedUser, payload: SaveQueryRequestDto) {
    const dataSource = await this.getAccessibleDataSourceOrThrow(
      user,
      payload.data_source_id,
      {
        requireWriteAccess: true,
      },
    );
    const normalizedTags = this.normalizeTags(payload.tags);
    const queryText = payload.query;

    if (!queryText.trim()) {
      throw new BadRequestException('query is required.');
    }

    const query = this.queryRepository.create({
      orgId: user.orgId,
      dataSourceId: dataSource.id,
      latestQueryDataId: payload.latest_query_data_id ?? null,
      name: payload.name.trim(),
      description: this.normalizeOptionalString(payload.description),
      queryText,
      queryHash: this.generateQueryHash(queryText),
      apiKey: this.generateApiKey(),
      userId: user.id,
      lastModifiedById: user.id,
      isArchived: false,
      isDraft: payload.is_draft ?? true,
      schedule: resetQueryScheduleLastExecute(payload.schedule ?? null),
      scheduleFailures: 0,
      options: payload.options ?? {},
      searchVector: null,
      tags: normalizedTags,
      version: 1,
    });

    const savedQuery = await this.queryRepository.save(query);
    await this.visualizationRepository.save(
      this.visualizationRepository.create({
        description: '',
        name: 'Table',
        options: '{}',
        queryId: savedQuery.id,
        type: 'TABLE',
      }),
    );

    return this.getQueryDetail(user, savedQuery.id);
  }

  async updateQuery(
    user: AuthenticatedUser,
    queryId: number,
    payload: SaveQueryRequestDto,
  ) {
    const query = await this.queryRepository.findOneBy({
      id: queryId,
      orgId: user.orgId,
    });

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    await this.ensureCanModifyQuery(user, query);

    if (payload.version !== undefined && payload.version !== query.version) {
      throw new ConflictException('Query has been modified by another user.');
    }

    const dataSource = await this.getAccessibleDataSourceOrThrow(
      user,
      payload.data_source_id,
      {
        requireWriteAccess: true,
      },
    );
    const queryText = payload.query;

    if (!queryText.trim()) {
      throw new BadRequestException('query is required.');
    }

    const didDataSourceChange = query.dataSourceId !== dataSource.id;

    query.dataSourceId = dataSource.id;
    query.name = payload.name.trim();
    query.description = this.normalizeOptionalString(payload.description);
    query.queryText = queryText;
    query.queryHash = this.generateQueryHash(queryText);
    query.lastModifiedById = user.id;
    query.schedule = payload.schedule ?? null;
    query.options = payload.options ?? {};
    query.tags = this.normalizeTags(payload.tags);
    query.isDraft = payload.is_draft ?? query.isDraft;
    query.version += 1;

    if (didDataSourceChange) {
      query.latestQueryDataId = null;
    } else {
      query.latestQueryDataId =
        payload.latest_query_data_id ?? query.latestQueryDataId;
    }

    await this.queryRepository.save(query);

    return this.getQueryDetail(user, query.id);
  }

  async updateQuerySchedule(
    user: AuthenticatedUser,
    queryId: number,
    schedule: Record<string, unknown> | null,
  ) {
    const query = await this.queryRepository.findOneBy({
      id: queryId,
      orgId: user.orgId,
    });

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    await this.ensureCanScheduleQuery(user, query);

    query.schedule = resetQueryScheduleLastExecute(schedule);
    query.lastModifiedById = user.id;
    query.version += 1;

    await this.queryRepository.save(query);

    return this.getQueryDetail(user, query.id);
  }

  async archiveQuery(user: AuthenticatedUser, queryId: number) {
    const query = await this.queryRepository.findOneBy({
      id: queryId,
      orgId: user.orgId,
    });

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    await this.ensureCanModifyQuery(user, query);
    const archivedQueryDetail = await this.getQueryDetail(user, query.id);

    const visualizations = await this.visualizationRepository.find({
      where: { queryId: query.id },
      select: { id: true },
    });
    const visualizationIds = visualizations.map((item) => item.id);

    if (visualizationIds.length > 0) {
      await this.widgetRepository
        .createQueryBuilder()
        .delete()
        .from(WidgetEntity)
        .where('visualization_id IN (:...visualizationIds)', {
          visualizationIds,
        })
        .execute();
    }

    const alerts = await this.alertRepository.find({
      where: { queryId: query.id },
      select: { id: true },
    });
    const alertIds = alerts.map((item) => item.id);

    if (alertIds.length > 0) {
      await this.alertSubscriptionRepository
        .createQueryBuilder()
        .delete()
        .from(AlertSubscriptionEntity)
        .where('alert_id IN (:...alertIds)', { alertIds })
        .execute();

      await this.alertRepository
        .createQueryBuilder()
        .delete()
        .from(AlertEntity)
        .where('id IN (:...alertIds)', { alertIds })
        .execute();
    }

    query.isArchived = true;
    query.schedule = null;
    query.lastModifiedById = user.id;
    query.version += 1;

    await this.queryRepository.save(query);

    return buildArchivedQueryDetailResponse(archivedQueryDetail, query);
  }

  async regenerateApiKey(user: AuthenticatedUser, queryId: number) {
    const query = await this.queryRepository.findOneBy({
      id: queryId,
      orgId: user.orgId,
    });

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    await this.ensureCanModifyQuery(user, query);

    query.apiKey = this.generateApiKey();
    query.lastModifiedById = user.id;
    query.version += 1;

    await this.queryRepository.save(query);

    return this.getQueryDetail(user, query.id);
  }

  async forkQuery(user: AuthenticatedUser, queryId: number) {
    const query = await this.queryRepository.findOneBy({
      id: queryId,
      orgId: user.orgId,
    });

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    if (!query.dataSourceId) {
      throw new BadRequestException('데이터 소스가 설정되지 않은 쿼리입니다.');
    }

    await this.ensureCanForkQuery(user, query);

    const visualizations = await this.visualizationRepository.find({
      where: { queryId: query.id },
      order: { id: 'ASC' },
    });

    const forkedQuery = await this.queryRepository.save(
      this.queryRepository.create({
        orgId: user.orgId,
        dataSourceId: query.dataSourceId,
        latestQueryDataId: query.latestQueryDataId,
        name: `Copy of (#${query.id}) ${query.name}`,
        description: query.description,
        queryText: query.queryText,
        queryHash: query.queryHash,
        apiKey: this.generateApiKey(),
        userId: user.id,
        lastModifiedById: user.id,
        isArchived: false,
        isDraft: true,
        schedule: null,
        scheduleFailures: 0,
        options: query.options ?? {},
        searchVector: null,
        tags: query.tags ?? [],
        version: 1,
      }),
    );

    if (visualizations.length > 0) {
      await this.visualizationRepository.save(
        visualizations.map((visualization) =>
          this.visualizationRepository.create({
            queryId: forkedQuery.id,
            type: visualization.type,
            name: visualization.name,
            description: visualization.description,
            options: visualization.options,
          }),
        ),
      );
    }

    return this.getQueryDetail(user, forkedQuery.id);
  }

  async getPublicQueryResult(queryId: number, apiKey: string) {
    /* isArchived 확인과 latestQueryData 직렬화가 목적이므로,
       QueryEntity는 최소 컬럼만, QueryResultEntity는 직렬화에 필요한 전체 컬럼 로딩 */
    const query = await this.queryRepository.findOne({
      select: {
        id: true,
        isArchived: true,
        latestQueryDataId: true,
        latestQueryData: {
          id: true,
          dataSourceId: true,
          queryText: true,
          data: true,
          runtime: true,
          retrievedAt: true,
        },
      },
      where: {
        id: queryId,
        apiKey,
      },
      relations: {
        latestQueryData: true,
      },
    });

    if (!query || query.isArchived || !query.latestQueryData) {
      throw new NotFoundException('쿼리 결과를 찾을 수 없습니다.');
    }

    return {
      query_result: this.serializeQueryResult(query.latestQueryData),
    };
  }

  async getQueryResultById(user: AuthenticatedUser, queryResultId: number) {
    const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
      user,
      {
        permission: 'view_query',
      },
    );

    if (accessibleDataSourceIds.length === 0) {
      throw new NotFoundException('쿼리 결과를 찾을 수 없습니다.');
    }

    const queryResult = await this.queryResultRepository.findOne({
      select: {
        id: true,
        dataSourceId: true,
        queryText: true,
        data: true,
        runtime: true,
        retrievedAt: true,
      },
      where: {
        id: queryResultId,
        orgId: user.orgId,
        dataSourceId: In(accessibleDataSourceIds),
      },
    });

    if (!queryResult) {
      throw new NotFoundException('쿼리 결과를 찾을 수 없습니다.');
    }

    return this.serializeQueryResult(queryResult);
  }

  async getAccessibleDataSource(
    user: AuthenticatedUser,
    dataSourceId: number,
    options?: {
      permission?: string;
      requireWriteAccess?: boolean;
    },
  ) {
    return this.getAccessibleDataSourceOrThrow(user, dataSourceId, options);
  }

  async canAccessDataSource(
    user: AuthenticatedUser,
    dataSourceId: number,
    options?: {
      permission?: string;
      requireWriteAccess?: boolean;
    },
  ) {
    const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
      user,
      options,
    );

    return accessibleDataSourceIds.includes(dataSourceId);
  }

  async resolvePersistedExecutionTargetQueryId(
    user: AuthenticatedUser,
    queryId: number | null | undefined,
    dataSourceId: number,
  ) {
    if (!queryId) {
      return null;
    }

    const query = await this.queryRepository.findOne({
      select: {
        id: true,
        dataSourceId: true,
        userId: true,
      },
      where: {
        id: queryId,
        orgId: user.orgId,
      },
    });

    if (!query) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    if (!canPersistLatestQueryData(user, query.userId)) {
      throw new ForbiddenException(
        '다른 사용자가 작성한 쿼리 결과는 갱신할 수 없습니다.',
      );
    }

    if (query.dataSourceId !== dataSourceId) {
      throw new ForbiddenException(
        '다른 데이터 소스 결과를 이 쿼리에 저장할 수 없습니다.',
      );
    }

    return query.id;
  }

  async storeExecutionResult(params: {
    data: {
      columns: Array<{
        friendly_name: string;
        name: string;
        type: string | null;
      }>;
      rows: Array<Record<string, unknown>>;
      truncated: boolean;
    };
    dataSourceId: number;
    orgId: number;
    queryId?: number | null;
    queryText: string;
    runtime: number;
  }) {
    const queryHash = this.generateQueryHash(params.queryText);
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

    if (params.queryId) {
      await this.queryRepository.update(
        { id: params.queryId, orgId: params.orgId },
        {
          latestQueryDataId: result.id,
        },
      );
    }

    return {
      query_result: {
        id: result.id,
        data_source_id: result.dataSourceId,
        query: result.queryText,
        data: params.data,
        runtime: result.runtime,
        retrieved_at: result.retrievedAt.toISOString(),
      },
    };
  }

  private createAccessibleQueriesQueryBuilder(
    user: AuthenticatedUser,
    view: QueryListView,
    accessibleDataSourceIds: number[],
    relationMode: QueryRelationMode = 'full',
  ) {
    const shouldJoinFavorite = relationMode !== 'none' || view === 'favorites';
    const queryBuilder = this.queryRepository
      .createQueryBuilder('query')
      .where('query.org_id = :orgId', { orgId: user.orgId })
      .andWhere('query.data_source_id IN (:...accessibleDataSourceIds)', {
        accessibleDataSourceIds,
      })
      .andWhere('query.is_archived = :isArchived', {
        isArchived: view === 'archive',
      });

    if (shouldJoinFavorite) {
      queryBuilder.leftJoinAndMapOne(
        'query.favorite',
        FavoriteEntity,
        'favorite',
        [
          "favorite.object_type = 'Query'",
          'favorite.object_id = query.id',
          'favorite.user_id = :favoriteUserId',
          'favorite.org_id = :favoriteOrgId',
        ].join(' AND '),
        {
          favoriteOrgId: user.orgId,
          favoriteUserId: user.id,
        },
      );
    }

    if (relationMode !== 'none') {
      /* UserEntity에서 apiKey를 제외하고 직렬화에 필요한 컬럼만 로딩 */
      const userSelectColumns = [
        'user.id',
        'user.name',
        'user.email',
        'user.profileImageUrl',
        'user.groupIds',
        'user.updatedAt',
        'user.createdAt',
        'user.disabledAt',
        'user.details',
        'user.passwordHash',
      ];
      const lastModifiedBySelectColumns = userSelectColumns.map((col) =>
        col.replace('user.', 'lastModifiedBy.'),
      );
      queryBuilder
        .leftJoin('query.user', 'user')
        .addSelect(userSelectColumns)
        .leftJoin('query.lastModifiedBy', 'lastModifiedBy')
        .addSelect(lastModifiedBySelectColumns);
    }

    if (relationMode === 'full') {
      queryBuilder.leftJoinAndSelect(
        'query.latestQueryData',
        'latestQueryData',
      );
    }

    if (relationMode === 'summary') {
      // Query list only needs execution metadata. Avoid selecting the entire
      // query_results.data payload, which can be large enough to dominate the
      // request time even for small list responses.
      queryBuilder
        .leftJoin('query.latestQueryData', 'latestQueryData')
        .addSelect(
          'latestQueryData.retrievedAt',
          QUERY_LIST_LATEST_QUERY_DATA_RETRIEVED_AT_ALIAS,
        )
        .addSelect(
          'latestQueryData.runtime',
          QUERY_LIST_LATEST_QUERY_DATA_RUNTIME_ALIAS,
        );
    }

    if (!isAdminUser(user)) {
      queryBuilder.andWhere(
        '(query.is_draft = false OR query.user_id = :draftViewerId)',
        {
          draftViewerId: user.id,
        },
      );
    }

    if (view === 'my') {
      queryBuilder.andWhere('query.user_id = :userId', { userId: user.id });
    }

    if (view === 'favorites') {
      queryBuilder.andWhere('favorite.id IS NOT NULL');
    }

    return queryBuilder;
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<QueryEntity>,
    params: QueryListQueryDto,
    multiByteSearchEnabled: boolean,
  ): SearchMode {
    if (params.tags && params.tags.length > 0) {
      queryBuilder.andWhere(
        'COALESCE(query.tags, ARRAY[]::text[]) @> ARRAY[:...tags]::text[]',
        {
          tags: params.tags,
        },
      );
    }

    const searchTerm = params.q?.trim();

    if (!searchTerm) {
      return 'default';
    }

    const searchVector = "COALESCE(query.search_vector, ''::tsvector)";
    const searchQuery = "plainto_tsquery('pg_catalog.simple', :searchTerm)";
    const searchPattern = `%${searchTerm}%`;

    if (multiByteSearchEnabled) {
      queryBuilder.andWhere(
        "(query.name ILIKE :searchPattern OR COALESCE(query.description, '') ILIKE :searchPattern)",
        {
          searchPattern,
        },
      );

      return 'ilike';
    }

    queryBuilder
      .andWhere(
        `(${searchVector} @@ ${searchQuery} OR query.name ILIKE :searchPattern OR COALESCE(query.description, '') ILIKE :searchPattern)`,
        {
          searchPattern,
          searchTerm,
        },
      )
      .addSelect(`ts_rank_cd(${searchVector}, ${searchQuery})`, 'search_rank');

    return 'ranked';
  }

  private applyOrdering(
    queryBuilder: SelectQueryBuilder<QueryEntity>,
    order: QueryListQueryDto['order'],
    searchMode: SearchMode,
  ) {
    if (!order) {
      if (searchMode === 'ranked') {
        queryBuilder
          .orderBy('search_rank', 'DESC')
          .addOrderBy('query.createdAt', 'DESC');
        return;
      }

      queryBuilder.orderBy('query.createdAt', 'DESC');
      return;
    }

    const direction = order.startsWith('-') ? 'DESC' : 'ASC';
    const normalizedOrder = order.replace(/^-/, '');

    const orderDefinition = getQueryListOrderDefinition(normalizedOrder);

    if (!orderDefinition) {
      queryBuilder.orderBy('query.createdAt', 'DESC');
      queryBuilder.addOrderBy('query.id', 'DESC');
      return;
    }

    if (orderDefinition.select && orderDefinition.alias) {
      queryBuilder.addSelect(orderDefinition.select, orderDefinition.alias);
    }

    queryBuilder.orderBy(
      orderDefinition.orderBy,
      direction,
      orderDefinition.nulls,
    );
    queryBuilder.addOrderBy('query.id', 'DESC');
  }

  private serializeQuery(
    query: QueryEntity,
    latestQueryDataSummary?: QueryListLatestQueryDataSummary,
  ) {
    const options =
      query.options && typeof query.options === 'object' ? query.options : {};
    const retrievedAt =
      latestQueryDataSummary?.retrievedAt ??
      query.latestQueryData?.retrievedAt.toISOString() ??
      null;
    const runtime =
      latestQueryDataSummary?.runtime ?? query.latestQueryData?.runtime ?? null;
    const serializeUser = (
      user: QueryEntity['user'] | QueryEntity['lastModifiedBy'] | null,
    ) =>
      user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            profile_image_url: this.currentUserService.getProfileImageUrl(user),
            groups: user.groupIds ?? [],
            updated_at: user.updatedAt.toISOString(),
            created_at: user.createdAt.toISOString(),
            disabled_at: user.disabledAt?.toISOString() ?? null,
            is_disabled: user.disabledAt !== null,
            is_invitation_pending: isUserInvitationPending(user.details),
            is_email_verified: isUserEmailVerified(user.details),
            auth_type: user.passwordHash ? 'password' : 'external',
          }
        : null;

    return {
      id: query.id,
      latest_query_data_id: query.latestQueryDataId,
      name: query.name,
      description: query.description,
      query: query.queryText,
      query_hash: query.queryHash,
      schedule: query.schedule,
      api_key: query.apiKey,
      is_archived: query.isArchived,
      is_draft: query.isDraft,
      updated_at: query.updatedAt.toISOString(),
      created_at: query.createdAt.toISOString(),
      data_source_id: query.dataSourceId,
      options,
      version: query.version,
      tags: query.tags ?? [],
      is_safe: isQuerySafe(options),
      user: serializeUser(query.user),
      last_modified_by: serializeUser(query.lastModifiedBy),
      last_modified_by_id: query.lastModifiedById,
      retrieved_at: retrievedAt,
      runtime,
      is_favorite: Boolean(
        (query as QueryEntity & { favorite?: FavoriteEntity }).favorite,
      ),
    };
  }

  private serializeAdminOutdatedQuery(
    query: Pick<
      QueryEntity,
      | 'id'
      | 'name'
      | 'schedule'
      | 'isArchived'
      | 'isDraft'
      | 'tags'
      | 'createdAt'
    > & {
      latestQueryData?: Pick<
        QueryResultEntity,
        'retrievedAt' | 'runtime'
      > | null;
      user?: Pick<
        UserEntity,
        'id' | 'name' | 'email' | 'profileImageUrl'
      > | null;
    },
  ) {
    return {
      id: query.id,
      name: query.name,
      schedule: query.schedule,
      is_archived: query.isArchived,
      is_draft: query.isDraft,
      tags: query.tags ?? [],
      created_at: query.createdAt.toISOString(),
      user: query.user
        ? {
            id: query.user.id,
            name: query.user.name,
            profile_image_url: this.currentUserService.getProfileImageUrl(
              query.user as UserEntity,
            ),
          }
        : null,
      retrieved_at: query.latestQueryData?.retrievedAt?.toISOString() ?? null,
      runtime: query.latestQueryData?.runtime ?? null,
    };
  }

  private async serializeQueryDetail(query: QueryEntity) {
    const baseQuery = this.serializeQuery(query);
    const visualizations = await this.visualizationRepository.find({
      where: {
        queryId: query.id,
      },
      order: {
        id: 'ASC',
      },
    });

    return {
      ...baseQuery,
      latest_query_data: query.latestQueryData
        ? this.serializeQueryResult(query.latestQueryData)
        : null,
      visualizations: visualizations.map((visualization) => ({
        id: visualization.id,
        type: visualization.type,
        query_id: visualization.queryId,
        name: visualization.name,
        description: visualization.description,
        options: this.parseVisualizationOptions(visualization.options),
        updated_at: visualization.updatedAt.toISOString(),
        created_at: visualization.createdAt.toISOString(),
      })),
    };
  }

  private serializeQueryResult(queryResult: QueryResultEntity) {
    return {
      id: queryResult.id,
      data_source_id: queryResult.dataSourceId,
      query: queryResult.queryText,
      data: queryResult.data as {
        columns: Array<{
          friendly_name: string;
          name: string;
          type: string | null;
        }>;
        limit?: {
          applied_limit: number;
          did_apply_default_limit: boolean;
          did_cap_limit: boolean;
          requested_limit: number | null;
        };
        rows: Array<Record<string, unknown>>;
        truncated: boolean;
      },
      runtime: queryResult.runtime,
      retrieved_at: queryResult.retrievedAt.toISOString(),
    };
  }

  private async getAccessibleDataSourceOrThrow(
    user: AuthenticatedUser,
    dataSourceId: number,
    options?: {
      permission?: string;
      requireWriteAccess?: boolean;
    },
  ) {
    const accessibleDataSourceIds = await this.getAccessibleDataSourceIds(
      user,
      options,
    );

    if (!accessibleDataSourceIds.length) {
      throw new ForbiddenException('사용 가능한 데이터 소스가 없습니다.');
    }

    /* 접근 가능 여부 확인이 목적이므로 id만 로딩 (encryptedOptions 등 제외) */
    const dataSource = await this.dataSourceRepository
      .createQueryBuilder('data_source')
      .select('data_source.id')
      .where('data_source.id = :dataSourceId', { dataSourceId })
      .andWhere('data_source.org_id = :orgId', { orgId: user.orgId })
      .andWhere('data_source.id IN (:...accessibleDataSourceIds)', {
        accessibleDataSourceIds,
      })
      .getOne();

    if (!dataSource) {
      throw new NotFoundException('데이터 소스를 찾을 수 없습니다.');
    }

    return dataSource;
  }

  private async ensureCanModifyQuery(
    user: AuthenticatedUser,
    query: QueryEntity,
  ) {
    if (!canEditOwnedQuery(user, query.userId)) {
      throw new ForbiddenException('이 쿼리를 수정할 권한이 없습니다.');
    }

    if (!query.dataSourceId) {
      throw new ForbiddenException('이 쿼리를 수정할 권한이 없습니다.');
    }

    const hasAccess = await this.canAccessDataSource(user, query.dataSourceId, {
      requireWriteAccess: true,
    });

    if (!hasAccess) {
      throw new ForbiddenException('이 쿼리를 수정할 권한이 없습니다.');
    }
  }

  private async ensureCanScheduleQuery(
    user: AuthenticatedUser,
    query: QueryEntity,
  ) {
    if (!canScheduleOwnedQuery(user, query.userId)) {
      throw new ForbiddenException(
        '이 쿼리의 새로고침 일정을 수정할 권한이 없습니다.',
      );
    }

    if (!query.dataSourceId) {
      throw new ForbiddenException(
        '이 쿼리의 새로고침 일정을 수정할 권한이 없습니다.',
      );
    }

    const hasAccess = await this.canAccessDataSource(user, query.dataSourceId, {
      permission: 'execute_query',
      requireWriteAccess: true,
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        '이 쿼리의 새로고침 일정을 수정할 권한이 없습니다.',
      );
    }
  }

  private async ensureCanForkQuery(
    user: AuthenticatedUser,
    query: QueryEntity,
  ) {
    if (!canForkQuery(user)) {
      throw new ForbiddenException('이 쿼리를 복제할 권한이 없습니다.');
    }

    if (query.isDraft && !canViewDraftQuery(user, query.userId)) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    const dataSourceId = query.dataSourceId;

    if (!dataSourceId) {
      throw new BadRequestException('데이터 소스가 설정되지 않은 쿼리입니다.');
    }

    const hasViewAccess = await this.canAccessDataSource(
      user,
      dataSourceId,
      {
        permission: 'view_query',
      },
    );

    if (!hasViewAccess) {
      throw new NotFoundException('쿼리를 찾을 수 없습니다.');
    }

    await this.getAccessibleDataSourceOrThrow(user, dataSourceId, {
      requireWriteAccess: true,
    });
  }

  private async getAccessibleQueryDetailDataSourceIds(user: AuthenticatedUser) {
    const [viewableDataSourceIds, editableDataSourceIds] = await Promise.all([
      this.getAccessibleDataSourceIds(user, {
        permission: 'view_query',
      }),
      isAdminUser(user) || user.permissions.includes('edit_query')
        ? this.getAccessibleDataSourceIds(user, {
            requireWriteAccess: true,
          })
        : Promise.resolve([]),
    ]);

    return Array.from(
      new Set([...viewableDataSourceIds, ...editableDataSourceIds]),
    );
  }

  private async getAccessibleDataSourceIds(
    user: AuthenticatedUser,
    options?: {
      permission?: string;
      requireWriteAccess?: boolean;
    },
  ) {
    if (user.roles.includes('admin')) {
      const rows = await this.dataSourceRepository.find({
        select: {
          id: true,
        },
        where: {
          orgId: user.orgId,
        },
      });

      return rows.map((dataSource) => dataSource.id);
    }

    if (!user.groupIds.length) {
      return [];
    }

    const queryBuilder = this.dataSourceRepository
      .createQueryBuilder('data_source')
      .select('data_source.id', 'id')
      .distinct(true)
      .innerJoin(
        'data_source_groups',
        'data_source_group',
        'data_source_group.data_source_id = data_source.id',
      )
      .innerJoin(
        'groups',
        'access_group',
        'access_group.id = data_source_group.group_id AND access_group.org_id = data_source.org_id',
      )
      .where('data_source.org_id = :orgId', {
        orgId: user.orgId,
      })
      .andWhere('data_source_group.group_id IN (:...groupIds)', {
        groupIds: user.groupIds,
      });

    if (options?.permission) {
      queryBuilder.andWhere(
        ':permission = ANY(COALESCE(access_group.permissions, ARRAY[]::varchar[]))',
        {
          permission: options.permission,
        },
      );
    }

    if (options?.requireWriteAccess) {
      queryBuilder.andWhere('data_source_group.view_only = false');
    }

    const rows = await queryBuilder.getRawMany<{ id: number | string }>();

    return rows
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id) && id > 0);
  }

  private normalizeTags(tags: string[]) {
    return Array.from(
      new Set(tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)),
    );
  }

  private normalizeOptionalString(value?: string | null) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : null;
  }

  private generateQueryHash(queryText: string) {
    return createHash('md5').update(queryText).digest('hex');
  }

  private generateApiKey() {
    return randomBytes(20).toString('hex');
  }

  private parseVisualizationOptions(options: string): Record<string, unknown> {
    if (!options) {
      return {};
    }

    try {
      const parsed = JSON.parse(options) as unknown;

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }

    return {};
  }
}
