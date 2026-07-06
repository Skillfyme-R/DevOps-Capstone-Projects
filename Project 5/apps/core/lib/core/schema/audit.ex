defmodule Core.Schema.Audit do
  @moduledoc """
  Immutable audit log for all significant platform events.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Account}

  @type t :: %__MODULE__{}

  defenum AuditAction,
    user_created: 0,
    user_deleted: 1,
    user_suspended: 2,
    login: 3,
    logout: 4,
    subscription_created: 5,
    subscription_canceled: 6,
    content_published: 7,
    content_deleted: 8,
    studio_approved: 9,
    studio_suspended: 10,
    plan_changed: 11,
    billing_updated: 12,
    cdn_node_added: 13,
    cdn_node_removed: 14,
    api_key_created: 15,
    api_key_revoked: 16

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "audits" do
    field :action,      AuditAction
    field :resource_id, :binary_id
    field :resource_type, :string
    field :changes,     :map, default: %{}
    field :ip_address,  :string
    field :user_agent,  :string
    field :metadata,    :map, default: %{}

    belongs_to :actor, User, foreign_key: :actor_id
    belongs_to :account, Account

    timestamps(updated_at: false)
  end

  def changeset(audit, attrs) do
    audit
    |> cast(attrs, [
      :action, :resource_id, :resource_type, :changes,
      :ip_address, :user_agent, :metadata, :actor_id, :account_id
    ])
    |> validate_required([:action])
  end
end
