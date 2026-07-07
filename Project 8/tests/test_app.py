import sys
import pytest
sys.path.insert(0, "./app")
from app import app, ORDERS, CATALOG


@pytest.fixture(autouse=True)
def clear_orders():
    ORDERS.clear()
    yield
    ORDERS.clear()


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ──────────────────────────────────────────────
# Root / index
# ──────────────────────────────────────────────

def test_index_returns_200(client):
    res = client.get("/")
    assert res.status_code == 200


def test_index_contains_service_name(client):
    data = client.get("/").get_json()
    assert data["service"] == "CartFlow Commerce API"
    assert data["company"] == "CartFlow Inc."


def test_index_contains_endpoints_map(client):
    data = client.get("/").get_json()
    assert "endpoints" in data
    assert "catalog" in data["endpoints"]
    assert "health" in data["endpoints"]


# ──────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────

def test_health_returns_200(client):
    res = client.get("/health")
    assert res.status_code == 200


def test_health_status_is_healthy(client):
    data = client.get("/health").get_json()
    assert data["status"] == "healthy"
    assert data["checks"]["api"] == "ok"


# ──────────────────────────────────────────────
# Product catalog
# ──────────────────────────────────────────────

def test_list_products_returns_all(client):
    data = client.get("/api/v1/products").get_json()
    assert data["total"] == len(CATALOG)
    assert len(data["products"]) == len(CATALOG)


def test_list_products_filter_by_category(client):
    data = client.get("/api/v1/products?category=Electronics").get_json()
    for p in data["products"]:
        assert p["category"] == "Electronics"


def test_list_products_filter_by_price_range(client):
    data = client.get("/api/v1/products?min_price=50&max_price=200").get_json()
    for p in data["products"]:
        assert 50 <= p["price"] <= 200


def test_list_products_filter_in_stock(client):
    data = client.get("/api/v1/products?in_stock=true").get_json()
    for p in data["products"]:
        assert p["stock"] > 0


def test_get_product_by_id(client):
    res = client.get("/api/v1/products/p001")
    assert res.status_code == 200
    assert res.get_json()["id"] == "p001"


def test_get_product_not_found(client):
    res = client.get("/api/v1/products/p999")
    assert res.status_code == 404
    assert "error" in res.get_json()


# ──────────────────────────────────────────────
# Order management
# ──────────────────────────────────────────────

def _place_order(client, email="buyer@cartflow.io", product_id="p001", qty=1):
    return client.post(
        "/api/v1/orders",
        json={"customer_email": email, "items": [{"product_id": product_id, "quantity": qty}]},
        content_type="application/json",
    )


def test_create_order_returns_201(client):
    res = _place_order(client)
    assert res.status_code == 201


def test_create_order_response_shape(client):
    data = _place_order(client).get_json()
    assert data["order_id"].startswith("ORD-")
    assert data["status"] == "confirmed"
    assert data["currency"] == "USD"
    assert "total" in data
    assert "items" in data


def test_create_order_calculates_tax(client):
    data = _place_order(client, product_id="p003").get_json()
    expected_tax = round(data["subtotal"] * 0.08, 2)
    assert data["tax"] == expected_tax
    assert data["total"] == round(data["subtotal"] + expected_tax, 2)


def test_create_order_missing_email(client):
    res = client.post(
        "/api/v1/orders",
        json={"items": [{"product_id": "p001", "quantity": 1}]},
        content_type="application/json",
    )
    assert res.status_code == 422


def test_create_order_empty_items(client):
    res = client.post(
        "/api/v1/orders",
        json={"customer_email": "test@cartflow.io", "items": []},
        content_type="application/json",
    )
    assert res.status_code == 422


def test_create_order_invalid_product(client):
    res = client.post(
        "/api/v1/orders",
        json={"customer_email": "test@cartflow.io", "items": [{"product_id": "p999", "quantity": 1}]},
        content_type="application/json",
    )
    assert res.status_code == 404


def test_create_order_no_body(client):
    res = client.post("/api/v1/orders", content_type="application/json")
    assert res.status_code == 400


def test_list_orders_returns_placed_orders(client):
    _place_order(client)
    _place_order(client)
    data = client.get("/api/v1/orders").get_json()
    assert data["total"] == 2


def test_list_orders_filter_by_email(client):
    _place_order(client, email="alice@cartflow.io")
    _place_order(client, email="bob@cartflow.io")
    data = client.get("/api/v1/orders?customer_email=alice@cartflow.io").get_json()
    assert data["total"] == 1
    assert data["orders"][0]["customer_email"] == "alice@cartflow.io"


def test_get_order_by_id(client):
    created = _place_order(client).get_json()
    order_id = created["order_id"]
    res = client.get(f"/api/v1/orders/{order_id}")
    assert res.status_code == 200
    assert res.get_json()["order_id"] == order_id


def test_get_order_not_found(client):
    res = client.get("/api/v1/orders/ORD-NOTEXIST")
    assert res.status_code == 404


# ──────────────────────────────────────────────
# Metrics summary
# ──────────────────────────────────────────────

def test_metrics_summary_returns_200(client):
    assert client.get("/metrics/summary").status_code == 200


def test_metrics_summary_after_orders(client):
    _place_order(client, product_id="p001")
    _place_order(client, product_id="p003")
    data = client.get("/metrics/summary").get_json()
    assert data["metrics"]["total_orders"] == 2
    assert data["metrics"]["total_revenue_usd"] > 0
    assert data["metrics"]["catalog_size"] == len(CATALOG)
