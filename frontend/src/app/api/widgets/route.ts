import { proxyWidgetsRequest } from './proxy';

export async function POST(request: Request) {
  return proxyWidgetsRequest(request, 'POST');
}
