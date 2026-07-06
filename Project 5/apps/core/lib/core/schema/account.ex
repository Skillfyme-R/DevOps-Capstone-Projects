defmodule Core.Schema.Account do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Subscription, PlatformPlan, DomainMapping, Group, Role, Invite}

  @type t :: %__MODULE__{}

  defenum AccountTier,
    starter: 0,
    professional: 1,
    business: 2,
    enterprise: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "accounts" do
    field :name,             :string
    field :slug,             :string
    field :tier,             AccountTier, default: :starter
    field :logo_url,         :string
    field :domain,           :string
    field :billing_email,    :string
    field :customer_id,      :string
    field :trial_ends_at,    :utc_datetime_usec
    field :suspended,        :boolean, default: false
    field :white_label,      :boolean, default: false
    field :max_viewers,      :integer, default: 5
    field :max_streams,      :integer, default: 1
    field :storage_quota_gb, :integer, default: 10
    field :bandwidth_quota_tb, :float, default: 1.0

    belongs_to :root_user, User
    has_many :users, User
    has_many :groups, Group
    has_many :roles, Role
    has_many :invites, Invite
    has_many :subscriptions, Subscription
    has_many :domain_mappings, DomainMapping

    timestamps()
  end

  def changeset(account, attrs) do
    account
    |> cast(attrs, [
      :name, :slug, :tier, :logo_url, :domain, :billing_email,
      :customer_id, :trial_ends_at, :white_label,
      :max_viewers, :max_streams, :storage_quota_gb, :bandwidth_quota_tb,
      :root_user_id
    ])
    |> validate_required([:name, :slug])
    |> validate_length(:name, min: 2, max: 255)
    |> validate_format(:slug, ~r/^[a-z0-9\-]+$/, message: "must contain only lowercase letters, numbers, and hyphens")
    |> unique_constraint(:slug)
    |> unique_constraint(:domain)
  end
end
