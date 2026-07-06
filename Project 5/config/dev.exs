import Config

config :core, Core.Repo,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

config :api, ApiWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4020],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  watchers: []

config :graphql, GraphqlWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4021],
  check_origin: false,
  code_reloader: true,
  debug_errors: true

config :rtc, RtcWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4022],
  check_origin: false,
  code_reloader: true,
  debug_errors: true

config :logger, level: :debug

config :core, :storage,
  bucket: "fluxstream-dev",
  region: "us-east-1",
  cdn_host: "http://localhost:4000"
