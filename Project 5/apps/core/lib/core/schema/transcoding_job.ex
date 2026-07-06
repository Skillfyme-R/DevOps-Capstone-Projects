defmodule Core.Schema.TranscodingJob do
  @moduledoc """
  Represents a video transcoding job in the FluxStream pipeline.
  Analogous to Plural's upgrade/rollout queue — manages async processing.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Content, Episode}

  @type t :: %__MODULE__{}

  defenum JobStatus,
    queued: 0,
    processing: 1,
    completed: 2,
    failed: 3,
    retrying: 4,
    canceled: 5

  defenum OutputFormat,
    hls: 0,
    dash: 1,
    mp4: 2,
    webm: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "transcoding_jobs" do
    field :status,          JobStatus, default: :queued
    field :source_url,      :string
    field :output_format,   OutputFormat, default: :hls
    field :profiles,        {:array, :string}, default: ["360p", "480p", "720p", "1080p"]
    field :priority,        :integer, default: 5
    field :progress_pct,    :float, default: 0.0
    field :error_message,   :string
    field :retry_count,     :integer, default: 0
    field :max_retries,     :integer, default: 3
    field :worker_id,       :string
    field :started_at,      :utc_datetime_usec
    field :completed_at,    :utc_datetime_usec
    field :duration_seconds, :integer
    field :output_size_bytes, :integer
    field :metadata,        :map, default: %{}

    belongs_to :content, Content
    belongs_to :episode, Episode

    timestamps()
  end

  def changeset(job, attrs) do
    job
    |> cast(attrs, [
      :status, :source_url, :output_format, :profiles, :priority,
      :error_message, :max_retries, :metadata, :content_id, :episode_id
    ])
    |> validate_required([:source_url, :output_format])
    |> validate_number(:priority, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
  end

  def start_changeset(job, worker_id) do
    job
    |> change(status: :processing, worker_id: worker_id, started_at: DateTime.utc_now())
  end

  def complete_changeset(job, output_size_bytes) do
    job
    |> change(status: :completed, progress_pct: 100.0, completed_at: DateTime.utc_now(), output_size_bytes: output_size_bytes)
  end

  def fail_changeset(job, error_message) do
    job
    |> change(status: :failed, error_message: error_message, retry_count: job.retry_count + 1)
  end
end
