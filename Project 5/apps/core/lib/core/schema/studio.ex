defmodule Core.Schema.Studio do
  @moduledoc """
  A Studio is a content publisher on FluxStream — equivalent to a Production House.
  Studios upload, manage, and monetize their content libraries.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Content, Account, StudioMember}

  @type t :: %__MODULE__{}

  defenum StudioStatus,
    pending: 0,
    active: 1,
    suspended: 2,
    deactivated: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "studios" do
    field :name,             :string
    field :slug,             :string
    field :description,      :string
    field :logo_url,         :string
    field :banner_url,       :string
    field :website,          :string
    field :status,           StudioStatus, default: :pending
    field :verified,         :boolean, default: false
    field :revenue_share,    :float, default: 0.70
    field :content_count,    :integer, default: 0
    field :total_views,      :integer, default: 0
    field :stripe_account_id, :string
    field :payout_enabled,   :boolean, default: false
    field :genres,           {:array, :string}, default: []
    field :country,          :string

    belongs_to :owner, User
    belongs_to :account, Account
    has_many :contents, Content
    has_many :studio_members, StudioMember

    timestamps()
  end

  def changeset(studio, attrs) do
    studio
    |> cast(attrs, [
      :name, :slug, :description, :logo_url, :banner_url, :website,
      :status, :verified, :revenue_share, :stripe_account_id,
      :payout_enabled, :genres, :country, :owner_id, :account_id
    ])
    |> validate_required([:name, :owner_id])
    |> validate_length(:name, min: 2, max: 255)
    |> validate_number(:revenue_share, greater_than: 0, less_than_or_equal_to: 1.0)
    |> unique_constraint(:slug)
    |> put_slug()
  end

  defp put_slug(%{valid?: true, changes: %{name: name}} = changeset) do
    slug = name |> String.downcase() |> String.replace(~r/[^a-z0-9\s]/, "") |> String.replace(~r/\s+/, "-")
    put_change(changeset, :slug, slug)
  end

  defp put_slug(changeset), do: changeset
end
