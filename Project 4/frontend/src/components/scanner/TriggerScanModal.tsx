import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Scan } from "lucide-react";
import { useTriggerScan } from "@/hooks/useScans";
import { useProjects } from "@/hooks/useProjects";
import { extractErrorMessage } from "@/utils/api";
import type { ScanType } from "@/types";

const schema = z.object({
  project_id: z.string().uuid("Select a project"),
  scan_type: z.enum(["full", "sast", "dast", "dependency", "container", "secret", "iac"]),
  branch: z.string().min(1),
  target_url: z.string().url().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface TriggerScanModalProps {
  onClose: () => void;
}

const SCAN_TYPES: { value: ScanType; label: string; description: string }[] = [
  { value: "full", label: "Full Scan", description: "All scanners in parallel" },
  { value: "sast", label: "SAST", description: "Static code analysis" },
  { value: "dependency", label: "Dependencies", description: "Vulnerable packages" },
  { value: "secret", label: "Secrets", description: "Leaked credentials & keys" },
  { value: "container", label: "Container", description: "Docker image CVEs" },
  { value: "iac", label: "IaC", description: "Terraform / K8s misconfigs" },
  { value: "dast", label: "DAST", description: "Live endpoint scanning" },
];

export function TriggerScanModal({ onClose }: TriggerScanModalProps) {
  const { data: projectsData } = useProjects();
  const { mutateAsync, isPending, error } = useTriggerScan();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scan_type: "full", branch: "main" },
  });

  const onSubmit = async (values: FormValues) => {
    await mutateAsync({
      project_id: values.project_id,
      scan_type: values.scan_type,
      branch: values.branch,
      target_url: values.target_url || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-brand-400" />
            <h2 className="text-base font-semibold text-white">Trigger Security Scan</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Project</label>
            <select
              {...register("project_id")}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="">— Select a project —</option>
              {projectsData?.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.project_id && (
              <p className="mt-1 text-xs text-red-400">{errors.project_id.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Scan Type</label>
            <div className="grid grid-cols-2 gap-2">
              {SCAN_TYPES.map(({ value, label, description }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-950/30"
                >
                  <input
                    type="radio"
                    value={value}
                    {...register("scan_type")}
                    className="mt-0.5 accent-brand-500"
                  />
                  <div>
                    <p className="text-xs font-medium text-white">{label}</p>
                    <p className="text-xs text-slate-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Branch</label>
              <input
                {...register("branch")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                placeholder="main"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Target URL{" "}
                <span className="text-slate-600">(DAST only)</span>
              </label>
              <input
                {...register("target_url")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                placeholder="https://staging.example.com"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-400">
              {extractErrorMessage(error)}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {isPending ? "Starting…" : "Start Scan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
