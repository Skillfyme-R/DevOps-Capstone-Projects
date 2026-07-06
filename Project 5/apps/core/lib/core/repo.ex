defmodule Core.Repo do
  use Ecto.Repo,
    otp_app: :core,
    adapter: Ecto.Adapters.Postgres
end

defmodule Core.CDNRepo do
  use Ecto.Repo,
    otp_app: :core,
    adapter: Ecto.Adapters.Postgres
end
