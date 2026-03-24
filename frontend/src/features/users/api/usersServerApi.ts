import { getSessionData } from '@/features/home';
import { fetchServerJson } from '@/lib/server-backend';

import type { SessionResponse } from '@/features/home/types';
import type { UserDetailResponse } from '../types';

export async function getUserDetail(userId: number): Promise<UserDetailResponse> {
  return fetchServerJson<UserDetailResponse>(`/api/users/${userId}`);
}

export async function getUsersSession(): Promise<SessionResponse> {
  return getSessionData();
}
