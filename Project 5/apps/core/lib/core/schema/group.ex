defmodule Core.Schema.Group do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Account, User, GroupMember}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "groups" do
    field :name,        :string
    field :description, :string
    field :global,      :boolean, default: false

    belongs_to :account, Account
    has_many :group_members, GroupMember
    many_to_many :users, User, join_through: GroupMember

    timestamps()
  end

  def changeset(group, attrs) do
    group
    |> cast(attrs, [:name, :description, :global, :account_id])
    |> validate_required([:name])
    |> validate_length(:name, min: 1, max: 255)
    |> unique_constraint([:name, :account_id])
  end
end

defmodule Core.Schema.GroupMember do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Group, User}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "group_members" do
    belongs_to :group, Group
    belongs_to :user, User
    timestamps()
  end

  def changeset(member, attrs) do
    member
    |> cast(attrs, [:group_id, :user_id])
    |> validate_required([:group_id, :user_id])
    |> unique_constraint([:group_id, :user_id])
  end
end
