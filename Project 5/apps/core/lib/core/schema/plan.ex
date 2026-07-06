defmodule Core.Schema.Plan do
  @moduledoc """
  FluxStream subscription plan — maps to a Stripe product/price.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.Subscription

  @type t :: %__MODULE__{}

  defenum StreamQuality,
    sd: 0,
    hd: 1,
    full_hd: 2,
    uhd_4k: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "plans" do
    field :name,                  :string
    field :slug,                  :string
    field :description,           :string
    field :monthly_price_cents,   :integer
    field :annual_price_cents,    :integer
    field :currency,              :string, default: "usd"
    field :stripe_monthly_price_id, :string
    field :stripe_annual_price_id,  :string
    field :max_streams,           :integer, default: 1
    field :max_profiles,          :integer, default: 1
    field :max_quality,           StreamQuality, default: :hd
    field :offline_downloads,     :boolean, default: false
    field :hdr_enabled,           :boolean, default: false
    field :dolby_atmos,           :boolean, default: false
    field :ads_supported,         :boolean, default: true
    field :family_sharing,        :boolean, default: false
    field :student_discount,      :boolean, default: false
    field :trial_days,            :integer, default: 7
    field :active,                :boolean, default: true
    field :public,                :boolean, default: true
    field :sort_order,            :integer, default: 0
    field :features,              {:array, :string}, default: []

    has_many :subscriptions, Subscription

    timestamps()
  end

  def changeset(plan, attrs) do
    plan
    |> cast(attrs, [
      :name, :slug, :description, :monthly_price_cents, :annual_price_cents,
      :currency, :stripe_monthly_price_id, :stripe_annual_price_id,
      :max_streams, :max_profiles, :max_quality, :offline_downloads, :hdr_enabled,
      :dolby_atmos, :ads_supported, :family_sharing, :student_discount,
      :trial_days, :active, :public, :sort_order, :features
    ])
    |> validate_required([:name, :monthly_price_cents])
    |> validate_number(:monthly_price_cents, greater_than_or_equal_to: 0)
    |> validate_number(:max_streams, greater_than: 0)
    |> unique_constraint(:slug)
  end
end
