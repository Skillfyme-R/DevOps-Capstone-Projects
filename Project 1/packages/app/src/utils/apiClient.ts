/**
 * NexusFinance API Client
 *
 * A configured Axios instance for all backend API calls.
 * Handles:
 *   1. Base URL (so routes can use '/accounts' instead of full URL)
 *   2. Automatic JWT token injection into every request header
 *   3. Token refresh when access token expires (401 response)
 *   4. Redirect to /login if refresh also fails
 *   5. Request/response interceptors for logging
 */

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = (window as any).REACT_APP_API_URL ?? 'http://localhost:7008';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30_000,  // 30 second timeout (payments can take time)
  headers: {
    'Content-Type': 'application/json',
    'X-Platform':   'nexusfinance-web',
  },
  withCredentials: true,  // Send cookies (for refresh token)
});

// ── Request Interceptor ─────────────────────────────────────────────────────
// Runs BEFORE every request is sent
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Inject the JWT access token from localStorage into every request
    const token = localStorage.getItem('nexus_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ── Response Interceptor ────────────────────────────────────────────────────
// Runs AFTER every response is received
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response, // Pass successful responses through unchanged

  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Token expired (401) — try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Prevent infinite retry loop

      try {
        const refreshToken = localStorage.getItem('nexus_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`http://localhost:7008/api/v1/auth/refresh`, { refreshToken });
        localStorage.setItem('nexus_access_token',  data.accessToken);
        localStorage.setItem('nexus_refresh_token', data.refreshToken);

        // Retry the original failed request with the new token
        originalRequest.headers!.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        // Refresh also failed — clear tokens and send to login
        localStorage.removeItem('nexus_access_token');
        localStorage.removeItem('nexus_refresh_token');
        window.location.href = '/login?expired=true';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ── Typed API Methods ───────────────────────────────────────────────────────
// Convenience wrappers that return typed data directly (unwrap .data)

export const api = {
  get:    <T>(url: string, params?: object) =>
            apiClient.get<T>(url, { params }).then(r => r.data),
  post:   <T>(url: string, data?: unknown) =>
            apiClient.post<T>(url, data).then(r => r.data),
  patch:  <T>(url: string, data?: unknown) =>
            apiClient.patch<T>(url, data).then(r => r.data),
  put:    <T>(url: string, data?: unknown) =>
            apiClient.put<T>(url, data).then(r => r.data),
  delete: <T>(url: string) =>
            apiClient.delete<T>(url).then(r => r.data),
};
