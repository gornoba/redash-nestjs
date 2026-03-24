import { proxyDashboardsRequest } from './proxy';

export async function GET(request: Request) {
  return proxyDashboardsRequest(request, 'GET');
}

export async function POST(request: Request) {
  return proxyDashboardsRequest(request, 'POST');
}
