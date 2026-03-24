const DEFAULT_LOCAL_API_BASE_URL = 'http://localhost:4000';

export function getPublicApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_LOCAL_API_BASE_URL;
}

export function getServerApiBaseUrl() {
  return process.env.API_BASE_URL ?? getPublicApiBaseUrl();
}

export function getApiBaseUrl() {
  // Next.js only exposes NEXT_PUBLIC_* values to browser bundles.
  return typeof window === 'undefined'
    ? getServerApiBaseUrl()
    : getPublicApiBaseUrl();
}
