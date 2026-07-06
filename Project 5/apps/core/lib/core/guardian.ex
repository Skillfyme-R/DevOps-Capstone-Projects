defmodule Core.Guardian do
  use Guardian, otp_app: :core

  alias Core.Schema.User

  def subject_for_token(%User{id: id}, _claims), do: {:ok, "user:#{id}"}
  def subject_for_token(_, _), do: {:error, :unknown_resource}

  def resource_from_claims(%{"sub" => "user:" <> id}) do
    case Core.Repo.get(User, id) do
      nil -> {:error, :not_found}
      user -> {:ok, user}
    end
  end

  def resource_from_claims(_), do: {:error, :unknown_resource}
end
