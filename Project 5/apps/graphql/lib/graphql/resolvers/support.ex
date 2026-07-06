defmodule Graphql.Resolvers.Support do
  @moduledoc "GraphQL resolvers for viewer support and playback issue management."

  alias Core.Services.Support

  def get_issue(%{id: id}, _), do: Support.get_issue(id)

  def list_issues(args, %{context: %{current_user: user}}) do
    opts = build_opts(args, [:status, :priority, :limit])
    opts = if user.role == :platform_admin, do: opts, else: Keyword.put(opts, :reporter_id, user.id)
    {:ok, Support.list_issues(opts)}
  end

  def my_issues(_, %{context: %{current_user: user}}), do: {:ok, Support.list_issues(reporter_id: user.id)}
  def my_issues(_, _), do: {:error, "not authenticated"}

  def update_issue_status(%{id: id, status: status}, %{context: %{current_user: user}}) do
    with :ok <- require_support_role(user),
         {:ok, issue} <- Support.get_issue(id) do
      status_atom = String.downcase(status) |> String.to_existing_atom()
      case status_atom do
        :resolved -> Support.resolve_issue(issue, "Resolved by admin")
        :closed   -> Support.close_issue(issue)
        _         -> issue |> Ecto.Changeset.change(status: status_atom) |> Core.Repo.update()
      end
    end
  end
  def update_issue_status(_, _), do: {:error, "not authenticated"}

  def report_issue(%{subject: subject} = attrs, %{context: %{current_user: user}}) do
    attrs = attrs |> Map.delete(:subject) |> Map.put(:title, subject) |> Map.put_new(:issue_type, :other)
    Support.create_issue(user, attrs)
  end
  def report_issue(attrs, %{context: %{current_user: user}}) do
    Support.create_issue(user, Map.put_new(attrs, :issue_type, :other))
  end
  def report_issue(_, _), do: {:error, "not authenticated"}

  def add_message(%{issue_id: issue_id} = attrs, %{context: %{current_user: user}}) do
    with {:ok, issue} <- Support.get_issue(issue_id),
         :ok <- authorize_issue_access(user, issue) do
      Support.add_message(issue, user, Map.drop(attrs, [:issue_id]))
    end
  end

  def assign_issue(%{id: id, assignee_id: assignee_id}, %{context: %{current_user: user}}) do
    with :ok <- require_support_role(user),
         {:ok, issue} <- Support.get_issue(id),
         {:ok, assignee} <- Core.Services.Users.get_user(assignee_id) do
      Support.assign_issue(issue, assignee)
    end
  end

  def resolve_issue(%{id: id, resolution_note: note}, %{context: %{current_user: user}}) do
    with :ok <- require_support_role(user),
         {:ok, issue} <- Support.get_issue(id) do
      Support.resolve_issue(issue, note)
    end
  end

  def close_issue(%{id: id}, %{context: %{current_user: user}}) do
    with :ok <- require_support_role(user),
         {:ok, issue} <- Support.get_issue(id) do
      Support.close_issue(issue)
    end
  end

  def set_priority(%{id: id, priority: priority}, %{context: %{current_user: user}}) do
    with :ok <- require_support_role(user),
         {:ok, issue} <- Support.get_issue(id) do
      Support.set_priority(issue, priority)
    end
  end

  defp authorize_issue_access(user, issue) do
    if user.role in [:platform_admin, :studio_admin] or issue.reporter_id == user.id do
      :ok
    else
      {:error, "not authorized to access this issue"}
    end
  end

  defp require_support_role(user) do
    if user.role in [:platform_admin, :studio_admin] do
      :ok
    else
      {:error, "support role required"}
    end
  end

  defp build_opts(args, keys) do
    Enum.reduce(keys, [], fn key, acc ->
      case Map.get(args, key) do
        nil -> acc
        val -> [{key, val} | acc]
      end
    end)
  end
end
