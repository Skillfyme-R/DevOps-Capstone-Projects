# Infrastructure (Terraform)

Pulsar's AWS infrastructure is defined as three reusable modules
(`terraform/modules/{networking,database,cache}`) composed by a single environment
(`terraform/environments/production`), which additionally defines the EKS cluster inline (there is
no separate `modules/eks` — the EKS resources live directly in the environment's `main.tf`).

## Module: `networking`

Resources (`terraform/modules/networking/main.tf`):

- `aws_vpc.pulsar` — CIDR `var.pulsar_vpc_cidr` (default `10.30.0.0/16`), DNS support + hostnames
  enabled.
- `aws_internet_gateway.pulsar` and a single `aws_nat_gateway.pulsar` (in the first public subnet)
  — **one NAT gateway, not one per AZ**. The module's own comment is explicit about this trade-off:
  *"Single NAT gateway keeps cost down for a non-exotic setup; use one per AZ for full HA in
  production-critical estates."* This means a failure of the AZ hosting the NAT gateway takes
  down all private-subnet egress until AWS recovers it — an accepted cost/HA trade-off at this
  scope, not an oversight.
- **Public subnets**: 3, one per AZ in `var.pulsar_availability_zones` (default
  `us-east-1a/b/c`), CIDRs `10.30.0.0/24`, `10.30.1.0/24`, `10.30.2.0/24`.
- **Private subnets**: 3, same AZ spread, CIDRs `10.30.10.0/24`, `10.30.11.0/24`, `10.30.12.0/24`.
- Route tables: public routes `0.0.0.0/0` via the IGW; private routes `0.0.0.0/0` via the single
  NAT gateway.
- **Three security groups**, each scoped to exactly the traffic Pulsar needs:
  - `server` — ingress `8080/tcp` from the whole VPC CIDR (not the public internet).
  - `database` — ingress `5432/tcp` **only from the server security group** (not a CIDR block) —
    so only Pulsar server instances/pods can reach Postgres, by security group reference rather
    than IP range.
  - `cache` — ingress `6379/tcp` **only from the server security group**, same pattern.
  - All three allow unrestricted egress (`0.0.0.0/0`, all protocols) — standard for outbound
    package/registry/AWS-API access.

## Module: `database`

Resources (`terraform/modules/database/main.tf`), an RDS PostgreSQL instance:

| Setting | Value | Source |
|---|---|---|
| Engine | `postgres` 16 | hardcoded `engine_version = "16"` |
| Instance class | `db.r6g.large` (production default) | `pulsar_db_instance_class` variable, overridden to `db.r6g.large` in `environments/production/variables.tf` |
| Storage | `gp3`, `var.pulsar_db_allocated_storage` GB (default 100), encrypted at rest | `storage_encrypted = true` |
| Multi-AZ | `true` in production | `pulsar_db_multi_az` variable (module default `false`, production overrides to `true`) |
| Backup retention | `var.pulsar_db_backup_retention_days` (module default 7 days) | not overridden in the production env's variables — confirm actual `.tfvars` value before relying on the module default for a real deployment |
| Final snapshot | `skip_final_snapshot = false`, named `<prefix>-postgres-final` | protects against accidental data loss on `terraform destroy` |
| Deletion protection | `true` only when `pulsar_environment == "production"` | conditional expression in the resource itself |
| Credentials | `pulsar_db_username` (default `pulsar`), `pulsar_db_password` (required, `sensitive = true`, must come from `TF_VAR_pulsar_db_password` or a secrets manager — never hardcoded) | |

The module's comment on schema ownership: *"Flyway (run by pulsar-server on boot) owns schema
migrations"* — Terraform provisions the empty database instance; `pulsar-server`'s own Flyway
migrations create and evolve the schema on first boot against it. Terraform never runs SQL.

## Module: `cache`

Resources (`terraform/modules/cache/main.tf`), an ElastiCache Redis replication group:

| Setting | Value |
|---|---|
| Engine | Redis 7.1 |
| Node type | `cache.t4g.medium` (production default, per `pulsar_cache_node_type`) |
| Node count | `var.pulsar_cache_num_nodes` (module default 1 — a single-node replication group; scale this up for HA before treating Redis as anything other than a reclaimable cache/queue in production, since Pulsar's design already tolerates Redis data loss via `TaskTimeoutSweeper`, see [`operations-guide.md`](operations-guide.md)) |
| Encryption | At-rest and in-transit both enabled |
| Network | Own subnet group across the private subnets, security group restricted to the `server` SG only |

## EKS (defined directly in `environments/production/main.tf`)

Not a separate module — the cluster, node group, and their IAM roles are declared inline in the
production environment:

- **Cluster**: `aws_eks_cluster.pulsar`, named `pulsar-production`, Kubernetes version
  `var.pulsar_eks_cluster_version` (default `"1.30"`). VPC config spans both private and public
  subnets, with both private and public API server endpoint access enabled.
- **Cluster IAM role**: trusts `eks.amazonaws.com`, attached policy
  `AmazonEKSClusterPolicy`.
- **Managed node group**: `aws_eks_node_group.pulsar`, instance types
  `var.pulsar_eks_node_instance_types` (default `["m6i.large"]`), scaling config
  `desired_size=3, min_size=2, max_size=6` (all Terraform variables, independently adjustable from
  the Kubernetes-level HPA which scales *pods*, not *nodes* — see
  [`kubernetes-deployment.md`](kubernetes-deployment.md)), launched into private subnets only.
- **Node IAM role**: trusts `ec2.amazonaws.com`, attached policies
  `AmazonEKSWorkerNodePolicy`, `AmazonEKS_CNI_Policy`, `AmazonEC2ContainerRegistryReadOnly`.

## State management

`terraform/environments/production/main.tf`'s `terraform` block configures an S3 backend:

```hcl
backend "s3" {
  bucket         = "reelforge-pulsar-tfstate"
  key            = "environments/production/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "reelforge-pulsar-tflock"
  encrypt        = true
}
```

The bucket (with versioning enabled) and the DynamoDB lock table must already exist before the
first `terraform init` — Terraform doesn't bootstrap its own backend. Provider is pinned to
`hashicorp/aws ~> 5.60`, Terraform itself to `>= 1.6`.

## Outputs

`terraform/environments/production/outputs.tf` surfaces: `eks_cluster_name`,
`eks_cluster_endpoint`, `db_endpoint` (from the `database` module), `cache_primary_endpoint` (from
the `cache` module) — these are what you'd feed into `aws eks update-kubeconfig` and into
`pulsar-config`/`pulsar-secrets` values for the Kubernetes layer.

## Sizing rationale, as documented in the source

The variable descriptions themselves explain the sizing choices (not guessed — these are the
actual `description` fields in `variables.tf`):

- `db.r6g.large` — *"sized for steady workflow-execution write load without over-provisioning."*
- `cache.t4g.medium` — *"covers Pulsar's task-lease/queue caching without a dedicated cluster
  tier."*

Both read as right-sized-for-this-workload choices rather than arbitrary defaults — appropriate
for a workflow engine whose write load is bursty task-execution rows and whose Redis usage is
transient queue/lease state, not a high-throughput OLTP or a large in-memory dataset.

## Related documents

- [`deployment.md`](deployment.md) — how this infrastructure fits into the overall deploy sequence
- [`kubernetes-deployment.md`](kubernetes-deployment.md) — what runs on top of the EKS cluster
- [`ci-cd.md`](ci-cd.md) — the `terraform-plan.yml` workflow that reviews changes to this code
