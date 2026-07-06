defmodule ApiWeb.HealthController do
  use Phoenix.Controller, formats: [:json]

  def index(conn, _params) do
    json(conn, %{status: "ok", app: "FluxStream API"})
  end
end
