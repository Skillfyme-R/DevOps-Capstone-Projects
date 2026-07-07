-- NexaFlow Logistics Platform — Initial Database Schema
-- Migration: 001_initial_schema
-- Description: Creates all core domain tables for shipments, warehouses,
--              inventory, fleet, orders, suppliers, and workflows.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- fast ILIKE text search
CREATE EXTENSION IF NOT EXISTS "postgis";     -- geospatial queries

-- ─────────────────────────────────────────────────────────────────────────────
-- Organizations (multi-tenant root)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE organizations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    plan          TEXT NOT NULL DEFAULT 'starter',  -- starter, professional, enterprise
    max_users     INT  NOT NULL DEFAULT 10,
    is_active     BOOL NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    first_name      TEXT,
    last_name       TEXT,
    role            TEXT NOT NULL DEFAULT 'operator',  -- admin, manager, operator, viewer
    is_active       BOOL NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- ─────────────────────────────────────────────────────────────────────────────
-- Warehouses
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE warehouses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    name                TEXT NOT NULL,
    code                TEXT NOT NULL,
    type                TEXT NOT NULL DEFAULT 'fulfillment',
    address_line_1      TEXT NOT NULL,
    address_line_2      TEXT,
    city                TEXT NOT NULL,
    state               TEXT,
    postal_code         TEXT,
    country             TEXT NOT NULL DEFAULT 'US',
    latitude            DECIMAL(9,6),
    longitude           DECIMAL(9,6),
    location            GEOGRAPHY(POINT, 4326),
    total_area_sq_m     DECIMAL(12,2),
    usable_area_sq_m    DECIMAL(12,2),
    max_weight_kg       DECIMAL(12,2),
    manager_id          UUID REFERENCES users(id),
    operating_hours     TEXT,
    is_active           BOOL NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, code)
);
CREATE INDEX idx_warehouses_org ON warehouses(organization_id);
CREATE INDEX idx_warehouses_location ON warehouses USING GIST(location);

-- ─────────────────────────────────────────────────────────────────────────────
-- Warehouse Zones
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE warehouse_zones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id    UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    zone_type       TEXT NOT NULL,
    area_sq_m       DECIMAL(10,2),
    max_items       INT,
    temperature_c   DECIMAL(5,2),
    is_active       BOOL NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_zones_warehouse ON warehouse_zones(warehouse_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Suppliers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    code            TEXT NOT NULL,
    tier            TEXT NOT NULL DEFAULT 'standard',
    category        TEXT NOT NULL DEFAULT 'distributor',
    contact_name    TEXT,
    contact_email   TEXT,
    contact_phone   TEXT,
    address_line_1  TEXT,
    city            TEXT,
    country         TEXT DEFAULT 'US',
    tax_id          TEXT,
    payment_terms   TEXT DEFAULT 'net_30',
    lead_time_days  INT  NOT NULL DEFAULT 7,
    rating_score    DECIMAL(3,2) NOT NULL DEFAULT 0,
    is_active       BOOL NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, code)
);
CREATE INDEX idx_suppliers_org ON suppliers(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Items
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE inventory_items (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    warehouse_id        UUID NOT NULL REFERENCES warehouses(id),
    zone_id             UUID REFERENCES warehouse_zones(id),
    product_id          TEXT NOT NULL,
    sku                 TEXT NOT NULL,
    name                TEXT NOT NULL,
    category            TEXT,
    quantity_on_hand    INT  NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved   INT  NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    quantity_available  INT  NOT NULL GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    reorder_point       INT  NOT NULL DEFAULT 10,
    reorder_qty         INT  NOT NULL DEFAULT 50,
    weight_kg           DECIMAL(10,3),
    volume_m3           DECIMAL(10,4),
    unit_cost_cents     BIGINT NOT NULL DEFAULT 0,
    currency            CHAR(3) NOT NULL DEFAULT 'USD',
    bin_location        TEXT,
    batch_number        TEXT,
    expiry_date         DATE,
    supplier_id         UUID REFERENCES suppliers(id),
    status              TEXT NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (warehouse_id, sku)
);
CREATE INDEX idx_inventory_org ON inventory_items(organization_id);
CREATE INDEX idx_inventory_warehouse ON inventory_items(warehouse_id);
CREATE INDEX idx_inventory_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_inventory_trgm_name ON inventory_items USING GIN(name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- Inventory Movements (immutable audit log)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE inventory_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventory_id    UUID NOT NULL REFERENCES inventory_items(id),
    movement_type   TEXT NOT NULL,
    quantity_delta  INT  NOT NULL,
    reference_id    TEXT,
    reference_type  TEXT,
    actor_id        UUID REFERENCES users(id),
    notes           TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_movements_inventory ON inventory_movements(inventory_id);
CREATE INDEX idx_movements_occurred ON inventory_movements(occurred_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Vehicles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE vehicles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    registration_no     TEXT NOT NULL UNIQUE,
    fleet_code          TEXT NOT NULL,
    make                TEXT NOT NULL,
    model               TEXT NOT NULL,
    year                SMALLINT NOT NULL,
    vehicle_type        TEXT NOT NULL DEFAULT 'truck',
    status              TEXT NOT NULL DEFAULT 'available',
    payload_capacity_kg DECIMAL(10,2) NOT NULL,
    volume_capacity_m3  DECIMAL(10,3),
    fuel_type           TEXT NOT NULL DEFAULT 'diesel',
    current_latitude    DECIMAL(9,6),
    current_longitude   DECIMAL(9,6),
    current_location    TEXT,
    assigned_depot_id   UUID REFERENCES warehouses(id),
    driver_id           UUID,
    last_service_at     TIMESTAMPTZ,
    next_service_at     TIMESTAMPTZ,
    odometer_km         DECIMAL(10,1) NOT NULL DEFAULT 0,
    is_active           BOOL NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vehicles_org ON vehicles(organization_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_fleet_code ON vehicles(fleet_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- Drivers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE drivers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    first_name          TEXT NOT NULL,
    last_name           TEXT NOT NULL,
    email               TEXT UNIQUE,
    phone               TEXT,
    license_number      TEXT NOT NULL,
    license_expiry      DATE NOT NULL,
    status              TEXT NOT NULL DEFAULT 'active',
    assigned_vehicle_id UUID REFERENCES vehicles(id),
    total_deliveries    INT  NOT NULL DEFAULT 0,
    rating_avg          DECIMAL(3,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_drivers_org ON drivers(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Shipments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE shipments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number     TEXT NOT NULL UNIQUE,
    organization_id     UUID NOT NULL REFERENCES organizations(id),
    order_id            UUID,
    status              TEXT NOT NULL DEFAULT 'pending',
    carrier_code        TEXT,
    service_level       TEXT DEFAULT 'standard',
    origin_warehouse_id UUID REFERENCES warehouses(id),
    destination_address TEXT NOT NULL,
    weight_kg           DECIMAL(10,3),
    volume_m3           DECIMAL(10,4),
    special_handling    TEXT,
    estimated_delivery  TIMESTAMPTZ,
    actual_delivery     TIMESTAMPTZ,
    vehicle_id          UUID REFERENCES vehicles(id),
    driver_id           UUID REFERENCES drivers(id),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_shipments_org ON shipments(organization_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_order ON shipments(order_id);
CREATE INDEX idx_shipments_created ON shipments(created_at DESC);
CREATE INDEX idx_shipments_trgm ON shipments USING GIN(tracking_number gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- Shipment Events (immutable tracking history)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE shipment_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    description TEXT,
    location    TEXT,
    actor_id    UUID REFERENCES users(id),
    metadata    JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_events_shipment ON shipment_events(shipment_id);
CREATE INDEX idx_events_occurred ON shipment_events(occurred_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id       UUID NOT NULL REFERENCES organizations(id),
    order_number          TEXT NOT NULL,
    customer_id           TEXT,
    customer_name         TEXT NOT NULL,
    customer_email        TEXT,
    status                TEXT NOT NULL DEFAULT 'draft',
    priority              TEXT NOT NULL DEFAULT 'standard',
    shipping_address      TEXT NOT NULL,
    billing_address       TEXT,
    line_items            JSONB NOT NULL DEFAULT '[]',
    subtotal_cents        BIGINT NOT NULL DEFAULT 0,
    shipping_cents        BIGINT NOT NULL DEFAULT 0,
    tax_cents             BIGINT NOT NULL DEFAULT 0,
    total_cents           BIGINT NOT NULL DEFAULT 0,
    currency              CHAR(3) NOT NULL DEFAULT 'USD',
    payment_method        TEXT,
    warehouse_id          UUID REFERENCES warehouses(id),
    shipment_id           UUID REFERENCES shipments(id),
    supplier_id           UUID REFERENCES suppliers(id),
    special_instructions  TEXT,
    required_by_date      TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, order_number)
);
CREATE INDEX idx_orders_org ON orders(organization_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_trgm ON orders USING GIN(order_number gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- Workflow Definitions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE workflow_definitions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name            TEXT NOT NULL,
    description     TEXT,
    trigger_type    TEXT NOT NULL DEFAULT 'manual',
    trigger_on      TEXT,
    steps           JSONB NOT NULL DEFAULT '[]',
    is_active       BOOL NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_workflows_org ON workflow_definitions(organization_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Workflow Executions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE workflow_executions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID NOT NULL REFERENCES workflow_definitions(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    status          TEXT NOT NULL DEFAULT 'running',
    current_step    INT  NOT NULL DEFAULT 0,
    step_results    JSONB NOT NULL DEFAULT '[]',
    context         JSONB NOT NULL DEFAULT '{}',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    error           TEXT
);
CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_org ON workflow_executions(organization_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
CREATE INDEX idx_executions_started ON workflow_executions(started_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-update triggers
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','users','warehouses','suppliers','inventory_items',
    'vehicles','drivers','shipments','orders','workflow_definitions'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: default organization and admin user (dev only)
-- Password hash is bcrypt of "nexaflow_admin" — CHANGE IN PRODUCTION
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'NexaFlow Demo Org', 'demo', 'enterprise');

INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, role)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'admin@nexaflow.io',
  '$2a$12$LRLIXXkOlOTREuQKTTn.MemE0hX5vl0.TnvpIomDc.vw3JW3rYrze',  -- "nexaflow_admin"
  'Platform', 'Admin', 'admin'
);

COMMIT;
