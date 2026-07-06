defmodule Core.Services.Users do
  @moduledoc """
  User lifecycle management — registration, authentication, profile updates,
  API token management, and SSO flows.
  """
  use Core.Services.Base

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.{User, PersistedToken, ViewingProfile, PublicKey, OIDCTrustRelationship}
  alias Core.Guardian

  @spec register(map) :: {:ok, User.t()} | {:error, term}
  def register(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> safe_insert()
  end

  @spec login(String.t(), String.t()) :: {:ok, String.t(), User.t()} | {:error, :invalid_credentials}
  def login(email, password) do
    user = Repo.get_by(User, email: String.downcase(email))

    with %User{} <- user,
         false <- user.suspended,
         true <- Argon2.verify_pass(password, user.password_hash),
         {:ok, token, _claims} <- Guardian.encode_and_sign(user, %{}, ttl: {30, :days}) do
      user = Repo.preload(user, [:account, subscriptions: [:plan]])
      {:ok, token, user}
    else
      _ -> {:error, :invalid_credentials}
    end
  end

  @spec get_user(binary) :: {:ok, User.t()} | {:error, term}
  def get_user(id) do
    case Repo.get(User, id) do
      nil -> not_found(:user)
      user -> {:ok, user}
    end
  end

  @spec get_user_by_email(String.t()) :: {:ok, User.t()} | {:error, term}
  def get_user_by_email(email) do
    case Repo.get_by(User, email: String.downcase(email)) do
      nil -> not_found(:user)
      user -> {:ok, user}
    end
  end

  @spec update_user(User.t(), map) :: {:ok, User.t()} | {:error, term}
  def update_user(user, attrs) do
    user
    |> User.changeset(attrs)
    |> safe_update()
  end

  @spec suspend_user(User.t(), User.t()) :: {:ok, User.t()} | {:error, term}
  def suspend_user(user, actor) do
    with {:ok, updated} <- user |> User.suspend_changeset() |> safe_update() do
      audit(:user_suspended, actor, user)
      {:ok, updated}
    end
  end

  @spec delete_user(User.t(), User.t()) :: {:ok, User.t()} | {:error, term}
  def delete_user(user, actor) do
    with {:ok, deleted} <- safe_delete(user) do
      audit(:user_deleted, actor, user)
      {:ok, deleted}
    end
  end

  @spec create_api_token(User.t(), map) :: {:ok, String.t(), PersistedToken.t()} | {:error, term}
  def create_api_token(user, attrs) do
    changeset = PersistedToken.changeset(%PersistedToken{}, Map.put(attrs, :user_id, user.id))

    with {:ok, token_record} <- safe_insert(changeset) do
      audit(:api_key_created, user, token_record)
      {:ok, token_record.token, token_record}
    end
  end

  @spec revoke_api_token(PersistedToken.t(), User.t()) :: {:ok, PersistedToken.t()} | {:error, term}
  def revoke_api_token(token, actor) do
    with {:ok, revoked} <- token |> PersistedToken.revoke_changeset() |> safe_update() do
      audit(:api_key_revoked, actor, revoked)
      {:ok, revoked}
    end
  end

  @spec authenticate_token(String.t()) :: {:ok, User.t()} | {:error, :invalid_token}
  def authenticate_token("fxs_" <> _ = raw_token) do
    hash = :crypto.hash(:sha256, raw_token) |> Base.encode16(case: :lower)

    token =
      PersistedToken
      |> where([t], t.token_hash == ^hash and not t.revoked)
      |> where([t], is_nil(t.expires_at) or t.expires_at > ^DateTime.utc_now())
      |> preload(:user)
      |> Repo.one()

    case token do
      nil -> {:error, :invalid_token}
      t ->
        Repo.update_all(where(PersistedToken, id: ^t.id), set: [last_used_at: DateTime.utc_now()])
        {:ok, t.user}
    end
  end

  def authenticate_token(_), do: {:error, :invalid_token}

  @spec create_viewing_profile(User.t(), map) :: {:ok, ViewingProfile.t()} | {:error, term}
  def create_viewing_profile(user, attrs) do
    attrs = Map.put(attrs, :user_id, user.id)
    %ViewingProfile{} |> ViewingProfile.changeset(attrs) |> safe_insert()
  end

  @spec add_public_key(User.t(), map) :: {:ok, PublicKey.t()} | {:error, term}
  def add_public_key(user, attrs) do
    attrs = Map.put(attrs, :user_id, user.id)
    %PublicKey{} |> PublicKey.changeset(attrs) |> safe_insert()
  end

  @spec link_oidc(User.t(), String.t(), String.t(), binary) :: {:ok, OIDCTrustRelationship.t()} | {:error, term}
  def link_oidc(user, external_id, provider_name, provider_id) do
    %OIDCTrustRelationship{}
    |> OIDCTrustRelationship.changeset(%{
      external_id: external_id,
      provider_name: provider_name,
      user_id: user.id,
      oidc_provider_id: provider_id
    })
    |> safe_insert()
  end
end
