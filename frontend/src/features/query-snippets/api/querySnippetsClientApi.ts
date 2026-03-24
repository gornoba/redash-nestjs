'use client';

import { proxyApiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';

import type { SettingsQuerySnippetItem } from '@/features/settings/types';

export interface SaveQuerySnippetPayload {
  description: string;
  snippet: string;
  trigger: string;
}

export async function getQuerySnippets() {
  try {
    const response = await proxyApiClient.get<{ items: SettingsQuerySnippetItem[] }>(
      '/api/settings/query-snippets',
    );

    return response.data.items;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load query snippets.'));
  }
}

export async function createQuerySnippet(payload: SaveQuerySnippetPayload) {
  try {
    const response = await proxyApiClient.post<SettingsQuerySnippetItem>(
      '/api/settings/query-snippets',
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed saving snippet.'));
  }
}

export async function updateQuerySnippet(
  snippetId: number,
  payload: SaveQuerySnippetPayload,
) {
  try {
    const response = await proxyApiClient.post<SettingsQuerySnippetItem>(
      `/api/settings/query-snippets/${snippetId}`,
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed saving snippet.'));
  }
}

export async function deleteQuerySnippet(snippetId: number) {
  try {
    await proxyApiClient.delete(`/api/settings/query-snippets/${snippetId}`);
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Failed deleting query snippet.'),
    );
  }
}
