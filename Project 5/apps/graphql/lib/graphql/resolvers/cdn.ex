defmodule Graphql.Resolvers.CDN do
  @moduledoc "GraphQL resolvers for CDN node management and platform capacity."

  alias Core.Services.CDN

  def list_nodes(args, _) do
    opts = build_opts(args, [:status, :region, :limit])
    {:ok, CDN.list_nodes(opts)}
  end

  def get_node(%{id: id}, _), do: CDN.get_node(id)

  def platform_capacity(_, _) do
    {:ok, CDN.platform_capacity()}
  end

  def provision_node(attrs, %{context: %{current_user: user}}) do
    with :ok <- require_admin(user) do
      CDN.provision_node(attrs)
    end
  end

  def decommission_node(%{id: id}, %{context: %{current_user: user}}) do
    with :ok <- require_admin(user),
         {:ok, node} <- CDN.get_node(id) do
      CDN.decommission_node(node, user)
    end
  end

  defp require_admin(%{role: :platform_admin}), do: :ok
  defp require_admin(_), do: {:error, "platform admin required"}

  defp build_opts(args, keys) do
    Enum.reduce(keys, [], fn key, acc ->
      case Map.get(args, key) do
        nil -> acc
        val -> [{key, val} | acc]
      end
    end)
  end
end
