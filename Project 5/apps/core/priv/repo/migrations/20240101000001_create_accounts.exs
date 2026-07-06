defmodule Core.Repo.Migrations.CreateAccounts do
  use Ecto.Migration

  def change do
    create table(:accounts, primary_key: false) do
      add :id,                  :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,                :string, null: false
      add :slug,                :string, null: false
      add :tier,                :integer, null: false, default: 0
      add :logo_url,            :string
      add :domain,              :string
      add :billing_email,       :string
      add :customer_id,         :string
      add :trial_ends_at,       :utc_datetime_usec
      add :suspended,           :boolean, default: false, null: false
      add :white_label,         :boolean, default: false, null: false
      add :max_viewers,         :integer, default: 5
      add :max_streams,         :integer, default: 1
      add :storage_quota_gb,    :integer, default: 10
      add :bandwidth_quota_tb,  :float, default: 1.0
      add :root_user_id,        :binary_id

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:accounts, [:slug])
    create unique_index(:accounts, [:domain])
    create index(:accounts, [:customer_id])
  end
end
