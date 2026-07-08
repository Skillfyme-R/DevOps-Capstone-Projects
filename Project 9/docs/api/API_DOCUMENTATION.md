# MediCart Platform — API Documentation

**Base URL:** `https://api.medicart.health`
**Version:** v1
**Format:** JSON
**Authentication:** Bearer JWT (production)

---

## Response Format

All endpoints return a consistent JSON envelope:

```json
{
  "status": "success | error",
  "request_id": "uuid-v4",
  "data": { ... }
}
```

Error responses:
```json
{
  "status": "error",
  "request_id": "uuid-v4",
  "message": "Human-readable error message"
}
```

---

## Endpoints

### Platform

#### GET /
Returns platform information.

**Response:**
```json
{
  "status": "success",
  "data": {
    "platform": "MediCart Healthcare Platform",
    "company": "MediCart Health Technologies Pvt. Ltd.",
    "version": "1.0.0",
    "environment": "prod",
    "region": "us-east-1",
    "tagline": "Your Trusted Healthcare Marketplace",
    "capabilities": ["product-catalog", "inventory-management", "prescription-ordering", "order-management", "shipment-tracking", "analytics"]
  }
}
```

#### GET /health
Kubernetes liveness probe.

**Response (200):**
```json
{ "status": "healthy", "platform": "MediCart Healthcare Platform", "version": "1.0.0", "timestamp": 1720000000 }
```

#### GET /ready
Kubernetes readiness probe.

**Response (200):**
```json
{ "status": "ready", "environment": "prod", "timestamp": 1720000000 }
```

---

### Products

#### GET /api/v1/products

List products with optional filtering.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter by category: `medicines`, `equipment`, `ppe`, `supplements` |
| `requires_prescription` | boolean | Filter by prescription requirement |

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "products": [
      {
        "id": "PROD-001",
        "name": "Paracetamol 500mg Tablets",
        "category": "medicines",
        "sub_category": "analgesics",
        "sku": "MED-PCM-500-30",
        "price": 45.00,
        "currency": "INR",
        "unit": "strip of 10",
        "stock": 1200,
        "requires_prescription": false,
        "manufacturer": "MediCore Pharma",
        "rating": 4.7
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 5
  }
}
```

#### GET /api/v1/products/{product_id}

Get a single product by ID.

**Path Parameters:** `product_id` (string, e.g. `PROD-001`)

**Response (200):** Product object inside `data.product`.
**Response (404):** Error — product not found.

---

### Inventory

#### GET /api/v1/inventory

Returns inventory summary including low-stock alerts.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "total_skus": 5,
    "low_stock_count": 1,
    "low_stock_items": [
      { "id": "PROD-002", "name": "Digital Glucometer Kit", "stock": 85 }
    ],
    "warehouse": "MediCart Central Warehouse, Mumbai"
  }
}
```

---

### Orders

#### GET /api/v1/orders

List all orders.

#### GET /api/v1/orders/{order_id}

Get order by ID. Returns `404` if not found.

**Sample Order:**
```json
{
  "order_id": "ORD-2024-00001",
  "customer_id": "CUST-1001",
  "status": "delivered",
  "total": 1388.50,
  "currency": "INR",
  "items": [
    { "product_id": "PROD-001", "quantity": 3 },
    { "product_id": "PROD-005", "quantity": 1 }
  ],
  "created_at": "2024-06-01T10:30:00Z"
}
```

---

### Shipment Tracking

#### GET /api/v1/shipments/{tracking_number}

Track a shipment by tracking number.

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "tracking_number": "MCTK-9283747",
    "carrier": "MediCart Express Logistics",
    "status": "in_transit",
    "estimated_delivery": "2024-06-07",
    "events": [
      { "timestamp": "2024-06-05T12:00:00Z", "location": "Mumbai Warehouse", "event": "Dispatched" }
    ]
  }
}
```

---

### Analytics

#### GET /api/v1/analytics/summary

Returns 30-day sales and operational analytics.

---

### Prescriptions

#### GET /api/v1/prescriptions

List digital prescriptions associated with the platform.

---

## Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad request |
| 404 | Resource not found |
| 405 | Method not allowed |
| 500 | Internal server error |

---

## Rate Limiting

Production API is protected by AWS WAF v2:
- **2,000 requests per 5-minute window per IP**
- Exceeding the limit returns HTTP 403

---

*MediCart API v1 — For developer support: api-support@medicart.health*
