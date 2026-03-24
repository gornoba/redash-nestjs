'use client';

import { proxyApiClient } from '@/lib/api-client';

import type {
  DataSourceDetail,
  DataSourceSummary,
  DataSourceSchemaResponse,
  DataSourceTestResponse,
  DataSourceTypeDefinition,
  SaveDataSourcePayload,
} from '../types';

function getErrorMessage(payload: unknown, fallbackMessage: string) {
  if (!payload || typeof payload !== 'object') {
    return fallbackMessage;
  }

  const message = (payload as { message?: string | string[] }).message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return fallbackMessage;
}

async function readJson<T>(response: Response) {
  return (await response.json().catch(() => null)) as T | null;
}

export async function getDataSources() {
  const response = await proxyApiClient.get<DataSourceSummary[]>(
    '/api/data_sources',
  );

  return response.data;
}

export async function getDataSourceSchema(
  dataSourceId: number,
  refresh = false,
) {
  const response = await proxyApiClient.get<DataSourceSchemaResponse>(
    `/api/data_sources/${dataSourceId}/schema`,
    {
      params: refresh ? { refresh: true } : undefined,
    },
  );

  return response.data;
}

export async function getDataSourceTypesClient() {
  const response = await fetch('/api/data_sources/types', {
    cache: 'no-store',
  });
  const data = await readJson<DataSourceTypeDefinition[]>(response);

  if (!response.ok || !data) {
    throw new Error(getErrorMessage(data, 'Failed to load data source types.'));
  }

  return data;
}

export async function createDataSource(payload: SaveDataSourcePayload) {
  const response = await fetch('/api/data_sources', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson<DataSourceDetail>(response);

  if (!response.ok || !data) {
    throw new Error(getErrorMessage(data, 'Failed to create data source.'));
  }

  return data;
}

export async function updateDataSource(
  dataSourceId: number,
  payload: SaveDataSourcePayload,
) {
  const response = await fetch(`/api/data_sources/${dataSourceId}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson<DataSourceDetail>(response);

  if (!response.ok || !data) {
    throw new Error(getErrorMessage(data, 'Failed to save data source.'));
  }

  return data;
}

export async function testDataSourceConnection(dataSourceId: number) {
  const response = await fetch(`/api/data_sources/${dataSourceId}/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });
  const data = await readJson<DataSourceTestResponse>(response);

  if (!response.ok || !data) {
    throw new Error(
      getErrorMessage(data, 'Failed to test data source connection.'),
    );
  }

  return data;
}

export async function deleteDataSource(dataSourceId: number) {
  const response = await fetch(`/api/data_sources/${dataSourceId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await readJson<{ message?: string | string[] }>(response);
    throw new Error(
      getErrorMessage(data, 'Failed to delete data source.'),
    );
  }
}
