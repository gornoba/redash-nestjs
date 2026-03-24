import { fetchServerJson } from '@/lib/server-backend';

import type {
  DataSourceDetail,
  DataSourceTypeDefinition,
} from '../types';

export async function getDataSourceTypesServer() {
  return fetchServerJson<DataSourceTypeDefinition[]>('/api/data_sources/types');
}

export async function getDataSourceServer(dataSourceId: number) {
  return fetchServerJson<DataSourceDetail>(`/api/data_sources/${dataSourceId}`);
}
