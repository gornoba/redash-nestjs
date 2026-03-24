'use client';

import { proxyApiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';

import type {
  AlertDetail,
  AlertListItem,
  AlertSubscriptionItem,
  SaveAlertPayload,
} from '../types';

interface GetAlertsParams {
  order?: string;
  q?: string;
}

export async function getAlerts(params: GetAlertsParams = {}) {
  try {
    const response = await proxyApiClient.get<AlertListItem[]>('/api/alerts', {
      params,
    });

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load alerts.'));
  }
}

export async function getAlert(alertId: number) {
  try {
    const response = await proxyApiClient.get<AlertDetail>(
      `/api/alerts/${alertId}`,
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load alert.'));
  }
}

export async function createAlert(payload: SaveAlertPayload) {
  try {
    const response = await proxyApiClient.post<AlertDetail>(
      '/api/alerts',
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to save alert.'));
  }
}

export async function updateAlert(alertId: number, payload: SaveAlertPayload) {
  try {
    const response = await proxyApiClient.post<AlertDetail>(
      `/api/alerts/${alertId}`,
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to save alert.'));
  }
}

export async function deleteAlert(alertId: number) {
  try {
    await proxyApiClient.delete(`/api/alerts/${alertId}`);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed deleting alert.'));
  }
}

export async function muteAlert(alertId: number) {
  try {
    await proxyApiClient.post(`/api/alerts/${alertId}/mute`);
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Failed muting notifications.'),
    );
  }
}

export async function unmuteAlert(alertId: number) {
  try {
    await proxyApiClient.delete(`/api/alerts/${alertId}/mute`);
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Failed restoring notifications.'),
    );
  }
}

export async function getAlertSubscriptions(alertId: number) {
  try {
    const response = await proxyApiClient.get<AlertSubscriptionItem[]>(
      `/api/alerts/${alertId}/subscriptions`,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Failed to load alert subscriptions.'),
    );
  }
}

export async function createAlertSubscription(
  alertId: number,
  payload: { destination_id?: number },
) {
  try {
    const response = await proxyApiClient.post<AlertSubscriptionItem>(
      `/api/alerts/${alertId}/subscriptions`,
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Failed to save alert subscription.'),
    );
  }
}

export async function deleteAlertSubscription(
  alertId: number,
  subscriptionId: number,
) {
  try {
    await proxyApiClient.delete(
      `/api/alerts/${alertId}/subscriptions/${subscriptionId}`,
    );
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Failed deleting alert subscription.'),
    );
  }
}
