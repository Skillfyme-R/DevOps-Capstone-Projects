defmodule Core.Services.ContentLibrary do
  @moduledoc """
  Content catalog management — create, publish, search, and manage
  movies, series, episodes, and live events on the FluxStream platform.
  Analogous to Plural's RepositoryService.
  """
  use Core.Services.Base

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.{Content, Episode, Studio, User, Watchlist, ViewingHistory, ContentRating, ContentReview}
  alias Core.PubSub

  @spec create_content(Studio.t(), map) :: {:ok, Content.t()} | {:error, term}
  def create_content(studio, attrs) do
    attrs = Map.put(attrs, :studio_id, studio.id)

    %Content{}
    |> Content.changeset(attrs)
    |> safe_insert()
    |> tap(fn {:ok, content} -> Phoenix.PubSub.broadcast(Core.PubSub, "studio:#{studio.id}", {:content_created, content}) end)
  end

  @spec update_content(Content.t(), map, User.t()) :: {:ok, Content.t()} | {:error, term}
  def update_content(content, attrs, actor) do
    with {:ok, updated} <- content |> Content.changeset(attrs) |> safe_update() do
      audit(:content_published, actor, updated)
      {:ok, updated}
    end
  end

  @spec publish_content(Content.t(), User.t()) :: {:ok, Content.t()} | {:error, term}
  def publish_content(content, actor) do
    with {:ok, published} <- content |> Content.publish_changeset() |> safe_update() do
      audit(:content_published, actor, published)
      Phoenix.PubSub.broadcast(Core.PubSub, "catalog:updates", {:content_published, published})
      {:ok, published}
    end
  end

  @spec delete_content(Content.t(), User.t()) :: {:ok, Content.t()} | {:error, term}
  def delete_content(content, actor) do
    with {:ok, deleted} <- safe_delete(content) do
      audit(:content_deleted, actor, content)
      {:ok, deleted}
    end
  end

  @spec get_content(binary) :: {:ok, Content.t()} | {:error, term}
  def get_content(id) do
    case Repo.get(Content, id) |> maybe_preload() do
      nil -> not_found(:content)
      content -> {:ok, content}
    end
  end

  @spec get_content_by_slug(String.t()) :: {:ok, Content.t()} | {:error, term}
  def get_content_by_slug(slug) do
    case Repo.get_by(Content, slug: slug) |> maybe_preload() do
      nil -> not_found(:content)
      content -> {:ok, content}
    end
  end

  defp maybe_preload(nil), do: nil
  defp maybe_preload(content), do: Repo.preload(content, [:studio, :episodes])

  @spec search_content(String.t(), keyword) :: [Content.t()]
  def search_content(query, opts \\ []) do
    search_term = "%#{String.downcase(query)}%"

    Content
    |> where([c], c.status == :published)
    |> where([c], ilike(c.title, ^search_term) or ilike(c.description, ^search_term))
    |> apply_content_filters(opts)
    |> order_by([c], [desc: c.featured, desc: c.view_count])
    |> preload([:studio])
    |> Repo.all()
  end

  @spec list_content(keyword) :: [Content.t()]
  def list_content(opts \\ []) do
    Content
    |> apply_content_filters(opts)
    |> preload([:studio])
    |> Repo.all()
  end

  @spec featured_content(integer) :: [Content.t()]
  def featured_content(limit \\ 10) do
    Content
    |> where([c], c.status == :published and c.featured == true)
    |> order_by([c], desc: c.published_at)
    |> limit(^limit)
    |> preload([:studio])
    |> Repo.all()
  end

  @spec add_episode(Content.t(), map) :: {:ok, Episode.t()} | {:error, term}
  def add_episode(content, attrs) do
    attrs = Map.put(attrs, :content_id, content.id)

    with {:ok, episode} <- %Episode{} |> Episode.changeset(attrs) |> safe_insert() do
      Repo.update_all(
        where(Content, id: ^content.id),
        inc: [episode_count: 1]
      )
      {:ok, episode}
    end
  end

  @spec add_to_watchlist(User.t(), binary, binary | nil) :: {:ok, Watchlist.t()} | {:error, term}
  def add_to_watchlist(user, content_id, profile_id \\ nil) do
    case Repo.get_by(Watchlist, user_id: user.id, content_id: content_id) do
      %Watchlist{} = existing -> {:ok, existing}
      nil ->
        %Watchlist{}
        |> Watchlist.changeset(%{user_id: user.id, content_id: content_id, viewing_profile_id: profile_id})
        |> safe_insert()
    end
  end

  @spec remove_from_watchlist(User.t(), binary) :: {:ok, true} | {:error, term}
  def remove_from_watchlist(user, content_id) do
    case Repo.get_by(Watchlist, user_id: user.id, content_id: content_id) do
      nil -> {:ok, true}
      item -> safe_delete(item)
    end
  end

  @spec record_view(User.t(), binary, map) :: {:ok, ViewingHistory.t()} | {:error, term}
  def record_view(user, content_id, attrs) do
    attrs = Map.merge(attrs, %{user_id: user.id, content_id: content_id})

    existing = Repo.get_by(ViewingHistory, user_id: user.id, content_id: content_id, session_id: attrs[:session_id])

    result =
      if existing do
        existing |> ViewingHistory.changeset(attrs) |> safe_update()
      else
        %ViewingHistory{} |> ViewingHistory.changeset(attrs) |> safe_insert()
      end

    with {:ok, _history} <- result do
      Repo.update_all(where(Content, id: ^content_id), inc: [view_count: 1])
      result
    end
  end

  @spec rate_content(User.t(), binary, map) :: {:ok, ContentRating.t()} | {:error, term}
  def rate_content(user, content_id, attrs) do
    attrs = Map.merge(attrs, %{user_id: user.id, content_id: content_id})

    case Repo.get_by(ContentRating, user_id: user.id, content_id: content_id) do
      nil -> %ContentRating{} |> ContentRating.changeset(attrs) |> safe_insert()
      rating -> rating |> ContentRating.changeset(attrs) |> safe_update()
    end
  end

  @spec review_content(User.t(), binary, map) :: {:ok, ContentReview.t()} | {:error, term}
  def review_content(user, content_id, attrs) do
    attrs = Map.merge(attrs, %{user_id: user.id, content_id: content_id})
    %ContentReview{} |> ContentReview.changeset(attrs) |> safe_insert()
  end

  defp apply_content_filters(query, opts) do
    Enum.reduce(opts, query, fn
      {:genre, genre}, q -> where(q, [c], ^genre in c.genres)
      {:content_type, type}, q -> where(q, [c], c.content_type == ^to_atom(type))
      {:studio_id, id}, q -> where(q, [c], c.studio_id == ^id)
      {:status, status}, q -> where(q, [c], c.status == ^to_atom(status))
      {:featured, val}, q -> where(q, [c], c.featured == ^val)
      {:limit, n}, q -> limit(q, ^n)
      {:order_by, order}, q when order in [:newest, "newest"] -> order_by(q, [c], desc: c.published_at)
      {:order_by, order}, q when order in [:popular, "popular"] -> order_by(q, [c], desc: c.view_count)
      {:order_by, order}, q when order in [:rating, "rating"] -> order_by(q, [c], desc: c.avg_rating)
      _, q -> q
    end)
  end

  defp to_atom(val) when is_atom(val), do: val
  defp to_atom(val) when is_binary(val) do
    val |> String.downcase() |> String.to_existing_atom()
  rescue
    _ -> val
  end
end
