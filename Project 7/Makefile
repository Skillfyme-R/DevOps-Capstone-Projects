.PHONY: help build test lint fmt docker-build docker-push \
        compose-up compose-down k8s-apply k8s-delete \
        terraform-init terraform-plan terraform-apply \
        ui-install ui-build ui-dev clean

VERSION     ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
REGISTRY    ?= ghcr.io/vaultflow
API_IMAGE   := $(REGISTRY)/api:$(VERSION)
UI_IMAGE    := $(REGISTRY)/ui:$(VERSION)
NAMESPACE   := vaultflow

# ── Help ───────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  ⬡  VaultFlow — Financial Intelligence Platform"
	@echo "  ───────────────────────────────────────────────"
	@echo "  build          Build Go binary"
	@echo "  test           Run all Go tests"
	@echo "  lint           Run golangci-lint"
	@echo "  fmt            Format Go code"
	@echo "  docker-build   Build Docker images (api + ui)"
	@echo "  docker-push    Push images to registry"
	@echo "  compose-up     Start all services with Docker Compose"
	@echo "  compose-down   Stop Docker Compose services"
	@echo "  k8s-apply      Apply Kubernetes manifests (Kustomize)"
	@echo "  k8s-delete     Delete Kubernetes manifests"
	@echo "  ui-install     Install UI npm dependencies"
	@echo "  ui-build       Build React production bundle"
	@echo "  ui-dev         Start UI dev server"
	@echo "  clean          Remove build artifacts"
	@echo ""

# ── Go ─────────────────────────────────────────────────────────────────────────
build:
	CGO_ENABLED=0 go build \
	  -ldflags="-w -s -X github.com/vaultflow/vaultflow/pkg/cmd.version=$(VERSION)" \
	  -o bin/vaultflow \
	  ./cmd/vaultflow

test:
	go test ./... -race -coverprofile=coverage.out -covermode=atomic
	go tool cover -func=coverage.out

lint:
	golangci-lint run ./... --timeout=5m

fmt:
	gofmt -s -w .
	goimports -w .

# ── Docker ─────────────────────────────────────────────────────────────────────
docker-build:
	docker build -t $(API_IMAGE) -f Dockerfile .
	docker build -t $(UI_IMAGE) -f Dockerfile.ui .

docker-push:
	docker push $(API_IMAGE)
	docker push $(UI_IMAGE)

# ── Docker Compose ─────────────────────────────────────────────────────────────
compose-up:
	docker compose up --build -d
	@echo "VaultFlow running:"
	@echo "  API:      http://localhost:9090"
	@echo "  UI:       http://localhost:3000"
	@echo "  Metrics:  http://localhost:9091/metrics"
	@echo "  Grafana:  http://localhost:3001 (admin/vaultflow)"

compose-down:
	docker compose down -v

# ── Kubernetes ─────────────────────────────────────────────────────────────────
k8s-apply:
	kubectl apply -k deploy/kubernetes/base
	kubectl rollout status deployment/vaultflow-api -n $(NAMESPACE) --timeout=300s

k8s-delete:
	kubectl delete -k deploy/kubernetes/base

# ── UI ─────────────────────────────────────────────────────────────────────────
ui-install:
	cd ui && npm ci

ui-build:
	cd ui && npm run build

ui-dev:
	cd ui && npm start

# ── Clean ──────────────────────────────────────────────────────────────────────
clean:
	rm -rf bin/ coverage.out ui/build ui/node_modules
