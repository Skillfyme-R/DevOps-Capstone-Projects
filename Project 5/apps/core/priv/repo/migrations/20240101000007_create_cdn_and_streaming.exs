defmodule Core.Repo.Migrations.CreateCdnAndStreaming do
  use Ecto.Migration

  def change do
    create table(:cdn_nodes, primary_key: false) do
      add :id,                :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,              :string, null: false
      add :region,            :string, null: false
      add :country,           :string
      add :city,              :string
      add :provider,          :integer, null: false
      add :status,            :integer, default: 0, null: false
      add :endpoint,          :string
      add :ip_address,        :string
      add :pop_code,          :string
      add :capacity_gbps,     :float
      add :current_load_pct,  :float, default: 0.0
      add :latency_ms,        :integer
      add :active_streams,    :integer, default: 0
      add :total_bandwidth_tb, :float, default: 0.0
      add :last_health_check, :utc_datetime_usec
      add :metadata,          :map, default: %{}

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:cdn_nodes, [:pop_code])
    create index(:cdn_nodes, [:status])
    create index(:cdn_nodes, [:region])

    create table(:stream_endpoints, primary_key: false) do
      add :id,            :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :url,           :string, null: false
      add :protocol,      :integer, default: 0, null: false
      add :quality,       :integer, default: 0, null: false
      add :status,        :integer, default: 0, null: false
      add :region,        :string
      add :latency_ms,    :integer
      add :bitrate_kbps,  :integer
      add :is_primary,    :boolean, default: false
      add :drm_enabled,   :boolean, default: false
      add :token_signed,  :boolean, default: false
      add :expires_at,    :utc_datetime_usec
      add :content_id,    references(:contents, type: :binary_id, on_delete: :delete_all)
      add :episode_id,    references(:episodes, type: :binary_id, on_delete: :delete_all)
      add :cdn_node_id,   references(:cdn_nodes, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:stream_endpoints, [:content_id])
    create index(:stream_endpoints, [:episode_id])
    create index(:stream_endpoints, [:cdn_node_id])
    create index(:stream_endpoints, [:status])

    create table(:transcoding_jobs, primary_key: false) do
      add :id,               :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :status,           :integer, default: 0, null: false
      add :source_url,       :string, null: false
      add :output_format,    :integer, default: 0, null: false
      add :profiles,         {:array, :string}, default: []
      add :priority,         :integer, default: 5
      add :progress_pct,     :float, default: 0.0
      add :error_message,    :text
      add :retry_count,      :integer, default: 0
      add :max_retries,      :integer, default: 3
      add :worker_id,        :string
      add :started_at,       :utc_datetime_usec
      add :completed_at,     :utc_datetime_usec
      add :duration_seconds, :integer
      add :output_size_bytes, :bigint
      add :metadata,         :map, default: %{}
      add :content_id,       references(:contents, type: :binary_id, on_delete: :delete_all)
      add :episode_id,       references(:episodes, type: :binary_id, on_delete: :delete_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:transcoding_jobs, [:status])
    create index(:transcoding_jobs, [:content_id])
    create index(:transcoding_jobs, [:episode_id])
    create index(:transcoding_jobs, [:priority, :status])
  end
end
