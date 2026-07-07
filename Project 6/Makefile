# NexaFlow Logistics Platform — Makefile
# Run `make help` for a full list of targets.

BINARY      := nexaflow-server
CLI_BINARY  := nexaflow-cli
VERSION     ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
REGISTRY    := ghcr.io/nexaflow-io
IMAGE       := $(REGISTRY)/nexaflow-server
LDFLAGS     := -s -w -X main.version=$(VERSION)
GO_FLAGS    := CGO_ENABLED=0 GOOS=linux GOARCH=amd64
TEST_FLAGS  := -race -coverprofile=coverage.out -covermode=atomic

.PHONY: help
help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ─────────────────────────────────────────────────────────────────────────────
# Development
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: dev
dev: ## Start the full local dev stack (docker-compose)
	docker compose -f deploy/manifests/docker-compose.yaml up --build

.PHONY: dev-backend
dev-backend: ## Run the Go server locally (hot reload via air)
	@which air > /dev/null || go install github.com/air-verse/air@latest
	air -c .air.toml

.PHONY: dev-frontend
dev-frontend: ## Run the React dev server
	cd web && npm run dev

# ─────────────────────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: build
build: build-backend build-frontend ## Build everything

.PHONY: build-backend
build-backend: ## Compile the Go server binary
	$(GO_FLAGS) go build -ldflags="$(LDFLAGS)" -o bin/$(BINARY) ./cmd/server
	$(GO_FLAGS) go build -ldflags="$(LDFLAGS)" -o bin/$(CLI_BINARY) ./cmd/cli
	@echo "✓ Binary built: bin/$(BINARY)"

.PHONY: build-frontend
build-frontend: ## Build the React web UI
	cd web && npm ci && npm run build
	@echo "✓ Frontend built: web/dist/"

# ─────────────────────────────────────────────────────────────────────────────
# Test
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: test
test: test-backend test-frontend ## Run all tests

.PHONY: test-backend
test-backend: ## Run Go tests with race detection and coverage
	go test $(TEST_FLAGS) ./...
	go tool cover -func=coverage.out | tail -n1

.PHONY: test-frontend
test-frontend: ## Run Vitest unit tests
	cd web && npm test

.PHONY: test-integration
test-integration: ## Run integration tests (requires docker-compose up)
	go test -tags=integration -v ./...

# ─────────────────────────────────────────────────────────────────────────────
# Lint & Format
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: lint
lint: ## Lint Go and TypeScript sources
	golangci-lint run ./...
	cd web && npm run lint

.PHONY: fmt
fmt: ## Auto-format all source code
	gofmt -s -w .
	cd web && npx prettier --write "src/**/*.{ts,tsx}"

.PHONY: vet
vet: ## Run go vet
	go vet ./...

# ─────────────────────────────────────────────────────────────────────────────
# Docker
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: docker-build
docker-build: ## Build the Docker image
	docker build -t $(IMAGE):$(VERSION) -t $(IMAGE):latest .

.PHONY: docker-push
docker-push: docker-build ## Push the Docker image to the registry
	docker push $(IMAGE):$(VERSION)
	docker push $(IMAGE):latest

.PHONY: docker-scan
docker-scan: ## Scan the Docker image with Trivy
	trivy image $(IMAGE):latest --severity HIGH,CRITICAL

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: migrate
migrate: ## Apply all database migrations
	@for f in migrations/*.sql; do \
	  echo "Applying $$f..."; \
	  psql $$NEXAFLOW_DB_URL -f $$f; \
	done

.PHONY: migrate-dry
migrate-dry: ## Dry-run migration (syntax check only)
	@for f in migrations/*.sql; do \
	  echo "Checking $$f..."; \
	  psql $$NEXAFLOW_DB_URL --set ON_ERROR_STOP=1 -c "BEGIN; \i $$f; ROLLBACK;"; \
	done

# ─────────────────────────────────────────────────────────────────────────────
# Kubernetes & Helm
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: k8s-apply
k8s-apply: ## Apply Kubernetes manifests to current context
	kubectl apply -f deploy/manifests/kubernetes.yaml

.PHONY: k8s-status
k8s-status: ## Show NexaFlow pod status
	kubectl -n nexaflow get pods,svc,ingress

.PHONY: helm-lint
helm-lint: ## Lint the Helm chart
	helm lint deploy/helm/nexaflow

.PHONY: helm-template
helm-template: ## Render Helm templates for review
	helm template nexaflow deploy/helm/nexaflow --namespace nexaflow

# ─────────────────────────────────────────────────────────────────────────────
# Terraform
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: tf-plan
tf-plan: ## Terraform plan (staging)
	cd deploy/terraform && terraform init && terraform plan -var="environment=staging"

.PHONY: tf-apply
tf-apply: ## Terraform apply (staging — requires confirmation)
	cd deploy/terraform && terraform apply -var="environment=staging"

.PHONY: tf-fmt
tf-fmt: ## Format Terraform files
	cd deploy/terraform && terraform fmt -recursive

# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────
.PHONY: clean
clean: ## Remove build artifacts
	rm -rf bin/ web/dist/ coverage.out

.PHONY: deps
deps: ## Install/update all dependencies
	go mod tidy
	cd web && npm install

.PHONY: generate
generate: ## Run go generate
	go generate ./...

.PHONY: version
version: ## Print the current version
	@echo $(VERSION)
