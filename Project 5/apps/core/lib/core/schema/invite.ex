defmodule Core.Schema.Invite do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Account, User, Group}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "invites" do
    field :email,       :string
    field :token,       :string
    field :accepted,    :boolean, default: false
    field :accepted_at, :utc_datetime_usec
    field :expires_at,  :utc_datetime_usec

    belongs_to :account, Account
    belongs_to :invited_by, User, foreign_key: :invited_by_id
    many_to_many :groups, Group, join_through: "invite_groups"

    timestamps()
  end

  def changeset(invite, attrs) do
    invite
    |> cast(attrs, [:email, :expires_at, :account_id, :invited_by_id])
    |> validate_required([:email, :account_id])
    |> validate_format(:email, ~r/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    |> put_token()
    |> put_expiry()
    |> unique_constraint([:email, :account_id])
  end

  defp put_token(changeset) do
    put_change(changeset, :token, :crypto.strong_rand_bytes(24) |> Base.url_encode64(padding: false))
  end

  defp put_expiry(%{changes: %{expires_at: _}} = cs), do: cs
  defp put_expiry(changeset), do: put_change(changeset, :expires_at, DateTime.add(DateTime.utc_now(), 7, :day))
end
