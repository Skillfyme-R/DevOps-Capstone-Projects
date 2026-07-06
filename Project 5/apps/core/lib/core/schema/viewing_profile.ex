defmodule Core.Schema.ViewingProfile do
  @moduledoc """
  A viewer profile within a user account — like Netflix profiles.
  Multiple profiles can exist per account for family/team plans.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, ViewingHistory}

  @type t :: %__MODULE__{}

  defenum ProfileType,
    adult: 0,
    teen: 1,
    child: 2

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "viewing_profiles" do
    field :name,            :string
    field :avatar_url,      :string
    field :avatar_color,    :string
    field :profile_type,    ProfileType, default: :adult
    field :pin,             :string
    field :pin_hash,        :string
    field :language,        :string, default: "en"
    field :autoplay_next,   :boolean, default: true
    field :subtitles_on,    :boolean, default: false
    field :default_quality, :string, default: "auto"
    field :genres_preferred, {:array, :string}, default: []

    belongs_to :user, User
    has_many :viewing_histories, ViewingHistory

    timestamps()
  end

  def changeset(profile, attrs) do
    profile
    |> cast(attrs, [
      :name, :avatar_url, :avatar_color, :profile_type, :pin,
      :language, :autoplay_next, :subtitles_on, :default_quality,
      :genres_preferred, :user_id
    ])
    |> validate_required([:name, :user_id])
    |> validate_length(:name, min: 1, max: 50)
    |> validate_length(:pin, is: 4)
    |> hash_pin()
  end

  defp hash_pin(%{valid?: true, changes: %{pin: pin}} = changeset) do
    change(changeset, pin_hash: Argon2.hash_pwd_salt(pin), pin: nil)
  end

  defp hash_pin(changeset), do: changeset
end
