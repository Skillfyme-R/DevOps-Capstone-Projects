defmodule Core.Release do
  @app :core

  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :up, all: true))
    end
  end

  def rollback(repo, version) do
    load_app()
    {:ok, _, _} = Ecto.Migrator.with_repo(repo, &Ecto.Migrator.run(&1, :down, to: version))
  end

  def seed do
    load_app()
    seed_path = Application.app_dir(@app, "priv/repo/seeds.exs")
    if File.exists?(seed_path) do
      {:ok, _, _} = Ecto.Migrator.with_repo(Core.Repo, fn _repo ->
        Code.eval_file(seed_path)
      end)
    end
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp load_app do
    Application.load(@app)
  end
end
