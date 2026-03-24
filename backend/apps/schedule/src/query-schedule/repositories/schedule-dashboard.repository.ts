import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { setQueryScheduleLastExecute } from '@app/common/query/query-schedule.util';
import { DashboardEntity } from '@app/database/entities/dashboard.entity';

type ScheduledDashboardRow = {
  dashboard_id: number | string;
  dashboard_options: Record<string, unknown> | string | null;
  dashboard_updated_at: Date | string;
  query_data_source_id: number | string | null;
  query_id: number | string | null;
  query_org_id: number | string | null;
  query_text: string | null;
  query_user_id: number | string | null;
};

type ScheduledDashboardQuery = {
  dataSourceId: number;
  id: number;
  orgId: number;
  queryText: string;
  userId: number;
};

export type ScheduledDashboardRefresh = {
  id: number;
  queries: ScheduledDashboardQuery[];
  schedule: Record<string, unknown> | null;
  updatedAt: Date;
};

@Injectable()
export class ScheduleDashboardRepository {
  constructor(
    @InjectRepository(DashboardEntity)
    private readonly dashboardRepository: Repository<DashboardEntity>,
  ) {}

  async getScheduledDashboards(): Promise<ScheduledDashboardRefresh[]> {
    const rows = await this.dashboardRepository.query<ScheduledDashboardRow[]>(
      `
        SELECT
          dashboard.id AS dashboard_id,
          dashboard.options AS dashboard_options,
          dashboard.updated_at AS dashboard_updated_at,
          query.id AS query_id,
          query.data_source_id AS query_data_source_id,
          query.org_id AS query_org_id,
          query.query AS query_text,
          query.user_id AS query_user_id
        FROM dashboards AS dashboard
        LEFT JOIN widgets AS widget
          ON widget.dashboard_id = dashboard.id
        LEFT JOIN visualizations AS visualization
          ON visualization.id = widget.visualization_id
        LEFT JOIN queries AS query
          ON query.id = visualization.query_id
         AND query.is_archived = false
         AND query.data_source_id IS NOT NULL
        WHERE dashboard.is_archived = false
        ORDER BY dashboard.id ASC, query.id ASC
      `,
    );

    const grouped = new Map<number, ScheduledDashboardRefresh>();

    rows.forEach((row) => {
      const dashboardId = Number(row.dashboard_id);

      if (!Number.isInteger(dashboardId)) {
        return;
      }

      const current = grouped.get(dashboardId) ?? {
        id: dashboardId,
        queries: [],
        schedule: this.getRefreshSchedule(row.dashboard_options),
        updatedAt: new Date(row.dashboard_updated_at),
      };

      const queryId = Number(row.query_id);
      const dataSourceId = Number(row.query_data_source_id);
      const orgId = Number(row.query_org_id);
      const userId = Number(row.query_user_id);

      if (
        Number.isInteger(queryId) &&
        Number.isInteger(dataSourceId) &&
        Number.isInteger(orgId) &&
        Number.isInteger(userId) &&
        typeof row.query_text === 'string' &&
        !current.queries.some((query) => query.id === queryId)
      ) {
        current.queries.push({
          dataSourceId,
          id: queryId,
          orgId,
          queryText: row.query_text,
          userId,
        });
      }

      grouped.set(dashboardId, current);
    });

    return [...grouped.values()].filter((dashboard) => dashboard.schedule);
  }

  async markDashboardRefreshExecuted(dashboardId: number, executedAt: Date) {
    const dashboard = await this.dashboardRepository.findOneBy({
      id: dashboardId,
    });

    if (!dashboard) {
      return;
    }

    const currentOptions =
      dashboard.options && typeof dashboard.options === 'object'
        ? { ...dashboard.options }
        : {};
    const nextRefreshSchedule = setQueryScheduleLastExecute(
      this.getRefreshSchedule(currentOptions),
      executedAt,
    );

    if (!nextRefreshSchedule) {
      return;
    }

    currentOptions.refresh = nextRefreshSchedule;
    dashboard.options = currentOptions;

    await this.dashboardRepository.save(dashboard);
  }

  private getRefreshSchedule(
    value: Record<string, unknown> | string | null,
  ): Record<string, unknown> | null {
    const options =
      typeof value === 'string'
        ? this.parseDashboardOptions(value)
        : value && typeof value === 'object'
          ? value
          : null;

    if (!options) {
      return null;
    }

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

  private parseDashboardOptions(value: string) {
    try {
      const parsed: unknown = JSON.parse(value);

      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }

    return null;
  }
}
