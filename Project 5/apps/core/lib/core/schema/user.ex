defmodule Core.Schema.User do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{
    Account,
    Subscription,
    ViewingProfile,
    Invite,
    Group,
    RoleBinding,
    PublicKey,
    PersistedToken,
    OIDCTrustRelationship,
    Audit
  }

  @email_re ~r/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-\.]+\.[a-zA-Z]{2,}$/

  @type t :: %__MODULE__{}

  defenum LoginMethod,
    password: 0,
    passwordless: 1,
    google: 2,
    github: 3,
    sso: 4,
    apple: 5

  defenum OnboardingStatus,
    new: 0,
    profile_created: 1,
    plan_selected: 2,
    content_browsed: 3,
    active: 4

  defenum UserRole,
    viewer: 0,
    creator: 1,
    studio_admin: 2,
    platform_admin: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "users" do
    field :name,              :string
    field :email,             :string
    field :email_verified,    :boolean, default: false
    field :password_hash,     :string
    field :password,          :string, virtual: true
    field :jwt,               :string, virtual: true
    field :login_method,      LoginMethod, default: :password
    field :onboarding,        OnboardingStatus, default: :new
    field :role,              UserRole, default: :viewer
    field :avatar_url,        :string
    field :phone,             :string
    field :customer_id,       :string
    field :external_id,       :string
    field :service_account,   :boolean, default: false
    field :suspended,         :boolean, default: false
    field :suspended_at,      :utc_datetime_usec
    field :language,          :string, default: "en"
    field :timezone,          :string, default: "UTC"
    field :marketing_consent, :boolean, default: false

    belongs_to :account, Account
    has_many :subscriptions, Subscription
    has_many :viewing_profiles, ViewingProfile
    has_many :role_bindings, RoleBinding
    has_many :persisted_tokens, PersistedToken
    has_many :audits, Audit
    has_many :public_keys, PublicKey
    has_many :oidc_trust_relationships, OIDCTrustRelationship

    timestamps()
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :name, :email, :password, :login_method, :role, :avatar_url,
      :phone, :customer_id, :external_id, :service_account,
      :marketing_consent, :language, :timezone, :account_id
    ])
    |> validate_required([:name, :email])
    |> validate_format(:email, @email_re, message: "must be a valid email address")
    |> validate_length(:name, min: 1, max: 255)
    |> validate_length(:password, min: 8, max: 72)
    |> unique_constraint(:email)
    |> hash_password()
  end

  def onboarding_changeset(user, attrs) do
    user
    |> cast(attrs, [:onboarding])
    |> validate_required([:onboarding])
  end

  def suspend_changeset(user) do
    user
    |> change(suspended: true, suspended_at: DateTime.utc_now())
  end

  defp hash_password(%{valid?: true, changes: %{password: pwd}} = changeset) do
    change(changeset, password_hash: Argon2.hash_pwd_salt(pwd), password: nil)
  end

  defp hash_password(changeset), do: changeset
end
