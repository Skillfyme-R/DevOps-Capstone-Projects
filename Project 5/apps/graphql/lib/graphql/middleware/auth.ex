defmodule Graphql.Middleware.Auth do
  @moduledoc """
  Absinthe middleware that enforces authentication on protected resolvers.
  Checks for a current_user in the context — set by the plug pipeline.
  """
  @behaviour Absinthe.Middleware

  @impl true
  def call(%{context: %{current_user: %Core.Schema.User{}}} = resolution, _config), do: resolution

  def call(resolution, _config) do
    Absinthe.Resolution.put_result(resolution, {:error, %{message: "unauthenticated", code: "UNAUTHENTICATED"}})
  end
end

defmodule Graphql.Middleware.AdminOnly do
  @moduledoc "Requires platform_admin role."
  @behaviour Absinthe.Middleware

  @impl true
  def call(%{context: %{current_user: %{role: :platform_admin}}} = resolution, _), do: resolution

  def call(resolution, _) do
    Absinthe.Resolution.put_result(resolution, {:error, %{message: "forbidden", code: "FORBIDDEN"}})
  end
end

defmodule Graphql.Middleware.RateLimit do
  @moduledoc "Basic rate limiting middleware — tracks call counts per user per minute."
  @behaviour Absinthe.Middleware
  @max_calls_per_minute 120

  @impl true
  def call(%{context: %{current_user: user}} = resolution, _) do
    key = "graphql:rate:#{user.id}:#{minute_bucket()}"

    case Core.Cache.get(key) do
      nil ->
        Core.Cache.put(key, 1, ttl: :timer.seconds(60))
        resolution

      count when count < @max_calls_per_minute ->
        Core.Cache.put(key, count + 1, ttl: :timer.seconds(60))
        resolution

      _ ->
        Absinthe.Resolution.put_result(resolution, {:error, %{message: "rate limit exceeded", code: "RATE_LIMITED"}})
    end
  end

  def call(resolution, _), do: resolution

  defp minute_bucket, do: div(System.system_time(:second), 60)
end

defmodule Graphql.Middleware.HandleErrors do
  @moduledoc "Normalizes Ecto and service errors into clean GraphQL error shapes."
  @behaviour Absinthe.Middleware

  @impl true
  def call(%{errors: []} = resolution, _), do: resolution

  def call(%{errors: errors} = resolution, _) do
    normalized =
      Enum.flat_map(errors, fn
        %Ecto.Changeset{} = cs -> format_changeset(cs)
        {:not_found, resource} -> [%{message: "#{resource} not found", code: "NOT_FOUND"}]
        {:error, msg} when is_binary(msg) -> [%{message: msg, code: "ERROR"}]
        msg when is_binary(msg) -> [%{message: msg, code: "ERROR"}]
        other -> [%{message: inspect(other), code: "UNKNOWN"}]
      end)

    %{resolution | errors: normalized}
  end

  defp format_changeset(cs) do
    Ecto.Changeset.traverse_errors(cs, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {k, v}, acc ->
        String.replace(acc, "%{#{k}}", to_string(v))
      end)
    end)
    |> Enum.flat_map(fn {field, msgs} ->
      Enum.map(msgs, &%{message: "#{field}: #{&1}", code: "VALIDATION_ERROR"})
    end)
  end
end
