import { fetchServerJson, isForbiddenError } from '@/lib/server-backend';

import type {
  FavoritesResponse,
  OrganizationStatusResponse,
  SessionResponse,
} from '../types';

export async function getSessionData(): Promise<SessionResponse> {
  return fetchServerJson<SessionResponse>('/api/session');
}

export async function getHomePageSupportingData(): Promise<{
  favoriteDashboards: FavoritesResponse;
  favoriteQueries: FavoritesResponse;
  organizationStatus: OrganizationStatusResponse;
}> {
  async function getFavoritesOrEmpty(path: '/api/dashboards/favorites' | '/api/queries/favorites') {
    try {
      return await fetchServerJson<FavoritesResponse>(path);
    } catch (error) {
      if (isForbiddenError(error)) {
        return {
          count: 0,
          page: 1,
          page_size: 20,
          results: [],
        };
      }

      throw error;
    }
  }

  const [favoriteDashboards, favoriteQueries, organizationStatus] =
    await Promise.all([
      getFavoritesOrEmpty('/api/dashboards/favorites'),
      getFavoritesOrEmpty('/api/queries/favorites'),
      fetchServerJson<OrganizationStatusResponse>('/api/organization/status'),
    ]);

  return {
    favoriteDashboards,
    favoriteQueries,
    organizationStatus,
  };
}
