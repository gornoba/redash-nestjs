export const GROUP_PERMISSION_OPTIONS = [
  'create_dashboard',
  'create_query',
  'edit_dashboard',
  'edit_query',
  'view_query',
  'view_source',
  'execute_query',
  'list_users',
  'schedule_query',
  'list_dashboards',
  'list_alerts',
  'list_data_sources',
] as const;

export type GroupPermission = (typeof GROUP_PERMISSION_OPTIONS)[number];
