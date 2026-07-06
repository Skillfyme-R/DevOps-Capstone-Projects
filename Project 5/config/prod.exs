import Config

config :logger, level: :info

config :api, ApiWeb.Endpoint,
  server: true,
  http: [port: String.to_integer(System.get_env("PORT", "4000"))],
  url: [host: System.get_env("HOST", "localhost"), scheme: "https", port: 443]

config :graphql, GraphqlWeb.Endpoint,
  server: true,
  http: [port: String.to_integer(System.get_env("GRAPHQL_PORT", "4001"))],
  url: [host: System.get_env("HOST", "localhost"), scheme: "https", port: 443]

config :rtc, RtcWeb.Endpoint,
  server: true,
  http: [port: String.to_integer(System.get_env("RTC_PORT", "4002"))],
  url: [host: System.get_env("HOST", "localhost"), scheme: "https", port: 443]

config :core, Core.Repo,
  pool_size: String.to_integer(System.get_env("DB_POOL_SIZE", "20"))
