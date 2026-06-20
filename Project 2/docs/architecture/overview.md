# VendorVault Platform — Architecture Overview

## System Summary

VendorVault is an enterprise-grade multi-vendor marketplace platform built on a plugin-based monorepo architecture. It enables thousands of vendors to list and sell products while providing shoppers with a unified, secure, and high-performance buying experience.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     VendorVault Platform                            │
│                                                                     │
│  ┌──────────────┐    HTTPS     ┌──────────────────────────────┐    │
│  │   Shopper /  │──────────────│        AWS CloudFront        │    │
│  │ Vendor Browser│             │     (CDN + DDoS protection)  │    │
│  └──────────────┘             └─────────────┬────────────────┘    │
│                                              │                      │
│                              ┌───────────────┴──────────────┐      │
│                              │       AWS ALB / Nginx        │      │
│                              └───────┬───────────┬──────────┘      │
│                                      │           │                  │
│                    ┌─────────────────┐   ┌───────────────────┐     │
│                    │  Frontend (React)│   │  Backend API      │     │
│                    │  Nginx + SPA    │   │  Express/Node.js  │     │
│                    │  Port 3000/80   │   │  Port 8008        │     │
│                    └─────────────────┘   └────────┬──────────┘     │
│                                                   │                │
│                         ┌─────────────────────────┼──────────┐    │
│                         │         Backend Plugins             │    │
│                         │  auth | catalog | cart | orders |  │    │
│                         │  vendors | payments | analytics |  │    │
│                         │  wishlist | audit | health         │    │
│                         └─────────────────────────┬──────────┘    │
│                                                   │                │
│            ┌──────────────┬───────────────────────┴──────────┐    │
│            │              │                                   │    │
│     ┌──────▼──────┐ ┌─────▼──────┐           ┌─────────────┐ │    │
│     │ PostgreSQL  │ │   Redis    │           │Elasticsearch│ │    │
│     │  (Primary   │ │ (Cache +   │           │ (Product    │ │    │
│     │  Database)  │ │ Sessions + │           │  Search)    │ │    │
│     │  AWS RDS    │ │  Rate Limit│           │             │ │    │
│     │  Multi-AZ)  │ │  ElastiCache│          │             │ │    │
│     └─────────────┘ └────────────┘           └─────────────┘ │    │
│                                                               │    │
└───────────────────────────────────────────────────────────────┘    │
```

## Core Design Decisions

### 1. Plugin Architecture
Each business domain is a self-contained plugin (`/packages/backend/src/plugins/*`). Plugins are independently testable, deployable as separate microservices if needed, and follow a consistent interface pattern (routes factory function + Router).

### 2. Multi-Vendor Cart
Cart items maintain `vendor_id` linkage, allowing a single order to span multiple vendors. On checkout, order items are grouped per vendor for fulfillment and payout routing.

### 3. Cache-First Reads
All expensive queries (product catalog pages, vendor profiles, analytics aggregations) are cached in Redis with appropriate TTLs. Cache invalidation is targeted (by key), not broad cache flushes.

### 4. Stripe Connect for Payouts
Platform uses Stripe Connect to enable vendor payouts. A platform commission (`commissionRate: 12%`) is deducted before payouts. Payouts are scheduled `vendorPayoutDelay: 7 days` after order delivery.

### 5. Horizontal Scalability
Backend is stateless — JWT-based auth, no in-process session storage. All state is in PostgreSQL or Redis, enabling unlimited horizontal scaling with the Kubernetes HPA (3–20 replicas based on CPU/memory).

## Component Inventory

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| Frontend  | React 18, MUI v5, Zustand | 3000 | Marketplace UI, Vendor Dashboard |
| Backend   | Express, TypeScript, Node.js 18 | 8008 | REST API, Business Logic |
| Database  | PostgreSQL 15 | 5433 | Persistent data store |
| Cache     | Redis 7 | 6381 | Sessions, cart, catalog cache, rate limiting |
| Search    | Elasticsearch 8 | 9200 | Full-text product search |
| Metrics   | Prometheus + Grafana | 9090/4000 | Observability |
| Container | Docker + Kubernetes (EKS) | — | Container orchestration |
| CDN       | AWS CloudFront | — | Static asset delivery |
| Storage   | AWS S3 | — | Product images, exports |
| Payments  | Stripe + Stripe Connect | — | Marketplace payments & payouts |

## Data Flow: Customer Checkout

```
1. Shopper adds item to cart
   → POST /api/v1/cart/items
   → Validates stock, upserts vv_cart_items

2. Shopper views cart
   → GET /api/v1/cart
   → Aggregates vv_cart_items with product prices

3. Shopper applies coupon
   → POST /api/v1/cart/coupon
   → Validates vv_coupons (active, not expired, usage limit)

4. Shopper places order
   → POST /api/v1/orders
   → DB transaction:
      a. Creates vv_orders record
      b. Creates vv_order_items per vendor
      c. Decrements vv_products.stock
      d. Marks cart as checked_out

5. Payment confirmation
   → Stripe webhook → POST /api/v1/payments/webhook
   → Updates vv_orders.status = 'confirmed'
   → Schedules vendor payout (vv_vendor_payouts)

6. Vendor ships order
   → PATCH /api/v1/orders/:id/ship
   → Creates vv_shipments with tracking info
   → Notifies customer via email (SendGrid)

7. Order delivered
   → Webhook from FedEx/UPS/DHL
   → Updates vv_shipments.status = 'delivered'
   → Triggers vendor payout release
```

## Security Architecture

- **JWT Authentication**: HS256, 7-day tokens with Redis revocation list
- **RBAC**: customer | vendor | admin roles enforced at middleware level
- **Rate Limiting**: Redis-backed, 120 req/min per user (60 for unauthenticated)
- **Input Validation**: Joi schemas on every mutation endpoint
- **SQL Injection**: Parameterized queries via Knex (no string interpolation)
- **HTTPS**: TLS termination at ALB, HSTS headers, forced redirect
- **CSP Headers**: Strict Content Security Policy via Helmet.js
- **Secrets**: Never hardcoded; environment variables + AWS Secrets Manager in production
- **Container Security**: Non-root user (UID 1001), read-only filesystem, no privileged mode
- **Dependency Scanning**: `yarn audit` in CI, Trivy filesystem scan
