'use client';

import { proxyApiClient } from '@/lib/api-client';

import type {
  ExecuteQueryPayload,
  ExecuteQueryJobStatusResponse,
  ExecuteQueryResponse,
  QueryDetail,
  QueryExecutionResult,
  QueryListResponse,
  QueryListView,
  QueryTagsResponse,
  SaveQueryPayload,
} from '../types';

interface GetQueriesParams {
  order?: string;
  page: number;
  page_size: number;
  q?: string;
  tags: string[];
}

interface QueryRequestOptions {
  signal?: AbortSignal;
}

const QUERY_VIEW_PATH: Record<QueryListView, string> = {
  all: '/api/queries',
  archive: '/api/queries/archive',
  favorites: '/api/queries/favorites',
  my: '/api/queries/my',
};

export async function getQueries(
  view: QueryListView,
  params: GetQueriesParams,
  options?: QueryRequestOptions,
): Promise<QueryListResponse> {
  const response = await proxyApiClient.get<QueryListResponse>(
    QUERY_VIEW_PATH[view],
    {
      params,
      paramsSerializer: {
        indexes: null,
      },
      signal: options?.signal,
    },
  );

  return response.data;
}

export async function getQueryTags(
  options?: QueryRequestOptions,
): Promise<QueryTagsResponse> {
  const response = await proxyApiClient.get<QueryTagsResponse>('/api/queries/tags', {
    signal: options?.signal,
  });

  return response.data;
}

export async function getQueryDetail(queryId: number) {
  const response = await proxyApiClient.get<QueryDetail>(`/api/queries/${queryId}`);

  return response.data;
}

export async function favoriteQuery(queryId: number) {
  const response = await proxyApiClient.post<QueryDetail>(
    `/api/queries/${queryId}/favorite`,
  );

  return response.data;
}

export async function unfavoriteQuery(queryId: number) {
  const response = await proxyApiClient.delete<QueryDetail>(
    `/api/queries/${queryId}/favorite`,
  );

  return response.data;
}

export async function createQuery(payload: SaveQueryPayload) {
  const response = await proxyApiClient.post<QueryDetail>(
    '/api/queries',
    payload,
  );

  return response.data;
}

export async function updateQuery(queryId: number, payload: SaveQueryPayload) {
  const response = await proxyApiClient.post<QueryDetail>(
    `/api/queries/${queryId}`,
    payload,
  );

  return response.data;
}

export async function updateQuerySchedule(
  queryId: number,
  schedule: Record<string, unknown> | null,
) {
  const response = await proxyApiClient.post<QueryDetail>(
    `/api/queries/${queryId}/schedule`,
    {
      schedule,
    },
  );

  return response.data;
}

export async function archiveQuery(queryId: number) {
  const response = await proxyApiClient.delete<QueryDetail>(
    `/api/queries/${queryId}`,
  );

  return response.data;
}

export async function forkQuery(queryId: number) {
  const response = await proxyApiClient.post<QueryDetail>(
    `/api/queries/${queryId}/fork`,
  );

  return response.data;
}

export async function regenerateQueryApiKey(queryId: number) {
  const response = await proxyApiClient.post<QueryDetail>(
    `/api/queries/${queryId}/regenerate_api_key`,
  );

  return response.data;
}

export async function executeQuery(payload: ExecuteQueryPayload) {
  const response = await proxyApiClient.post<ExecuteQueryResponse>(
    '/api/queries/results',
    payload,
  );

  return response.data;
}

export async function getExecuteQueryJobStatus(jobId: string) {
  const response = await proxyApiClient.get<ExecuteQueryJobStatusResponse>(
    `/api/queries/jobs/${jobId}`,
  );

  return response.data;
}

export async function getQueryExecutionResult(queryResultId: number) {
  const response = await proxyApiClient.get<QueryExecutionResult>(
    `/api/queries/results/${queryResultId}`,
  );

  return response.data;
}
