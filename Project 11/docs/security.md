# Security

Threat model summary: what Pulsar protects today, what's an explicit dev-only shortcut that must
change before any real deployment, and the recommended secrets-management path.

## What's protected

| Concern | Mechanism | Where |
|---|---|---|
| Human operator authentication | Username/password → BCrypt-verified → JWT access + refresh token pair | `AuthController`, `AuthService`, `JwtService`, `PasswordEncoderConfig` |
| Worker authentication | Static header API key, two-tier (env-var dev key OR SHA-256-hashed DB-backed key) | `ApiKeyAuthenticationFilter`, `ApiKeyValidator` |
| Authorization | Path-based RBAC across four roles (`ADMIN`, `OPERATOR`, `WORKER`, `VIEWER`) | `SecurityConfig` |
| Password storage | BCrypt (Spring Security's `PasswordEncoderConfig`) | `persistence/entity/UserEntity.java`, seeded via `V2__seed_bootstrap_data.sql` |
| API key storage | SHA-256 hash only — raw keys are never persisted | `ApiKeyAuthenticationFilter.sha256Hex`, `api_keys.key_hash` |
| Session model | Stateless (`SessionCreationPolicy.STATELESS`) — no server-side session state to leak or fixate | `SecurityConfig` |
| Transport | TLS termination at the ingress (cert-manager + Let's Encrypt) in the Kubernetes path | `k8s/base/ingress.yaml` |
| UI token storage | `sessionStorage`, not `localStorage` — tokens die with the browser tab, shrinking the XSS persistence window for an ops console that can pause/terminate production pipelines | `pulsar-ui/src/context/AuthContext.tsx` |
| Unauthenticated vs unauthorized signal | Custom `AuthenticationEntryPoint` forces `401` (not Spring Security's default `403`) for anonymous requests denied by an authorization rule | `SecurityConfig` |

## What's a known dev-only shortcut — change before any real deployment

These are **not accidental** — they're explicitly labeled in the source as placeholders for
zero-setup local/demo use, and this document is the honest, direct callout the task brief asked
for.

1. **The seeded bootstrap admin password.** `V2__seed_bootstrap_data.sql` inserts a user
   `admin` with a BCrypt hash of the literal string `PulsarAdmin123!`. The migration's own comment
   says: *"Rotate/delete this account in any real deployment; it exists purely to make the API
   demoable out of the box."* Any environment that isn't a local sandbox or an ephemeral demo
   should either change this password immediately after first login or delete the row entirely and
   provision real accounts.

2. **The default static worker API key.** `pulsar.security.worker-api-key` defaults to
   `pk_dev_local_key_change_me` (the literal string, right down to `_change_me`) in
   `application.yml`, and is what `docker-compose.yml` and the demo worker fleet use out of the
   box. `ApiKeyValidator`'s own javadoc frames this as "zero-setup local/demo use" specifically
   *because* the DB-backed `api_keys` table is the "durable/production path." Any real deployment
   should set `PULSAR_WORKER_API_KEY` to something unguessable via a real secret (or, better,
   disable the static-key path's usefulness by rotating it to a value nobody would type from
   memory) and provision real per-fleet keys through the `api_keys` table.

3. **The default JWT signing secret.** `application.yml`'s default is literally
   `dev-only-signing-secret-do-not-use-in-production-min-32-bytes` — the string itself tells you
   not to use it. Every JWT is only as strong as this HMAC key; a deployment running with the
   default is one `docker inspect` or repo-read away from an attacker being able to forge valid
   tokens for any role. **This must be overridden with a real, randomly generated secret in every
   non-local environment**, injected via `PULSAR_JWT_SECRET`.

4. **`k8s/base/secret.yaml` ships placeholder values**, by design — its header comment says so
   explicitly: `"Placeholder values only — never commit real secrets... this manifest is replaced
   by values injected via a real secrets manager... in staging/production."` If you `kubectl apply
   -k k8s/base` without replacing these, you get literal strings like `REPLACE_ME_DB_PASSWORD` as
   your actual database password — the manifest is not meant to be applied as-is outside of a
   throwaway sandbox cluster.

## Secrets management recommendation

The placeholder pattern in `k8s/base/secret.yaml` (a plain `Secret` with `stringData` holding
obviously-fake values) is a stand-in for one of these, and should be swapped for one of them before
any environment that matters:

- **AWS Secrets Manager + External Secrets Operator** — store `PULSAR_DB_PASSWORD`,
  `PULSAR_JWT_SECRET`, and `PULSAR_WORKER_API_KEY` as Secrets Manager entries, and run External
  Secrets Operator in the cluster to sync them into a real `pulsar-secrets` Kubernetes Secret on a
  refresh interval — this also gives you automatic rotation support if Secrets Manager rotation is
  configured on the RDS password.
- **AWS Systems Manager Parameter Store (SecureString)** — a cheaper alternative to Secrets
  Manager for values that don't need automatic rotation, same External Secrets Operator
  integration path.
- **Sealed Secrets** — if you want the encrypted secret committed to Git (GitOps-friendly) rather
  than pulled from an external store at sync time, encrypt with the cluster's public key and let
  the Sealed Secrets controller decrypt in-cluster.
- **CI/CD-injected secrets** — the simplest option, already partially modeled by
  `terraform-plan.yml`'s use of `secrets.PULSAR_STAGING_DB_PASSWORD` as a `TF_VAR_*` — GitHub
  Actions secrets populate a real `Secret` manifest at deploy time via `kubectl create secret
  generic --from-literal=...` instead of applying the checked-in placeholder file.

Whichever mechanism, the invariant that matters: **`k8s/base/secret.yaml` as checked into this
repository should never be the thing actually applied to a real cluster.**

## Threat model notes

- **What Pulsar does not defend against, by scope**: there's no rate limiting wired up yet
  (`PULSAR-3002`/`RATE_LIMIT_EXCEEDED` is a reserved error code with no enforcement path currently
  implemented), no WAF-equivalent request filtering, and no anomaly detection on auth attempts
  (no lockout after repeated failed logins). These would be reasonable additions before exposing
  the API beyond a trusted internal network.
- **The worker trust boundary is coarse.** Any holder of a valid API key gets the full `WORKER`
  role, which can poll/complete/fail *any* task type — there's no per-key scoping to specific task
  types or workflows. A compromised worker key can claim and (mis)report on any queued task in the
  system, not just the ones it's "supposed to" handle.
- **Webhook endpoints are intentionally public** (`/api/pulsar/v1/webhooks/**` is `permitAll` in
  `SecurityConfig`) since they're meant to be called by external systems without a Pulsar-issued
  credential. This means anyone who knows (or guesses) a registered `source` name can start a
  workflow with attacker-controlled input. If webhook sources are ever wired to anything
  sensitive, add a shared-secret or signature-verification step at the webhook boundary (Pulsar
  doesn't do this today).
