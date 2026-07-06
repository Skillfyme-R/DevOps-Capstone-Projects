defmodule Core.Schema.Subscription do
  @moduledoc """
  Viewer subscription to a FluxStream plan. Powered by Stripe.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Account, Plan}

  @type t :: %__MODULE__{}

  defenum SubscriptionStatus,
    trialing: 0,
    active: 1,
    past_due: 2,
    canceled: 3,
    unpaid: 4,
    paused: 5

  defenum BillingInterval,
    monthly: 0,
    annual: 1,
    lifetime: 2

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "subscriptions" do
    field :status,                SubscriptionStatus, default: :trialing
    field :billing_interval,      BillingInterval, default: :monthly
    field :stripe_subscription_id, :string
    field :stripe_customer_id,    :string
    field :current_period_start,  :utc_datetime_usec
    field :current_period_end,    :utc_datetime_usec
    field :trial_start,           :utc_datetime_usec
    field :trial_end,             :utc_datetime_usec
    field :canceled_at,           :utc_datetime_usec
    field :cancel_at_period_end,  :boolean, default: false
    field :quantity,              :integer, default: 1
    field :line_item_id,          :string
    field :latest_invoice,        :string

    belongs_to :user, User
    belongs_to :account, Account
    belongs_to :plan, Plan

    timestamps()
  end

  def changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :status, :billing_interval, :stripe_subscription_id, :stripe_customer_id,
      :current_period_start, :current_period_end, :trial_start, :trial_end,
      :canceled_at, :cancel_at_period_end, :quantity, :line_item_id,
      :latest_invoice, :user_id, :account_id, :plan_id
    ])
    |> validate_required([:user_id, :plan_id])
    |> unique_constraint(:stripe_subscription_id)
  end

  def cancel_changeset(subscription) do
    change(subscription, status: :canceled, canceled_at: DateTime.utc_now())
  end
end
