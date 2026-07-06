defmodule Core.Schema.PersistedToken do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.User

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "persisted_tokens" do
    field :token,      :string
    field :token_hash, :string
    field :scopes,     {:array, :string}, default: ["read"]
    field :name,       :string
    field :last_used_at, :utc_datetime_usec
    field :expires_at, :utc_datetime_usec
    field :revoked,    :boolean, default: false
    field :revoked_at, :utc_datetime_usec

    belongs_to :user, User

    timestamps()
  end

  def changeset(token, attrs) do
    token
    |> cast(attrs, [:scopes, :name, :expires_at, :user_id])
    |> validate_required([:user_id])
    |> put_token()
  end

  def revoke_changeset(token) do
    change(token, revoked: true, revoked_at: DateTime.utc_now())
  end

  defp put_token(changeset) do
    raw = :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)
    hash = :crypto.hash(:sha256, raw) |> Base.encode16(case: :lower)
    changeset |> put_change(:token, "fxs_#{raw}") |> put_change(:token_hash, hash)
  end
end
