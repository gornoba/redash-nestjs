import { getApiBaseUrl } from '@/lib/api-base-url';

async function proxyResetRequest(
  request: Request,
  method: 'GET' | 'POST',
  token: string,
) {
  const response =
    method === 'GET'
      ? await fetch(
          `${getApiBaseUrl()}/api/users/reset?token=${encodeURIComponent(token)}`,
          {
            method,
            headers: {
              Accept: 'application/json',
            },
            cache: 'no-store',
          },
        )
      : await fetch(`${getApiBaseUrl()}/api/users/reset`, {
          method,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...(await request.json().catch(() => ({}))),
            token,
          }),
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

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  return proxyResetRequest(request, 'GET', token);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  return proxyResetRequest(request, 'POST', token);
}
