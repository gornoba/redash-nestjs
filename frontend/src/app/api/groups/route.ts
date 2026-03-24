import { cookies } from 'next/headers';

import { getApiBaseUrl } from '@/lib/api-base-url';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/access-token-cookie';

async function proxyGroupsRoot(request: Request, method: 'GET' | 'POST') {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  if (!accessToken) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const requestBody = method === 'GET' ? '' : await request.text();
  const hasRequestBody = requestBody.length > 0;
  const response = await fetch(`${getApiBaseUrl()}/api/groups`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(hasRequestBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasRequestBody ? requestBody : undefined,
    cache: 'no-store',
  });

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}

export async function GET(request: Request) {
  return proxyGroupsRoot(request, 'GET');
}

export async function POST(request: Request) {
  return proxyGroupsRoot(request, 'POST');
}
