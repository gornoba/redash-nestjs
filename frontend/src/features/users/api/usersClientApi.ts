import type {
  AcceptLinkPayload,
  AcceptLinkResponse,
  CreateUserPayload,
  CreatedUserResponse,
  LinkDetailsResponse,
  UpdateUserPayload,
  UserDetailResponse,
} from '../types';

export class UsersApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string;
    statusCode?: number;
  };

  if (!response.ok) {
    throw new UsersApiError(
      payload.message ?? 'Request failed.',
      payload.statusCode ?? response.status,
    );
  }

  return payload as T;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await fetch('/api/users', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return readJson<CreatedUserResponse>(response);
}

export async function getUser(userId: number) {
  const response = await fetch(`/api/users/${userId}`, {
    cache: 'no-store',
    credentials: 'include',
  });

  return readJson<UserDetailResponse>(response);
}

export async function updateUser(userId: number, payload: UpdateUserPayload) {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return readJson<UserDetailResponse>(response);
}

export async function deleteUser(userId: number) {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  return readJson<CreatedUserResponse>(response);
}

export async function resendInvitation(userId: number) {
  const response = await fetch(`/api/users/${userId}/invite`, {
    method: 'POST',
    credentials: 'include',
  });

  return readJson<UserDetailResponse>(response);
}

export async function sendPasswordReset(userId: number) {
  const response = await fetch(`/api/users/${userId}/reset_password`, {
    method: 'POST',
    credentials: 'include',
  });

  return readJson<UserDetailResponse>(response);
}

export async function regenerateApiKey(userId: number) {
  const response = await fetch(`/api/users/${userId}/regenerate_api_key`, {
    method: 'POST',
    credentials: 'include',
  });

  return readJson<UserDetailResponse>(response);
}

export async function disableUser(userId: number) {
  const response = await fetch(`/api/users/${userId}/disable`, {
    method: 'POST',
    credentials: 'include',
  });

  return readJson<UserDetailResponse>(response);
}

export async function enableUser(userId: number) {
  const response = await fetch(`/api/users/${userId}/disable`, {
    method: 'DELETE',
    credentials: 'include',
  });

  return readJson<UserDetailResponse>(response);
}

export async function getLinkDetails(mode: 'invite' | 'reset', token: string) {
  const path =
    mode === 'invite'
      ? `/api/users/invitations/${token}`
      : `/api/users/reset/${token}`;
  const response = await fetch(path, {
    cache: 'no-store',
    credentials: 'include',
  });

  return readJson<LinkDetailsResponse>(response);
}

export async function acceptLink(
  mode: 'invite' | 'reset',
  token: string,
  payload: AcceptLinkPayload,
) {
  const path =
    mode === 'invite'
      ? `/api/users/invitations/${token}`
      : `/api/users/reset/${token}`;
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return readJson<AcceptLinkResponse>(response);
}
