import { apiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';

import type { SetupStateResponse } from '../types';

export async function getSetupState(): Promise<SetupStateResponse> {
  try {
    const response = await apiClient.get<SetupStateResponse>('/api/setup');
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Request failed.'));
  }
}

export async function submitSetup(payload: {
  name: string;
  email: string;
  password: string;
  orgName: string;
  securityNotifications: boolean;
  newsletter: boolean;
}) {
  try {
    const response = await apiClient.post('/api/setup', payload);
    return response.data as {
      message: string;
      organization: { id: number; name: string; slug: string };
      user: { id: number; name: string; email: string };
    };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Request failed.'));
  }
}
