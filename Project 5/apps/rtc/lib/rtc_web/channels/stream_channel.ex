defmodule RtcWeb.StreamChannel do
  use Phoenix.Channel

  def join("stream:" <> _stream_id, _params, socket) do
    {:ok, socket}
  end

  def handle_in("ping", _params, socket) do
    {:reply, {:ok, %{response: "pong"}}, socket}
  end
end
