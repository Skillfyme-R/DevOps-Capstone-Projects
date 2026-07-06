defmodule Core.Schema.PublicKey do
  @moduledoc """
  SSH/GPG public keys for studio API authentication and DRM key exchange.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.User

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "public_keys" do
    field :name,       :string
    field :content,    :string
    field :digest,     :string
    field :key_type,   :string
    field :expires_at, :utc_datetime_usec

    belongs_to :user, User

    timestamps()
  end

  def changeset(key, attrs) do
    key
    |> cast(attrs, [:name, :content, :expires_at, :user_id])
    |> validate_required([:name, :content, :user_id])
    |> validate_length(:name, min: 1, max: 255)
    |> parse_key()
  end

  defp parse_key(%{valid?: true, changes: %{content: content}} = changeset) do
    digest = :crypto.hash(:sha256, content) |> Base.encode16(case: :lower)
    key_type = cond do
      String.starts_with?(content, "ssh-rsa") -> "RSA"
      String.starts_with?(content, "ssh-ed25519") -> "Ed25519"
      String.starts_with?(content, "ecdsa-sha2") -> "ECDSA"
      true -> "Unknown"
    end

    changeset |> put_change(:digest, digest) |> put_change(:key_type, key_type)
  end

  defp parse_key(changeset), do: changeset
end
