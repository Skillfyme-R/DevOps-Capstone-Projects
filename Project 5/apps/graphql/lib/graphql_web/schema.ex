defmodule GraphqlWeb.Schema do
  use Absinthe.Schema

  alias Graphql.Resolvers

  # ── Scalars ──────────────────────────────────────────────────────────────
  scalar :datetime, description: "ISO 8601 datetime string" do
    serialize fn
      %DateTime{} = dt -> DateTime.to_iso8601(dt)
      %NaiveDateTime{} = ndt -> NaiveDateTime.to_iso8601(ndt)
      val -> to_string(val)
    end
    parse fn
      %Absinthe.Blueprint.Input.String{value: val} -> {:ok, val}
      _ -> :error
    end
  end

  # ── Enums ────────────────────────────────────────────────────────────────
  enum :content_type do
    value :movie
    value :series
    value :short
    value :documentary
    value :live
  end

  enum :content_status do
    value :draft
    value :processing
    value :published
    value :archived
  end

  enum :node_status do
    value :healthy
    value :degraded
    value :draining
    value :offline
    value :provisioning
  end

  # ── Types ─────────────────────────────────────────────────────────────────
  object :account do
    field :id,   :id
    field :name, :string
    field :slug, :string
    field :tier, :string
  end

  object :plan do
    field :id,   :id
    field :name, :string
    field :slug, :string
  end

  object :subscription_obj do
    field :id,     :id
    field :status, :string do
      resolve fn sub, _, _ -> {:ok, sub.status |> to_string()} end
    end
    field :plan,   :plan
  end

  object :user do
    field :id,            :id
    field :name,          :string
    field :email,         :string
    field :role,          :string
    field :avatar_url,    :string
    field :account,       :account
    field :subscriptions, list_of(:subscription_obj)
  end

  object :auth_payload do
    field :token, :string
    field :user,  :user
  end

  object :studio do
    field :id,          :id
    field :name,        :string
    field :slug,        :string
    field :description, :string
    field :logo_url,    :string
    field :status,      :string
    field :verified,    :boolean
  end

  object :episode do
    field :id,              :id
    field :title,           :string
    field :season_number,   :integer
    field :episode_number,  :integer
    field :duration_seconds, :integer
    field :master_playlist_url, :string
    field :thumbnail_url,   :string
  end

  object :content do
    field :id,                  :id
    field :title,               :string
    field :slug,                :string
    field :description,         :string
    field :content_type,        :string
    field :status,              :string
    field :thumbnail_url,       :string
    field :banner_url,          :string
    field :master_playlist_url, :string
    field :duration_seconds,    :integer
    field :avg_rating,          :float
    field :view_count,          :integer
    field :genres,              list_of(:string)
    field :subtitles,           list_of(:string)
    field :studio,              :studio
    field :episodes,            list_of(:episode)
  end

  object :watchlist_item do
    field :id,          :id
    field :content,     :content
    field :inserted_at, :datetime
  end

  object :view_record do
    field :id,              :id
    field :watched_seconds, :integer
    field :completed,       :boolean
  end

  object :cdn_node do
    field :id,               :id
    field :name,             :string
    field :region,           :string
    field :country,          :string
    field :city,             :string
    field :provider,         :string
    field :status,           :string
    field :pop_code,         :string
    field :capacity_gbps,    :float
    field :current_load_pct, :float
    field :active_streams,   :integer
    field :last_health_check, :datetime
  end

  object :platform_capacity do
    field :total_capacity_gbps,  :float
    field :avg_load_pct,         :float
    field :total_active_streams, :integer
    field :node_count,           :integer
  end

  object :support_issue do
    field :id,          :id
    field :subject,     :string do
      resolve fn issue, _, _ -> {:ok, issue.title} end
    end
    field :description, :string
    field :status,      :string do
      resolve fn issue, _, _ -> {:ok, issue.status |> to_string() |> String.upcase()} end
    end
    field :priority,    :string do
      resolve fn issue, _, _ -> {:ok, issue.priority |> to_string() |> String.upcase()} end
    end
    field :inserted_at, :datetime
    field :updated_at,  :datetime
  end

  # ── Queries ───────────────────────────────────────────────────────────────
  query do
    field :health, :string do
      resolve fn _, _ -> {:ok, "FluxStream GraphQL API"} end
    end

    field :me, :user do
      resolve &Resolvers.User.me/2
    end

    field :featured_content, list_of(:content) do
      arg :limit, :integer
      resolve fn args, info -> Resolvers.Content.resolve_featured(args, info) end
    end

    field :contents, list_of(:content) do
      arg :genre,        :string
      arg :content_type, :string
      arg :status,       :string
      arg :studio_id,    :id
      arg :order_by,     :string
      arg :limit,        :integer
      resolve fn args, info -> Resolvers.Content.resolve_contents(args, info) end
    end

    field :content, :content do
      arg :id,   :id
      arg :slug, :string
      resolve fn args, info -> Resolvers.Content.resolve_content(args, nil, info) end
    end

    field :search_content, list_of(:content) do
      arg :query, non_null(:string)
      arg :genre, :string
      arg :limit, :integer
      resolve fn args, info -> Resolvers.Content.resolve_search_content(args, info) end
    end

    field :my_watchlist, list_of(:watchlist_item) do
      resolve fn args, %{context: %{current_user: user}} ->
        Resolvers.User.my_watchlist(args, %{context: %{current_user: user}})
      end
    end

    field :cdn_nodes, list_of(:cdn_node) do
      arg :status, :string
      arg :region, :string
      arg :limit,  :integer
      resolve fn args, info -> Resolvers.CDN.list_nodes(args, info) end
    end

    field :platform_capacity, :platform_capacity do
      resolve fn args, info -> Resolvers.CDN.platform_capacity(args, info) end
    end

    field :my_issues, list_of(:support_issue) do
      resolve fn args, info -> Resolvers.Support.my_issues(args, info) end
    end

    field :all_issues, list_of(:support_issue) do
      arg :status,   :string
      arg :priority, :string
      arg :limit,    :integer
      resolve fn args, info -> Resolvers.Support.list_issues(args, info) end
    end

    field :my_studios, list_of(:studio) do
      resolve fn _, %{context: %{current_user: user}} ->
        Resolvers.Studio.my_studios(%{}, user)
      end
    end

    field :studio_contents, list_of(:content) do
      arg :studio_id, non_null(:id)
      resolve fn args, info -> Resolvers.Studio.studio_contents(args, info) end
    end
  end

  # ── Mutations ─────────────────────────────────────────────────────────────
  mutation do
    field :login, :auth_payload do
      arg :email,    non_null(:string)
      arg :password, non_null(:string)
      resolve &Resolvers.User.login/2
    end

    field :social_login, :auth_payload do
      arg :provider, non_null(:string)
      arg :name,     non_null(:string)
      arg :email,    non_null(:string)
      resolve fn args, info -> Resolvers.User.social_login(args, info) end
    end

    field :register, :auth_payload do
      arg :name,     non_null(:string)
      arg :email,    non_null(:string)
      arg :password, non_null(:string)
      resolve &Resolvers.User.register/2
    end

    field :logout, :boolean do
      resolve &Resolvers.User.logout/2
    end

    field :add_to_watchlist, :boolean do
      arg :content_id, non_null(:id)
      resolve fn args, info -> Resolvers.Content.add_to_watchlist(args, info) end
    end

    field :remove_from_watchlist, :boolean do
      arg :content_id, non_null(:id)
      resolve fn args, info -> Resolvers.Content.remove_from_watchlist(args, info) end
    end

    field :record_view, :boolean do
      arg :content_id,      non_null(:id)
      arg :episode_id,      :id
      arg :watched_seconds, non_null(:integer)
      arg :last_position,   non_null(:integer)
      arg :completed,       :boolean
      arg :session_id,      :string
      resolve fn args, info ->
        case Resolvers.Content.record_view(args, info) do
          {:ok, _} -> {:ok, true}
          {:error, _} -> {:ok, true}
        end
      end
    end

    field :update_profile, :user do
      arg :name,       :string
      arg :avatar_url, :string
      resolve fn args, info -> Resolvers.User.update_profile(args, info) end
    end

    field :change_password, :boolean do
      arg :current_password, non_null(:string)
      arg :new_password,     non_null(:string)
      resolve fn args, info -> Resolvers.User.change_password(args, info) end
    end

    field :create_content, :content do
      arg :studio_id,    non_null(:id)
      arg :title,        non_null(:string)
      arg :description,  :string
      arg :content_type, non_null(:string)
      arg :genres,       list_of(:string)
      arg :thumbnail_url, :string
      resolve fn args, info -> Resolvers.Content.create_content(args, info) end
    end

    field :publish_content, :content do
      arg :id, non_null(:id)
      resolve fn args, info -> Resolvers.Content.publish_content(args, info) end
    end

    field :subscribe_to_plan, :boolean do
      arg :plan_slug, non_null(:string)
      resolve fn args, info -> Resolvers.User.subscribe_to_plan(args, info) end
    end

    field :cancel_subscription, :boolean do
      arg :subscription_id, non_null(:id)
      resolve fn args, info -> Resolvers.User.cancel_subscription(args, info) end
    end

    field :delete_account, :boolean do
      arg :password, non_null(:string)
      resolve fn args, info -> Resolvers.User.delete_account(args, info) end
    end

    field :report_issue, :support_issue do
      arg :subject,     non_null(:string)
      arg :description, non_null(:string)
      arg :content_id,  :id
      resolve fn args, info -> Resolvers.Support.report_issue(args, info) end
    end

    field :update_issue_status, :support_issue do
      arg :id,     non_null(:id)
      arg :status, non_null(:string)
      resolve fn args, info -> Resolvers.Support.update_issue_status(args, info) end
    end
  end
end
