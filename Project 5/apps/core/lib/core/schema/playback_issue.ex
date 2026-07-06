defmodule Core.Schema.PlaybackIssue do
  @moduledoc """
  A viewer-reported playback issue or support ticket.
  Analogous to Plural's Incident schema.
  """
  use Core.Schema
  import Ecto.Changeset

  alias Core.Schema.{User, Content, Episode, PlaybackIssueMessage}

  @type t :: %__MODULE__{}

  defenum IssueType,
    buffering: 0,
    no_audio: 1,
    poor_quality: 2,
    playback_error: 3,
    subtitles: 4,
    login: 5,
    billing: 6,
    other: 7

  defenum IssueStatus,
    open: 0,
    in_progress: 1,
    resolved: 2,
    closed: 3,
    wont_fix: 4

  defenum IssuePriority,
    low: 0,
    medium: 1,
    high: 2,
    critical: 3

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @timestamps_opts [type: :utc_datetime_usec]

  schema "playback_issues" do
    field :title,           :string
    field :description,     :string
    field :issue_type,      IssueType
    field :status,          IssueStatus, default: :open
    field :priority,        IssuePriority, default: :medium
    field :device_info,     :map, default: %{}
    field :browser_info,    :string
    field :os_info,         :string
    field :network_type,    :string
    field :playback_url,    :string
    field :error_code,      :string
    field :resolved_at,     :utc_datetime_usec
    field :resolution_note, :string

    belongs_to :reporter, User, foreign_key: :reporter_id
    belongs_to :assignee, User, foreign_key: :assignee_id
    belongs_to :content, Content
    belongs_to :episode, Episode
    has_many :messages, PlaybackIssueMessage

    timestamps()
  end

  def changeset(issue, attrs) do
    issue
    |> cast(attrs, [
      :title, :description, :issue_type, :status, :priority,
      :device_info, :browser_info, :os_info, :network_type,
      :playback_url, :error_code, :reporter_id, :assignee_id,
      :content_id, :episode_id
    ])
    |> validate_required([:title, :description, :issue_type, :reporter_id])
    |> validate_length(:title, min: 3, max: 500)
  end

  def resolve_changeset(issue, note) do
    issue
    |> change(status: :resolved, resolved_at: DateTime.utc_now(), resolution_note: note)
  end
end
