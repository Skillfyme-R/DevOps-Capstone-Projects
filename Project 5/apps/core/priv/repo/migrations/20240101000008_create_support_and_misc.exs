defmodule Core.Repo.Migrations.CreateSupportAndMisc do
  use Ecto.Migration

  def change do
    create table(:groups, primary_key: false) do
      add :id,          :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,        :string, null: false
      add :description, :text
      add :global,      :boolean, default: false
      add :account_id,  references(:accounts, type: :binary_id, on_delete: :delete_all)
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:groups, [:name, :account_id])

    create table(:group_members, primary_key: false) do
      add :id,       :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :group_id, references(:groups, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id,  references(:users, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:group_members, [:group_id, :user_id])

    create table(:roles, primary_key: false) do
      add :id,          :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,        :string, null: false
      add :description, :text
      add :permissions, {:array, :string}, default: []
      add :account_id,  references(:accounts, type: :binary_id, on_delete: :delete_all)
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:roles, [:name, :account_id])

    create table(:role_bindings, primary_key: false) do
      add :id,       :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :role_id,  references(:roles, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id,  references(:users, type: :binary_id, on_delete: :delete_all)
      add :group_id, references(:groups, type: :binary_id, on_delete: :delete_all)
      timestamps(type: :utc_datetime_usec)
    end

    create table(:invites, primary_key: false) do
      add :id,             :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :email,          :string, null: false
      add :token,          :string, null: false
      add :accepted,       :boolean, default: false
      add :accepted_at,    :utc_datetime_usec
      add :expires_at,     :utc_datetime_usec
      add :account_id,     references(:accounts, type: :binary_id, on_delete: :delete_all), null: false
      add :invited_by_id,  references(:users, type: :binary_id, on_delete: :nilify_all)
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:invites, [:email, :account_id])
    create unique_index(:invites, [:token])

    create table(:playback_issues, primary_key: false) do
      add :id,               :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :title,            :string, null: false
      add :description,      :text, null: false
      add :issue_type,       :integer, null: false
      add :status,           :integer, default: 0, null: false
      add :priority,         :integer, default: 1, null: false
      add :device_info,      :map, default: %{}
      add :browser_info,     :string
      add :os_info,          :string
      add :network_type,     :string
      add :playback_url,     :string
      add :error_code,       :string
      add :resolved_at,      :utc_datetime_usec
      add :resolution_note,  :text
      add :reporter_id,      references(:users, type: :binary_id, on_delete: :nilify_all), null: false
      add :assignee_id,      references(:users, type: :binary_id, on_delete: :nilify_all)
      add :content_id,       references(:contents, type: :binary_id, on_delete: :nilify_all)
      add :episode_id,       references(:episodes, type: :binary_id, on_delete: :nilify_all)
      timestamps(type: :utc_datetime_usec)
    end

    create index(:playback_issues, [:reporter_id])
    create index(:playback_issues, [:status])
    create index(:playback_issues, [:priority])

    create table(:playback_issue_messages, primary_key: false) do
      add :id,                :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :text,              :text, null: false
      add :internal,          :boolean, default: false
      add :attachments,       {:array, :string}, default: []
      add :author_id,         references(:users, type: :binary_id, on_delete: :nilify_all), null: false
      add :playback_issue_id, references(:playback_issues, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create index(:playback_issue_messages, [:playback_issue_id])

    create table(:audits, primary_key: false) do
      add :id,            :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :action,        :integer, null: false
      add :resource_id,   :binary_id
      add :resource_type, :string
      add :changes,       :map, default: %{}
      add :ip_address,    :string
      add :user_agent,    :string
      add :metadata,      :map, default: %{}
      add :actor_id,      references(:users, type: :binary_id, on_delete: :nilify_all)
      add :account_id,    references(:accounts, type: :binary_id, on_delete: :delete_all)
      add :inserted_at,   :utc_datetime_usec, null: false, default: fragment("now()")
    end

    create index(:audits, [:actor_id])
    create index(:audits, [:account_id])
    create index(:audits, [:action])
    create index(:audits, [:inserted_at])

    create table(:persisted_tokens, primary_key: false) do
      add :id,           :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :token_hash,   :string, null: false
      add :scopes,       {:array, :string}, default: []
      add :name,         :string
      add :last_used_at, :utc_datetime_usec
      add :expires_at,   :utc_datetime_usec
      add :revoked,      :boolean, default: false
      add :revoked_at,   :utc_datetime_usec
      add :user_id,      references(:users, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:persisted_tokens, [:token_hash])
    create index(:persisted_tokens, [:user_id])

    create table(:webhooks, primary_key: false) do
      add :id,          :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :url,         :string, null: false
      add :secret,      :string
      add :events,      {:array, :string}, default: []
      add :active,      :boolean, default: true
      add :description, :string
      add :account_id,  references(:accounts, type: :binary_id, on_delete: :delete_all)
      add :studio_id,   references(:studios, type: :binary_id, on_delete: :delete_all)
      timestamps(type: :utc_datetime_usec)
    end

    create index(:webhooks, [:account_id])
    create index(:webhooks, [:studio_id])

    create table(:webhook_deliveries, primary_key: false) do
      add :id,              :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :event,           :string, null: false
      add :payload,         :map
      add :response_status, :integer
      add :response_body,   :text
      add :delivered_at,    :utc_datetime_usec
      add :failed,          :boolean, default: false
      add :retry_count,     :integer, default: 0
      add :webhook_id,      references(:webhooks, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create index(:webhook_deliveries, [:webhook_id])

    create table(:domain_mappings, primary_key: false) do
      add :id,               :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :domain,           :string, null: false
      add :status,           :integer, default: 0, null: false
      add :verification_key, :string
      add :ssl_enabled,      :boolean, default: false
      add :ssl_expires_at,   :utc_datetime_usec
      add :verified_at,      :utc_datetime_usec
      add :account_id,       references(:accounts, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:domain_mappings, [:domain])
    create index(:domain_mappings, [:account_id])

    create table(:oidc_providers, primary_key: false) do
      add :id,             :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,           :string, null: false
      add :client_id,      :string, null: false
      add :client_secret,  :string, null: false
      add :discovery_url,  :string, null: false
      add :redirect_uris,  {:array, :string}, default: []
      add :scopes,         {:array, :string}, default: []
      add :active,         :boolean, default: true
      add :account_id,     references(:accounts, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create index(:oidc_providers, [:account_id])

    create table(:oidc_trust_relationships, primary_key: false) do
      add :id,               :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :external_id,      :string, null: false
      add :provider_name,    :string
      add :user_id,          references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :oidc_provider_id, references(:oidc_providers, type: :binary_id, on_delete: :delete_all)
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:oidc_trust_relationships, [:external_id, :oidc_provider_id])

    create table(:public_keys, primary_key: false) do
      add :id,         :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :name,       :string, null: false
      add :content,    :text, null: false
      add :digest,     :string
      add :key_type,   :string
      add :expires_at, :utc_datetime_usec
      add :user_id,    references(:users, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create index(:public_keys, [:user_id])
    create unique_index(:public_keys, [:digest])

    create table(:content_ratings, primary_key: false) do
      add :id,         :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :score,      :integer
      add :liked,      :boolean
      add :user_id,    references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :content_id, references(:contents, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create unique_index(:content_ratings, [:user_id, :content_id])

    create table(:content_reviews, primary_key: false) do
      add :id,         :binary_id, primary_key: true, default: fragment("gen_random_uuid()")
      add :body,       :text, null: false
      add :score,      :integer
      add :spoiler,    :boolean, default: false
      add :approved,   :boolean, default: false
      add :user_id,    references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :content_id, references(:contents, type: :binary_id, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime_usec)
    end

    create index(:content_reviews, [:content_id])
    create index(:content_reviews, [:approved])
  end
end
