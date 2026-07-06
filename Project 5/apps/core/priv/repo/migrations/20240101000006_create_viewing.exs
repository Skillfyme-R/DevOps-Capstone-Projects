defmodule Core.Repo.Migrations.CreateViewing do
  use Ecto.Migration

  def change do
    create table(:viewing_profiles, primary_key: false) do
      add :id,               :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,             :string, null: false
      add :avatar_url,       :string
      add :avatar_color,     :string
      add :profile_type,     :integer, default: 0, null: false
      add :pin_hash,         :string
      add :language,         :string, default: "en"
      add :autoplay_next,    :boolean, default: true
      add :subtitles_on,     :boolean, default: false
      add :default_quality,  :string, default: "auto"
      add :genres_preferred, {:array, :string}, default: []
      add :user_id,          references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create index(:viewing_profiles, [:user_id])

    create table(:viewing_histories, primary_key: false) do
      add :id,                 :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :watched_seconds,    :integer, default: 0
      add :completed,          :boolean, default: false
      add :last_position,      :integer, default: 0
      add :device_type,        :string
      add :quality_watched,    :string
      add :started_at,         :utc_datetime_usec
      add :completed_at,       :utc_datetime_usec
      add :session_id,         :string
      add :user_id,            references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :viewing_profile_id, references(:viewing_profiles, type: :binary_id, on_delete: :nilify_all)
      add :content_id,         references(:contents, type: :binary_id, on_delete: :delete_all), null: false
      add :episode_id,         references(:episodes, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create index(:viewing_histories, [:user_id])
    create index(:viewing_histories, [:content_id])
    create index(:viewing_histories, [:episode_id])
    create index(:viewing_histories, [:session_id])
    create index(:viewing_histories, [:user_id, :content_id])

    create table(:watchlists, primary_key: false) do
      add :id,                 :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :sort_order,         :integer, default: 0
      add :user_id,            references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :viewing_profile_id, references(:viewing_profiles, type: :binary_id, on_delete: :nilify_all)
      add :content_id,         references(:contents, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:watchlists, [:user_id, :content_id, :viewing_profile_id])
    create index(:watchlists, [:user_id])
  end
end
