import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/lib/api-base-url';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/access-token-cookie';

export async function POST() {
  await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  }).catch(() => null);

  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_TOKEN_COOKIE_NAME);

  return NextResponse.json({ message: '로그아웃되었습니다.' });
}
