# ─────────────────────────────────────────────
# Stage 1: Elixir build
# ─────────────────────────────────────────────
FROM hexpm/elixir:1.16.2-erlang-26.2.3-alpine-3.19.1 AS elixir-builder

ENV MIX_ENV=prod \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8

WORKDIR /app

# System dependencies
RUN apk add --no-cache build-base git curl

# Install Hex + Rebar
RUN mix local.hex --force && mix local.rebar --force

# Cache dependencies
COPY mix.exs mix.lock ./
COPY apps/core/mix.exs apps/core/
COPY apps/api/mix.exs apps/api/
COPY apps/graphql/mix.exs apps/graphql/
COPY apps/rtc/mix.exs apps/rtc/
COPY apps/email/mix.exs apps/email/
COPY apps/worker/mix.exs apps/worker/
COPY apps/cron/mix.exs apps/cron/

RUN mix deps.get --only prod
RUN mix deps.compile

# Copy application source
COPY config/ config/
COPY apps/ apps/
COPY rel/ rel/

# Compile and build release
RUN mix compile
RUN mix release fluxstream

# ─────────────────────────────────────────────
# Stage 2: Frontend build
# ─────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/www

COPY www/package.json www/yarn.lock* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY www/ .

ARG VITE_GRAPHQL_URL=/graphql
ARG VITE_WS_URL=wss://app.fluxstream.io/socket
ENV VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL}
ENV VITE_WS_URL=${VITE_WS_URL}

RUN npm run build

# ─────────────────────────────────────────────
# Stage 3: Production runtime image
# ─────────────────────────────────────────────
FROM alpine:3.19.1 AS runtime

ENV LANG=en_US.UTF-8 \
    HOME=/app \
    MIX_ENV=prod

# Runtime dependencies
RUN apk add --no-cache libstdc++ openssl ncurses-libs curl nginx

WORKDIR /app

# Copy Elixir release
COPY --from=elixir-builder /app/_build/prod/rel/fluxstream ./

# Copy frontend build into nginx webroot
COPY --from=frontend-builder /app/www/dist /var/www/fluxstream/
COPY www/nginx.conf /etc/nginx/http.d/default.conf

# Entrypoint
COPY bin/docker-entrypoint.sh ./bin/docker-entrypoint.sh
RUN chmod +x ./bin/docker-entrypoint.sh

EXPOSE 4000 4001 4002 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

ENTRYPOINT ["./bin/docker-entrypoint.sh"]
CMD ["./bin/fluxstream", "start"]
