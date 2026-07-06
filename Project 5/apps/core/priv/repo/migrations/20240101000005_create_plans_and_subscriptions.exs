defmodule Core.Repo.Migrations.CreatePlansAndSubscriptions do
  use Ecto.Migration

  def change do
    create table(:plans, primary_key: false) do
      add :id,                      :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,                    :string, null: false
      add :slug,                    :string
      add :description,             :text
      add :monthly_price_cents,     :integer, null: false
      add :annual_price_cents,      :integer
      add :currency,                :string, default: "usd", null: false
      add :stripe_monthly_price_id, :string
      add :stripe_annual_price_id,  :string
      add :max_streams,             :integer, default: 1
      add :max_profiles,            :integer, default: 1
      add :max_quality,             :integer, default: 2
      add :offline_downloads,       :boolean, default: false
      add :hdr_enabled,             :boolean, default: false
      add :dolby_atmos,             :boolean, default: false
      add :ads_supported,           :boolean, default: true
      add :family_sharing,          :boolean, default: false
      add :student_discount,        :boolean, default: false
      add :trial_days,              :integer, default: 7
      add :active,                  :boolean, default: true
      add :public,                  :boolean, default: true
      add :sort_order,              :integer, default: 0
      add :features,                {:array, :string}, default: []

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:plans, [:slug])
    create index(:plans, [:active, :public])

    create table(:subscriptions, primary_key: false) do
      add :id,                      :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :status,                  :integer, default: 0, null: false
      add :billing_interval,        :integer, default: 0, null: false
      add :stripe_subscription_id,  :string
      add :stripe_customer_id,      :string
      add :current_period_start,    :utc_datetime_usec
      add :current_period_end,      :utc_datetime_usec
      add :trial_start,             :utc_datetime_usec
      add :trial_end,               :utc_datetime_usec
      add :canceled_at,             :utc_datetime_usec
      add :cancel_at_period_end,    :boolean, default: false
      add :quantity,                :integer, default: 1
      add :line_item_id,            :string
      add :latest_invoice,          :string
      add :user_id,                 references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :account_id,              references(:accounts, type: :binary_id, on_delete: :nilify_all)
      add :plan_id,                 references(:plans, type: :binary_id, on_delete: :restrict), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:subscriptions, [:stripe_subscription_id])
    create index(:subscriptions, [:user_id])
    create index(:subscriptions, [:account_id])
    create index(:subscriptions, [:plan_id])
    create index(:subscriptions, [:status])
  end
end
