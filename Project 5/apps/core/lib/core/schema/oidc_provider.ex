defmodule Core.Schema.OIDCProvider do
  @moduledoc """
  OpenID Connect provider integration — allows accounts to configure
  SSO for their team (e.g., Okta, Auth0, Azure AD).
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.Account

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "oidc_providers" do
    field :name,            :string
    field :client_id,       :string
    field :client_secret,   :string
    field :discovery_url,   :string
    field :redirect_uris,   {:array, :string}, default: []
    field :scopes,          {:array, :string}, default: ["openid", "email", "profile"]
    field :active,          :boolean, default: true

    belongs_to :account, Account

    timestamps()
  end

  def changeset(provider, attrs) do
    provider
    |> cast(attrs, [
      :name, :client_id, :client_secret, :discovery_url,
      :redirect_uris, :scopes, :active, :account_id
    ])
    |> validate_required([:name, :client_id, :client_secret, :discovery_url, :account_id])
    |> validate_format(:discovery_url, ~r/^https:\/\//, message: "must be an HTTPS URL")
  end
end

defmodule Core.Schema.OIDCTrustRelationship do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, OIDCProvider}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "oidc_trust_relationships" do
    field :external_id, :string
    field :provider_name, :string

    belongs_to :user, User
    belongs_to :oidc_provider, OIDCProvider

    timestamps()
  end

  def changeset(trust, attrs) do
    trust
    |> cast(attrs, [:external_id, :provider_name, :user_id, :oidc_provider_id])
    |> validate_required([:external_id, :user_id])
    |> unique_constraint([:external_id, :oidc_provider_id])
  end
end
