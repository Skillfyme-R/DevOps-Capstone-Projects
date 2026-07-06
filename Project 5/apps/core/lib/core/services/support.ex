defmodule Core.Services.Support do
  @moduledoc """
  Viewer support — report, triage, and resolve playback issues.
  Analogous to Plural's Incidents service.
  """
  use Core.Services.Base

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.{PlaybackIssue, PlaybackIssueMessage, User}

  @spec create_issue(User.t(), map) :: {:ok, PlaybackIssue.t()} | {:error, term}
  def create_issue(reporter, attrs) do
    attrs = Map.put(attrs, :reporter_id, reporter.id)

    with {:ok, issue} <- %PlaybackIssue{} |> PlaybackIssue.changeset(attrs) |> safe_insert() do
      Phoenix.PubSub.broadcast(Core.PubSub, "support:issues", {:issue_created, issue})
      {:ok, issue}
    end
  end

  @spec add_message(PlaybackIssue.t(), User.t(), map) :: {:ok, PlaybackIssueMessage.t()} | {:error, term}
  def add_message(issue, author, attrs) do
    attrs = Map.merge(attrs, %{playback_issue_id: issue.id, author_id: author.id})

    with {:ok, message} <- %PlaybackIssueMessage{} |> PlaybackIssueMessage.changeset(attrs) |> safe_insert() do
      Phoenix.PubSub.broadcast(Core.PubSub, "support:issue:#{issue.id}", {:message_added, message})
      {:ok, message}
    end
  end

  @spec assign_issue(PlaybackIssue.t(), User.t()) :: {:ok, PlaybackIssue.t()} | {:error, term}
  def assign_issue(issue, assignee) do
    issue
    |> Ecto.Changeset.change(assignee_id: assignee.id, status: :in_progress)
    |> safe_update()
  end

  @spec resolve_issue(PlaybackIssue.t(), String.t()) :: {:ok, PlaybackIssue.t()} | {:error, term}
  def resolve_issue(issue, resolution_note) do
    with {:ok, resolved} <- issue |> PlaybackIssue.resolve_changeset(resolution_note) |> safe_update() do
      Phoenix.PubSub.broadcast(Core.PubSub, "support:issue:#{issue.id}", {:issue_resolved, resolved})
      {:ok, resolved}
    end
  end

  @spec close_issue(PlaybackIssue.t()) :: {:ok, PlaybackIssue.t()} | {:error, term}
  def close_issue(issue) do
    issue
    |> Ecto.Changeset.change(status: :closed)
    |> safe_update()
  end

  @spec get_issue(binary) :: {:ok, PlaybackIssue.t()} | {:error, term}
  def get_issue(id) do
    case Repo.get(PlaybackIssue, id) |> Repo.preload([:reporter, :assignee, :messages, :content]) do
      nil -> not_found(:playback_issue)
      issue -> {:ok, issue}
    end
  end

  @spec list_issues(keyword) :: [PlaybackIssue.t()]
  def list_issues(opts \\ []) do
    PlaybackIssue
    |> apply_filters(opts)
    |> order_by([i], [asc: i.priority, desc: i.inserted_at])
    |> Repo.all()
  end

  @spec set_priority(PlaybackIssue.t(), atom) :: {:ok, PlaybackIssue.t()} | {:error, term}
  def set_priority(issue, priority) do
    issue |> Ecto.Changeset.change(priority: priority) |> safe_update()
  end

  defp apply_filters(query, opts) do
    Enum.reduce(opts, query, fn
      {:status, status}, q -> where(q, [i], i.status == ^status)
      {:priority, priority}, q -> where(q, [i], i.priority == ^priority)
      {:reporter_id, id}, q -> where(q, [i], i.reporter_id == ^id)
      {:assignee_id, id}, q -> where(q, [i], i.assignee_id == ^id)
      {:limit, n}, q -> limit(q, ^n)
      _, q -> q
    end)
  end
end
