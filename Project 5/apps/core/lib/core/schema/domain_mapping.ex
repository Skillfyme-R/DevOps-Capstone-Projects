defmodule Core.Schema.DomainMapping do
  @moduledoc """
  Custom domain mapping for white-label accounts.
  An account on the Business/Enterprise tier can serve FluxStream
  under their own domain (e.g., streaming.acmecorp.com).
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.Account

  defenum DomainStatus,
    pending: 0,
    verifying: 1,
    active: 2,
    failed: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "domain_mappings" do
    field :domain,           :string
    field :status,           DomainStatus, default: :pending
    field :verification_key, :string
    field :ssl_enabled,      :boolean, default: false
    field :ssl_expires_at,   :utc_datetime_usec
    field :verified_at,      :utc_datetime_usec

    belongs_to :account, Account

    timestamps()
  end

  def changeset(mapping, attrs) do
    mapping
    |> cast(attrs, [:domain, :account_id])
    |> validate_required([:domain, :account_id])
    |> validate_format(:domain, ~r/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, message: "must be a valid domain name")
    |> unique_constraint(:domain)
    |> put_verification_key()
  end

  defp put_verification_key(changeset) do
    key = "fluxstream-verify=#{:crypto.strong_rand_bytes(16) |> Base.encode16(case: :lower)}"
    put_change(changeset, :verification_key, key)
  end
end
