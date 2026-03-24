'use server';

import { fetchServerJson } from '@/lib/server-backend';

import type { SetupStateResponse } from '../types';

const FALLBACK_SETUP_STATE: SetupStateResponse = {
  isSetupRequired: false,
  defaults: {
    securityNotifications: true,
    newsletter: true,
  },
};

export async function getSetupStateServer(): Promise<SetupStateResponse> {
  return fetchServerJson<SetupStateResponse>('/setup');
}

export async function getSetupStateServerSafe(): Promise<SetupStateResponse> {
  try {
    return await getSetupStateServer();
  } catch {
    return FALLBACK_SETUP_STATE;
  }
}
