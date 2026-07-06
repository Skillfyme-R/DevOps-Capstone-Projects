import Config

config :fluxstream,
  env: Mix.env()

config :core,
  ecto_repos: [Core.Repo, Core.CDNRepo]

config :core, Core.Repo,
  adapter: Ecto.Adapters.Postgres,
  hostname: System.get_env("DB_HOST", "localhost"),
  port: String.to_integer(System.get_env("DB_PORT", "5434")),
  username: System.get_env("DB_USER", "postgres"),
  password: System.get_env("DB_PASS", "postgres"),
  database: System.get_env("DB_NAME", "fluxstream_#{Mix.env()}"),
  pool_size: String.to_integer(System.get_env("DB_POOL_SIZE", "10"))

config :core, Core.CDNRepo,
  adapter: Ecto.Adapters.Postgres,
  hostname: System.get_env("CDN_DB_HOST", "localhost"),
  port: String.to_integer(System.get_env("CDN_DB_PORT", "5436")),
  username: System.get_env("CDN_DB_USER", "postgres"),
  password: System.get_env("CDN_DB_PASS", "postgres"),
  database: System.get_env("CDN_DB_NAME", "fluxstream_cdn_#{Mix.env()}"),
  pool_size: 5

config :core, Core.Guardian,
  issuer: "fluxstream",
  secret_key: System.get_env("JWT_SECRET", "dev-jwt-secret-change-in-production")

config :core, :stripe,
  secret_key: System.get_env("STRIPE_SECRET_KEY", ""),
  webhook_secret: System.get_env("STRIPE_WEBHOOK_SECRET", "")

config :core, :storage,
  bucket: System.get_env("STORAGE_BUCKET", "fluxstream-assets"),
  region: System.get_env("STORAGE_REGION", "us-east-1"),
  cdn_host: System.get_env("CDN_HOST", "https://cdn.fluxstream.io")

config :core, :influx,
  host: System.get_env("INFLUX_HOST", "http://localhost:8086"),
  database: System.get_env("INFLUX_DB", "fluxstream"),
  username: System.get_env("INFLUX_USER", "fluxstream"),
  password: System.get_env("INFLUX_PASSWORD", "")

config :core, :rabbitmq,
  url: System.get_env("RABBITMQ_URL", "amqp://rabbitmq:rabbitmq@localhost:5672")

config :email, Email.Mailer,
  adapter: Swoosh.Adapters.Sendgrid,
  api_key: System.get_env("SENDGRID_API_KEY", "")

config :email,
  from_address: System.get_env("EMAIL_FROM", "noreply@fluxstream.io"),
  from_name: "FluxStream"

config :api, ApiWeb.Endpoint,
  url: [host: System.get_env("HOST", "localhost")],
  secret_key_base: System.get_env("SECRET_KEY_BASE", "dev-secret-key-base-please-change"),
  render_errors: [view: ApiWeb.ErrorView, accepts: ~w(json)],
  pubsub_server: Core.PubSub

config :graphql, GraphqlWeb.Endpoint,
  url: [host: System.get_env("HOST", "localhost")],
  secret_key_base: System.get_env("SECRET_KEY_BASE", "dev-secret-key-base-please-change"),
  render_errors: [view: GraphqlWeb.ErrorView, accepts: ~w(json)],
  pubsub_server: Core.PubSub

config :rtc, RtcWeb.Endpoint,
  url: [host: System.get_env("HOST", "localhost")],
  secret_key_base: System.get_env("SECRET_KEY_BASE", "dev-secret-key-base-please-change"),
  pubsub_server: Core.PubSub

config :core, Core.PubSub,
  name: Core.PubSub,
  adapter: Phoenix.PubSub.PG2

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :user_id, :account_id]

config :phoenix, :json_library, Jason

import_config "#{config_env()}.exs"
