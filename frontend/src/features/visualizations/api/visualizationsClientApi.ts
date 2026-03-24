'use client';

import { apiClient, proxyApiClient } from '@/lib/api-client';
import type {
  PublicEmbedResponse,
  QueryVisualization,
  SaveVisualizationPayload,
} from '@/features/queries/types';

export async function createVisualization(payload: SaveVisualizationPayload) {
  const response = await proxyApiClient.post<QueryVisualization>(
    '/api/visualizations',
    payload,
  );

  return response.data;
}

export async function updateVisualization(
  visualizationId: number,
  payload: SaveVisualizationPayload,
) {
  const response = await proxyApiClient.post<QueryVisualization>(
    `/api/visualizations/${visualizationId}`,
    payload,
  );

  return response.data;
}

export async function deleteVisualization(visualizationId: number) {
  const response = await proxyApiClient.delete<QueryVisualization>(
    `/api/visualizations/${visualizationId}`,
  );

  return response.data;
}

export async function getPublicVisualizationEmbed(
  queryId: number,
  visualizationId: number,
  apiKey: string,
) {
  const response = await apiClient.get<PublicEmbedResponse>(
    `/api/embed/query/${queryId}/visualization/${visualizationId}`,
    {
      params: {
        api_key: apiKey,
      },
    },
  );

  return response.data;
}
