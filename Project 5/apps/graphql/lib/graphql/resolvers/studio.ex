defmodule Graphql.Resolvers.Studio do
  @moduledoc "GraphQL resolvers for studio management."

  alias Core.Services.Studios

  def get_studio(%{id: id}, _) when not is_nil(id), do: Studios.get_studio(id)
  def get_studio(%{slug: slug}, _), do: Studios.get_studio_by_slug(slug)

  def list_studios(args, _) do
    opts = build_opts(args, [:status, :verified, :limit])
    {:ok, Studios.list_studios(opts)}
  end

  def create_studio(attrs, %{context: %{current_user: user}}) do
    Studios.create_studio(user, attrs)
  end

  def update_studio(%{id: id} = attrs, %{context: %{current_user: user}}) do
    with {:ok, studio} <- Studios.get_studio(id),
         :ok <- authorize_studio(user, studio) do
      Studios.update_studio(studio, Map.drop(attrs, [:id]))
    end
  end

  def approve_studio(%{id: id}, %{context: %{current_user: user}}) do
    with :ok <- require_admin(user),
         {:ok, studio} <- Studios.get_studio(id) do
      Studios.approve_studio(studio, user)
    end
  end

  def suspend_studio(%{id: id}, %{context: %{current_user: user}}) do
    with :ok <- require_admin(user),
         {:ok, studio} <- Studios.get_studio(id) do
      Studios.suspend_studio(studio, user)
    end
  end

  def add_studio_member(%{studio_id: sid, user_id: uid, role: role}, %{context: %{current_user: actor}}) do
    with {:ok, studio} <- Studios.get_studio(sid),
         :ok <- authorize_studio(actor, studio),
         {:ok, user} <- Core.Services.Users.get_user(uid) do
      Studios.add_member(studio, user, String.to_existing_atom(role))
    end
  end

  def remove_studio_member(%{studio_id: sid, user_id: uid}, %{context: %{current_user: actor}}) do
    with {:ok, studio} <- Studios.get_studio(sid),
         :ok <- authorize_studio(actor, studio),
         {:ok, user} <- Core.Services.Users.get_user(uid) do
      Studios.remove_member(studio, user)
    end
  end

  defp authorize_studio(user, studio) do
    cond do
      user.role == :platform_admin -> :ok
      studio.owner_id == user.id -> :ok
      true ->
        case Studios.member_role(studio, user) do
          {:ok, role} when role in [:owner, :admin] -> :ok
          _ -> {:error, "not authorized to manage this studio"}
        end
    end
  end

  defp require_admin(%{role: :platform_admin}), do: :ok
  defp require_admin(_), do: {:error, "platform admin required"}

  def my_studios(_args, user) do
    import Ecto.Query, only: [from: 2]
    studios = Core.Repo.all(
      from s in Core.Schema.Studio,
        where: s.owner_id == ^user.id,
        order_by: [asc: s.name]
    )
    {:ok, studios}
  end

  def studio_contents(%{studio_id: sid}, _info) do
    import Ecto.Query, only: [from: 2]
    items = Core.Repo.all(
      from c in Core.Schema.Content,
        where: c.studio_id == ^sid,
        order_by: [desc: c.inserted_at]
    )
    {:ok, items}
  end

  defp build_opts(args, keys) do
    Enum.reduce(keys, [], fn key, acc ->
      case Map.get(args, key) do
        nil -> acc
        val -> [{key, val} | acc]
      end
    end)
  end
end
