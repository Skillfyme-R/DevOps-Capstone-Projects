defmodule RtcWeb.UserSocket do
  use Phoenix.Socket

  channel "stream:*", RtcWeb.StreamChannel

  @impl true
  def connect(%{"token" => _token}, socket, _connect_info) do
    {:ok, socket}
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(_socket), do: nil
end
