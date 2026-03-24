'use client';

import { proxyApiClient } from '@/lib/api-client';

import type {
  AdminJobsResponse,
  AdminOutdatedQueriesResponse,
  AdminStatusResponse,
} from '../types';

export async function getAdminStatus() {
  const response = await proxyApiClient.get<AdminStatusResponse>(
    '/api/admin/status',
  );

  return response.data;
}

export async function getAdminJobs() {
  const response = await proxyApiClient.get<AdminJobsResponse>(
    '/api/admin/queries/jobs',
  );

  return response.data;
}

export async function getAdminOutdatedQueries() {
  const response = await proxyApiClient.get<AdminOutdatedQueriesResponse>(
    '/api/admin/queries/outdated',
  );

  return response.data;
}
