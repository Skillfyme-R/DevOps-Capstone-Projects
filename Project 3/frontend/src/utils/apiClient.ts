import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const AUTH_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:9001/api/v1';
const PATIENTS_URL = process.env.REACT_APP_PATIENTS_URL || 'http://localhost:9002/api/v1';
const APPOINTMENTS_URL = process.env.REACT_APP_APPOINTMENTS_URL || 'http://localhost:9003/api/v1';
const ANALYTICS_URL = process.env.REACT_APP_ANALYTICS_URL || 'http://localhost:9005/api/v1';

function attachToken(config: InternalAxiosRequestConfig) {
  const token = localStorage.getItem('mc_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}

function makeRefreshingClient(baseURL: string) {
  const client = axios.create({ baseURL, timeout: 15000, headers: { 'Content-Type': 'application/json' } });
  client.interceptors.request.use(attachToken);
  client.interceptors.response.use(
    (res: AxiosResponse) => res,
    async (err: AxiosError) => {
      const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (err.response?.status === 401 && !original._retry) {
        original._retry = true;
        const refreshToken = localStorage.getItem('mc_refresh_token');
        if (refreshToken) {
          try {
            const { data } = await axios.post(`${AUTH_URL}/auth/refresh`, { refreshToken });
            localStorage.setItem('mc_access_token', data.accessToken);
            original.headers.Authorization = `Bearer ${data.accessToken}`;
            return client(original);
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
  return client;
}

export const apiClient = makeRefreshingClient(AUTH_URL);
export const patientsClient = makeRefreshingClient(PATIENTS_URL);
export const appointmentsClient = makeRefreshingClient(APPOINTMENTS_URL);
export const analyticsClient = makeRefreshingClient(ANALYTICS_URL);

export const fhirClient = axios.create({
  baseURL: process.env.REACT_APP_FHIR_BASE_URL || 'http://localhost:9002/fhir/r4',
  timeout: 15000,
  headers: { 'Content-Type': 'application/fhir+json', Accept: 'application/fhir+json' },
});

fhirClient.interceptors.request.use(attachToken);
