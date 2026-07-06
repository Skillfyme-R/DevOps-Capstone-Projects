import Config

config :core, Core.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "fluxstream_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: 10

config :logger, level: :warning

config :core, :stripe, secret_key: "sk_test_placeholder", webhook_secret: "whsec_test_placeholder"
config :core, :storage, bucket: "fluxstream-test", cdn_host: "http://localhost"
config :email, Email.Mailer, adapter: Swoosh.Adapters.Test
