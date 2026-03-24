import { proxyQueriesRequest } from './proxy';

export async function GET(request: Request) {
  return proxyQueriesRequest(request, 'GET');
}

export async function POST(request: Request) {
  return proxyQueriesRequest(request, 'POST');
}
