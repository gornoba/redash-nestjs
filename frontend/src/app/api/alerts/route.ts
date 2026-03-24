import { proxyAlertsRequest } from './proxy';

export async function GET(request: Request) {
  return proxyAlertsRequest(request, 'GET');
}

export async function POST(request: Request) {
  return proxyAlertsRequest(request, 'POST');
}
