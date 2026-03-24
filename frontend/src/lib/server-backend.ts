import axios from 'axios';
import { cookies } from 'next/headers';

import { getApiErrorMessage } from './api-error';
import { getApiBaseUrl } from './api-base-url';
import { ACCESS_TOKEN_COOKIE_NAME } from './access-token-cookie';

function normalizeBackendPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (normalizedPath === '/api' || normalizedPath.startsWith('/api/')) {
    return normalizedPath;
  }

  return `/api${normalizedPath}`;
}

export class BackendRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

async function getAuthorizationHeaders() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function fetchServerJson<T>(path: string): Promise<T> {
  try {
    const response = await axios.get<T>(
      `${getApiBaseUrl()}${normalizeBackendPath(path)}`,
      {
        headers: await getAuthorizationHeaders(),
        timeout: 10000,
      },
    );

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new BackendRequestError(
        error.response?.status ?? 500,
        getApiErrorMessage(error, `Request failed: ${path}`),
      );
    }

    throw error;
  }
}

export function isUnauthorizedError(error: unknown) {
  return error instanceof BackendRequestError && error.statusCode === 401;
}

export function isForbiddenError(error: unknown) {
  return error instanceof BackendRequestError && error.statusCode === 403;
}
