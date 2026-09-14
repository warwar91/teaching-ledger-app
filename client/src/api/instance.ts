import axios from 'axios';
import { clearAuth, getToken } from '@client/src/utils/auth';
import { logger } from '@client/src/utils/logger';

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.includes('/login')) return;
  window.location.replace('/login');
}

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

http.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    logger.error('Request error:', error);
    return Promise.reject(error);
  },
);

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuth();
      redirectToLogin();
    }
    return Promise.reject(error);
  },
);

export { http };
export default http;
