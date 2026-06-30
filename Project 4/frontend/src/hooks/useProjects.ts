import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/utils/api";
import type { Project, PaginatedResponse } from "@/types";

const KEYS = {
  projects: () => ["projects"] as const,
  project: (id: string) => ["project", id] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: KEYS.projects(),
    queryFn: async (): Promise<PaginatedResponse<Project>> => {
      const { data } = await apiClient.get("/projects");
      return data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: KEYS.project(id),
    queryFn: async (): Promise<Project> => {
      const { data } = await apiClient.get(`/projects/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      repository_url?: string;
      default_branch?: string;
    }): Promise<Project> => {
      const { data } = await apiClient.post("/projects", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.projects() });
    },
  });
}
