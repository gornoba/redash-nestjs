import { proxyVisualizationsRequest } from './proxy';

export async function POST(request: Request) {
  return proxyVisualizationsRequest(request, 'POST');
}
