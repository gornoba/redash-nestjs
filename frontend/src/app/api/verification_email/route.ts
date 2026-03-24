import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/lib/api-base-url';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/access-token-cookie';

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return 'Failed to resend verification email.';
  }

  const message = (payload as { message?: string | string[] }).message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  if (typeof message === 'string') {
    return message;
  }

  return 'Failed to resend verification email.';
}

export async function POST() {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const response = await fetch(`${getApiBaseUrl()}/api/verification_email`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    cache: 'no-store',
  });

  const data = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    return NextResponse.json(
      { message: getErrorMessage(data) },
      { status: response.status },
    );
  }

  return NextResponse.json(data, { status: response.status });
}
