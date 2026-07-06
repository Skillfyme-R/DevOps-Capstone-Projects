defmodule Core.Schema.ContentRating do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Content}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "content_ratings" do
    field :score,   :integer
    field :liked,   :boolean

    belongs_to :user, User
    belongs_to :content, Content

    timestamps()
  end

  def changeset(rating, attrs) do
    rating
    |> cast(attrs, [:score, :liked, :user_id, :content_id])
    |> validate_required([:user_id, :content_id])
    |> validate_number(:score, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> unique_constraint([:user_id, :content_id])
  end
end

defmodule Core.Schema.ContentReview do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Content}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "content_reviews" do
    field :body,    :string
    field :score,   :integer
    field :spoiler, :boolean, default: false
    field :approved, :boolean, default: false

    belongs_to :user, User
    belongs_to :content, Content

    timestamps()
  end

  def changeset(review, attrs) do
    review
    |> cast(attrs, [:body, :score, :spoiler, :user_id, :content_id])
    |> validate_required([:body, :score, :user_id, :content_id])
    |> validate_length(:body, min: 20, max: 5000)
    |> validate_number(:score, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
  end
end
