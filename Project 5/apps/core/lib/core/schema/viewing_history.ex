defmodule Core.Schema.ViewingHistory do
  @moduledoc """
  Tracks a viewer's watch progress for content and episodes.
  Powers resume-watching, recommendations, and analytics.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Content, Episode, ViewingProfile}

  @type t :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "viewing_histories" do
    field :watched_seconds,   :integer, default: 0
    field :completed,         :boolean, default: false
    field :last_position,     :integer, default: 0
    field :device_type,       :string
    field :quality_watched,   :string
    field :started_at,        :utc_datetime_usec
    field :completed_at,      :utc_datetime_usec
    field :session_id,        :string

    belongs_to :user, User
    belongs_to :viewing_profile, ViewingProfile
    belongs_to :content, Content
    belongs_to :episode, Episode

    timestamps()
  end

  def changeset(history, attrs) do
    history
    |> cast(attrs, [
      :watched_seconds, :completed, :last_position, :device_type,
      :quality_watched, :started_at, :completed_at, :session_id,
      :user_id, :viewing_profile_id, :content_id, :episode_id
    ])
    |> validate_required([:user_id, :content_id])
    |> validate_number(:watched_seconds, greater_than_or_equal_to: 0)
    |> validate_number(:last_position, greater_than_or_equal_to: 0)
  end
end
