defmodule Core.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      Core.Repo,
      Core.CDNRepo,
      {Phoenix.PubSub, name: Core.PubSub},
      Core.Cache,
      {Finch, name: Core.Finch}
    ]

    opts = [strategy: :one_for_one, name: Core.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
