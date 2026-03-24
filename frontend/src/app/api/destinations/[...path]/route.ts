import { proxyDestinationRequest } from '../proxy';

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  return proxyDestinationRequest(request, 'GET', path);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  return proxyDestinationRequest(request, 'POST', path);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;

  return proxyDestinationRequest(request, 'DELETE', path);
}
