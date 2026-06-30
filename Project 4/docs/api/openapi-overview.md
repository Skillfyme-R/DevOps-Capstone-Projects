# ShieldGrid API Reference

The ShieldGrid API follows REST conventions with JSON request/response bodies.

**Base URL:** `https://app.shieldgrid.io/api/v1`
**Interactive docs:** `/docs` (Swagger UI, non-production only)

---

## Authentication

All endpoints except `/auth/register` and `/auth/login` require a Bearer token:

```
Authorization: Bearer <access_token>
```

Tokens are short-lived (30 min). Use the refresh token to obtain new access tokens (client-side implementation required).

---

## Error Format

```json
{
  "detail": "Human-readable error message"
}
```

| Status | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 202 | Accepted (async operation started) |
| 204 | No content (successful delete/update) |
| 400 | Validation error |
| 401 | Missing or invalid token |
| 403 | Insufficient permissions |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 422 | Unprocessable entity |
| 500 | Internal server error |

---

## Scan Types

| Value | Scanners Invoked |
|---|---|
| `full` | All available scanners in parallel |
| `sast` | Static code analysis (Bandit / Semgrep pattern) |
| `dast` | Dynamic endpoint scanning (ZAP pattern) |
| `dependency` | Package vulnerability check (OWASP Dependency-Check / Snyk pattern) |
| `container` | Docker image CVE scan (Trivy pattern) |
| `secret` | Git history secret detection (Gitleaks / truffleHog pattern) |
| `iac` | Infrastructure-as-Code misconfiguration (Checkov / tfsec pattern) |

---

## Severity Scale

| Level | CVSS Range | Score Impact |
|---|---|---|
| `critical` | 9.0–10.0 | −20 points |
| `high` | 7.0–8.9 | −10 points |
| `medium` | 4.0–6.9 | −5 points |
| `low` | 0.1–3.9 | −2 points |
| `info` | N/A | No impact |

---

## Example: Full Scan Workflow

```bash
# 1. Register
curl -X POST https://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@acme.com","password":"S3cur3Pass!","full_name":"Alice Smith","organization_name":"Acme Corp"}'

# Response: {"access_token":"...","refresh_token":"...","token_type":"bearer","expires_in":1800}

# 2. Create a project
TOKEN="<access_token>"
curl -X POST https://localhost:8000/api/v1/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Payment API","repository_url":"https://github.com/acme/payment-api","default_branch":"main"}'

# Response: {"id":"<project-uuid>","name":"Payment API",...}

# 3. Trigger a full scan
PROJECT_ID="<project-uuid>"
curl -X POST https://localhost:8000/api/v1/scans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"project_id\":\"$PROJECT_ID\",\"scan_type\":\"full\",\"branch\":\"main\"}"

# Response: {"id":"<scan-uuid>","status":"completed","security_score":65.0,...}

# 4. View findings
SCAN_ID="<scan-uuid>"
curl https://localhost:8000/api/v1/scans/$SCAN_ID \
  -H "Authorization: Bearer $TOKEN"

# 5. Check posture dashboard
curl https://localhost:8000/api/v1/scans/posture \
  -H "Authorization: Bearer $TOKEN"
```
