'use client';

import { proxyApiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';

import type {
  OrganizationSettings,
  OrganizationSettingsResponse,
} from '../types';

export async function updateOrganizationSettings(
  payload: OrganizationSettings,
): Promise<OrganizationSettingsResponse> {
  try {
    const response = await proxyApiClient.post<OrganizationSettingsResponse>(
      '/api/settings/organization',
      payload,
    );

    return response.data;
  } catch (error) {
    throw new Error(
      getApiErrorMessage(error, 'Failed to update organization settings.'),
    );
  }
}
