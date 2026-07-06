defmodule Core.Schema.StudioMember do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Studio, User}

  defenum StudioRole,
    owner: 0,
    admin: 1,
    editor: 2,
    viewer: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "studio_members" do
    field :role, StudioRole, default: :viewer

    belongs_to :studio, Studio
    belongs_to :user, User

    timestamps()
  end

  def changeset(member, attrs) do
    member
    |> cast(attrs, [:role, :studio_id, :user_id])
    |> validate_required([:role, :studio_id, :user_id])
    |> unique_constraint([:studio_id, :user_id])
  end
end
