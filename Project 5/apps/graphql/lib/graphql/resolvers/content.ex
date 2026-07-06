defmodule Graphql.Resolvers.Content do
  @moduledoc "GraphQL resolvers for content catalog operations."

  alias Core.Services.ContentLibrary
  alias Core.Schema.Content

  def resolve_content(%{id: id}, _, _) when not is_nil(id), do: ContentLibrary.get_content(id)
  def resolve_content(%{slug: slug}, _, _) when not is_nil(slug), do: ContentLibrary.get_content_by_slug(slug)
  def resolve_content(_, _, _), do: {:error, "id or slug required"}

  def resolve_contents(args, _) do
    opts = build_opts(args, [:genre, :content_type, :studio_id, :status, :featured, :order_by, :limit])
    {:ok, ContentLibrary.list_content(opts)}
  end

  def resolve_search_content(%{query: query} = args, _) do
    opts = build_opts(args, [:genre, :content_type, :limit])
    {:ok, ContentLibrary.search_content(query, opts)}
  end

  def resolve_featured(args, _) do
    limit = args[:limit] || 10
    {:ok, ContentLibrary.featured_content(limit)}
  end

  def create_content(%{studio_id: studio_id} = args, %{context: %{current_user: user}}) do
    with {:ok, studio} <- Core.Services.Studios.get_studio(studio_id),
         :ok <- authorize_studio_write(user, studio) do
      ContentLibrary.create_content(studio, args)
    end
  end

  def create_content(_, _), do: {:error, "unauthorized"}

  def update_content(%{id: id} = args, %{context: %{current_user: user}}) do
    with {:ok, content} <- ContentLibrary.get_content(id),
         :ok <- authorize_content_write(user, content) do
      attrs = Map.drop(args, [:id])
      ContentLibrary.update_content(content, attrs, user)
    end
  end

  def publish_content(%{id: id}, %{context: %{current_user: user}}) do
    with {:ok, content} <- ContentLibrary.get_content(id),
         :ok <- authorize_content_write(user, content) do
      ContentLibrary.publish_content(content, user)
    end
  end

  def delete_content(%{id: id}, %{context: %{current_user: user}}) do
    with {:ok, content} <- ContentLibrary.get_content(id),
         :ok <- authorize_content_write(user, content) do
      ContentLibrary.delete_content(content, user)
    end
  end

  def add_episode(%{content_id: content_id} = args, %{context: %{current_user: user}}) do
    with {:ok, content} <- ContentLibrary.get_content(content_id),
         :ok <- authorize_content_write(user, content) do
      attrs = Map.drop(args, [:content_id])
      ContentLibrary.add_episode(content, attrs)
    end
  end

  def add_to_watchlist(%{content_id: content_id} = args, %{context: %{current_user: user}}) do
    case ContentLibrary.add_to_watchlist(user, content_id, args[:profile_id]) do
      {:ok, _} -> {:ok, true}
      # already in watchlist — treat as success
      {:error, %Ecto.Changeset{errors: [{_, {"has already been taken", _}} | _]}} -> {:ok, true}
      {:error, reason} -> {:error, reason}
    end
  end

  def add_to_watchlist(_, _), do: {:error, "unauthenticated"}

  def remove_from_watchlist(%{content_id: content_id}, %{context: %{current_user: user}}) do
    case ContentLibrary.remove_from_watchlist(user, content_id) do
      {:ok, _} -> {:ok, true}
      {:error, {:not_found, _}} -> {:ok, true}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  def remove_from_watchlist(_, _), do: {:error, "unauthenticated"}

  def record_view(args, %{context: %{current_user: user}}) do
    ContentLibrary.record_view(user, args.content_id, Map.drop(args, [:content_id]))
  end

  def rate_content(%{content_id: id} = args, %{context: %{current_user: user}}) do
    with {:ok, _} <- ContentLibrary.rate_content(user, id, Map.drop(args, [:content_id])) do
      {:ok, true}
    end
  end

  def review_content(%{content_id: id} = args, %{context: %{current_user: user}}) do
    with {:ok, _} <- ContentLibrary.review_content(user, id, Map.drop(args, [:content_id])) do
      {:ok, true}
    end
  end

  defp authorize_studio_write(user, studio) do
    if user.role in [:platform_admin, :studio_admin] or Core.Services.Studios.is_member?(studio, user) do
      :ok
    else
      {:error, "not authorized to manage this studio's content"}
    end
  end

  defp authorize_content_write(user, content) do
    if user.role == :platform_admin do
      :ok
    else
      with {:ok, studio} <- Core.Services.Studios.get_studio(content.studio_id) do
        authorize_studio_write(user, studio)
      end
    end
  end

  def my_watchlist(_args, user) do
    import Ecto.Query, only: [from: 2]
    items = Core.Repo.all(
      from w in Core.Schema.WatchlistItem,
        where: w.user_id == ^user.id,
        preload: [content: :studio],
        order_by: [desc: w.inserted_at],
        limit: 50
    )
    {:ok, items}
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
