defmodule Core.Services.Accounts do
  @moduledoc """
  Account and tenant management — create, update, suspend, and configure
  FluxStream accounts (B2B tenants on the platform).
  """
  use Core.Services.Base

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.{Account, User, DomainMapping, OIDCProvider, Group, Role, Invite}

  @spec get_account(binary) :: {:ok, Account.t()} | {:error, term}
  def get_account(id) do
    case Repo.get(Account, id) do
      nil -> not_found(:account)
      account -> {:ok, account}
    end
  end

  @spec get_account_by_slug(String.t()) :: {:ok, Account.t()} | {:error, term}
  def get_account_by_slug(slug) do
    case Repo.get_by(Account, slug: slug) do
      nil -> not_found(:account)
      account -> {:ok, account}
    end
  end

  @spec create_account(map, User.t()) :: {:ok, Account.t()} | {:error, term}
  def create_account(attrs, root_user) do
    attrs = Map.put(attrs, :root_user_id, root_user.id)

    %Account{}
    |> Account.changeset(attrs)
    |> safe_insert()
  end

  @spec update_account(Account.t(), map) :: {:ok, Account.t()} | {:error, term}
  def update_account(account, attrs) do
    account
    |> Account.changeset(attrs)
    |> safe_update()
  end

  @spec suspend_account(Account.t(), User.t()) :: {:ok, Account.t()} | {:error, term}
  def suspend_account(account, actor) do
    with {:ok, account} <- account |> change(suspended: true) |> safe_update() do
      audit(:billing_updated, actor, account, metadata: %{action: "suspended"})
      {:ok, account}
    end
  end

  @spec add_domain(Account.t(), String.t()) :: {:ok, DomainMapping.t()} | {:error, term}
  def add_domain(account, domain) do
    %DomainMapping{}
    |> DomainMapping.changeset(%{domain: domain, account_id: account.id})
    |> safe_insert()
  end

  @spec configure_oidc(Account.t(), map) :: {:ok, OIDCProvider.t()} | {:error, term}
  def configure_oidc(account, attrs) do
    attrs = Map.put(attrs, :account_id, account.id)

    %OIDCProvider{}
    |> OIDCProvider.changeset(attrs)
    |> safe_insert()
  end

  @spec create_invite(Account.t(), String.t(), User.t()) :: {:ok, Invite.t()} | {:error, term}
  def create_invite(account, email, inviter) do
    %Invite{}
    |> Invite.changeset(%{email: email, account_id: account.id, invited_by_id: inviter.id})
    |> safe_insert()
  end

  @spec accept_invite(String.t(), map) :: {:ok, User.t()} | {:error, term}
  def accept_invite(token, user_attrs) do
    with {:ok, invite} <- get_invite_by_token(token),
         false <- invite.accepted,
         {:ok, user} <- create_user_from_invite(invite, user_attrs),
         {:ok, _} <- mark_invite_accepted(invite) do
      {:ok, user}
    else
      true -> {:error, :invite_already_accepted}
      error -> error
    end
  end

  defp get_invite_by_token(token) do
    case Repo.get_by(Invite, token: token) do
      nil -> not_found(:invite)
      invite -> if DateTime.before?(DateTime.utc_now(), invite.expires_at), do: {:ok, invite}, else: {:error, :invite_expired}
    end
  end

  defp create_user_from_invite(invite, attrs) do
    attrs = Map.merge(attrs, %{email: invite.email, account_id: invite.account_id})
    %User{} |> User.changeset(attrs) |> safe_insert()
  end

  defp mark_invite_accepted(invite) do
    invite
    |> Ecto.Changeset.change(accepted: true, accepted_at: DateTime.utc_now())
    |> safe_update()
  end

  @spec create_group(Account.t(), map) :: {:ok, Group.t()} | {:error, term}
  def create_group(account, attrs) do
    %Group{}
    |> Group.changeset(Map.put(attrs, :account_id, account.id))
    |> safe_insert()
  end

  @spec create_role(Account.t(), map) :: {:ok, Role.t()} | {:error, term}
  def create_role(account, attrs) do
    %Role{}
    |> Role.changeset(Map.put(attrs, :account_id, account.id))
    |> safe_insert()
  end

  @spec list_accounts(keyword) :: [Account.t()]
  def list_accounts(opts \\ []) do
    Account
    |> apply_filters(opts)
    |> Repo.all()
  end

  defp apply_filters(query, opts) do
    Enum.reduce(opts, query, fn
      {:tier, tier}, q -> where(q, [a], a.tier == ^tier)
      {:suspended, val}, q -> where(q, [a], a.suspended == ^val)
      {:limit, n}, q -> limit(q, ^n)
      _, q -> q
    end)
  end
end
