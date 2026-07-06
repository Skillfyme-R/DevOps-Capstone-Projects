defmodule Graphql.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      GraphqlWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: Graphql.Supervisor]
    Supervisor.start_link(children, opts)
  end

  @impl true
  def config_change(changed, _new, removed) do
    GraphqlWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
