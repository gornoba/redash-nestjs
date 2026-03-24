import { cookies } from 'next/headers';

import { getApiBaseUrl } from '@/lib/api-base-url';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/access-token-cookie';

async function proxyGroupsRequest(
  request: Request,
  method: 'GET' | 'POST' | 'DELETE',
  path: string[],
) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  if (!accessToken) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestBody = method === 'GET' ? '' : await request.text();
  const hasRequestBody = requestBody.length > 0;
  const response = await fetch(
    `${getApiBaseUrl()}/api/groups/${path.join('/')}${url.search}`,
    {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(hasRequestBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasRequestBody ? requestBody : undefined,
      cache: 'no-store',
    },
  );

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('content-type') ?? 'application/json',
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  return proxyGroupsRequest(request, 'GET', path);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  return proxyGroupsRequest(request, 'POST', path);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  return proxyGroupsRequest(request, 'DELETE', path);
}
