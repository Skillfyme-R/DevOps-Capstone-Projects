defmodule Core.MixProject do
  use Mix.Project

  def project do
    [
      app: :core,
      version: "0.1.0",
      build_path: "../../_build",
      config_path: "../../config/config.exs",
      deps_path: "../../deps",
      lockfile: "../../mix.lock",
      elixir: "~> 1.16",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  def application do
    [
      mod: {Core.Application, []},
      extra_applications: [:logger, :runtime_tools, :crypto]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      # Database
      {:ecto_sql, "~> 3.11"},
      {:postgrex, "~> 0.18"},
      {:ecto_enum, "~> 1.4"},

      # Auth
      {:guardian, "~> 2.3"},
      {:argon2_elixir, "~> 4.0"},
      {:jose, "~> 1.11"},

      # Payments
      {:stripity_stripe, "~> 3.1"},

      # HTTP client
      {:finch, "~> 0.18"},
      {:tesla, "~> 1.9"},

      # Serialization
      {:jason, "~> 1.4"},

      # Messaging
      {:conduit, "~> 0.12"},
      {:conduit_amqp, "~> 0.6"},

      # Storage (S3-compatible)
      {:ex_aws, "~> 2.5"},
      {:ex_aws_s3, "~> 2.5"},
      {:hackney, "~> 1.20"},
      {:sweet_xml, "~> 0.7"},

      # Caching
      {:con_cache, "~> 1.1"},
      {:nebulex, "~> 2.6"},

      # Metrics / telemetry
      {:telemetry, "~> 1.2"},
      {:telemetry_metrics, "~> 0.6"},

      # Time
      {:timex, "~> 3.7"},

      # PubSub
      {:phoenix_pubsub, "~> 2.1"},

      # OAuth / SSO
      {:assent, "~> 0.2"},

      # Utils
      {:briefly, "~> 0.5"},
      {:slugify, "~> 1.3"},
      {:number, "~> 1.0"},
      {:decimal, "~> 2.1"},
      {:json_polyfill, "~> 0.2"},

      # Test
      {:ex_machina, "~> 2.7", only: :test},
      {:faker, "~> 0.17", only: [:dev, :test]},
      {:mox, "~> 1.1", only: :test}
    ]
  end

  defp aliases do
    [
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"]
    ]
  end
end
