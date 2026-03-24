import axios from 'axios';

import { getApiBaseUrl } from './api-base-url';

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const proxyApiClient = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);

proxyApiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
);
