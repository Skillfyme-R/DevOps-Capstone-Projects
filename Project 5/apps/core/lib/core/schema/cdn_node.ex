defmodule Core.Schema.CDNNode do
  @moduledoc """
  Represents a CDN edge node / streaming region. Analogous to Plural's Cluster.
  FluxStream routes viewer requests to the closest healthy CDN node.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.StreamEndpoint

  @type t :: %__MODULE__{}

  defenum NodeStatus,
    provisioning: 0,
    healthy: 1,
    degraded: 2,
    draining: 3,
    offline: 4

  defenum CloudProvider,
    aws: 0,
    gcp: 1,
    azure: 2,
    cloudflare: 3,
    akamai: 4,
    fastly: 5,
    self_hosted: 6

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "cdn_nodes" do
    field :name,              :string
    field :region,            :string
    field :country,           :string
    field :city,              :string
    field :provider,          CloudProvider
    field :status,            NodeStatus, default: :provisioning
    field :endpoint,          :string
    field :ip_address,        :string
    field :pop_code,          :string
    field :capacity_gbps,     :float
    field :current_load_pct,  :float, default: 0.0
    field :latency_ms,        :integer
    field :active_streams,    :integer, default: 0
    field :total_bandwidth_tb, :float, default: 0.0
    field :last_health_check, :utc_datetime_usec
    field :metadata,          :map, default: %{}

    has_many :stream_endpoints, StreamEndpoint

    timestamps()
  end

  def changeset(node, attrs) do
    node
    |> cast(attrs, [
      :name, :region, :country, :city, :provider, :status,
      :endpoint, :ip_address, :pop_code, :capacity_gbps,
      :current_load_pct, :latency_ms, :metadata
    ])
    |> validate_required([:name, :region, :provider])
    |> validate_number(:capacity_gbps, greater_than: 0)
    |> validate_number(:current_load_pct, greater_than_or_equal_to: 0, less_than_or_equal_to: 100)
    |> unique_constraint(:pop_code)
  end
end
