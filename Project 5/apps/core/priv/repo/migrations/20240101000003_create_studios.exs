defmodule Core.Repo.Migrations.CreateStudios do
  use Ecto.Migration

  def change do
    create table(:studios, primary_key: false) do
      add :id,                :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,              :string, null: false
      add :slug,              :string, null: false
      add :description,       :text
      add :logo_url,          :string
      add :banner_url,        :string
      add :website,           :string
      add :status,            :integer, default: 0, null: false
      add :verified,          :boolean, default: false, null: false
      add :revenue_share,     :float, default: 0.70, null: false
      add :content_count,     :integer, default: 0
      add :total_views,       :integer, default: 0
      add :stripe_account_id, :string
      add :payout_enabled,    :boolean, default: false
      add :genres,            {:array, :string}, default: []
      add :country,           :string
      add :owner_id,          references(:users, type: :binary_id, on_delete: :restrict), null: false
      add :account_id,        references(:accounts, type: :binary_id, on_delete: :nilify_all)

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:studios, [:slug])
    create index(:studios, [:owner_id])
    create index(:studios, [:account_id])
    create index(:studios, [:status])

    create table(:studio_members, primary_key: false) do
      add :id,        :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :role,      :integer, default: 3, null: false
      add :studio_id, references(:studios, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id,   references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:studio_members, [:studio_id, :user_id])
  end
end
