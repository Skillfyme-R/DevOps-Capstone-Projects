defmodule Core.Schema.PlaybackIssueMessage do
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, PlaybackIssue}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "playback_issue_messages" do
    field :text,       :string
    field :internal,   :boolean, default: false
    field :attachments, {:array, :string}, default: []

    belongs_to :author, User, foreign_key: :author_id
    belongs_to :playback_issue, PlaybackIssue

    timestamps()
  end

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:text, :internal, :attachments, :author_id, :playback_issue_id])
    |> validate_required([:text, :author_id, :playback_issue_id])
    |> validate_length(:text, min: 1, max: 10_000)
  end
end
