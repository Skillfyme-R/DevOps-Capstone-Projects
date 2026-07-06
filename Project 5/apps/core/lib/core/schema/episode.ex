defmodule Core.Schema.Episode do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Content, StreamEndpoint, ViewingHistory}

  @type t :: %__MODULE__{}

  defenum EpisodeStatus,
    draft: 0,
    processing: 1,
    ready: 2,
    published: 3,
    archived: 4

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "episodes" do
    field :title,               :string
    field :slug,                :string
    field :description,         :string
    field :season_number,       :integer, default: 1
    field :episode_number,      :integer
    field :duration_seconds,    :integer
    field :status,              EpisodeStatus, default: :draft
    field :thumbnail_url,       :string
    field :storage_path,        :string
    field :master_playlist_url, :string
    field :file_size_bytes,     :integer
    field :subtitles,           {:array, :string}, default: []
    field :view_count,          :integer, default: 0
    field :published_at,        :utc_datetime_usec
    field :available_until,     :utc_datetime_usec

    belongs_to :content, Content
    has_many :stream_endpoints, StreamEndpoint
    has_many :viewing_histories, ViewingHistory

    timestamps()
  end

  def changeset(episode, attrs) do
    episode
    |> cast(attrs, [
      :title, :slug, :description, :season_number, :episode_number,
      :duration_seconds, :status, :thumbnail_url, :storage_path,
      :master_playlist_url, :file_size_bytes, :subtitles,
      :published_at, :available_until, :content_id
    ])
    |> validate_required([:title, :episode_number, :content_id])
    |> validate_number(:season_number, greater_than: 0)
    |> validate_number(:episode_number, greater_than: 0)
    |> validate_number(:duration_seconds, greater_than: 0)
    |> unique_constraint([:content_id, :season_number, :episode_number])
  end
end
