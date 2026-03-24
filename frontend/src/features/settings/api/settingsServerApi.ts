import { getSessionData } from '@/features/home';
import { fetchServerJson } from '@/lib/server-backend';

import type { SessionResponse } from '@/features/home/types';
import type {
  SettingsMenuResponse,
  SettingsSectionDataMap,
  SettingsSectionKey,
} from '../types';

const SETTINGS_SECTION_API_PATH: Record<SettingsSectionKey, string> = {
  account: '/api/settings/account',
  'alert-destinations': '/api/settings/destinations',
  'data-sources': '/api/settings/data-sources',
  general: '/api/settings/organization',
  groups: '/api/settings/groups',
  'query-snippets': '/api/settings/query-snippets',
  users: '/api/settings/users',
};

export async function getSettingsMenu(): Promise<SettingsMenuResponse> {
  return fetchServerJson<SettingsMenuResponse>('/api/settings/menu');
}

export async function getSettingsSectionData<K extends SettingsSectionKey>(
  section: K,
): Promise<SettingsSectionDataMap[K]> {
  return fetchServerJson<SettingsSectionDataMap[K]>(
    SETTINGS_SECTION_API_PATH[section],
  );
}

export async function getSettingsSession(): Promise<SessionResponse> {
  return getSessionData();
}
