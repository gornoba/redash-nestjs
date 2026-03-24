import { proxyAdminRequest } from '../proxy';

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  return proxyAdminRequest(request, 'GET', path);
}
