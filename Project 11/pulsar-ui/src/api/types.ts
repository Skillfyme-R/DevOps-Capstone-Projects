// Mirrors media.reelforge.pulsar.core.model + server.api.v1.dto — keep in sync with pulsar-server.

export type WorkflowStatus =
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'TERMINATED'
  | 'TIMED_OUT';

export type TaskExecutionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'FAILED_WITH_TERMINAL_ERROR'
  | 'TIMED_OUT'
  | 'CANCELED'
  | 'SKIPPED';

// SIMPLE is the only type polled by external workers; the rest are in-process control-flow nodes.
export type TaskType = 'SIMPLE' | 'FORK' | 'JOIN' | 'DECISION' | 'SUB_WORKFLOW' | 'DYNAMIC' | 'TERMINATE';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface TaskDefinitionRefDto {
  taskReferenceName: string;
  taskType: TaskType;
  name?: string | null;
  inputParameters: Record<string, unknown>;
  next: string[];
  joinOn: string[];
  decisionInputParameter?: string | null;
  decisionCases: Record<string, string[]>;
  defaultCase: string[];
  subWorkflowName?: string | null;
  subWorkflowVersion: number;
}

export interface WorkflowDefinitionResponse {
  id: string;
  name: string;
  version: number;
  description: string;
  tasks: TaskDefinitionRefDto[];
  timeoutSeconds: number;
  ownerEmail: string;
  createdAt: string;
}

export interface RegisterWorkflowDefinitionRequest {
  name: string;
  version: number;
  description?: string;
  tasks: TaskDefinitionRefDto[];
  timeoutSeconds: number;
  ownerEmail: string;
}

export interface StartWorkflowRequest {
  workflowName: string;
  version?: number | null;
  input: Record<string, unknown>;
  correlationId?: string | null;
}

export interface StartWorkflowResponse {
  workflowExecutionId: string;
}

export interface TaskExecutionResponse {
  id: string;
  workflowExecutionId: string;
  taskReferenceName: string;
  taskType: TaskType;
  status: TaskExecutionStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  retryCount: number;
  scheduledTime: string | null;
  startTime: string | null;
  endTime: string | null;
  workerId: string | null;
  callbackAfterSeconds: number;
}

export interface WorkflowExecutionResponse {
  id: string;
  workflowDefinitionId: string;
  workflowDefinitionVersion: number;
  status: WorkflowStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  startTime: string | null;
  endTime: string | null;
  correlationId: string | null;
  tasks: TaskExecutionResponse[];
}

export interface ErrorResponse {
  errorCode: string;
  message: string;
  timestamp: string;
  path: string;
  fieldErrors: { field: string; message: string }[];
}

export interface ActuatorHealthComponent {
  status: string;
  details?: Record<string, unknown>;
}

export interface ActuatorHealthResponse {
  status: string;
  components?: Record<string, ActuatorHealthComponent>;
}
