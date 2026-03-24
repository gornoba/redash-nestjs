'use client';

import { proxyApiClient } from '@/lib/api-client';
import type {
  CreateDashboardPayload,
  CreateDashboardWidgetPayload,
  DashboardDetail,
  DashboardListItem,
  DashboardListResponse,
  DashboardListView,
  DashboardRefreshResponse,
  DashboardRefreshStatusResponse,
  DashboardWidgetResponse,
  DashboardTagsResponse,
  UpdateDashboardPayload,
  UpdateDashboardWidgetPayload,
} from '@/features/dashboards/types';
import type {
  AddDashboardWidgetResponse,
  DashboardSearchResponse,
} from '@/features/queries/types';

interface GetDashboardsParams {
  order?: string;
  page: number;
  page_size: number;
  q?: string;
  tags: string[];
}

const DASHBOARD_VIEW_PATH: Record<DashboardListView, string> = {
  all: '/api/dashboards',
  favorites: '/api/dashboards/favorites',
  my: '/api/dashboards/my',
};

export async function getDashboards(
  view: DashboardListView,
  params: GetDashboardsParams,
): Promise<DashboardListResponse> {
  const response = await proxyApiClient.get<DashboardListResponse>(
    DASHBOARD_VIEW_PATH[view],
    {
      params,
      paramsSerializer: {
        indexes: null,
      },
    },
  );

  return response.data;
}

export async function getDashboardTags(): Promise<DashboardTagsResponse> {
  const response = await proxyApiClient.get<DashboardTagsResponse>(
    '/api/dashboards/tags',
  );

  return response.data;
}

export async function createDashboard(payload: CreateDashboardPayload) {
  const response = await proxyApiClient.post<DashboardListItem>(
    '/api/dashboards',
    payload,
  );

  return response.data;
}

export async function getDashboardDetail(dashboardId: number) {
  const response = await proxyApiClient.get<DashboardDetail>(
    `/api/dashboards/${dashboardId}`,
  );

  return response.data;
}

export async function updateDashboard(
  dashboardId: number,
  payload: UpdateDashboardPayload,
) {
  const response = await proxyApiClient.post<DashboardListItem>(
    `/api/dashboards/${dashboardId}`,
    payload,
  );

  return response.data;
}

export async function archiveDashboard(dashboardId: number) {
  const response = await proxyApiClient.delete<DashboardListItem>(
    `/api/dashboards/${dashboardId}`,
  );

  return response.data;
}

export async function refreshDashboard(dashboardId: number) {
  const response = await proxyApiClient.post<DashboardRefreshResponse>(
    `/api/dashboards/${dashboardId}/refresh`,
  );

  return response.data;
}

export async function getDashboardRefreshStatus(dashboardRefreshId: string) {
  const response = await proxyApiClient.get<DashboardRefreshStatusResponse>(
    `/api/dashboards/refreshes/${dashboardRefreshId}`,
  );

  return response.data;
}

export async function favoriteDashboard(dashboardId: number) {
  const response = await proxyApiClient.post<DashboardListItem>(
    `/api/dashboards/${dashboardId}/favorite`,
  );

  return response.data;
}

export async function unfavoriteDashboard(dashboardId: number) {
  const response = await proxyApiClient.delete<DashboardListItem>(
    `/api/dashboards/${dashboardId}/favorite`,
  );

  return response.data;
}

export async function searchDashboards(q: string) {
  const response = await proxyApiClient.get<DashboardSearchResponse>(
    '/api/dashboards',
    {
      params: {
        page: 1,
        page_size: 25,
        q,
      },
    },
  );

  return response.data;
}

export async function addWidgetToDashboard(
  dashboardId: number,
  visualizationId: number,
) {
  const response = await proxyApiClient.post<AddDashboardWidgetResponse>(`/api/dashboards/${dashboardId}/widgets`, {
    visualization_id: visualizationId,
  });

  return response.data;
}

export async function createDashboardWidget(payload: CreateDashboardWidgetPayload) {
  const response = await proxyApiClient.post<DashboardWidgetResponse>(
    '/api/widgets',
    payload,
  );

  return response.data;
}

export async function updateDashboardWidget(
  widgetId: number,
  payload: UpdateDashboardWidgetPayload,
) {
  const response = await proxyApiClient.post<DashboardWidgetResponse>(
    `/api/widgets/${widgetId}`,
    payload,
  );

  return response.data;
}

export async function deleteDashboardWidget(widgetId: number) {
  const response = await proxyApiClient.delete<DashboardWidgetResponse>(
    `/api/widgets/${widgetId}`,
  );

  return response.data;
}
