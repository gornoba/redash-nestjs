import { getApiBaseUrl } from '@/lib/api-base-url';

async function proxyInviteRequest(
  request: Request,
  method: 'GET' | 'POST',
  token: string,
) {
  const response =
    method === 'GET'
      ? await fetch(
          `${getApiBaseUrl()}/api/users/invitations?token=${encodeURIComponent(token)}`,
          {
            method,
            headers: {
              Accept: 'application/json',
            },
            cache: 'no-store',
          },
        )
      : await fetch(`${getApiBaseUrl()}/api/users/invitations`, {
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

  return proxyInviteRequest(request, 'GET', token);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  return proxyInviteRequest(request, 'POST', token);
}
