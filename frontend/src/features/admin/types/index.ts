export interface AdminStatusResponse {
  dashboards_count: number;
  database_metrics: {
    metrics: Array<[string, number]>;
  };
  manager: {
    last_refresh_at: number | null;
    outdated_queries_count: number;
    queues: Record<string, { size: number }>;
    started_at: number | null;
  };
  queries_count: number;
  query_results_count: number;
  redis_used_memory: number;
  redis_used_memory_human: string;
  unused_query_results_count: number;
  version: string;
  widgets_count: number;
}

export interface AdminStartedJob {
  enqueued_at: string | null;
  id: string;
  meta: {
    data_source_id?: number | null;
    org_id?: number | null;
    query_id?: number | null;
    scheduled?: boolean;
    user_id?: number | null;
  };
  name: string;
  origin: string;
  started_at: string | null;
}

export interface AdminQueueStatus {
  name: string;
  queued: number;
  started: AdminStartedJob[];
}

export interface AdminWorkerStatus {
  birth_date: string;
  current_job: string | null;
  failed_jobs: number;
  hostname: string;
  name: string;
  pid: number;
  queues: string;
  state: string;
  successful_jobs: number;
  total_working_time: number;
}

export interface AdminJobsResponse {
  queues: Record<string, AdminQueueStatus>;
  workers: AdminWorkerStatus[];
}

export interface AdminOutdatedQueryItem {
  id: number;
  name: string;
  schedule: Record<string, unknown> | null;
  is_archived: boolean;
  is_draft: boolean;
  tags: string[];
  created_at: string;
  user: {
    id: number;
    name: string;
    profile_image_url: string;
  } | null;
  retrieved_at: string | null;
  runtime: number | null;
}

export interface AdminOutdatedQueriesResponse {
  queries: AdminOutdatedQueryItem[];
  updated_at: number | null;
}
