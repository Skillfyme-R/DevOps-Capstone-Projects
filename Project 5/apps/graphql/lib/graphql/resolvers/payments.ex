defmodule Graphql.Resolvers.Payments do
  @moduledoc "GraphQL resolvers for subscription billing operations."

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.Plan
  alias Core.Services.Payments

  def list_plans(args, _) do
    plans =
      Plan
      |> apply_plan_filters(args)
      |> order_by([p], p.sort_order)
      |> Repo.all()
    {:ok, plans}
  end

  def get_plan(%{id: id}, _) when not is_nil(id) do
    case Repo.get(Plan, id) do
      nil -> {:error, "plan not found"}
      plan -> {:ok, plan}
    end
  end

  def get_plan(%{slug: slug}, _) do
    case Repo.get_by(Plan, slug: slug) do
      nil -> {:error, "plan not found"}
      plan -> {:ok, plan}
    end
  end

  def my_subscription(_, %{context: %{current_user: user}}) do
    Payments.get_active_subscription(user)
  end

  def create_subscription(%{plan_id: plan_id, billing_interval: interval}, %{context: %{current_user: user}}) do
    with {:ok, plan} <- get_plan(%{id: plan_id}, nil) do
      Payments.create_subscription(user, plan, %{billing_interval: interval})
    end
  end

  def cancel_subscription(%{id: id, immediately: immediately}, %{context: %{current_user: user}}) do
    with {:ok, sub} <- get_user_subscription(user, id) do
      Payments.cancel_subscription(sub, immediately || false)
    end
  end

  def change_plan(%{subscription_id: sub_id, new_plan_id: plan_id}, %{context: %{current_user: user}}) do
    with {:ok, sub} <- get_user_subscription(user, sub_id),
         {:ok, plan} <- get_plan(%{id: plan_id}, nil) do
      Payments.change_plan(sub, plan)
    end
  end

  defp get_user_subscription(user, sub_id) do
    case Repo.get_by(Core.Schema.Subscription, id: sub_id, user_id: user.id) do
      nil -> {:error, "subscription not found"}
      sub -> {:ok, sub}
    end
  end

  defp apply_plan_filters(query, args) do
    Enum.reduce(args, query, fn
      {:active, val}, q -> where(q, [p], p.active == ^val)
      {:public, val}, q -> where(q, [p], p.public == ^val)
      _, q -> q
    end)
  end
end
