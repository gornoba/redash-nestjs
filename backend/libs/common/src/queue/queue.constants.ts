export const QUERY_EXECUTION_QUEUE = 'queries';
export const SCHEDULED_QUERY_EXECUTION_QUEUE = 'scheduled_queries';
export const ALERT_EVALUATION_QUEUE = 'alerts';
export const SCHEMA_REFRESH_QUEUE = 'schemas';
export const NOTIFICATION_DISPATCH_QUEUE = 'notifications';
export const ADMIN_STATUS_REDIS_KEY = 'redash:status';
export const ADMIN_WORKER_HEARTBEAT_KEY_PREFIX = 'redash:workers';

export const ADMIN_MONITORED_QUEUE_NAMES = [
  QUERY_EXECUTION_QUEUE,
  SCHEDULED_QUERY_EXECUTION_QUEUE,
  ALERT_EVALUATION_QUEUE,
  SCHEMA_REFRESH_QUEUE,
  NOTIFICATION_DISPATCH_QUEUE,
] as const;

export const QUERY_EXECUTION_JOB = 'execute';
export const SCHEDULED_QUERY_EXECUTION_JOB = 'scheduled-execute';
export const SCHEDULED_QUERY_SCAN_JOB = 'scan-scheduled-queries';
export const ALERT_EVALUATION_JOB = 'evaluate-alerts';
export const SCHEMA_REFRESH_JOB = 'refresh-schema';
export const NOTIFICATION_DISPATCH_JOB = 'dispatch-notification';

export interface QueryExecutionJobPayload {
  dataSourceId: number;
  orgId: number;
  persistLatestQueryData: boolean;
  queryId: number | null;
  queryText: string;
  requestedByUserId: number;
}

export interface AlertEvaluationJobPayload {
  queryId: number;
}

export interface NotificationDispatchJobPayload {
  alertId: number;
  state: 'ok' | 'triggered' | 'unknown';
  subscriptionId: number;
}

export interface ExecuteQueryJobQueuedResponse {
  job_id: string;
  state: 'queued';
}

export interface ExecuteQueryJobStatusResponse {
  error: string | null;
  job_id: string;
  query_result_id?: number;
  state: 'queued' | 'running' | 'completed' | 'failed';
}
