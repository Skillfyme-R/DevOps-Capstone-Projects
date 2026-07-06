defmodule Core.Schema.Content do
  @moduledoc """
  Represents a top-level content item — a Movie, Series, Documentary, or Live Event.
  This is the central entity of the FluxStream content catalog.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{
    Studio,
    Episode,
    StreamEndpoint,
    ViewingHistory,
    ContentRating,
    ContentReview
  }

  @type t :: %__MODULE__{}

  defenum ContentType,
    movie: 0,
    series: 1,
    documentary: 2,
    live_event: 3,
    short: 4,
    podcast: 5

  defenum ContentStatus,
    draft: 0,
    processing: 1,
    ready: 2,
    published: 3,
    archived: 4,
    geo_restricted: 5

  defenum AgeRating,
    g: 0,
    pg: 1,
    pg13: 2,
    r: 3,
    nc17: 4,
    tv_ma: 5,
    tv_14: 6,
    tv_pg: 7

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "contents" do
    field :title,               :string
    field :slug,                :string
    field :description,         :string
    field :short_description,   :string
    field :content_type,        ContentType
    field :status,              ContentStatus, default: :draft
    field :age_rating,          AgeRating, default: :pg
    field :duration_seconds,    :integer
    field :release_year,        :integer
    field :language,            :string, default: "en"
    field :subtitles,           {:array, :string}, default: []
    field :genres,              {:array, :string}, default: []
    field :tags,                {:array, :string}, default: []
    field :thumbnail_url,       :string
    field :banner_url,          :string
    field :trailer_url,         :string
    field :imdb_id,             :string
    field :tmdb_id,             :string
    field :country_of_origin,   :string
    field :allowed_countries,   {:array, :string}, default: []
    field :blocked_countries,   {:array, :string}, default: []
    field :featured,            :boolean, default: false
    field :view_count,          :integer, default: 0
    field :avg_rating,          :float
    field :season_count,        :integer, default: 0
    field :episode_count,       :integer, default: 0
    field :storage_path,        :string
    field :master_playlist_url, :string
    field :file_size_bytes,     :integer
    field :published_at,        :utc_datetime_usec
    field :available_until,     :utc_datetime_usec

    belongs_to :studio, Studio
    has_many :episodes, Episode
    has_many :stream_endpoints, StreamEndpoint
    has_many :viewing_histories, ViewingHistory
    has_many :content_reviews, ContentReview
    has_many :content_ratings, ContentRating

    timestamps()
  end

  def changeset(content, attrs) do
    content
    |> cast(attrs, [
      :title, :slug, :description, :short_description, :content_type,
      :status, :age_rating, :duration_seconds, :release_year, :language,
      :subtitles, :genres, :tags, :thumbnail_url, :banner_url, :trailer_url,
      :imdb_id, :tmdb_id, :country_of_origin, :allowed_countries, :blocked_countries,
      :featured, :storage_path, :master_playlist_url, :file_size_bytes,
      :published_at, :available_until, :studio_id,
      :avg_rating, :view_count, :season_count, :episode_count
    ])
    |> validate_required([:title, :content_type, :studio_id])
    |> validate_length(:title, min: 1, max: 500)
    |> validate_number(:release_year, greater_than_or_equal_to: 1888, less_than_or_equal_to: 2100)
    |> validate_number(:duration_seconds, greater_than: 0)
    |> unique_constraint(:slug)
    |> put_slug()
  end

  def publish_changeset(content) do
    content
    |> change(status: :published, published_at: DateTime.utc_now())
  end

  defp put_slug(%{valid?: true, changes: %{title: title}} = changeset) do
    slug = title |> String.downcase() |> String.replace(~r/[^a-z0-9\s]/, "") |> String.replace(~r/\s+/, "-")
    put_change(changeset, :slug, slug)
  end

  defp put_slug(changeset), do: changeset
end
