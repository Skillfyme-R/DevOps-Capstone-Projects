# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — Build the React web UI
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS web-builder

WORKDIR /app/web

COPY web/package.json web/package-lock.json* ./
RUN npm ci --prefer-offline

COPY web/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Build the Go server binary
# ─────────────────────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS go-builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Embed the compiled frontend into the Go binary
COPY --from=web-builder /app/web/dist ./web/dist

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w -X main.version=$(git describe --tags --always --dirty 2>/dev/null || echo dev)" \
    -o /bin/nexaflow-server ./cmd/server

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — Minimal runtime image
# ─────────────────────────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot

LABEL org.opencontainers.image.title="NexaFlow Server"
LABEL org.opencontainers.image.description="NexaFlow Intelligent Logistics Orchestration Platform"
LABEL org.opencontainers.image.vendor="NexaFlow Logistics, Inc."
LABEL org.opencontainers.image.source="https://github.com/nexaflow-io/nexaflow"
LABEL org.opencontainers.image.licenses="Apache-2.0"

COPY --from=go-builder /bin/nexaflow-server /nexaflow-server
COPY --from=go-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=go-builder /usr/share/zoneinfo /usr/share/zoneinfo

USER nonroot:nonroot

EXPOSE 8080 9090

ENTRYPOINT ["/nexaflow-server"]
CMD ["--port", "8080", "--metrics-port", "9090"]
