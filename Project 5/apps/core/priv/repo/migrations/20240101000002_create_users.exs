defmodule Core.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id,                :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,              :string, null: false
      add :email,             :string, null: false
      add :email_verified,    :boolean, default: false, null: false
      add :password_hash,     :string
      add :login_method,      :integer, default: 0, null: false
      add :onboarding,        :integer, default: 0, null: false
      add :role,              :integer, default: 0, null: false
      add :avatar_url,        :string
      add :phone,             :string
      add :customer_id,       :string
      add :external_id,       :string
      add :service_account,   :boolean, default: false, null: false
      add :suspended,         :boolean, default: false, null: false
      add :suspended_at,      :utc_datetime_usec
      add :language,          :string, default: "en"
      add :timezone,          :string, default: "UTC"
      add :marketing_consent, :boolean, default: false
      add :account_id,        references(:accounts, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:users, [:email])
    create index(:users, [:account_id])
    create index(:users, [:customer_id])
    create index(:users, [:external_id])
  end
end
