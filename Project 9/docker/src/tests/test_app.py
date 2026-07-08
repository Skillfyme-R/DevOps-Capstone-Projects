"""Unit tests for MediCart Healthcare API."""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


# ---------------------------------------------------------------------------
# Platform endpoints
# ---------------------------------------------------------------------------

def test_index_returns_platform_info(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "MediCart" in data["data"]["platform"]
    assert "version" in data["data"]
    assert "capabilities" in data["data"]


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_ready_endpoint(client):
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ready"


# ---------------------------------------------------------------------------
# Product catalog
# ---------------------------------------------------------------------------

def test_list_products_returns_all(client):
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data["data"]["total"] == 5


def test_list_products_filter_by_category(client):
    response = client.get("/api/v1/products?category=medicines")
    assert response.status_code == 200
    data = response.get_json()
    for product in data["data"]["products"]:
        assert product["category"] == "medicines"


def test_list_products_filter_rx(client):
    response = client.get("/api/v1/products?requires_prescription=true")
    assert response.status_code == 200
    data = response.get_json()
    for product in data["data"]["products"]:
        assert product["requires_prescription"] is True


def test_get_product_found(client):
    response = client.get("/api/v1/products/PROD-001")
    assert response.status_code == 200
    data = response.get_json()
    assert data["data"]["product"]["id"] == "PROD-001"


def test_get_product_not_found(client):
    response = client.get("/api/v1/products/PROD-999")
    assert response.status_code == 404
    data = response.get_json()
    assert data["status"] == "error"


# ---------------------------------------------------------------------------
# Inventory
# ---------------------------------------------------------------------------

def test_inventory_summary(client):
    response = client.get("/api/v1/inventory")
    assert response.status_code == 200
    data = response.get_json()
    assert "total_skus" in data["data"]
    assert "low_stock_count" in data["data"]
    assert data["data"]["total_skus"] == 5


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------

def test_list_orders(client):
    response = client.get("/api/v1/orders")
    assert response.status_code == 200
    data = response.get_json()
    assert data["data"]["total"] == 2


def test_get_order_found(client):
    response = client.get("/api/v1/orders/ORD-2024-00001")
    assert response.status_code == 200
    data = response.get_json()
    assert data["data"]["order"]["order_id"] == "ORD-2024-00001"


def test_get_order_not_found(client):
    response = client.get("/api/v1/orders/ORD-XXXX")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Shipment tracking
# ---------------------------------------------------------------------------

def test_track_shipment_found(client):
    response = client.get("/api/v1/shipments/MCTK-9283747")
    assert response.status_code == 200
    data = response.get_json()
    assert data["data"]["tracking_number"] == "MCTK-9283747"
    assert "events" in data["data"]


def test_track_shipment_not_found(client):
    response = client.get("/api/v1/shipments/INVALID-999")
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

def test_analytics_summary(client):
    response = client.get("/api/v1/analytics/summary")
    assert response.status_code == 200
    data = response.get_json()
    assert "total_orders" in data["data"]
    assert "total_revenue" in data["data"]
    assert len(data["data"]["top_categories"]) > 0


# ---------------------------------------------------------------------------
# Prescriptions
# ---------------------------------------------------------------------------

def test_list_prescriptions(client):
    response = client.get("/api/v1/prescriptions")
    assert response.status_code == 200
    data = response.get_json()
    assert data["data"]["total"] == 1


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------

def test_404_error_handler(client):
    response = client.get("/nonexistent-route")
    assert response.status_code == 404
    data = response.get_json()
    assert data["status"] == "error"
