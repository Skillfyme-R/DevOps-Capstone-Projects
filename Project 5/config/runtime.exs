import Config

if config_env() == :prod do
  config :core, Core.Repo,
    hostname: System.get_env("DB_HOST", "localhost"),
    port: String.to_integer(System.get_env("DB_PORT", "5432")),
    username: System.get_env("DB_USER", "postgres"),
    password: System.get_env("DB_PASS", "postgres"),
    database: System.get_env("DB_NAME", "fluxstream_prod"),
    pool_size: String.to_integer(System.get_env("DB_POOL_SIZE", "20"))

  config :core, Core.CDNRepo,
    hostname: System.get_env("CDN_DB_HOST", "localhost"),
    port: String.to_integer(System.get_env("CDN_DB_PORT", "5432")),
    username: System.get_env("CDN_DB_USER", "postgres"),
    password: System.get_env("CDN_DB_PASS", "postgres"),
    database: System.get_env("CDN_DB_NAME", "fluxstream_cdn_prod"),
    pool_size: 5

  config :api, ApiWeb.Endpoint,
    server: true,
    http: [port: String.to_integer(System.get_env("PORT", "4000"))],
    url: [host: System.get_env("HOST", "localhost"), scheme: "https", port: 443],
    secret_key_base: System.get_env("SECRET_KEY_BASE", "changeme")

  config :graphql, GraphqlWeb.Endpoint,
    server: true,
    http: [port: String.to_integer(System.get_env("GRAPHQL_PORT", "4001"))],
    url: [host: System.get_env("HOST", "localhost"), scheme: "https", port: 443],
    secret_key_base: System.get_env("SECRET_KEY_BASE", "changeme")

  config :rtc, RtcWeb.Endpoint,
    server: true,
    http: [port: String.to_integer(System.get_env("RTC_PORT", "4002"))],
    url: [host: System.get_env("HOST", "localhost"), scheme: "https", port: 443],
    secret_key_base: System.get_env("SECRET_KEY_BASE", "changeme")

  config :core, Core.Guardian,
    secret_key: System.get_env("JWT_SECRET", "changeme")
end
