import { fetchServerJson } from '@/lib/server-backend';

import type {
  DestinationDetail,
  DestinationTypeDefinition,
} from '../types';

export async function getDestinationTypesServer() {
  return fetchServerJson<DestinationTypeDefinition[]>('/api/destinations/types');
}

export async function getDestinationServer(destinationId: number) {
  return fetchServerJson<DestinationDetail>(`/api/destinations/${destinationId}`);
}
