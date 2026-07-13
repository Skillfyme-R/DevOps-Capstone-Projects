# Kubernetes Deployment

Pulsar's Kubernetes manifests live in `k8s/base/` as a flat Kustomize base (no overlays yet — see
the note at the end). Everything targets the `pulsar-system` namespace.

## Resource inventory

`k8s/base/kustomization.yaml` lists these resources, applied in this order:

| File | Kind | Purpose |
|---|---|---|
| `namespace.yaml` | `Namespace` | Creates `pulsar-system`, labeled `app.kubernetes.io/part-of: pulsar` |
| `configmap.yaml` | `ConfigMap` (`pulsar-config`) | Non-secret env vars shared by server/worker: DB URL, Redis host, sweeper interval, JWT TTLs, etc. |
| `secret.yaml` | `Secret` (`pulsar-secrets`) | **Placeholder** values for `PULSAR_DB_PASSWORD`, `PULSAR_JWT_SECRET`, `PULSAR_WORKER_API_KEY` — replace before real use, see [`security.md`](security.md) |
| `server-deployment.yaml` | `Deployment` (`pulsar-server-deployment`) | 3 replicas of `reelforge/pulsar-server:latest` |
| `server-service.yaml` | `Service` (`pulsar-server-service`) | ClusterIP, port 8080 |
| `ui-deployment.yaml` | `Deployment` (`pulsar-ui-deployment`) | 2 replicas of `reelforge/pulsar-ui:latest` |
| `ui-service.yaml` | `Service` (`pulsar-ui-service`) | ClusterIP, port 80 |
| `worker-deployment.yaml` | `Deployment` (`pulsar-worker-deployment`) | 2 replicas of `reelforge/pulsar-worker-sdk-demo:latest` |
| `ingress.yaml` | `Ingress` (`pulsar-ingress`) | Routes `pulsar.reelforge.media` to the server (`/api/pulsar`) and UI (`/`) |
| `hpa.yaml` | `HorizontalPodAutoscaler` (`pulsar-server-hpa`) | Scales `pulsar-server-deployment` 2–6 replicas on 70% CPU |
| `pdb.yaml` | `PodDisruptionBudget` (`pulsar-server-pdb`) | Keeps at least 1 `pulsar-server` pod available during voluntary disruptions |

## Applying it

```bash
kubectl apply -k k8s/base
```

This is exactly what `pulsar-ci.yml`'s `deploy-staging` job runs against the staging cluster on
every push to `main`. To preview the rendered manifests without applying:

```bash
kubectl kustomize k8s/base
```

## `pulsar-server` — the resource that gets the most operational attention

`server-deployment.yaml`:

- **3 replicas**, image `reelforge/pulsar-server:latest` (in a real pipeline you'd want a specific
  tag, not `latest` — the CI build tags images with `${{ github.sha }}`, so a production overlay
  would pin to that instead).
- Config via `envFrom: configMapRef: pulsar-config` (bulk, non-secret) plus three individually
  wired secret refs (`PULSAR_DB_PASSWORD`, `PULSAR_JWT_SECRET`, `PULSAR_WORKER_API_KEY`) from
  `pulsar-secrets`.
- **Resources**: requests `250m` CPU / `512Mi` memory, limits `1000m` CPU / `1Gi` memory.
- **Readiness probe**: `GET /actuator/health`, 20s initial delay, every 10s, 3 failures to mark
  not-ready — a pod failing this stops receiving traffic from the Service but isn't restarted.
- **Liveness probe**: same path, 45s initial delay (longer, to give Flyway + Spring context startup
  room), every 15s, 3 failures to restart the pod.

### HPA (`hpa.yaml`)

Targets `pulsar-server-deployment`, `minReplicas: 2`, `maxReplicas: 6`, scaling on average CPU
utilization crossing 70%. This scales **pods within the existing EKS node group** — it's
independent of the Terraform-managed node group's own `desired_size`/`min_size`/`max_size` (2–6
nodes, see [`infrastructure.md`](infrastructure.md)). If pod-level HPA scaling pushes past what the
current node count can schedule, cluster autoscaling (not configured in this Terraform, if you
need it) would need to add nodes — as shipped, the EKS node group's scaling config is static
within its min/max, not reactive to pod scheduling pressure via an installed Cluster Autoscaler or
Karpenter.

### PDB (`pdb.yaml`)

`minAvailable: 1` for pods matching `app: pulsar-server` — guarantees at least one `pulsar-server`
pod stays up during voluntary disruptions (node drains, cluster upgrades), so a rolling node
replacement can't take down every replica simultaneously even if it happens faster than the
Deployment's own rollout strategy would prefer.

## `pulsar-worker-demo`

`worker-deployment.yaml` — 2 replicas of the demo worker fleet image, config via the same
`pulsar-config` ConfigMap plus its own `PULSAR_WORKER_API_KEY` secret ref. Notably **no
readiness/liveness probes** — this is a background poller with no HTTP surface of its own, so
there's nothing conventional to probe; Kubernetes treats it as ready as soon as the container
starts. Resources: requests `100m`/`256Mi`, limits `500m`/`512Mi` — deliberately lighter than the
server, reflecting that it's a polling client, not a request-serving service.

## `pulsar-ui`

`ui-deployment.yaml` — 2 replicas of the nginx-served static build. Readiness probe `GET /` at 5s
initial delay/10s period; liveness probe same path at 10s initial delay/15s period — much faster
than the server's probes since there's no JVM/DB warm-up to wait for, just nginx serving static
files. Resources are the lightest of the three deployments (`50m`/`64Mi` request,
`250m`/`128Mi` limit).

## Ingress

`ingress.yaml` — single host `pulsar.reelforge.media`, `nginx` ingress class,
`nginx.ingress.kubernetes.io/ssl-redirect: "true"`, TLS cert managed by `cert-manager` via the
`letsencrypt-prod` `ClusterIssuer` (referenced, not defined here — the cluster must already have
cert-manager installed with that issuer configured). Path routing:

- `/api/pulsar` → `pulsar-server-service:8080`
- `/` (catch-all) → `pulsar-ui-service:80`

This means the UI and API are served from the **same hostname**, which is why
`pulsar-ui/Dockerfile`'s `VITE_API_BASE_URL` build arg can be set to the production hostname itself
(or left relative) rather than needing CORS configuration between two different origins.

## No environment-specific overlays yet

There is currently only `k8s/base/` — no `k8s/overlays/staging` or `k8s/overlays/production`
directories. The same manifests are applied to both `deploy-staging` (via CI) and any manual
production apply; environment-specific differences (image tags, replica counts, resource limits,
the ingress hostname) are not currently parameterized per environment via Kustomize overlays. If
Pulsar grows a real staging/production split with different sizing, adding
`k8s/overlays/{staging,production}/kustomization.yaml` patches over this base would be the natural
next step (see [Future Enhancements](../README.md#future-enhancements)).

## Related documents

- [`deployment.md`](deployment.md) — where this fits in the overall deploy sequence
- [`infrastructure.md`](infrastructure.md) — the EKS cluster and node group this runs on
- [`security.md`](security.md) — replacing `secret.yaml`'s placeholder values
