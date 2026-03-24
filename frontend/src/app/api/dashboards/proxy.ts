import { cookies } from 'next/headers';

import { getApiBaseUrl } from '@/lib/api-base-url';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/access-token-cookie';

export async function proxyDashboardsRequest(
  request: Request,
  method: 'DELETE' | 'GET' | 'POST',
  path: string[] = [],
) {
  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE_NAME)?.value;

  if (!accessToken) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const suffix = path.length > 0 ? `/${path.join('/')}` : '';
  const upstreamUrl = `${getApiBaseUrl()}/api/dashboards${suffix}${url.search}`;
  const requestBody = method === 'GET' ? '' : await request.text();
  const hasBody = requestBody.length > 0;

  const response = await fetch(upstreamUrl, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    },
    body: hasBody ? requestBody : undefined,
    cache: 'no-store',
  });

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('content-type') ?? 'application/json',
    },
  });
}
