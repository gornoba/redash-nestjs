import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/lib/api-base-url';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/access-token-cookie';

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return 'Login failed.';
  }

  const message = (payload as { message?: string | string[] }).message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return 'Login failed.';
}

export async function POST(request: Request) {
  const payload = await request.json();
  const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    return NextResponse.json(
      { message: getErrorMessage(data) },
      { status: response.status },
    );
  }

  const accessToken = (data as { accessToken?: string } | null)?.accessToken;

  if (!accessToken) {
    return NextResponse.json(
      { message: 'Login failed.' },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
  });

  return NextResponse.json(data, { status: response.status });
}
