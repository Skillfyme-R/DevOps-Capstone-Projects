defmodule Core.Schema.Watchlist do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Content, ViewingProfile}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "watchlists" do
    field :sort_order, :integer, default: 0

    belongs_to :user, User
    belongs_to :viewing_profile, ViewingProfile
    belongs_to :content, Content

    timestamps()
  end

  def changeset(watchlist, attrs) do
    watchlist
    |> cast(attrs, [:sort_order, :user_id, :viewing_profile_id, :content_id])
    |> validate_required([:user_id, :content_id])
    |> unique_constraint([:user_id, :content_id])
  end
end
