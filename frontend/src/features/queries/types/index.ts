export interface QueryListItem {
  id: number;
  latest_query_data_id: number | null;
  name: string;
  description: string | null;
  query: string;
  query_hash: string;
  schedule: Record<string, unknown> | null;
  api_key: string;
  is_archived: boolean;
  is_draft: boolean;
  updated_at: string;
  created_at: string;
  data_source_id: number | null;
  options: Record<string, unknown>;
  version: number;
  tags: string[];
  is_safe: boolean;
  user: {
    id: number;
    name: string;
    email: string;
    profile_image_url: string;
    groups: number[];
    updated_at: string;
    created_at: string;
    disabled_at: string | null;
    is_disabled: boolean;
    is_invitation_pending: boolean;
    is_email_verified: boolean;
    auth_type: string;
  } | null;
  last_modified_by: {
    id: number;
    name: string;
    email: string;
    profile_image_url: string;
    groups: number[];
    updated_at: string;
    created_at: string;
    disabled_at: string | null;
    is_disabled: boolean;
    is_invitation_pending: boolean;
    is_email_verified: boolean;
    auth_type: string;
  } | null;
  last_modified_by_id: number | null;
  retrieved_at: string | null;
  runtime: number | null;
  is_favorite: boolean;
}

export interface QueryVisualization {
  id: number;
  type: string;
  query_id: number;
  name: string;
  description: string | null;
  options: Record<string, unknown>;
  updated_at: string;
  created_at: string;
}

export interface QueryDetail extends QueryListItem {
  latest_query_data?: QueryExecutionResult | null;
  visualizations: QueryVisualization[];
}

export interface SaveQueryPayload {
  data_source_id: number;
  description: string | null;
  is_draft?: boolean;
  latest_query_data_id?: number | null;
  name: string;
  options: Record<string, unknown>;
  query: string;
  schedule?: Record<string, unknown> | null;
  tags: string[];
  version?: number;
}

export interface QueryExecutionColumn {
  friendly_name: string;
  name: string;
  type: string | null;
}

export interface QueryExecutionData {
  columns: QueryExecutionColumn[];
  limit?: {
    applied_limit: number;
    did_apply_default_limit: boolean;
    did_cap_limit: boolean;
    requested_limit: number | null;
  };
  rows: Array<Record<string, unknown>>;
  truncated: boolean;
}

export interface QueryExecutionResult {
  data: QueryExecutionData;
  data_source_id: number;
  id: number;
  query: string;
  retrieved_at: string;
  runtime: number;
}

export interface ExecuteQueryPayload {
  data_source_id: number;
  persist_latest_query_data?: boolean;
  query: string;
  query_id?: number | null;
}

export interface ExecuteQueryResponse {
  job_id: string;
  state: 'queued';
}

export interface ExecuteQueryJobStatusResponse {
  error: string | null;
  job_id: string;
  query_result_id?: number;
  state: 'queued' | 'running' | 'completed' | 'failed';
}

export interface DashboardSearchItem {
  id: number;
  slug: string;
  url: string;
  name: string;
  user_id: number;
  is_archived: boolean;
  is_draft: boolean;
  is_favorite: boolean;
  tags: string[];
}

export interface DashboardSearchResponse {
  count: number;
  page: number;
  page_size: number;
  results: DashboardSearchItem[];
}

export interface AddDashboardWidgetResponse {
  id: number;
  visualization_id: number | null;
  dashboard_id: number;
  width: number;
  options: Record<string, unknown>;
  text: string | null;
  updated_at: string;
  created_at: string;
}

export interface SaveVisualizationPayload {
  query_id: number;
  type: string;
  name: string;
  description: string | null;
  options: Record<string, unknown>;
}

export interface PublicEmbedResponse {
  query: {
    id: number;
    name: string;
    api_key: string;
  };
  visualization: QueryVisualization;
  query_result: QueryExecutionResult | null;
}

export interface QueryListResponse {
  count: number;
  page: number;
  page_size: number;
  results: QueryListItem[];
}

export interface QueryTagItem {
  name: string;
  count: number;
}

export interface QueryTagsResponse {
  tags: QueryTagItem[];
}

export type QueryListView = 'all' | 'archive' | 'favorites' | 'my';
