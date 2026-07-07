from flask import Flask, jsonify, request
import socket
import os
import uuid
from datetime import datetime, timezone


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

app = Flask(__name__)

CATALOG = [
    {"id": "p001", "name": "Wireless Noise-Cancelling Headphones", "category": "Electronics", "price": 149.99, "stock": 120, "sku": "ELEC-WNC-001"},
    {"id": "p002", "name": "Ergonomic Office Chair", "category": "Furniture", "price": 299.00, "stock": 45, "sku": "FURN-EOC-002"},
    {"id": "p003", "name": "Stainless Steel Water Bottle 32oz", "category": "Kitchen", "price": 24.99, "stock": 300, "sku": "KTCN-SSW-003"},
    {"id": "p004", "name": "Running Shoes - CloudStride Pro", "category": "Footwear", "price": 89.99, "stock": 75, "sku": "FOOT-CSP-004"},
    {"id": "p005", "name": "4K Ultra HD Smart TV 55\"", "category": "Electronics", "price": 549.00, "stock": 20, "sku": "ELEC-4KT-005"},
]

ORDERS = []


@app.route("/")
def index():
    return jsonify({
        "service": "CartFlow Commerce API",
        "company": "CartFlow Inc.",
        "version": os.getenv("APP_VERSION", "2.0.0"),
        "hostname": socket.gethostname(),
        "environment": os.getenv("ENVIRONMENT", "production"),
        "timestamp": utcnow(),
        "endpoints": {
            "catalog": "/api/v1/products",
            "orders": "/api/v1/orders",
            "health": "/health",
            "metrics": "/metrics/summary",
        },
    })


@app.route("/health")
def health():
    return jsonify({
        "status": "healthy",
        "service": "cartflow-api",
        "version": os.getenv("APP_VERSION", "2.0.0"),
        "checks": {
            "api": "ok",
            "catalog": "ok",
            "orders": "ok",
        },
        "timestamp": utcnow(),
    }), 200


@app.route("/api/v1/products", methods=["GET"])
def list_products():
    category = request.args.get("category")
    min_price = request.args.get("min_price", type=float)
    max_price = request.args.get("max_price", type=float)
    in_stock = request.args.get("in_stock", type=lambda v: v.lower() == "true")

    results = CATALOG[:]
    if category:
        results = [p for p in results if p["category"].lower() == category.lower()]
    if min_price is not None:
        results = [p for p in results if p["price"] >= min_price]
    if max_price is not None:
        results = [p for p in results if p["price"] <= max_price]
    if in_stock:
        results = [p for p in results if p["stock"] > 0]

    return jsonify({
        "products": results,
        "total": len(results),
        "page": 1,
        "per_page": len(results),
    })


@app.route("/api/v1/products/<product_id>", methods=["GET"])
def get_product(product_id):
    product = next((p for p in CATALOG if p["id"] == product_id), None)
    if not product:
        return jsonify({"error": "Product not found", "product_id": product_id}), 404
    return jsonify(product)


@app.route("/api/v1/orders", methods=["POST"])
def create_order():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body is required"}), 400

    customer_email = body.get("customer_email")
    items = body.get("items", [])

    if not customer_email:
        return jsonify({"error": "customer_email is required"}), 422
    if not items:
        return jsonify({"error": "items must not be empty"}), 422

    order_items = []
    total = 0.0
    for item in items:
        pid = item.get("product_id")
        qty = item.get("quantity", 1)
        product = next((p for p in CATALOG if p["id"] == pid), None)
        if not product:
            return jsonify({"error": f"Product {pid} not found"}), 404
        if product["stock"] < qty:
            return jsonify({"error": f"Insufficient stock for product {pid}"}), 409
        line_total = product["price"] * qty
        order_items.append({
            "product_id": pid,
            "sku": product["sku"],
            "name": product["name"],
            "quantity": qty,
            "unit_price": product["price"],
            "line_total": round(line_total, 2),
        })
        total += line_total

    order = {
        "order_id": f"ORD-{uuid.uuid4().hex[:8].upper()}",
        "customer_email": customer_email,
        "items": order_items,
        "subtotal": round(total, 2),
        "tax": round(total * 0.08, 2),
        "total": round(total * 1.08, 2),
        "currency": "USD",
        "status": "confirmed",
        "created_at": utcnow(),
        "estimated_delivery": "3-5 business days",
    }
    ORDERS.append(order)
    return jsonify(order), 201


@app.route("/api/v1/orders", methods=["GET"])
def list_orders():
    customer_email = request.args.get("customer_email")
    results = ORDERS[:]
    if customer_email:
        results = [o for o in results if o["customer_email"] == customer_email]
    return jsonify({"orders": results, "total": len(results)})


@app.route("/api/v1/orders/<order_id>", methods=["GET"])
def get_order(order_id):
    order = next((o for o in ORDERS if o["order_id"] == order_id), None)
    if not order:
        return jsonify({"error": "Order not found", "order_id": order_id}), 404
    return jsonify(order)


@app.route("/metrics/summary")
def metrics_summary():
    total_revenue = sum(o["total"] for o in ORDERS)
    return jsonify({
        "platform": "CartFlow Commerce",
        "metrics": {
            "total_orders": len(ORDERS),
            "total_revenue_usd": round(total_revenue, 2),
            "catalog_size": len(CATALOG),
            "active_skus": len([p for p in CATALOG if p["stock"] > 0]),
            "low_stock_alerts": len([p for p in CATALOG if p["stock"] < 10]),
        },
        "generated_at": utcnow(),
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
