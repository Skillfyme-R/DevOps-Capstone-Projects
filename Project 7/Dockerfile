# ─── Stage 1: Build Go binary ─────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git ca-certificates tzdata

# Copy all source first (go mod tidy needs the full source tree)
COPY . .

# Generate go.sum and download all dependencies
RUN cd core && go mod tidy && cd .. && go mod tidy && go mod download

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s" \
    -o vaultflow \
    ./cmd/vaultflow

# ─── Stage 2: Minimal runtime image ──────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot

LABEL org.opencontainers.image.title="VaultFlow"
LABEL org.opencontainers.image.description="VaultFlow Financial Intelligence Platform"
LABEL org.opencontainers.image.vendor="VaultFlow Technologies"
LABEL org.opencontainers.image.licenses="Apache-2.0"

COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /build/vaultflow /vaultflow

EXPOSE 9090 9091

USER nonroot:nonroot

ENTRYPOINT ["/vaultflow"]
CMD ["serve"]
