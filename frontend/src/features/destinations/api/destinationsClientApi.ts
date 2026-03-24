'use client';

import type {
  DestinationListItem,
  DestinationDetail,
  DestinationTypeDefinition,
  SaveDestinationPayload,
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

export async function getDestinationTypesClient() {
  const response = await fetch('/api/destinations/types', {
    cache: 'no-store',
  });
  const data = await readJson<DestinationTypeDefinition[]>(response);

  if (!response.ok || !data) {
    throw new Error(getErrorMessage(data, 'Failed to load alert destination types.'));
  }

  return data;
}

export async function getDestinationsClient() {
  const response = await fetch('/api/destinations', {
    cache: 'no-store',
  });
  const data = await readJson<DestinationListItem[]>(response);

  if (!response.ok || !data) {
    throw new Error(getErrorMessage(data, 'Failed to load alert destinations.'));
  }

  return data;
}

export async function createDestination(payload: SaveDestinationPayload) {
  const response = await fetch('/api/destinations', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson<DestinationDetail>(response);

  if (!response.ok || !data) {
    throw new Error(getErrorMessage(data, 'Failed to create alert destination.'));
  }

  return data;
}

export async function updateDestination(
  destinationId: number,
  payload: SaveDestinationPayload,
) {
  const response = await fetch(`/api/destinations/${destinationId}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await readJson<DestinationDetail>(response);

  if (!response.ok || !data) {
    throw new Error(getErrorMessage(data, 'Failed to save alert destination.'));
  }

  return data;
}

export async function deleteDestination(destinationId: number) {
  const response = await fetch(`/api/destinations/${destinationId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const data = await readJson<{ message?: string | string[] }>(response);
    throw new Error(getErrorMessage(data, 'Failed to delete alert destination.'));
  }
}
