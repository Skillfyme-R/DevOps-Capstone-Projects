import { useState } from "react";
import { Plus, FolderGit2, ExternalLink, GitBranch, Clock, X, AlertCircle } from "lucide-react";
import { useProjects, useCreateProject } from "@/hooks/useProjects";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatDistanceToNow } from "date-fns";
import { extractErrorMessage } from "@/utils/api";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  repository_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  default_branch: z.string().min(1, "Branch is required").default("main"),
});

type FormValues = z.infer<typeof schema>;

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateProject();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { default_branch: "main" },
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      await mutateAsync({
        name: values.name,
        description: values.description || undefined,
        repository_url: values.repository_url || undefined,
        default_branch: values.default_branch,
      });
      onClose();
    } catch (err) {
      setApiError(extractErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1724] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20">
              <FolderGit2 className="h-4 w-4 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold text-white">New Project</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Project Name <span className="text-red-400">*</span>
            </label>
            <input
              {...register("name")}
              className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-600 transition focus:border-blue-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              placeholder="My API Service"
            />
            {errors.name && (
              <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              {...register("description")}
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-600 transition focus:border-blue-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              placeholder="Short description of this project…"
            />
          </div>

          {/* Repo + Branch */}
          <div className="grid grid-cols-5 gap-3">
            <div className="col-span-3">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Repository URL</label>
              <input
                {...register("repository_url")}
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-600 transition focus:border-blue-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                placeholder="https://github.com/org/repo"
              />
              {errors.repository_url && (
                <p className="mt-1.5 text-xs text-red-400">{errors.repository_url.message}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Default Branch</label>
              <input
                {...register("default_branch")}
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-slate-600 transition focus:border-blue-500/50 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-blue-500/30"
                placeholder="main"
              />
            </div>
          </div>

          {/* API error */}
          {apiError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-xs text-red-300">{apiError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-500 hover:to-blue-400 disabled:opacity-50"
            >
              {isPending ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
        <FolderGit2 className="h-6 w-6 text-slate-600" />
      </div>
      <p className="text-sm font-medium text-slate-400">No projects yet</p>
      <p className="mt-1 text-xs text-slate-600">Create your first project to start scanning</p>
      <button
        onClick={onNew}
        className="mt-5 flex items-center gap-2 rounded-xl bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-600/30"
      >
        <Plus className="h-4 w-4" />
        New Project
      </button>
    </div>
  );
}

export default function ProjectsPage() {
  const { data, isLoading } = useProjects();
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Projects</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {data?.total ?? 0} project{data?.total !== 1 ? "s" : ""} in your organisation
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-500 hover:to-blue-400"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState onNew={() => setShowModal(true)} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((project) => (
              <div
                key={project.id}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-blue-500/30 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-blue-900/10"
              >
                {/* Top accent */}
                <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-blue-500/10">
                      <FolderGit2 className="h-4.5 w-4.5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{project.name}</h3>
                      <span className="font-mono text-[10px] text-slate-600">{project.slug}</span>
                    </div>
                  </div>
                  {project.repository_url && (
                    <a
                      href={project.repository_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/[0.06] hover:text-blue-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                {project.description && (
                  <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {project.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" />
                    {project.default_branch}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}
    </>
  );
}
