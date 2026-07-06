defmodule Core.Services.Base do
  @moduledoc """
  Shared helpers for all FluxStream service modules.
  Provides safe_insert, safe_update, audit logging, and error normalization.
  """

  defmacro __using__(_opts) do
    quote do
      import Ecto.Query
      import Ecto.Changeset, only: [change: 2, change: 1]
      alias Core.Repo
      alias Core.Schema.Audit

      defp safe_insert(changeset) do
        case Repo.insert(changeset) do
          {:ok, record} -> {:ok, record}
          {:error, changeset} -> {:error, changeset}
        end
      end

      defp safe_update(changeset) do
        case Repo.update(changeset) do
          {:ok, record} -> {:ok, record}
          {:error, changeset} -> {:error, changeset}
        end
      end

      defp safe_delete(record) do
        case Repo.delete(record) do
          {:ok, record} -> {:ok, record}
          {:error, changeset} -> {:error, changeset}
        end
      end

      defp not_found(resource), do: {:error, {:not_found, resource}}

      defp audit(action, actor, resource, opts \\ []) do
        %Audit{}
        |> Audit.changeset(%{
          action: action,
          actor_id: actor.id,
          resource_id: Map.get(resource, :id),
          resource_type: resource.__struct__ |> Module.split() |> List.last(),
          ip_address: Keyword.get(opts, :ip),
          user_agent: Keyword.get(opts, :user_agent),
          metadata: Keyword.get(opts, :metadata, %{})
        })
        |> Repo.insert()
      end
    end
  end
end
