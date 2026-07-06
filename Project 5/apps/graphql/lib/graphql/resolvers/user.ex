defmodule Graphql.Resolvers.User do
  @moduledoc "GraphQL resolvers for user authentication and profile operations."

  alias Core.Services.Users
  alias Core.Schema.User
  alias Argon2

  def me(_, %{context: %{current_user: user}}), do: {:ok, user}
  def me(_, _), do: {:ok, nil}

  def register(%{name: name, email: email, password: password}, _) do
    with {:ok, user} <- Users.register(%{name: name, email: email, password: password}),
         {:ok, token, _} <- Core.Guardian.encode_and_sign(user, %{}, ttl: {30, :days}) do
      {:ok, %{token: token, user: user}}
    end
  end

  def login(%{email: email, password: password}, _) do
    case Users.login(email, password) do
      {:ok, token, user} -> {:ok, %{token: token, user: user}}
      {:error, :invalid_credentials} -> {:error, "Invalid email or password"}
    end
  end

  def social_login(%{provider: provider, name: name, email: email}, _) do
    import Ecto.Query
    email = String.downcase(email)
    user = case Core.Repo.get_by(Core.Schema.User, email: email) do
      nil ->
        # Create a new user without a password (social-only account)
        random_pass = :crypto.strong_rand_bytes(32) |> Base.encode64()
        {:ok, u} = Users.register(%{name: name, email: email, password: random_pass})
        u
      existing -> existing
    end
    user = Core.Repo.preload(user, [:account, subscriptions: [:plan]])
    case Core.Guardian.encode_and_sign(user, %{provider: provider}, ttl: {30, :days}) do
      {:ok, token, _} -> {:ok, %{token: token, user: user}}
      {:error, reason} -> {:error, inspect(reason)}
    end
  end

  def logout(_, %{context: %{current_user: user, token: token}}) do
    Core.Guardian.revoke(token)
    {:ok, true}
  end

  def logout(_, _), do: {:ok, false}

  def update_profile(attrs, %{context: %{current_user: user}}) do
    Users.update_user(user, attrs)
  end

  def change_password(%{current_password: current_pwd, new_password: new_pwd}, %{context: %{current_user: user}}) do
    if Argon2.verify_pass(current_pwd, user.password_hash) do
      case Users.update_user(user, %{password: new_pwd}) do
        {:ok, _} -> {:ok, true}
        {:error, changeset} ->
          errors = Ecto.Changeset.traverse_errors(changeset, fn {msg, _} -> msg end)
          {:error, errors |> Map.values() |> List.flatten() |> hd()}
      end
    else
      {:error, "Current password is incorrect"}
    end
  end

  def subscribe_to_plan(%{plan_slug: slug}, %{context: %{current_user: user}}) do
    import Ecto.Query
    case Core.Repo.get_by(Core.Schema.Plan, slug: slug) do
      nil -> {:error, "Plan not found"}
      plan ->
        # Cancel any existing active subscriptions
        Core.Repo.all(
          from s in Core.Schema.Subscription,
            where: s.user_id == ^user.id and s.status in [^:active, ^:trialing]
        )
        |> Enum.each(fn s ->
          Core.Repo.update!(Core.Schema.Subscription.cancel_changeset(s))
        end)

        # Create new subscription
        now = DateTime.utc_now()
        attrs = %{
          user_id: user.id,
          plan_id: plan.id,
          account_id: user.account_id,
          status: :active,
          billing_interval: :monthly,
          current_period_start: now,
          current_period_end: DateTime.add(now, 30, :day),
        }
        case Core.Repo.insert(Core.Schema.Subscription.changeset(%Core.Schema.Subscription{}, attrs)) do
          {:ok, _} -> {:ok, true}
          {:error, reason} -> {:error, inspect(reason)}
        end
    end
  end

  def subscribe_to_plan(_, _), do: {:error, "unauthenticated"}

  def cancel_subscription(%{subscription_id: sub_id}, %{context: %{current_user: user}}) do
    import Ecto.Query
    case Core.Repo.one(from s in Core.Schema.Subscription, where: s.id == ^sub_id and s.user_id == ^user.id) do
      nil -> {:error, "Subscription not found"}
      sub ->
        case Core.Repo.update(Core.Schema.Subscription.cancel_changeset(sub)) do
          {:ok, _} -> {:ok, true}
          {:error, reason} -> {:error, inspect(reason)}
        end
    end
  end

  def cancel_subscription(_, _), do: {:error, "unauthenticated"}

  def delete_account(%{password: password}, %{context: %{current_user: user}}) do
    if Argon2.verify_pass(password, user.password_hash) do
      case Users.delete_user(user, user) do
        {:ok, _} -> {:ok, true}
        {:error, reason} -> {:error, inspect(reason)}
      end
    else
      {:error, "Incorrect password"}
    end
  end

  def delete_account(_, _), do: {:error, "unauthenticated"}

  def create_api_token(attrs, %{context: %{current_user: user}}) do
    with {:ok, raw_token, token_record} <- Users.create_api_token(user, attrs) do
      {:ok, %{token: raw_token, token_record: token_record}}
    end
  end

  def revoke_api_token(%{id: id}, %{context: %{current_user: user}}) do
    with {:ok, token} <- get_user_token(user, id) do
      Users.revoke_api_token(token, user)
    end
  end

  def create_viewing_profile(attrs, %{context: %{current_user: user}}) do
    Users.create_viewing_profile(user, attrs)
  end

  def update_viewing_profile(%{id: id} = attrs, %{context: %{current_user: user}}) do
    with {:ok, profile} <- get_user_profile(user, id) do
      profile |> Core.Schema.ViewingProfile.changeset(Map.drop(attrs, [:id])) |> Core.Repo.update()
    end
  end

  def delete_viewing_profile(%{id: id}, %{context: %{current_user: user}}) do
    with {:ok, profile} <- get_user_profile(user, id) do
      Core.Repo.delete(profile)
    end
  end

  def viewing_profiles(_, %{context: %{current_user: user}}) do
    profiles = Core.Repo.all(Core.Schema.ViewingProfile, user_id: user.id)
    {:ok, profiles}
  end

  def my_watchlist(args, %{context: %{current_user: user}}) do
    import Ecto.Query
    items =
      Core.Schema.Watchlist
      |> where([w], w.user_id == ^user.id)
      |> maybe_filter_profile(args[:profile_id])
      |> preload(content: :studio)
      |> Core.Repo.all()
    {:ok, items}
  end

  def my_viewing_history(args, %{context: %{current_user: user}}) do
    import Ecto.Query
    limit = args[:limit] || 20
    history =
      Core.Schema.ViewingHistory
      |> where([h], h.user_id == ^user.id)
      |> order_by([h], desc: h.updated_at)
      |> limit(^limit)
      |> preload([:content, :episode])
      |> Core.Repo.all()
    {:ok, history}
  end

  defp maybe_filter_profile(query, nil), do: query
  defp maybe_filter_profile(query, profile_id) do
    import Ecto.Query
    where(query, [w], w.viewing_profile_id == ^profile_id)
  end

  defp get_user_token(user, token_id) do
    case Core.Repo.get_by(Core.Schema.PersistedToken, id: token_id, user_id: user.id) do
      nil -> {:error, "token not found"}
      token -> {:ok, token}
    end
  end

  defp get_user_profile(user, profile_id) do
    case Core.Repo.get_by(Core.Schema.ViewingProfile, id: profile_id, user_id: user.id) do
      nil -> {:error, "profile not found"}
      profile -> {:ok, profile}
    end
  end
end
