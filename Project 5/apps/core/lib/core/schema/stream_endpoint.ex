defmodule Core.Schema.StreamEndpoint do
  @moduledoc """
  A streaming endpoint — represents a CDN-delivered HLS/DASH manifest URL
  for a specific quality variant of a Content or Episode.
  Analogous to Plural's DNS records but for content delivery routing.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Content, Episode, CDNNode}

  @type t :: %__MODULE__{}

  defenum StreamProtocol,
    hls: 0,
    dash: 1,
    rtmp: 2,
    webrtc: 3

  defenum StreamQuality,
    auto: 0,
    sd_360p: 1,
    sd_480p: 2,
    hd_720p: 3,
    hd_1080p: 4,
    uhd_4k: 5

  defenum EndpointStatus,
    provisioning: 0,
    active: 1,
    degraded: 2,
    offline: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "stream_endpoints" do
    field :url,          :string
    field :protocol,     StreamProtocol, default: :hls
    field :quality,      StreamQuality, default: :auto
    field :status,       EndpointStatus, default: :provisioning
    field :region,       :string
    field :latency_ms,   :integer
    field :bitrate_kbps, :integer
    field :is_primary,   :boolean, default: false
    field :drm_enabled,  :boolean, default: false
    field :token_signed, :boolean, default: false
    field :expires_at,   :utc_datetime_usec

    belongs_to :content, Content
    belongs_to :episode, Episode
    belongs_to :cdn_node, CDNNode

    timestamps()
  end

  def changeset(endpoint, attrs) do
    endpoint
    |> cast(attrs, [
      :url, :protocol, :quality, :status, :region, :latency_ms,
      :bitrate_kbps, :is_primary, :drm_enabled, :token_signed,
      :expires_at, :content_id, :episode_id, :cdn_node_id
    ])
    |> validate_required([:url, :protocol])
    |> validate_format(:url, ~r/^https?:\/\//, message: "must be a valid URL")
  end
end
