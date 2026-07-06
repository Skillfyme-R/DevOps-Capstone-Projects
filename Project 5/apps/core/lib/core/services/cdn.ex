defmodule Core.Services.CDN do
  @moduledoc """
  CDN node management — provision, monitor, and route streaming traffic
  across global edge nodes.
  Analogous to Plural's Cluster/Cloud service.
  """
  use Core.Services.Base

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.{CDNNode, StreamEndpoint}

  @health_check_timeout 5_000

  @spec provision_node(map) :: {:ok, CDNNode.t()} | {:error, term}
  def provision_node(attrs) do
    with {:ok, node} <- %CDNNode{} |> CDNNode.changeset(attrs) |> safe_insert() do
      audit_node(:cdn_node_added, node)
      {:ok, node}
    end
  end

  @spec decommission_node(CDNNode.t(), User.t()) :: {:ok, CDNNode.t()} | {:error, term}
  def decommission_node(node, actor) do
    with {:ok, draining} <- node |> Ecto.Changeset.change(status: :draining) |> safe_update() do
      audit(:cdn_node_removed, actor, draining)
      {:ok, draining}
    end
  end

  @spec update_node_health(CDNNode.t(), map) :: {:ok, CDNNode.t()} | {:error, term}
  def update_node_health(node, metrics) do
    node
    |> Ecto.Changeset.change(%{
      current_load_pct: metrics[:load_pct] || node.current_load_pct,
      latency_ms: metrics[:latency_ms] || node.latency_ms,
      active_streams: metrics[:active_streams] || node.active_streams,
      last_health_check: DateTime.utc_now(),
      status: determine_health_status(metrics)
    })
    |> safe_update()
  end

  @spec best_node_for_region(String.t()) :: {:ok, CDNNode.t()} | {:error, :no_available_nodes}
  def best_node_for_region(viewer_region) do
    node =
      CDNNode
      |> where([n], n.status == :healthy)
      |> where([n], n.region == ^viewer_region or n.current_load_pct < 80.0)
      |> order_by([n], [asc: n.current_load_pct, asc: n.latency_ms])
      |> limit(1)
      |> Repo.one()

    case node do
      nil -> {:error, :no_available_nodes}
      node -> {:ok, node}
    end
  end

  @spec generate_signed_stream_url(StreamEndpoint.t(), binary, integer) :: String.t()
  def generate_signed_stream_url(endpoint, viewer_id, ttl_seconds \\ 3600) do
    expires = System.system_time(:second) + ttl_seconds
    payload = "#{endpoint.url}|#{viewer_id}|#{expires}"
    secret = Application.get_env(:core, :cdn_signing_secret, "dev-cdn-secret")
    sig = :crypto.mac(:hmac, :sha256, secret, payload) |> Base.url_encode64(padding: false)
    "#{endpoint.url}?viewer=#{viewer_id}&expires=#{expires}&sig=#{sig}"
  end

  @spec list_nodes(keyword) :: [CDNNode.t()]
  def list_nodes(opts \\ []) do
    CDNNode
    |> apply_filters(opts)
    |> order_by([n], [asc: n.region])
    |> Repo.all()
  end

  @spec get_node(binary) :: {:ok, CDNNode.t()} | {:error, term}
  def get_node(id) do
    case Repo.get(CDNNode, id) do
      nil -> not_found(:cdn_node)
      node -> {:ok, node}
    end
  end

  @spec platform_capacity :: map
  def platform_capacity do
    CDNNode
    |> where([n], n.status == :healthy)
    |> select([n], %{
      total_capacity: sum(n.capacity_gbps),
      avg_load: avg(n.current_load_pct),
      total_active_streams: sum(n.active_streams),
      node_count: count(n.id)
    })
    |> Repo.one()
  end

  defp determine_health_status(%{load_pct: load}) when load > 95, do: :degraded
  defp determine_health_status(%{load_pct: _}), do: :healthy
  defp determine_health_status(_), do: :healthy

  defp audit_node(action, node) do
    Phoenix.PubSub.broadcast(Core.PubSub, "cdn:events", {action, node})
  end

  defp apply_filters(query, opts) do
    Enum.reduce(opts, query, fn
      {:status, status}, q -> where(q, [n], n.status == ^status)
      {:provider, provider}, q -> where(q, [n], n.provider == ^provider)
      {:region, region}, q -> where(q, [n], n.region == ^region)
      {:limit, n}, q -> limit(q, ^n)
      _, q -> q
    end)
  end
end
