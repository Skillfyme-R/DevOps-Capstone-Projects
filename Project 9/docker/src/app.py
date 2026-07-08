"""
MediCart Healthcare E-Commerce Platform — REST API
Company: MediCart Health Technologies Pvt. Ltd.
Product: MediCart SaaS Platform
"""
from flask import Flask, jsonify, request
import os
import logging
import time
import uuid

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("medicart")

app = Flask(__name__)

APP_VERSION = os.getenv("APP_VERSION", "1.0.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
PLATFORM_NAME = "MediCart Healthcare Platform"
COMPANY = "MediCart Health Technologies Pvt. Ltd."

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _request_id() -> str:
    return request.headers.get("X-Request-Id", str(uuid.uuid4()))


def _success(data: dict, status: int = 200):
    return jsonify({"status": "success", "request_id": _request_id(), "data": data}), status


def _error(message: str, status: int = 400):
    return jsonify({"status": "error", "request_id": _request_id(), "message": message}), status


# ---------------------------------------------------------------------------
# Platform Information
# ---------------------------------------------------------------------------

@app.route("/", methods=["GET"])
def index():
    return _success({
        "platform": PLATFORM_NAME,
        "company": COMPANY,
        "version": APP_VERSION,
        "environment": ENVIRONMENT,
        "region": AWS_REGION,
        "tagline": "Your Trusted Healthcare Marketplace",
        "capabilities": [
            "product-catalog",
            "inventory-management",
            "prescription-ordering",
            "order-management",
            "shipment-tracking",
            "analytics",
        ],
    })


# ---------------------------------------------------------------------------
# Health & Readiness
# ---------------------------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "platform": PLATFORM_NAME,
        "version": APP_VERSION,
        "timestamp": int(time.time()),
    }), 200


@app.route("/ready", methods=["GET"])
def ready():
    return jsonify({
        "status": "ready",
        "environment": ENVIRONMENT,
        "timestamp": int(time.time()),
    }), 200


# ---------------------------------------------------------------------------
# Product Catalog
# ---------------------------------------------------------------------------

SAMPLE_PRODUCTS = [
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
        "requires_prescription": False,
        "manufacturer": "MediCore Pharma",
        "rating": 4.7,
    },
    {
        "id": "PROD-002",
        "name": "Digital Glucometer Kit",
        "category": "equipment",
        "sub_category": "diagnostics",
        "sku": "EQP-GLU-KIT-01",
        "price": 1299.00,
        "currency": "INR",
        "unit": "unit",
        "stock": 85,
        "requires_prescription": False,
        "manufacturer": "CareDiag Systems",
        "rating": 4.5,
    },
    {
        "id": "PROD-003",
        "name": "Amoxicillin 250mg Capsules",
        "category": "medicines",
        "sub_category": "antibiotics",
        "sku": "MED-AMX-250-10",
        "price": 89.50,
        "currency": "INR",
        "unit": "strip of 10",
        "stock": 640,
        "requires_prescription": True,
        "manufacturer": "MediCore Pharma",
        "rating": 4.6,
    },
    {
        "id": "PROD-004",
        "name": "N95 Respirator Mask",
        "category": "ppe",
        "sub_category": "respiratory",
        "sku": "PPE-N95-BOX-20",
        "price": 299.00,
        "currency": "INR",
        "unit": "box of 20",
        "stock": 500,
        "requires_prescription": False,
        "manufacturer": "SafeGuard Medical",
        "rating": 4.8,
    },
    {
        "id": "PROD-005",
        "name": "Vitamin D3 + K2 Softgels",
        "category": "supplements",
        "sub_category": "vitamins",
        "sku": "SUP-VD3K2-60",
        "price": 549.00,
        "currency": "INR",
        "unit": "bottle of 60",
        "stock": 320,
        "requires_prescription": False,
        "manufacturer": "NutriHealth Labs",
        "rating": 4.9,
    },
]


@app.route("/api/v1/products", methods=["GET"])
def list_products():
    category = request.args.get("category")
    requires_rx = request.args.get("requires_prescription")
    results = SAMPLE_PRODUCTS

    if category:
        results = [p for p in results if p["category"] == category]
    if requires_rx is not None:
        rx_bool = requires_rx.lower() == "true"
        results = [p for p in results if p["requires_prescription"] == rx_bool]

    logger.info("Product catalog requested — returned %d items", len(results))
    return _success({
        "products": results,
        "total": len(results),
        "page": 1,
        "page_size": len(results),
    })


@app.route("/api/v1/products/<product_id>", methods=["GET"])
def get_product(product_id: str):
    product = next((p for p in SAMPLE_PRODUCTS if p["id"] == product_id), None)
    if not product:
        return _error(f"Product '{product_id}' not found", 404)
    return _success({"product": product})


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------

@app.route("/api/v1/inventory", methods=["GET"])
def inventory_summary():
    total_skus = len(SAMPLE_PRODUCTS)
    low_stock = [p for p in SAMPLE_PRODUCTS if p["stock"] < 100]
    return _success({
        "total_skus": total_skus,
        "low_stock_count": len(low_stock),
        "low_stock_items": [{"id": p["id"], "name": p["name"], "stock": p["stock"]} for p in low_stock],
        "warehouse": "MediCart Central Warehouse, Mumbai",
    })


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

SAMPLE_ORDERS = [
    {
        "order_id": "ORD-2024-00001",
        "customer_id": "CUST-1001",
        "status": "delivered",
        "total": 1388.50,
        "currency": "INR",
        "items": [
            {"product_id": "PROD-001", "quantity": 3},
            {"product_id": "PROD-005", "quantity": 1},
        ],
        "created_at": "2024-06-01T10:30:00Z",
        "delivered_at": "2024-06-03T14:20:00Z",
    },
    {
        "order_id": "ORD-2024-00002",
        "customer_id": "CUST-1042",
        "status": "shipped",
        "total": 299.00,
        "currency": "INR",
        "items": [{"product_id": "PROD-004", "quantity": 1}],
        "created_at": "2024-06-05T09:00:00Z",
        "tracking_number": "MCTK-9283747",
    },
]


@app.route("/api/v1/orders", methods=["GET"])
def list_orders():
    return _success({
        "orders": SAMPLE_ORDERS,
        "total": len(SAMPLE_ORDERS),
    })


@app.route("/api/v1/orders/<order_id>", methods=["GET"])
def get_order(order_id: str):
    order = next((o for o in SAMPLE_ORDERS if o["order_id"] == order_id), None)
    if not order:
        return _error(f"Order '{order_id}' not found", 404)
    return _success({"order": order})


# ---------------------------------------------------------------------------
# Shipment Tracking
# ---------------------------------------------------------------------------

@app.route("/api/v1/shipments/<tracking_number>", methods=["GET"])
def track_shipment(tracking_number: str):
    if tracking_number == "MCTK-9283747":
        return _success({
            "tracking_number": tracking_number,
            "carrier": "MediCart Express Logistics",
            "status": "in_transit",
            "estimated_delivery": "2024-06-07",
            "events": [
                {"timestamp": "2024-06-05T12:00:00Z", "location": "Mumbai Warehouse", "event": "Dispatched"},
                {"timestamp": "2024-06-05T18:30:00Z", "location": "Mumbai Hub", "event": "In Transit"},
                {"timestamp": "2024-06-06T08:00:00Z", "location": "Delhi Hub", "event": "Arrived at Hub"},
            ],
        })
    return _error(f"Tracking number '{tracking_number}' not found", 404)


# ---------------------------------------------------------------------------
# Analytics Dashboard
# ---------------------------------------------------------------------------

@app.route("/api/v1/analytics/summary", methods=["GET"])
def analytics_summary():
    return _success({
        "period": "last_30_days",
        "total_orders": 1248,
        "total_revenue": 2847392.50,
        "currency": "INR",
        "avg_order_value": 2281.56,
        "new_customers": 342,
        "returning_customers": 906,
        "top_categories": [
            {"category": "medicines", "orders": 680, "revenue": 1523400.00},
            {"category": "equipment", "orders": 210, "revenue": 789300.00},
            {"category": "supplements", "orders": 198, "revenue": 342182.50},
            {"category": "ppe", "orders": 160, "revenue": 192510.00},
        ],
        "prescription_orders_pct": 28.5,
    })


# ---------------------------------------------------------------------------
# Prescription Management
# ---------------------------------------------------------------------------

@app.route("/api/v1/prescriptions", methods=["GET"])
def list_prescriptions():
    return _success({
        "prescriptions": [
            {
                "prescription_id": "RX-2024-0001",
                "customer_id": "CUST-1001",
                "doctor": "Dr. Priya Nair",
                "issued_date": "2024-05-28",
                "expiry_date": "2024-08-28",
                "status": "verified",
                "medicines": [
                    {"name": "Amoxicillin 250mg", "dosage": "3x daily", "duration": "7 days"},
                ],
            }
        ],
        "total": 1,
    })


# ---------------------------------------------------------------------------
# Error Handlers
# ---------------------------------------------------------------------------

@app.errorhandler(404)
def not_found(e):
    return _error("Resource not found", 404)


@app.errorhandler(405)
def method_not_allowed(e):
    return _error("Method not allowed", 405)


@app.errorhandler(500)
def internal_error(e):
    logger.error("Internal server error: %s", str(e))
    return _error("Internal server error", 500)


if __name__ == "__main__":  # pragma: no cover
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_PORT", "8080"))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    logger.info("Starting %s v%s on %s:%d [%s]", PLATFORM_NAME, APP_VERSION, host, port, ENVIRONMENT)
    app.run(host=host, port=port, debug=debug)
