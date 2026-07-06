defmodule GraphqlWeb.Router do
  use Phoenix.Router

  pipeline :graphql do
    plug :accepts, ["json"]
    plug GraphqlWeb.Plugs.GraphqlContext
  end

  scope "/api" do
    pipe_through :graphql
    forward "/graphql", Absinthe.Plug, schema: GraphqlWeb.Schema
    forward "/graphiql", Absinthe.Plug.GraphiQL, schema: GraphqlWeb.Schema
  end
end
