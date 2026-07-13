import type {
  ActuatorHealthResponse,
  ErrorResponse,
  LoginRequest,
  StartWorkflowRequest,
  StartWorkflowResponse,
  TokenResponse,
  WorkflowDefinitionResponse,
  WorkflowExecutionResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const API_V1 = `${API_BASE_URL}/api/pulsar/v1`;

export class ApiError extends Error {
  status: number;
  errorCode?: string;

  constructor(status: number, message: string, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

type TokenGetter = () => string | null;

let getAccessToken: TokenGetter = () => null;

// Wired from AuthContext at app startup so the client stays framework-agnostic and testable standalone.
export function registerTokenGetter(getter: TokenGetter): void {
  getAccessToken = getter;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_V1}${path}`, { ...options, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const err = body as ErrorResponse | undefined;
    throw new ApiError(response.status, err?.message ?? response.statusText, err?.errorCode);
  }

  return body as T;
}

export const authApi = {
  login: (payload: LoginRequest) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  refresh: (refreshToken: string) =>
    request<TokenResponse>('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
};

export const workflowDefinitionApi = {
  getLatest: (name: string) => request<WorkflowDefinitionResponse>(`/workflow-definitions/${encodeURIComponent(name)}`),
  getVersion: (name: string, version: number) =>
    request<WorkflowDefinitionResponse>(`/workflow-definitions/${encodeURIComponent(name)}/versions/${version}`),
  getAllVersions: (name: string) =>
    request<WorkflowDefinitionResponse[]>(`/workflow-definitions/${encodeURIComponent(name)}/versions`),
};

export const workflowExecutionApi = {
  start: (payload: StartWorkflowRequest) =>
    request<StartWorkflowResponse>('/workflows', { method: 'POST', body: JSON.stringify(payload) }),
  get: (id: string) => request<WorkflowExecutionResponse>(`/workflows/${id}`),
  pause: (id: string) => request<void>(`/workflows/${id}/pause`, { method: 'PUT' }),
  resume: (id: string) => request<void>(`/workflows/${id}/resume`, { method: 'PUT' }),
  terminate: (id: string) => request<void>(`/workflows/${id}/terminate`, { method: 'PUT' }),
  retry: (id: string) => request<void>(`/workflows/${id}/retry`, { method: 'POST' }),
  rerun: (id: string) => request<StartWorkflowResponse>(`/workflows/${id}/rerun`, { method: 'POST' }),
};

// Actuator lives outside /api/pulsar/v1 and needs no auth header (permitAll in SecurityConfig).
export const actuatorApi = {
  health: async (): Promise<ActuatorHealthResponse> => {
    const response = await fetch(`${API_BASE_URL}/actuator/health`);
    if (!response.ok) {
      throw new ApiError(response.status, 'Health endpoint unreachable');
    }
    return response.json();
  },
  info: async (): Promise<Record<string, unknown>> => {
    const response = await fetch(`${API_BASE_URL}/actuator/info`);
    if (!response.ok) {
      throw new ApiError(response.status, 'Info endpoint unreachable');
    }
    return response.json();
  },
};

export { API_BASE_URL };
