'use client';

interface LoginPayload {
  email: string;
  password: string;
  orgSlug?: string;
}

export async function login(payload: LoginPayload) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      orgSlug: payload.orgSlug ?? 'default',
      email: payload.email,
      password: payload.password,
    }),
  });

  const data = (await response.json().catch(() => null)) as {
    message?: string | string[];
    accessToken?: string;
    tokenType?: 'Bearer';
    expiresIn?: string;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  } | null;

  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message;
    throw new Error(message ?? 'Login failed.');
  }

  return data as {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
}
