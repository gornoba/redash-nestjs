import { proxyDataSourceRequest } from './proxy';

export async function GET(request: Request) {
  return proxyDataSourceRequest(request, 'GET');
}

export async function POST(request: Request) {
  return proxyDataSourceRequest(request, 'POST');
}
