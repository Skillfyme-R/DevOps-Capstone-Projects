defmodule Core.Repo.Migrations.CreateContent do
  use Ecto.Migration

  def change do
    create table(:contents, primary_key: false) do
      add :id,                  :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :title,               :string, null: false
      add :slug,                :string
      add :description,         :text
      add :short_description,   :string
      add :content_type,        :integer, null: false
      add :status,              :integer, default: 0, null: false
      add :age_rating,          :integer, default: 1
      add :duration_seconds,    :integer
      add :release_year,        :integer
      add :language,            :string, default: "en"
      add :subtitles,           {:array, :string}, default: []
      add :genres,              {:array, :string}, default: []
      add :tags,                {:array, :string}, default: []
      add :thumbnail_url,       :string
      add :banner_url,          :string
      add :trailer_url,         :string
      add :imdb_id,             :string
      add :tmdb_id,             :string
      add :country_of_origin,   :string
      add :allowed_countries,   {:array, :string}, default: []
      add :blocked_countries,   {:array, :string}, default: []
      add :featured,            :boolean, default: false
      add :view_count,          :integer, default: 0
      add :avg_rating,          :float
      add :season_count,        :integer, default: 0
      add :episode_count,       :integer, default: 0
      add :storage_path,        :string
      add :master_playlist_url, :string
      add :file_size_bytes,     :bigint
      add :published_at,        :utc_datetime_usec
      add :available_until,     :utc_datetime_usec
      add :studio_id,           references(:studios, type: :binary_id, on_delete: :restrict), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:contents, [:slug])
    create index(:contents, [:studio_id])
    create index(:contents, [:status])
    create index(:contents, [:content_type])
    create index(:contents, [:featured])
    create index(:contents, [:published_at])
    create index(:contents, [:genres], using: :gin)
    create index(:contents, [:tags], using: :gin)

    create table(:episodes, primary_key: false) do
      add :id,                  :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :title,               :string, null: false
      add :slug,                :string
      add :description,         :text
      add :season_number,       :integer, default: 1, null: false
      add :episode_number,      :integer, null: false
      add :duration_seconds,    :integer
      add :status,              :integer, default: 0, null: false
      add :thumbnail_url,       :string
      add :storage_path,        :string
      add :master_playlist_url, :string
      add :file_size_bytes,     :bigint
      add :subtitles,           {:array, :string}, default: []
      add :view_count,          :integer, default: 0
      add :published_at,        :utc_datetime_usec
      add :available_until,     :utc_datetime_usec
      add :content_id,          references(:contents, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:episodes, [:content_id, :season_number, :episode_number])
    create index(:episodes, [:content_id])
    create index(:episodes, [:status])
  end
end
