defmodule Core.Services.Payments do
  @moduledoc """
  Subscription billing — Stripe integration for plan subscriptions,
  upgrades, cancellations, invoices, and studio payouts.
  Analogous to Plural's Payments service.
  """
  use Core.Services.Base

  import Ecto.Query
  alias Core.Repo
  alias Core.Schema.{User, Subscription, Plan}

  @spec create_subscription(User.t(), Plan.t(), map) :: {:ok, Subscription.t()} | {:error, term}
  def create_subscription(user, plan, attrs \\ %{}) do
    with {:ok, customer_id} <- ensure_stripe_customer(user),
         {:ok, stripe_sub} <- create_stripe_subscription(customer_id, plan, attrs),
         {:ok, subscription} <- persist_subscription(user, plan, stripe_sub) do
      Phoenix.PubSub.broadcast(Core.PubSub, "user:#{user.id}", {:subscription_created, subscription})
      {:ok, subscription}
    end
  end

  @spec cancel_subscription(Subscription.t(), boolean) :: {:ok, Subscription.t()} | {:error, term}
  def cancel_subscription(subscription, immediately \\ false) do
    with {:ok, _} <- cancel_stripe_subscription(subscription.stripe_subscription_id, immediately),
         {:ok, canceled} <- subscription |> Subscription.cancel_changeset() |> safe_update() do
      Phoenix.PubSub.broadcast(Core.PubSub, "user:#{subscription.user_id}", {:subscription_canceled, canceled})
      {:ok, canceled}
    end
  end

  @spec change_plan(Subscription.t(), Plan.t()) :: {:ok, Subscription.t()} | {:error, term}
  def change_plan(subscription, new_plan) do
    with {:ok, _} <- update_stripe_subscription(subscription.stripe_subscription_id, new_plan),
         {:ok, updated} <- subscription |> Ecto.Changeset.change(plan_id: new_plan.id) |> safe_update() do
      {:ok, updated}
    end
  end

  @spec get_active_subscription(User.t()) :: {:ok, Subscription.t()} | {:error, term}
  def get_active_subscription(user) do
    sub =
      Subscription
      |> where([s], s.user_id == ^user.id and s.status in [:trialing, :active])
      |> order_by([s], desc: s.inserted_at)
      |> limit(1)
      |> preload(:plan)
      |> Repo.one()

    case sub do
      nil -> not_found(:subscription)
      sub -> {:ok, sub}
    end
  end

  @spec handle_stripe_webhook(String.t(), map) :: :ok | {:error, term}
  def handle_stripe_webhook("customer.subscription.updated", event) do
    with %{"id" => stripe_id} <- event["data"]["object"],
         %Subscription{} = sub <- Repo.get_by(Subscription, stripe_subscription_id: stripe_id) do
      new_status = stripe_status_to_atom(event["data"]["object"]["status"])
      sub |> Ecto.Changeset.change(status: new_status) |> Repo.update()
    end

    :ok
  end

  def handle_stripe_webhook("invoice.payment_failed", event) do
    stripe_id = event["data"]["object"]["subscription"]

    case Repo.get_by(Subscription, stripe_subscription_id: stripe_id) do
      nil -> :ok
      sub ->
        sub |> Ecto.Changeset.change(status: :past_due) |> Repo.update()
        Phoenix.PubSub.broadcast(Core.PubSub, "user:#{sub.user_id}", {:payment_failed, sub})
        :ok
    end
  end

  def handle_stripe_webhook(_, _), do: :ok

  defp ensure_stripe_customer(%User{customer_id: cid}) when not is_nil(cid), do: {:ok, cid}
  defp ensure_stripe_customer(user) do
    case Stripe.Customer.create(%{email: user.email, name: user.name}) do
      {:ok, %{id: customer_id}} ->
        Repo.update_all(where(User, id: ^user.id), set: [customer_id: customer_id])
        {:ok, customer_id}
      {:error, reason} -> {:error, reason}
    end
  end

  defp create_stripe_subscription(customer_id, plan, attrs) do
    price_id = if attrs[:billing_interval] == :annual,
      do: plan.stripe_annual_price_id,
      else: plan.stripe_monthly_price_id

    Stripe.Subscription.create(%{
      customer: customer_id,
      items: [%{price: price_id}],
      trial_period_days: plan.trial_days
    })
  end

  defp cancel_stripe_subscription(stripe_id, true) do
    Stripe.Subscription.cancel(stripe_id)
  end

  defp cancel_stripe_subscription(stripe_id, false) do
    Stripe.Subscription.update(stripe_id, %{cancel_at_period_end: true})
  end

  defp update_stripe_subscription(stripe_id, new_plan) do
    Stripe.Subscription.update(stripe_id, %{
      items: [%{price: new_plan.stripe_monthly_price_id}]
    })
  end

  defp persist_subscription(user, plan, stripe_sub) do
    %Subscription{}
    |> Subscription.changeset(%{
      user_id: user.id,
      plan_id: plan.id,
      stripe_subscription_id: stripe_sub.id,
      stripe_customer_id: stripe_sub.customer,
      status: stripe_status_to_atom(stripe_sub.status),
      current_period_start: DateTime.from_unix!(stripe_sub.current_period_start),
      current_period_end: DateTime.from_unix!(stripe_sub.current_period_end),
      trial_end: if(stripe_sub.trial_end, do: DateTime.from_unix!(stripe_sub.trial_end))
    })
    |> safe_insert()
  end

  defp stripe_status_to_atom("trialing"), do: :trialing
  defp stripe_status_to_atom("active"), do: :active
  defp stripe_status_to_atom("past_due"), do: :past_due
  defp stripe_status_to_atom("canceled"), do: :canceled
  defp stripe_status_to_atom("unpaid"), do: :unpaid
  defp stripe_status_to_atom("paused"), do: :paused
  defp stripe_status_to_atom(_), do: :active
end
