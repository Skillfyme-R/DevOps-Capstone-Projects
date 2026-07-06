defmodule Core.Services.Transcoding do
  @moduledoc """
  Video transcoding pipeline management — queue jobs, track progress,
  retry failures, and route completed output to CDN endpoints.
  Analogous to Plural's Upgrades/Rollouts service for async processing.
  """
  use Core.Services.Base

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.{TranscodingJob, Content, Episode, StreamEndpoint}

  @default_profiles ["360p", "480p", "720p", "1080p"]
  @hd_profiles ["360p", "480p", "720p", "1080p", "2160p"]

  @spec enqueue_content(Content.t(), String.t(), keyword) :: {:ok, TranscodingJob.t()} | {:error, term}
  def enqueue_content(content, source_url, opts \\ []) do
    profiles = if content.avg_rating && content.view_count > 10_000, do: @hd_profiles, else: @default_profiles

    %TranscodingJob{}
    |> TranscodingJob.changeset(%{
      source_url: source_url,
      content_id: content.id,
      output_format: Keyword.get(opts, :format, :hls),
      profiles: Keyword.get(opts, :profiles, profiles),
      priority: Keyword.get(opts, :priority, 5)
    })
    |> safe_insert()
    |> tap(fn {:ok, job} ->
      Phoenix.PubSub.broadcast(Core.PubSub, "transcoding:queue", {:job_queued, job})
    end)
  end

  @spec enqueue_episode(Episode.t(), String.t(), keyword) :: {:ok, TranscodingJob.t()} | {:error, term}
  def enqueue_episode(episode, source_url, opts \\ []) do
    %TranscodingJob{}
    |> TranscodingJob.changeset(%{
      source_url: source_url,
      episode_id: episode.id,
      output_format: Keyword.get(opts, :format, :hls),
      profiles: Keyword.get(opts, :profiles, @default_profiles),
      priority: Keyword.get(opts, :priority, 5)
    })
    |> safe_insert()
  end

  @spec claim_next_job(String.t()) :: {:ok, TranscodingJob.t()} | {:error, :no_jobs}
  def claim_next_job(worker_id) do
    Repo.transaction(fn ->
      job =
        TranscodingJob
        |> where([j], j.status == :queued)
        |> order_by([j], [asc: j.priority, asc: j.inserted_at])
        |> limit(1)
        |> lock("FOR UPDATE SKIP LOCKED")
        |> Repo.one()

      case job do
        nil -> Repo.rollback(:no_jobs)
        job ->
          {:ok, started} = job |> TranscodingJob.start_changeset(worker_id) |> Repo.update()
          started
      end
    end)
  end

  @spec complete_job(TranscodingJob.t(), String.t(), integer) :: {:ok, TranscodingJob.t()} | {:error, term}
  def complete_job(job, output_base_url, output_size_bytes) do
    with {:ok, completed} <- job |> TranscodingJob.complete_changeset(output_size_bytes) |> safe_update() do
      provision_stream_endpoints(job, output_base_url)
      Phoenix.PubSub.broadcast(Core.PubSub, "transcoding:#{job.id}", {:job_completed, completed})
      {:ok, completed}
    end
  end

  @spec fail_job(TranscodingJob.t(), String.t()) :: {:ok, TranscodingJob.t()} | {:error, term}
  def fail_job(job, error_message) do
    with {:ok, failed} <- job |> TranscodingJob.fail_changeset(error_message) |> safe_update() do
      if failed.retry_count < failed.max_retries do
        requeue_job(failed)
      end

      Phoenix.PubSub.broadcast(Core.PubSub, "transcoding:#{job.id}", {:job_failed, failed})
      {:ok, failed}
    end
  end

  @spec update_progress(TranscodingJob.t(), float) :: {:ok, TranscodingJob.t()} | {:error, term}
  def update_progress(job, progress_pct) do
    with {:ok, updated} <- job |> Ecto.Changeset.change(progress_pct: progress_pct) |> safe_update() do
      Phoenix.PubSub.broadcast(Core.PubSub, "transcoding:#{job.id}", {:progress_updated, progress_pct})
      {:ok, updated}
    end
  end

  @spec list_pending_jobs(integer) :: [TranscodingJob.t()]
  def list_pending_jobs(limit \\ 50) do
    TranscodingJob
    |> where([j], j.status in [:queued, :retrying])
    |> order_by([j], [asc: j.priority, asc: j.inserted_at])
    |> limit(^limit)
    |> Repo.all()
  end

  defp provision_stream_endpoints(job, output_base_url) do
    cdn_node_id = select_cdn_node()

    attrs = %{
      url: "#{output_base_url}/master.m3u8",
      protocol: :hls,
      quality: :auto,
      status: :active,
      is_primary: true,
      drm_enabled: false,
      cdn_node_id: cdn_node_id,
      content_id: job.content_id,
      episode_id: job.episode_id
    }

    %StreamEndpoint{} |> StreamEndpoint.changeset(attrs) |> Repo.insert()
  end

  defp select_cdn_node do
    from(n in Core.Schema.CDNNode,
      where: n.status == :healthy,
      order_by: [asc: n.current_load_pct],
      limit: 1,
      select: n.id
    )
    |> Repo.one()
  end

  defp requeue_job(job) do
    job |> Ecto.Changeset.change(status: :retrying) |> Repo.update()
  end
end
