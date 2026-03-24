import { cookies } from 'next/headers';

import { getApiBaseUrl } from '@/lib/api-base-url';
import { ACCESS_TOKEN_COOKIE_NAME } from '@/lib/access-token-cookie';

export async function proxyQueriesRequest(
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
  const upstreamUrl = `${getApiBaseUrl()}/api/queries${suffix}${url.search}`;
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

  return new Response(response.body, {
    headers: buildProxyResponseHeaders(response),
    status: response.status,
  });
}

function buildProxyResponseHeaders(response: Response) {
  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  const cacheControl = response.headers.get('cache-control');

  if (contentType) {
    headers.set('Content-Type', contentType);
  } else {
    headers.set('Content-Type', 'application/json');
  }

  if (cacheControl) {
    headers.set('Cache-Control', cacheControl);
  }

  return headers;
}
