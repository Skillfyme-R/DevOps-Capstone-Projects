export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type ScanType = "sast" | "dast" | "dependency" | "container" | "secret" | "iac" | "full";
export type ScanStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "security_engineer" | "developer" | "viewer";
  is_active: boolean;
  organization_id: string;
  avatar_url?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  is_active: boolean;
  max_scans_per_month: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  repository_url?: string;
  default_branch: string;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Finding {
  id: string;
  scan_id: string;
  title: string;
  description: string;
  severity: Severity;
  scanner: string;
  category: string;
  file_path?: string;
  line_start?: number;
  line_end?: number;
  cve_id?: string;
  cwe_id?: string;
  cvss_score?: number;
  remediation?: string;
  references?: string[];
  is_suppressed: boolean;
  is_false_positive: boolean;
  created_at: string;
}

export interface ScanSummary {
  id: string;
  project_id: string;
  scan_type: ScanType;
  status: ScanStatus;
  branch: string;
  commit_sha?: string;
  security_score?: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  duration_seconds?: number;
  created_at: string;
}

export interface ScanDetail extends ScanSummary {
  findings: Finding[];
  error_message?: string;
  report_s3_key?: string;
}

export interface SecurityPosture {
  organization_id: string;
  overall_score: number;
  trend: "improving" | "stable" | "degrading";
  scans_this_month: number;
  open_critical: number;
  open_high: number;
  open_medium: number;
  open_low: number;
  top_vulnerable_projects: Array<{
    project_id: string;
    score: number;
    critical: number;
  }>;
  severity_breakdown: Record<string, number>;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  page_size?: number;
}
