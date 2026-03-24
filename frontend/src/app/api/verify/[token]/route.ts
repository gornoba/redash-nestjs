import { getApiBaseUrl } from '@/lib/api-base-url';

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const response = await fetch(
    `${getApiBaseUrl()}/api/verify/${encodeURIComponent(token)}`,
    {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    },
  );

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}
