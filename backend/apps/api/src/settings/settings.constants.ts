import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

export interface SettingsMenuItemDefinition {
  key: string;
  title: string;
  path: string;
  order: number;
  isVisible?: (user: AuthenticatedUser) => boolean;
  permission?: string;
  role?: 'admin';
}

export const SETTINGS_MENU_ITEMS: SettingsMenuItemDefinition[] = [
  {
    key: 'data-sources',
    title: 'Data Sources',
    path: '/data_sources',
    order: 1,
    isVisible: (user) =>
      user.roles.includes('admin') ||
      user.permissions.includes('list_data_sources'),
  },
  {
    key: 'users',
    title: 'Users',
    path: '/users',
    order: 2,
    permission: 'list_users',
  },
  {
    key: 'groups',
    title: 'Groups',
    path: '/groups',
    order: 3,
  },
  {
    key: 'alert-destinations',
    title: 'Alert Destinations',
    path: '/destinations',
    order: 4,
    permission: 'list_alerts',
  },
  {
    key: 'query-snippets',
    title: 'Query Snippets',
    path: '/query_snippets',
    order: 5,
  },
  {
    key: 'general',
    title: 'General',
    path: '/settings/general',
    order: 6,
    role: 'admin',
  },
  {
    key: 'account',
    title: 'Account',
    path: '/users/me',
    order: 7,
  },
];

export const ORGANIZATION_SETTINGS_DEFAULTS = {
  beacon_consent: null as boolean | null,
  auth_password_login_enabled: true,
  auth_saml_enabled: false,
  auth_saml_type: '',
  auth_saml_entity_id: '',
  auth_saml_metadata_url: '',
  auth_saml_nameid_format: '',
  auth_saml_sso_url: '',
  auth_saml_x509_cert: '',
  date_format: 'DD/MM/YY',
  time_format: 'HH:mm',
  integer_format: '0,0',
  float_format: '0,0.00',
  multi_byte_search_enabled: false,
  auth_jwt_login_enabled: false,
  auth_jwt_auth_issuer: '',
  auth_jwt_auth_public_certs_url: '',
  auth_jwt_auth_audience: '',
  auth_jwt_auth_algorithms: ['HS256', 'RS256', 'ES256'],
  auth_jwt_auth_cookie_name: '',
  auth_jwt_auth_header_name: '',
  timezone: 'UTC',
  feature_show_permissions_control: false,
  send_email_on_failed_scheduled_queries: false,
  hide_plotly_mode_bar: false,
  disable_public_urls: false,
};

export const ORGANIZATION_GENERAL_SETTING_KEYS = [
  'date_format',
  'time_format',
  'timezone',
  'send_email_on_failed_scheduled_queries',
  'multi_byte_search_enabled',
] as const;

export const DEFAULT_DATE_FORMAT_OPTIONS = [
  'DD/MM/YY',
  'MM/DD/YY',
  'YYYY-MM-DD',
] as const;

export const DEFAULT_TIME_FORMAT_OPTIONS = [
  'HH:mm',
  'HH:mm:ss',
  'HH:mm:ss.SSS',
] as const;

export function normalizeOrganizationSettings(
  settings: Record<string, unknown> | null | undefined,
) {
  return {
    ...ORGANIZATION_SETTINGS_DEFAULTS,
    ...(settings ?? {}),
  };
}

export function pickGeneralOrganizationSettings(
  settings: Record<string, unknown> | null | undefined,
) {
  const normalizedSettings = normalizeOrganizationSettings(settings);

  return {
    date_format: normalizedSettings.date_format,
    time_format: normalizedSettings.time_format,
    timezone: normalizedSettings.timezone,
    send_email_on_failed_scheduled_queries:
      normalizedSettings.send_email_on_failed_scheduled_queries,
    multi_byte_search_enabled: normalizedSettings.multi_byte_search_enabled,
  };
}

export function getAvailableSettingsMenuItems(user: AuthenticatedUser) {
  return SETTINGS_MENU_ITEMS.filter((item) => {
    if (item.isVisible && !item.isVisible(user)) {
      return false;
    }

    if (item.role && !user.roles.includes(item.role)) {
      return false;
    }

    if (item.permission && !user.permissions.includes(item.permission)) {
      return false;
    }

    return true;
  }).sort((left, right) => left.order - right.order);
}
