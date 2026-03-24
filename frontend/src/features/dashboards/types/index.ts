export interface DashboardListUser {
  id: number;
  name: string;
  email: string;
  profile_image_url: string;
}

export interface DashboardRefreshSchedule {
  day_of_week?: string | null;
  disabled?: boolean;
  interval: number | null;
  last_execute?: string | null;
  time?: string | null;
  until?: string | null;
}

export interface DashboardOptions extends Record<string, unknown> {
  refresh?: DashboardRefreshSchedule | null;
}

export interface DashboardWidgetPosition {
  autoHeight: boolean;
  col: number;
  maxSizeX: number;
  maxSizeY: number;
  minSizeX: number;
  minSizeY: number;
  row: number;
  sizeX: number;
  sizeY: number;
}

export interface DashboardWidgetOptions extends Record<string, unknown> {
  position: DashboardWidgetPosition;
}

export interface DashboardWidgetVisualization {
  id: number;
  type: string;
  query_id: number;
  query_name: string;
  name: string;
  description: string | null;
  options: Record<string, unknown>;
}

export interface DashboardWidgetQueryResult {
  data: {
    columns: Array<{
      friendly_name: string;
      name: string;
      type: string | null;
    }>;
    rows: Array<Record<string, unknown>>;
    truncated: boolean;
  };
  data_source_id: number;
  id: number;
  query: string;
  retrieved_at: string;
  runtime: number;
}

export interface DashboardWidgetItem {
  id: number;
  width: number;
  options: DashboardWidgetOptions;
  text: string | null;
  updated_at: string;
  created_at: string;
  visualization: DashboardWidgetVisualization | null;
  query_result: DashboardWidgetQueryResult | null;
}

export interface DashboardListItem {
  id: number;
  slug: string;
  url: string;
  name: string;
  user_id: number;
  user: DashboardListUser | null;
  layout: Record<string, unknown>[];
  dashboard_filters_enabled: boolean;
  options: DashboardOptions;
  is_archived: boolean;
  is_draft: boolean;
  updated_at: string;
  created_at: string;
  version: number;
  is_favorite: boolean;
  tags: string[];
}

export interface DashboardDetail extends DashboardListItem {
  widgets: DashboardWidgetItem[];
}

export interface DashboardListResponse {
  count: number;
  page: number;
  page_size: number;
  results: DashboardListItem[];
}

export interface DashboardTagItem {
  name: string;
  count: number;
}

export interface DashboardTagsResponse {
  tags: DashboardTagItem[];
}

export interface CreateDashboardPayload {
  name: string;
}

export interface UpdateDashboardPayload {
  dashboard_filters_enabled?: boolean;
  is_draft?: boolean;
  name?: string;
  options?: DashboardOptions;
  tags?: string[];
  version?: number;
}

export interface CreateDashboardWidgetPayload {
  dashboard_id: number;
  options?: Record<string, unknown>;
  text?: string | null;
  visualization_id?: number | null;
  width?: number;
}

export interface UpdateDashboardWidgetPayload {
  dashboard_id?: number;
  options?: Record<string, unknown>;
  text?: string | null;
  visualization_id?: number | null;
  width?: number;
}

export interface DashboardWidgetResponse {
  id: number;
  visualization_id: number | null;
  dashboard_id: number;
  width: number;
  options: DashboardWidgetOptions;
  text: string | null;
  updated_at: string;
  created_at: string;
}

export interface DashboardRefreshResponse {
  dashboard_id: number;
  dashboard_refresh_id: string;
  state: 'queued' | 'completed';
  total_jobs: number;
}

export interface DashboardRefreshStatusResponse {
  completed_jobs: number;
  dashboard_id: number;
  dashboard_refresh_id: string;
  error: string | null;
  failed_jobs: number;
  state: 'queued' | 'running' | 'completed' | 'failed';
  total_jobs: number;
}

export type DashboardListView = 'all' | 'favorites' | 'my';
