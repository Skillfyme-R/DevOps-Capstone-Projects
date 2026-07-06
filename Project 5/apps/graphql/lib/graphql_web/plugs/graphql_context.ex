defmodule GraphqlWeb.Plugs.GraphqlContext do
  @moduledoc """
  Reads the Authorization: Bearer <token> header, verifies it with Guardian,
  and puts :current_user + :token into the Absinthe context.
  """
  @behaviour Plug

  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    context = build_context(conn)
    Absinthe.Plug.put_options(conn, context: context)
  end

  defp build_context(conn) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, user, claims} <- Core.Guardian.resource_from_token(token) do
      user = Core.Repo.preload(user, [:account, subscriptions: [:plan]])
      %{current_user: user, token: token, claims: claims}
    else
      _ -> %{}
    end
  end
end
