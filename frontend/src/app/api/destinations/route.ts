import { proxyDestinationRequest } from './proxy';

export async function GET(request: Request) {
  return proxyDestinationRequest(request, 'GET');
}

export async function POST(request: Request) {
  return proxyDestinationRequest(request, 'POST');
}
