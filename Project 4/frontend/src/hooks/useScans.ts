import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/utils/api";
import type { ScanSummary, ScanDetail, SecurityPosture, PaginatedResponse, ScanType } from "@/types";

const KEYS = {
  scans: (projectId?: string) => ["scans", projectId] as const,
  scan: (id: string) => ["scan", id] as const,
  posture: () => ["posture"] as const,
};

export function useScans(projectId?: string) {
  return useQuery({
    queryKey: KEYS.scans(projectId),
    queryFn: async (): Promise<PaginatedResponse<ScanSummary>> => {
      const params = projectId ? { project_id: projectId } : {};
      const { data } = await apiClient.get("/scans", { params });
      return data;
    },
  });
}

export function useScan(id: string) {
  return useQuery({
    queryKey: KEYS.scan(id),
    queryFn: async (): Promise<ScanDetail> => {
      const { data } = await apiClient.get(`/scans/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useSecurityPosture() {
  return useQuery({
    queryKey: KEYS.posture(),
    queryFn: async (): Promise<SecurityPosture> => {
      const { data } = await apiClient.get("/scans/posture");
      return data;
    },
  });
}

export function useTriggerScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      project_id: string;
      scan_type: ScanType;
      branch?: string;
      target_url?: string;
    }): Promise<ScanSummary> => {
      const { data } = await apiClient.post("/scans", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scans"] });
      qc.invalidateQueries({ queryKey: ["posture"] });
    },
  });
}

export function useSuppressFinding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      scanId,
      findingId,
      reason,
    }: {
      scanId: string;
      findingId: string;
      reason: string;
    }) => {
      await apiClient.post(`/scans/${scanId}/findings/${findingId}/suppress`, { reason });
    },
    onSuccess: (_data, { scanId }) => {
      qc.invalidateQueries({ queryKey: KEYS.scan(scanId) });
    },
  });
}
