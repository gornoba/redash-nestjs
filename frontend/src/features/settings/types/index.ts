export type SettingsSectionKey =
  | 'account'
  | 'alert-destinations'
  | 'data-sources'
  | 'general'
  | 'groups'
  | 'query-snippets'
  | 'users';

export interface SettingsMenuItem {
  key: SettingsSectionKey;
  title: string;
  path: string;
}

export interface SettingsMenuResponse {
  items: SettingsMenuItem[];
  first_path: string;
}

export interface SettingsGroupSummary {
  id: number;
  name: string;
  type: string;
}

export interface SettingsAccountResponse {
  user: {
    id: number;
    name: string;
    email: string;
    profile_image_url: string;
    roles: string[];
    permissions: string[];
    groups: SettingsGroupSummary[];
  };
}

export interface OrganizationSettings {
  date_format: string;
  time_format: string;
  timezone: string;
  multi_byte_search_enabled: boolean;
  send_email_on_failed_scheduled_queries: boolean;
}

export interface OrganizationSettingsResponse {
  settings: OrganizationSettings;
}

export interface SettingsUserItem {
  id: number;
  name: string;
  email: string;
  profile_image_url: string;
  is_disabled: boolean;
  is_invitation_pending: boolean;
  groups: Array<Pick<SettingsGroupSummary, 'id' | 'name'>>;
  created_at: string;
  active_at: string | null;
}

export interface SettingsUsersResponse {
  items: SettingsUserItem[];
}

export interface SettingsListGroupItem {
  id: number;
  name: string;
  type: string;
  permissions: string[];
  member_count: number;
  created_at: string;
}

export interface SettingsGroupsResponse {
  items: SettingsListGroupItem[];
}

export interface SettingsDataSourceItem {
  id: number;
  name: string;
  type: string;
  created_at: string;
}

export interface SettingsDataSourcesResponse {
  items: SettingsDataSourceItem[];
}

export interface SettingsDestinationItem {
  id: number;
  name: string;
  type: string;
  user_name: string;
  created_at: string;
}

export interface SettingsDestinationsResponse {
  items: SettingsDestinationItem[];
}

export interface SettingsQuerySnippetItem {
  id: number;
  trigger: string;
  description: string;
  snippet: string;
  user: {
    id: number;
    name: string;
    profile_image_url: string;
  };
  user_name: string;
  created_at: string;
}

export interface SettingsQuerySnippetsResponse {
  items: SettingsQuerySnippetItem[];
}

export interface SettingsSectionDataMap {
  account: SettingsAccountResponse;
  'alert-destinations': SettingsDestinationsResponse;
  'data-sources': SettingsDataSourcesResponse;
  general: OrganizationSettingsResponse;
  groups: SettingsGroupsResponse;
  'query-snippets': SettingsQuerySnippetsResponse;
  users: SettingsUsersResponse;
}
