export type SessionMessage =
  | "email-not-verified"
  | "using-deprecated-embed-feature";

export interface SessionResponse {
  user: {
    id: number;
    name: string;
    email: string;
    groups: number[];
    roles: string[];
    permissions: string[];
    profile_image_url: string;
  };
  messages: SessionMessage[];
  org_slug: string;
  client_config: {
    basePath: string;
    pageSize: number;
    allowScriptsInUserInput: boolean;
    dateFormat: string;
    timeFormat: string;
    timezone: string;
    dateFormatList: string[];
    timeFormatList: string[];
    queryRefreshIntervals: number[];
    dateTimeFormat: string;
    mailSettingsMissing: boolean;
    settingsHomePath: string;
  };
}

export interface FavoriteItem {
  id: number;
  name: string;
  slug?: string;
  url?: string;
  is_draft?: boolean;
}

export interface FavoritesResponse {
  count: number;
  page: number;
  page_size: number;
  results: FavoriteItem[];
}

export interface OrganizationStatusCounters {
  users: number;
  alerts: number;
  data_sources: number;
  queries: number;
  dashboards: number;
}

export interface HomeVisibleGroup {
  id: number;
  name: string;
}

export interface HomeVisibleUser {
  id: number;
  email: string;
  name: string;
}

export interface OrganizationStatusResponse {
  object_counters: OrganizationStatusCounters;
  visible_groups: HomeVisibleGroup[];
  visible_users: HomeVisibleUser[];
}

export interface HomePageData {
  session: SessionResponse;
  favoriteDashboards: FavoritesResponse;
  favoriteQueries: FavoritesResponse;
  organizationStatus: OrganizationStatusResponse;
}
