defmodule Core.Schema.Webhook do
  @moduledoc """
  Studio webhook configurations — notify external systems on platform events
  (e.g., when transcoding completes, a new subscriber arrives, content is published).
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{Account, Studio, WebhookDelivery}

  @supported_events ~w(
    content.published content.deleted
    episode.published episode.deleted
    transcoding.completed transcoding.failed
    subscription.created subscription.canceled subscription.past_due
    playback_issue.opened playback_issue.resolved
    studio.approved studio.suspended
    cdn_node.online cdn_node.offline
  )

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "webhooks" do
    field :url,         :string
    field :secret,      :string
    field :events,      {:array, :string}, default: []
    field :active,      :boolean, default: true
    field :description, :string

    belongs_to :account, Account
    belongs_to :studio, Studio
    has_many :deliveries, WebhookDelivery

    timestamps()
  end

  def changeset(webhook, attrs) do
    webhook
    |> cast(attrs, [:url, :events, :active, :description, :account_id, :studio_id])
    |> validate_required([:url, :events])
    |> validate_format(:url, ~r/^https:\/\//, message: "must be an HTTPS URL")
    |> validate_events()
    |> put_secret()
  end

  defp validate_events(changeset) do
    validate_change(changeset, :events, fn :events, events ->
      invalid = Enum.reject(events, &(&1 in @supported_events))
      if Enum.empty?(invalid), do: [], else: [events: "unsupported events: #{Enum.join(invalid, ", ")}"]
    end)
  end

  defp put_secret(%{data: %{secret: nil}} = changeset) do
    put_change(changeset, :secret, :crypto.strong_rand_bytes(32) |> Base.encode16(case: :lower))
  end

  defp put_secret(changeset), do: changeset
end

defmodule Core.Schema.WebhookDelivery do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.Webhook

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "webhook_deliveries" do
    field :event,        :string
    field :payload,      :map
    field :response_status, :integer
    field :response_body, :string
    field :delivered_at, :utc_datetime_usec
    field :failed,       :boolean, default: false
    field :retry_count,  :integer, default: 0

    belongs_to :webhook, Webhook

    timestamps()
  end

  def changeset(delivery, attrs) do
    delivery
    |> cast(attrs, [:event, :payload, :response_status, :response_body, :delivered_at, :failed, :retry_count, :webhook_id])
    |> validate_required([:event, :webhook_id])
  end
end
