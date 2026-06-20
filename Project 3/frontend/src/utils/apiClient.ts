import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8090/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('mc_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('mc_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          localStorage.setItem('mc_access_token', data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(original);
        } catch {
          localStorage.removeItem('mc_access_token');
          localStorage.removeItem('mc_refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const fhirClient = axios.create({
  baseURL: process.env.REACT_APP_FHIR_BASE_URL || 'http://localhost:8090/fhir/r4',
  timeout: 15000,
  headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
});

fhirClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('mc_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
