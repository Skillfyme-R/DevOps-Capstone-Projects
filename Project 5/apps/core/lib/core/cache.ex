defmodule Core.Cache do
  use Nebulex.Cache,
    otp_app: :core,
    adapter: Nebulex.Adapters.Local

  @default_ttl :timer.minutes(15)

  def cached(key, ttl \\ @default_ttl, fun) do
    case get(key) do
      nil ->
        value = fun.()
        put(key, value, ttl: ttl)
        value

      value ->
        value
    end
  end

  def invalidate(key), do: delete(key)
  def invalidate_prefix(prefix), do: delete_all(query: {:q, prefix <> "*"})
end
