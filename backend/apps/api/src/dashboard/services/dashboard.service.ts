import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import {
  QUERY_EXECUTION_JOB,
  QUERY_EXECUTION_QUEUE,
} from '@app/common/queue/queue.constants';
import type { CreateDashboardRequestDto } from '../dto/create-dashboard.dto';
import type { DashboardListQueryDto } from '../dto/dashboard-list-query.schema';
import type { UpdateDashboardRequestDto } from '../dto/update-dashboard.dto';
import type {
  CreateWidgetRequestDto,
  UpdateWidgetRequestDto,
} from '../dto/widget.dto';
import { DashboardRepository } from '../repositories/dashboard.repository';
import { DashboardRefreshStatusService } from './dashboard-refresh-status.service';

type DashboardListView = 'all' | 'favorites' | 'my';

@Injectable()
export class DashboardService {
  constructor(
    @InjectQueue(QUERY_EXECUTION_QUEUE)
    private readonly queryExecutionQueue: Queue,
    private readonly dashboardRepository: DashboardRepository,
    private readonly dashboardRefreshStatusService: DashboardRefreshStatusService,
  ) {}

  getDashboards(
    user: AuthenticatedUser,
    view: DashboardListView,
    params: DashboardListQueryDto,
  ) {
    return this.dashboardRepository.getDashboards(user, view, params);
  }

  getDashboardDetail(user: AuthenticatedUser, dashboardId: number) {
    return this.dashboardRepository.getDashboardDetail(user, dashboardId);
  }

  async refreshDashboard(user: AuthenticatedUser, dashboardId: number) {
    const { dashboardId: resolvedDashboardId, queries } =
      await this.dashboardRepository.getDashboardRefreshQueries(
        user,
        dashboardId,
      );

    const jobIds = [];
    for (const query of queries) {
      const job = await this.queryExecutionQueue.add(
        QUERY_EXECUTION_JOB,
        {
          dataSourceId: query.dataSourceId,
          orgId: query.orgId,
          persistLatestQueryData: true,
          queryId: query.queryId,
          queryText: query.queryText,
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
      jobIds.push(String(job.id ?? ''));
    }

    return this.dashboardRefreshStatusService.createRefresh(
      user,
      resolvedDashboardId,
      jobIds,
    );
  }

  getDashboardRefreshStatus(
    user: AuthenticatedUser,
    dashboardRefreshId: string,
  ) {
    return this.dashboardRefreshStatusService.getRefreshStatus(
      user,
      dashboardRefreshId,
    );
  }

  getDashboardTags(user: AuthenticatedUser) {
    return this.dashboardRepository.getDashboardTags(user);
  }

  createDashboard(user: AuthenticatedUser, payload: CreateDashboardRequestDto) {
    return this.dashboardRepository.createDashboard(user, payload);
  }

  updateDashboard(
    user: AuthenticatedUser,
    dashboardId: number,
    payload: UpdateDashboardRequestDto,
  ) {
    return this.dashboardRepository.updateDashboard(user, dashboardId, payload);
  }

  favoriteDashboard(user: AuthenticatedUser, dashboardId: number) {
    return this.dashboardRepository.favoriteDashboard(user, dashboardId);
  }

  unfavoriteDashboard(user: AuthenticatedUser, dashboardId: number) {
    return this.dashboardRepository.unfavoriteDashboard(user, dashboardId);
  }

  archiveDashboard(user: AuthenticatedUser, dashboardId: number) {
    return this.dashboardRepository.archiveDashboard(user, dashboardId);
  }

  addWidget(
    user: AuthenticatedUser,
    dashboardId: number,
    visualizationId: number,
  ) {
    return this.dashboardRepository.addWidget(
      user,
      dashboardId,
      visualizationId,
    );
  }

  createWidget(user: AuthenticatedUser, payload: CreateWidgetRequestDto) {
    return this.dashboardRepository.createWidget(user, payload);
  }

  updateWidget(
    user: AuthenticatedUser,
    widgetId: number,
    payload: UpdateWidgetRequestDto,
  ) {
    return this.dashboardRepository.updateWidget(user, widgetId, payload);
  }

  deleteWidget(user: AuthenticatedUser, widgetId: number) {
    return this.dashboardRepository.deleteWidget(user, widgetId);
  }
}
