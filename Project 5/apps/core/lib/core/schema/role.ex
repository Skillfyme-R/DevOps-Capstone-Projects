defmodule Core.Schema.Role do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Account, RoleBinding}

  @all_permissions ~w(
    content:read content:write content:delete content:publish
    studio:read studio:write studio:manage
    users:read users:write users:suspend
    subscriptions:read subscriptions:write
    cdn:read cdn:write cdn:manage
    billing:read billing:write
    analytics:read
    support:read support:write
    platform:admin
  )

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "roles" do
    field :name,        :string
    field :description, :string
    field :permissions, {:array, :string}, default: []

    belongs_to :account, Account
    has_many :role_bindings, RoleBinding

    timestamps()
  end

  def changeset(role, attrs) do
    role
    |> cast(attrs, [:name, :description, :permissions, :account_id])
    |> validate_required([:name])
    |> validate_permissions()
    |> unique_constraint([:name, :account_id])
  end

  defp validate_permissions(changeset) do
    validate_change(changeset, :permissions, fn :permissions, perms ->
      invalid = Enum.reject(perms, &(&1 in @all_permissions))

      if Enum.empty?(invalid) do
        []
      else
        [permissions: "contains invalid permissions: #{Enum.join(invalid, ", ")}"]
      end
    end)
  end
end

defmodule Core.Schema.RoleBinding do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Role, User, Group}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "role_bindings" do
    belongs_to :role, Role
    belongs_to :user, User
    belongs_to :group, Group
    timestamps()
  end

  def changeset(binding, attrs) do
    binding
    |> cast(attrs, [:role_id, :user_id, :group_id])
    |> validate_required([:role_id])
  end
end
