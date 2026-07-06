defmodule Core.Schema do
  defmacro __using__(_opts) do
    quote do
      use Ecto.Schema
      import EctoEnum, only: [defenum: 2]
    end
  end
end
