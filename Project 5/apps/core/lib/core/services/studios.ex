defmodule Core.Services.Studios do
  @moduledoc """
  Studio (content publisher) lifecycle management — onboarding, verification,
  payout configuration, and member access control.
  Analogous to Plural's Publisher service.
  """
  use Core.Services.Base

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.{Studio, StudioMember, User}

  @spec create_studio(User.t(), map) :: {:ok, Studio.t()} | {:error, term}
  def create_studio(owner, attrs) do
    attrs = Map.put(attrs, :owner_id, owner.id)

    with {:ok, studio} <- %Studio{} |> Studio.changeset(attrs) |> safe_insert(),
         {:ok, _member} <- add_member(studio, owner, :owner) do
      {:ok, studio}
    end
  end

  @spec update_studio(Studio.t(), map) :: {:ok, Studio.t()} | {:error, term}
  def update_studio(studio, attrs) do
    studio |> Studio.changeset(attrs) |> safe_update()
  end

  @spec approve_studio(Studio.t(), User.t()) :: {:ok, Studio.t()} | {:error, term}
  def approve_studio(studio, actor) do
    with {:ok, approved} <- studio |> Ecto.Changeset.change(status: :active, verified: true) |> safe_update() do
      audit(:studio_approved, actor, studio)
      {:ok, approved}
    end
  end

  @spec suspend_studio(Studio.t(), User.t()) :: {:ok, Studio.t()} | {:error, term}
  def suspend_studio(studio, actor) do
    with {:ok, suspended} <- studio |> Ecto.Changeset.change(status: :suspended) |> safe_update() do
      audit(:studio_suspended, actor, studio)
      {:ok, suspended}
    end
  end

  @spec add_member(Studio.t(), User.t(), atom) :: {:ok, StudioMember.t()} | {:error, term}
  def add_member(studio, user, role \\ :viewer) do
    %StudioMember{}
    |> StudioMember.changeset(%{studio_id: studio.id, user_id: user.id, role: role})
    |> safe_insert()
  end

  @spec remove_member(Studio.t(), User.t()) :: {:ok, StudioMember.t()} | {:error, term}
  def remove_member(studio, user) do
    case Repo.get_by(StudioMember, studio_id: studio.id, user_id: user.id) do
      nil -> not_found(:studio_member)
      member -> safe_delete(member)
    end
  end

  @spec configure_payout(Studio.t(), String.t()) :: {:ok, Studio.t()} | {:error, term}
  def configure_payout(studio, stripe_account_id) do
    studio
    |> Ecto.Changeset.change(stripe_account_id: stripe_account_id, payout_enabled: true)
    |> safe_update()
  end

  @spec get_studio(binary) :: {:ok, Studio.t()} | {:error, term}
  def get_studio(id) do
    case Repo.get(Studio, id) do
      nil -> not_found(:studio)
      studio -> {:ok, studio}
    end
  end

  @spec get_studio_by_slug(String.t()) :: {:ok, Studio.t()} | {:error, term}
  def get_studio_by_slug(slug) do
    case Repo.get_by(Studio, slug: slug) do
      nil -> not_found(:studio)
      studio -> {:ok, studio}
    end
  end

  @spec list_studios(keyword) :: [Studio.t()]
  def list_studios(opts \\ []) do
    Studio
    |> apply_filters(opts)
    |> Repo.all()
  end

  @spec is_member?(Studio.t(), User.t()) :: boolean
  def is_member?(studio, user) do
    Repo.exists?(where(StudioMember, studio_id: ^studio.id, user_id: ^user.id))
  end

  @spec member_role(Studio.t(), User.t()) :: {:ok, atom} | {:error, :not_a_member}
  def member_role(studio, user) do
    case Repo.get_by(StudioMember, studio_id: studio.id, user_id: user.id) do
      nil -> {:error, :not_a_member}
      %{role: role} -> {:ok, role}
    end
  end

  defp apply_filters(query, opts) do
    Enum.reduce(opts, query, fn
      {:status, status}, q -> where(q, [s], s.status == ^status)
      {:verified, val}, q -> where(q, [s], s.verified == ^val)
      {:limit, n}, q -> limit(q, ^n)
      _, q -> q
    end)
  end
end
