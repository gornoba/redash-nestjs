import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { CurrentUserService } from '@app/common/current-user/current-user.service';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { resetQueryScheduleLastExecute } from '@app/common/query/query-schedule.util';
import { DashboardEntity } from '@app/database/entities/dashboard.entity';
import { FavoriteEntity } from '@app/database/entities/favorite.entity';
import { QueryEntity } from '@app/database/entities/query.entity';
import { VisualizationEntity } from '@app/database/entities/visualization.entity';
import { WidgetEntity } from '@app/database/entities/widget.entity';
import type { CreateDashboardRequestDto } from '../dto/create-dashboard.dto';
import type { DashboardListQueryDto } from '../dto/dashboard-list-query.schema';
import type { UpdateDashboardRequestDto } from '../dto/update-dashboard.dto';
import type {
  CreateWidgetRequestDto,
  UpdateWidgetRequestDto,
} from '../dto/widget.dto';

function serializeDashboardOptions(options: Record<string, unknown> | null) {
  return options ?? {};
}

type DashboardLayoutItem = Record<string, unknown>;

function parseDashboardLayout(layout: string | null) {
  if (!layout) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(layout);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is DashboardLayoutItem =>
        typeof item === 'object' && item !== null && !Array.isArray(item),
    );
  } catch {
    return [];
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type DashboardListView = 'all' | 'favorites' | 'my';
type DashboardListOrderDefinition = {
  alias?: string;
  orderBy: string;
  select?: string;
};

function getDashboardListOrderDefinition(
  normalizedOrder: string,
): DashboardListOrderDefinition | null {
  switch (normalizedOrder) {
    case 'name':
      return {
        alias: 'dashboard_order_name',
        orderBy: 'dashboard_order_name',
        select: 'LOWER(dashboard.name)',
      };
    case 'created_at':
      return {
        orderBy: 'dashboard.createdAt',
      };
    default:
      return null;
  }
}

const DASHBOARD_GRID_COLUMNS = 6;
const DASHBOARD_GRID_DEFAULTS = {
  autoHeight: false,
  col: 0,
  maxSizeX: 6,
  maxSizeY: 1000,
  minSizeX: 1,
  minSizeY: 1,
  row: 0,
  sizeX: 3,
  sizeY: 3,
};

type WidgetPosition = {
  autoHeight: boolean;
  col: number;
  maxSizeX: number;
  maxSizeY: number;
  minSizeX: number;
  minSizeY: number;
  row: number;
  sizeX: number;
  sizeY: number;
};

type WidgetOptions = Record<string, unknown> & {
  position: WidgetPosition;
};

type DashboardRefreshQuery = {
  dataSourceId: number;
  orgId: number;
  queryId: number;
  queryText: string;
};

export function canRefreshDashboardQuery(
  user: Pick<AuthenticatedUser, 'id' | 'roles'>,
  ownerId: number,
) {
  return user.roles.includes('admin') || user.id === ownerId;
}

function getFiniteInteger(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  return fallback;
}

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeWidgetPosition(value: unknown): WidgetPosition {
  const source =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const sizeX = Math.min(
    DASHBOARD_GRID_COLUMNS,
    Math.max(
      DASHBOARD_GRID_DEFAULTS.minSizeX,
      getFiniteInteger(source.sizeX, DASHBOARD_GRID_DEFAULTS.sizeX),
    ),
  );
  const minSizeX = Math.min(
    sizeX,
    Math.max(
      1,
      getFiniteInteger(source.minSizeX, DASHBOARD_GRID_DEFAULTS.minSizeX),
    ),
  );
  const maxSizeX = Math.max(
    sizeX,
    getFiniteInteger(source.maxSizeX, DASHBOARD_GRID_DEFAULTS.maxSizeX),
  );
  const sizeY = Math.max(
    DASHBOARD_GRID_DEFAULTS.minSizeY,
    getFiniteInteger(source.sizeY, DASHBOARD_GRID_DEFAULTS.sizeY),
  );
  const minSizeY = Math.min(
    sizeY,
    Math.max(
      1,
      getFiniteInteger(source.minSizeY, DASHBOARD_GRID_DEFAULTS.minSizeY),
    ),
  );
  const maxSizeY = Math.max(
    sizeY,
    getFiniteInteger(source.maxSizeY, DASHBOARD_GRID_DEFAULTS.maxSizeY),
  );

  return {
    autoHeight: getBoolean(
      source.autoHeight,
      DASHBOARD_GRID_DEFAULTS.autoHeight,
    ),
    col: Math.max(0, getFiniteInteger(source.col, DASHBOARD_GRID_DEFAULTS.col)),
    maxSizeX,
    maxSizeY,
    minSizeX,
    minSizeY,
    row: Math.max(0, getFiniteInteger(source.row, DASHBOARD_GRID_DEFAULTS.row)),
    sizeX,
    sizeY,
  };
}

function clampWidgetCol(position: WidgetPosition) {
  return Math.min(
    Math.max(0, position.col),
    Math.max(0, DASHBOARD_GRID_COLUMNS - position.sizeX),
  );
}

@Injectable()
export class DashboardRepository {
  constructor(
    @InjectRepository(DashboardEntity)
    private readonly dashboardRepository: Repository<DashboardEntity>,
    @InjectRepository(FavoriteEntity)
    private readonly favoriteRepository: Repository<FavoriteEntity>,
    @InjectRepository(QueryEntity)
    private readonly queryRepository: Repository<QueryEntity>,
    @InjectRepository(VisualizationEntity)
    private readonly visualizationRepository: Repository<VisualizationEntity>,
    @InjectRepository(WidgetEntity)
    private readonly widgetRepository: Repository<WidgetEntity>,
    private readonly currentUserService: CurrentUserService,
  ) {}

  async getDashboards(
    user: AuthenticatedUser,
    view: DashboardListView,
    params: DashboardListQueryDto,
  ) {
    const queryBuilder = this.createDashboardListQueryBuilder(user, view);

    this.applyDashboardFilters(queryBuilder, params);
    this.applyDashboardOrdering(queryBuilder, params.order);

    queryBuilder
      .skip((params.page - 1) * params.page_size)
      .take(params.page_size);

    const [results, count] = await queryBuilder.getManyAndCount();

    return {
      count,
      page: params.page,
      page_size: params.page_size,
      results: results.map((dashboard) => this.serializeDashboard(dashboard)),
    };
  }

  async getDashboardTags(user: AuthenticatedUser) {
    const visibleRows = await this.createDashboardListQueryBuilder(user, 'all')
      .select('dashboard.id', 'id')
      .getRawMany<{ id: number }>();

    const dashboardIds = visibleRows
      .map((row) => Number(row.id))
      .filter((value) => Number.isInteger(value));

    if (dashboardIds.length === 0) {
      return { tags: [] };
    }

    const tagRows = await this.dashboardRepository.query<
      Array<{ count: number | string; name: string }>
    >(
      `
        SELECT tag.name AS name, COUNT(*)::int AS count
        FROM dashboards AS dashboard
        CROSS JOIN LATERAL unnest(dashboard.tags) AS tag(name)
        WHERE dashboard.id = ANY($1::int[])
        GROUP BY tag.name
        ORDER BY COUNT(*) DESC, tag.name ASC
      `,
      [dashboardIds],
    );

    return {
      tags: tagRows.map((row) => ({
        name: row.name,
        count: Number(row.count),
      })),
    };
  }

  async createDashboard(
    user: AuthenticatedUser,
    payload: CreateDashboardRequestDto,
  ) {
    const slug = await this.generateDashboardSlug(user.orgId, payload.name);

    const dashboard = await this.dashboardRepository.save(
      this.dashboardRepository.create({
        dashboardFiltersEnabled: false,
        isArchived: false,
        isDraft: true,
        layout: '[]',
        name: payload.name.trim(),
        options: {},
        orgId: user.orgId,
        slug,
        tags: [],
        userId: user.id,
        version: 1,
      }),
    );

    return this.serializeDashboard({
      ...dashboard,
      user: {
        email: user.email,
        id: user.id,
        name: user.name,
      } as DashboardEntity['user'],
    });
  }

  async updateDashboard(
    user: AuthenticatedUser,
    dashboardId: number,
    payload: UpdateDashboardRequestDto,
  ) {
    const dashboard = await this.dashboardRepository.findOneBy({
      id: dashboardId,
      orgId: user.orgId,
    });

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }

    if (!this.canModifyDashboard(user, dashboard)) {
      throw new ForbiddenException('이 대시보드를 수정할 권한이 없습니다.');
    }

    if (payload.version && payload.version !== dashboard.version) {
      throw new ConflictException(
        '다른 사용자가 대시보드를 수정했습니다. 새로고침 후 다시 시도하세요.',
      );
    }

    if (payload.name && payload.name.trim() !== dashboard.name) {
      dashboard.name = payload.name.trim();
      dashboard.slug = await this.generateDashboardSlug(
        user.orgId,
        dashboard.name,
      );
    }

    if (payload.dashboard_filters_enabled !== undefined) {
      dashboard.dashboardFiltersEnabled = payload.dashboard_filters_enabled;
    }

    if (payload.is_draft !== undefined) {
      dashboard.isDraft = payload.is_draft;
    }

    if (payload.tags !== undefined) {
      dashboard.tags = [...new Set(payload.tags.map((tag) => tag.trim()))];
    }

    if (payload.options !== undefined) {
      const nextOptions = {
        ...(dashboard.options ?? {}),
        ...payload.options,
      };

      if (Object.prototype.hasOwnProperty.call(payload.options, 'refresh')) {
        nextOptions.refresh = resetQueryScheduleLastExecute(
          this.getDashboardRefreshOption(payload.options),
        );
      }

      dashboard.options = nextOptions;
    }

    dashboard.version += 1;

    await this.dashboardRepository.save(dashboard);

    return this.getDashboardListItem(user, dashboard.id);
  }

  async getDashboardDetail(user: AuthenticatedUser, dashboardId: number) {
    const dashboard = await this.findAccessibleDashboard(user, dashboardId);

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }

    /**
     * serializeDashboardWidget에서 사용하는 컬럼만 select.
     * visualization/query/latestQueryData는 직렬화에 필요한 필드만 가져온다.
     */
    const widgets = await this.widgetRepository
      .createQueryBuilder('widget')
      .leftJoin('widget.visualization', 'visualization')
      .addSelect([
        'visualization.id',
        'visualization.type',
        'visualization.queryId',
        'visualization.name',
        'visualization.description',
        'visualization.options',
      ])
      .leftJoin('visualization.query', 'query')
      .addSelect(['query.id', 'query.name'])
      .leftJoin('query.latestQueryData', 'latestQueryData')
      .addSelect([
        'latestQueryData.id',
        'latestQueryData.dataSourceId',
        'latestQueryData.queryText',
        'latestQueryData.data',
        'latestQueryData.runtime',
        'latestQueryData.retrievedAt',
      ])
      .where('widget.dashboard_id = :dashboardId', { dashboardId })
      .orderBy('widget.id', 'ASC')
      .getMany();

    return {
      ...this.serializeDashboard(dashboard),
      widgets: widgets.map((widget) => this.serializeDashboardWidget(widget)),
    };
  }

  async assertAccessibleDashboard(
    user: AuthenticatedUser,
    dashboardId: number,
  ) {
    const dashboard = await this.findAccessibleDashboard(user, dashboardId);

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }
  }

  async getDashboardRefreshQueries(
    user: AuthenticatedUser,
    dashboardId: number,
  ) {
    const dashboard = await this.findAccessibleDashboard(user, dashboardId);

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }

    /**
     * 새로고침 대상 쿼리 ID/dataSourceId/orgId/queryText만 필요.
     * visualization은 query와의 연결 경로로만 사용하므로 id만 select.
     */
    const widgets = await this.widgetRepository
      .createQueryBuilder('widget')
      .leftJoin('widget.visualization', 'visualization')
      .addSelect(['visualization.id'])
      .leftJoin('visualization.query', 'query')
      .addSelect([
        'query.id',
        'query.dataSourceId',
        'query.orgId',
        'query.queryText',
        'query.userId',
      ])
      .where('widget.dashboard_id = :dashboardId', { dashboardId })
      .andWhere('visualization.id IS NOT NULL')
      .andWhere('query.id IS NOT NULL')
      .andWhere('query.is_archived = false')
      .orderBy('query.id', 'ASC')
      .getMany();

    const uniqueQueries = new Map<number, DashboardRefreshQuery>();

    widgets.forEach((widget) => {
      const query = widget.visualization?.query;

      if (!query?.id || !query.dataSourceId) {
        return;
      }

      if (!canRefreshDashboardQuery(user, query.userId)) {
        throw new ForbiddenException(
          '다른 사용자가 작성한 쿼리가 포함된 대시보드는 새로고침할 수 없습니다.',
        );
      }

      if (!uniqueQueries.has(query.id)) {
        uniqueQueries.set(query.id, {
          dataSourceId: query.dataSourceId,
          orgId: query.orgId,
          queryId: query.id,
          queryText: query.queryText,
        });
      }
    });

    return {
      dashboardId: dashboard.id,
      queries: [...uniqueQueries.values()],
    };
  }

  async favoriteDashboard(user: AuthenticatedUser, dashboardId: number) {
    const dashboard = await this.findAccessibleDashboard(user, dashboardId);

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }

    /** 즐겨찾기 존재 여부만 확인하므로 id만 select */
    const existingFavorite = await this.favoriteRepository.findOne({
      select: { id: true },
      where: {
        objectId: dashboard.id,
        objectType: 'Dashboard',
        orgId: user.orgId,
        userId: user.id,
      },
    });

    if (!existingFavorite) {
      await this.favoriteRepository.save(
        this.favoriteRepository.create({
          objectId: dashboard.id,
          objectType: 'Dashboard',
          orgId: user.orgId,
          userId: user.id,
        }),
      );
    }

    return this.getDashboardListItem(user, dashboard.id);
  }

  async unfavoriteDashboard(user: AuthenticatedUser, dashboardId: number) {
    const dashboard = await this.findAccessibleDashboard(user, dashboardId);

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }

    await this.favoriteRepository.delete({
      objectId: dashboard.id,
      objectType: 'Dashboard',
      orgId: user.orgId,
      userId: user.id,
    });

    return this.getDashboardListItem(user, dashboard.id);
  }

  async archiveDashboard(user: AuthenticatedUser, dashboardId: number) {
    /** 권한 체크에 필요한 최소 컬럼 + 직렬화에 필요한 컬럼만 select */
    const dashboard = await this.dashboardRepository.findOne({
      select: {
        id: true,
        userId: true,
        orgId: true,
        name: true,
        slug: true,
        layout: true,
        dashboardFiltersEnabled: true,
        options: true,
        isArchived: true,
        isDraft: true,
        updatedAt: true,
        createdAt: true,
        version: true,
        tags: true,
      },
      where: { id: dashboardId, orgId: user.orgId },
    });

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }

    if (!this.canModifyDashboard(user, dashboard)) {
      throw new ForbiddenException('이 대시보드를 수정할 권한이 없습니다.');
    }

    const nextVersion = dashboard.version + 1;

    /** save() 대신 update()로 변경 대상 컬럼만 갱신하여 null 덮어쓰기 방지 */
    await this.dashboardRepository.update(dashboardId, {
      isArchived: true,
      version: nextVersion,
    });

    return {
      ...this.serializeDashboard({
        ...dashboard,
        isArchived: true,
        version: nextVersion,
        user: {
          email: user.email,
          id: user.id,
          name: user.name,
        } as DashboardEntity['user'],
      }),
      is_archived: true,
    };
  }

  async addWidget(
    user: AuthenticatedUser,
    dashboardId: number,
    visualizationId: number,
  ) {
    return this.createWidget(user, {
      dashboard_id: dashboardId,
      options: {},
      visualization_id: visualizationId,
      width: 1,
    });
  }

  async createWidget(user: AuthenticatedUser, payload: CreateWidgetRequestDto) {
    const dashboard = await this.getEditableDashboardOrThrow(
      user,
      payload.dashboard_id,
    );

    const visualization = await this.getVisualizationForWidgetOrThrow(
      user,
      payload.visualization_id,
    );

    /** buildWidgetOptions에서 options(position) 계산용이므로 options만 select */
    const existingWidgets = await this.widgetRepository.find({
      select: { id: true, options: true },
      where: {
        dashboardId: dashboard.id,
      },
      order: {
        id: 'ASC',
      },
    });

    const options = this.buildWidgetOptions(existingWidgets, payload.options);
    const widget = await this.widgetRepository.save(
      this.widgetRepository.create({
        dashboardId: dashboard.id,
        options: JSON.stringify(options),
        text: payload.text ?? null,
        visualizationId: visualization?.id ?? null,
        width: payload.width ?? 1,
      }),
    );

    return this.serializeWidgetResponse(widget);
  }

  async updateWidget(
    user: AuthenticatedUser,
    widgetId: number,
    payload: UpdateWidgetRequestDto,
  ) {
    const widget = await this.getEditableWidgetOrThrow(user, widgetId);
    const visualization = await this.getVisualizationForWidgetOrThrow(
      user,
      payload.visualization_id,
    );

    if (payload.text !== undefined) {
      widget.text = payload.text;
    }

    if (payload.visualization_id !== undefined) {
      widget.visualizationId = visualization?.id ?? null;
    }

    if (payload.width !== undefined) {
      widget.width = payload.width;
    }

    if (payload.options !== undefined) {
      const currentOptions = this.parseOptions(widget.options);
      const nextOptions = {
        ...currentOptions,
        ...payload.options,
      };

      if (
        payload.options.position &&
        typeof payload.options.position === 'object' &&
        !Array.isArray(payload.options.position)
      ) {
        nextOptions.position = {
          ...(currentOptions.position &&
          typeof currentOptions.position === 'object' &&
          !Array.isArray(currentOptions.position)
            ? (currentOptions.position as Record<string, unknown>)
            : {}),
          ...(payload.options.position as Record<string, unknown>),
        };
      }

      widget.options = JSON.stringify(this.normalizeWidgetOptions(nextOptions));
    }

    const savedWidget = await this.widgetRepository.save(widget);

    return this.serializeWidgetResponse(savedWidget);
  }

  async deleteWidget(user: AuthenticatedUser, widgetId: number) {
    const widget = await this.getEditableWidgetOrThrow(user, widgetId);
    const response = this.serializeWidgetResponse(widget);

    await this.widgetRepository.delete({
      id: widget.id,
    });

    return response;
  }

  private serializeDashboard(dashboard: DashboardEntity) {
    return {
      id: dashboard.id,
      slug: dashboard.slug || slugify(dashboard.name),
      url: `/dashboards/${dashboard.id}${
        dashboard.slug ? `-${dashboard.slug}` : ''
      }`,
      name: dashboard.name,
      user_id: dashboard.userId,
      user: dashboard.user
        ? {
            id: dashboard.user.id,
            name: dashboard.user.name,
            email: dashboard.user.email,
            profile_image_url: this.currentUserService.getProfileImageUrl(
              dashboard.user,
            ),
          }
        : null,
      layout: parseDashboardLayout(dashboard.layout),
      dashboard_filters_enabled: dashboard.dashboardFiltersEnabled,
      options: serializeDashboardOptions(dashboard.options),
      is_archived: dashboard.isArchived,
      is_draft: dashboard.isDraft,
      updated_at: dashboard.updatedAt.toISOString(),
      created_at: dashboard.createdAt.toISOString(),
      version: dashboard.version,
      is_favorite: Boolean(
        (dashboard as DashboardEntity & { favorite?: FavoriteEntity }).favorite,
      ),
      tags: dashboard.tags ?? [],
    };
  }

  private createDashboardListQueryBuilder(
    user: AuthenticatedUser,
    view: DashboardListView,
  ) {
    /**
     * user는 serializeDashboard에서 id, name, email, profileImageUrl만 사용하므로
     * leftJoinAndSelect 대신 leftJoin + 필요 컬럼만 select
     */
    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .leftJoin('dashboard.user', 'user')
      .addSelect(['user.id', 'user.name', 'user.email', 'user.profileImageUrl'])
      .leftJoinAndMapOne(
        'dashboard.favorite',
        FavoriteEntity,
        'favorite',
        [
          "favorite.object_type = 'Dashboard'",
          'favorite.object_id = dashboard.id',
          'favorite.user_id = :favoriteUserId',
          'favorite.org_id = :favoriteOrgId',
        ].join(' AND '),
        {
          favoriteOrgId: user.orgId,
          favoriteUserId: user.id,
        },
      )
      .where('dashboard.org_id = :orgId', { orgId: user.orgId })
      .andWhere('(dashboard.is_draft = false OR dashboard.user_id = :userId)', {
        userId: user.id,
      })
      .andWhere('dashboard.is_archived = false');

    if (view === 'my') {
      queryBuilder.andWhere('dashboard.user_id = :ownerUserId', {
        ownerUserId: user.id,
      });
    }

    if (view === 'favorites') {
      queryBuilder.andWhere('favorite.id IS NOT NULL');
    }

    return queryBuilder;
  }

  private applyDashboardFilters(
    queryBuilder: SelectQueryBuilder<DashboardEntity>,
    params: DashboardListQueryDto,
  ) {
    if (params.q) {
      queryBuilder.andWhere('dashboard.name ILIKE :search', {
        search: `%${params.q}%`,
      });
    }

    if (params.tags.length > 0) {
      queryBuilder.andWhere('dashboard.tags @> ARRAY[:...tags]::text[]', {
        tags: params.tags,
      });
    }
  }

  private applyDashboardOrdering(
    queryBuilder: SelectQueryBuilder<DashboardEntity>,
    order: DashboardListQueryDto['order'],
  ) {
    const normalizedOrder = order ?? '-created_at';
    const direction = normalizedOrder.startsWith('-') ? 'DESC' : 'ASC';
    const orderKey = normalizedOrder.replace(/^-/, '');
    const orderDefinition = getDashboardListOrderDefinition(orderKey);

    if (!orderDefinition) {
      queryBuilder.orderBy('dashboard.createdAt', 'DESC');
      queryBuilder.addOrderBy('dashboard.id', 'DESC');
      return;
    }

    if (orderDefinition.select && orderDefinition.alias) {
      queryBuilder.addSelect(orderDefinition.select, orderDefinition.alias);
    }

    queryBuilder.orderBy(orderDefinition.orderBy, direction);
    queryBuilder.addOrderBy('dashboard.id', 'DESC');
  }

  private findAccessibleDashboard(
    user: AuthenticatedUser,
    dashboardId: number,
  ) {
    return this.createDashboardListQueryBuilder(user, 'all')
      .andWhere('dashboard.id = :dashboardId', { dashboardId })
      .getOne();
  }

  private async getDashboardListItem(
    user: AuthenticatedUser,
    dashboardId: number,
  ) {
    const dashboard = await this.findAccessibleDashboard(user, dashboardId);

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }

    return this.serializeDashboard(dashboard);
  }

  private serializeDashboardWidget(widget: WidgetEntity) {
    return {
      id: widget.id,
      width: widget.width,
      options: this.normalizeWidgetOptions(widget.options),
      text: widget.text,
      updated_at: widget.updatedAt.toISOString(),
      created_at: widget.createdAt.toISOString(),
      visualization: widget.visualization
        ? {
            id: widget.visualization.id,
            type: widget.visualization.type,
            query_id: widget.visualization.queryId,
            query_name: widget.visualization.query?.name ?? '',
            name: widget.visualization.name,
            description: widget.visualization.description,
            options: this.parseOptions(widget.visualization.options),
          }
        : null,
      query_result: widget.visualization?.query?.latestQueryData
        ? {
            id: widget.visualization.query.latestQueryData.id,
            data_source_id:
              widget.visualization.query.latestQueryData.dataSourceId,
            query: widget.visualization.query.latestQueryData.queryText,
            data: widget.visualization.query.latestQueryData.data as {
              columns: Array<{
                friendly_name: string;
                name: string;
                type: string | null;
              }>;
              rows: Array<Record<string, unknown>>;
              truncated: boolean;
            },
            runtime: widget.visualization.query.latestQueryData.runtime,
            retrieved_at:
              widget.visualization.query.latestQueryData.retrievedAt.toISOString(),
          }
        : null,
    };
  }

  private serializeWidgetResponse(widget: WidgetEntity) {
    return {
      id: widget.id,
      visualization_id: widget.visualizationId,
      dashboard_id: widget.dashboardId,
      width: widget.width,
      options: this.normalizeWidgetOptions(widget.options),
      text: widget.text,
      updated_at: widget.updatedAt.toISOString(),
      created_at: widget.createdAt.toISOString(),
    };
  }

  private async generateDashboardSlug(orgId: number, name: string) {
    const baseSlug = slugify(name) || 'dashboard';
    let slug = baseSlug;
    let tries = 1;

    while (
      await this.dashboardRepository.exist({
        where: {
          orgId,
          slug,
        },
      })
    ) {
      slug = `${baseSlug}_${tries}`;
      tries += 1;
    }

    return slug;
  }

  private canModifyDashboard(
    user: AuthenticatedUser,
    dashboard: DashboardEntity,
  ) {
    return user.roles.includes('admin') || dashboard.userId === user.id;
  }

  private getDashboardRefreshOption(options: Record<string, unknown>) {
    const refreshOption = options.refresh;

    if (
      typeof refreshOption === 'object' &&
      refreshOption !== null &&
      !Array.isArray(refreshOption)
    ) {
      return refreshOption as Record<string, unknown>;
    }

    return null;
  }

  private async getEditableDashboardOrThrow(
    user: AuthenticatedUser,
    dashboardId: number,
  ) {
    /** 권한 체크(userId)와 위젯 조회(id)에만 사용하므로 최소 컬럼 select */
    const dashboard = await this.dashboardRepository.findOne({
      select: { id: true, userId: true, orgId: true },
      where: { id: dashboardId, orgId: user.orgId },
    });

    if (!dashboard) {
      throw new NotFoundException('대시보드를 찾을 수 없습니다.');
    }

    if (!this.canModifyDashboard(user, dashboard)) {
      throw new ForbiddenException('이 대시보드를 수정할 권한이 없습니다.');
    }

    return dashboard;
  }

  private async getEditableWidgetOrThrow(
    user: AuthenticatedUser,
    widgetId: number,
  ) {
    /** dashboard는 canModifyDashboard 권한 체크용이므로 userId만 select */
    const widget = await this.widgetRepository
      .createQueryBuilder('widget')
      .leftJoin('widget.dashboard', 'dashboard')
      .addSelect(['dashboard.id', 'dashboard.userId'])
      .where('widget.id = :widgetId', { widgetId })
      .andWhere('dashboard.org_id = :orgId', { orgId: user.orgId })
      .getOne();

    if (!widget?.dashboard) {
      throw new NotFoundException('위젯을 찾을 수 없습니다.');
    }

    if (!this.canModifyDashboard(user, widget.dashboard)) {
      throw new ForbiddenException('이 위젯을 수정할 권한이 없습니다.');
    }

    return widget;
  }

  private async getVisualizationForWidgetOrThrow(
    user: AuthenticatedUser,
    visualizationId: number | null | undefined,
  ) {
    if (visualizationId === undefined || visualizationId === null) {
      return null;
    }

    const visualization = await this.visualizationRepository.findOne({
      select: { id: true, queryId: true },
      where: { id: visualizationId },
    });

    if (!visualization) {
      throw new NotFoundException('시각화를 찾을 수 없습니다.');
    }

    /** 쿼리 존재 확인 + orgId 소속 검증만 수행하므로 id만 select */
    const query = await this.queryRepository.findOne({
      select: { id: true },
      where: { id: visualization.queryId, orgId: user.orgId },
    });

    if (!query) {
      throw new NotFoundException('시각화의 쿼리를 찾을 수 없습니다.');
    }

    return visualization;
  }

  private buildWidgetOptions(
    existingWidgets: WidgetEntity[],
    rawOptions: Record<string, unknown> | undefined,
  ) {
    const normalized = this.normalizeWidgetOptions(rawOptions);
    const hasExplicitPosition =
      rawOptions?.position &&
      typeof rawOptions.position === 'object' &&
      !Array.isArray(rawOptions.position);

    if (hasExplicitPosition) {
      return normalized;
    }

    const placement = this.calculateNewWidgetPlacement(
      existingWidgets.map(
        (widget) => this.normalizeWidgetOptions(widget.options).position,
      ),
      normalized.position.sizeX,
    );

    return {
      ...normalized,
      position: {
        ...normalized.position,
        col: placement.col,
        row: placement.row,
      },
    };
  }

  private calculateNewWidgetPlacement(
    positions: WidgetPosition[],
    sizeX: number,
  ) {
    const width = Math.min(
      DASHBOARD_GRID_COLUMNS,
      Math.max(1, Math.trunc(sizeX)),
    );
    const bottomLine = new Array<number>(DASHBOARD_GRID_COLUMNS).fill(0);

    positions.forEach((position) => {
      const col = clampWidgetCol(position);
      const from = Math.max(col, 0);
      const to = Math.min(col + position.sizeX, DASHBOARD_GRID_COLUMNS);
      const bottom = Math.max(0, position.row) + Math.max(1, position.sizeY);

      for (let index = from; index < to; index += 1) {
        bottomLine[index] = Math.max(bottomLine[index], bottom);
      }
    });

    let bestCol = 0;
    let bestRow = Number.MAX_SAFE_INTEGER;

    for (let col = 0; col <= DASHBOARD_GRID_COLUMNS - width; col += 1) {
      const row = Math.max(...bottomLine.slice(col, col + width));

      if (row < bestRow) {
        bestCol = col;
        bestRow = row;
      }
    }

    return {
      col: bestCol,
      row: bestRow === Number.MAX_SAFE_INTEGER ? 0 : bestRow,
    };
  }

  private parseOptions(value: string) {
    if (!value) {
      return {};
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }

    return {};
  }

  private normalizeWidgetOptions(
    value: string | Record<string, unknown> | null | undefined,
  ) {
    const parsed =
      typeof value === 'string'
        ? this.parseOptions(value)
        : value && typeof value === 'object' && !Array.isArray(value)
          ? value
          : {};

    return {
      ...parsed,
      position: {
        ...normalizeWidgetPosition(parsed.position),
        col: clampWidgetCol(normalizeWidgetPosition(parsed.position)),
      },
    } as WidgetOptions;
  }
}
