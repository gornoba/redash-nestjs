import { fetchServerJson } from '@/lib/server-backend';

import type {
  AdminJobsResponse,
  AdminOutdatedQueriesResponse,
  AdminStatusResponse,
} from '../types';

export async function getAdminStatusServer() {
  return fetchServerJson<AdminStatusResponse>('/api/admin/status');
}

export async function getAdminJobsServer() {
  return fetchServerJson<AdminJobsResponse>('/api/admin/queries/jobs');
}

export async function getAdminOutdatedQueriesServer() {
  return fetchServerJson<AdminOutdatedQueriesResponse>(
    '/api/admin/queries/outdated',
  );
}
