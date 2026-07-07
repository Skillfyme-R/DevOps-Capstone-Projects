package dao

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// InventoryItem represents stock held at a specific warehouse location.
type InventoryItem struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	WarehouseID    string    `json:"warehouse_id"`
	ZoneID         string    `json:"zone_id,omitempty"`
	ProductID      string    `json:"product_id"`
	SKU            string    `json:"sku"`
	Name           string    `json:"name"`
	Category       string    `json:"category"`
	QuantityOnHand int       `json:"quantity_on_hand"`
	QuantityReserved int     `json:"quantity_reserved"`
	QuantityAvailable int    `json:"quantity_available"`
	ReorderPoint   int       `json:"reorder_point"`
	ReorderQty     int       `json:"reorder_qty"`
	WeightKg       float64   `json:"weight_kg"`
	VolumeM3       float64   `json:"volume_m3"`
	UnitCostCents  int64     `json:"unit_cost_cents"`
	Currency       string    `json:"currency"`
	BinLocation    string    `json:"bin_location,omitempty"`
	BatchNumber    string    `json:"batch_number,omitempty"`
	ExpiryDate     *time.Time `json:"expiry_date,omitempty"`
	SupplierID     string    `json:"supplier_id,omitempty"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// InventoryMovement tracks every stock movement (receipt, pick, transfer, adjustment).
type InventoryMovement struct {
	ID            string    `json:"id"`
	InventoryID   string    `json:"inventory_id"`
	MovementType  string    `json:"movement_type"` // receipt, pick, transfer_in, transfer_out, adjustment, return
	QuantityDelta int       `json:"quantity_delta"`
	ReferencID    string    `json:"reference_id,omitempty"`
	ReferenceType string    `json:"reference_type,omitempty"` // order, shipment, po, manual
	ActorID       string    `json:"actor_id,omitempty"`
	Notes         string    `json:"notes,omitempty"`
	OccurredAt    time.Time `json:"occurred_at"`
}

// InventoryDAO handles stock persistence and movement recording.
type InventoryDAO struct {
	db *sql.DB
}

func NewInventoryDAO(db *sql.DB) *InventoryDAO {
	return &InventoryDAO{db: db}
}

func (d *InventoryDAO) Create(ctx context.Context, item *InventoryItem) (*InventoryItem, error) {
	item.ID = uuid.New().String()
	item.CreatedAt = time.Now().UTC()
	item.UpdatedAt = item.CreatedAt
	item.QuantityAvailable = item.QuantityOnHand - item.QuantityReserved
	if item.Currency == "" {
		item.Currency = "USD"
	}
	if item.Status == "" {
		item.Status = "active"
	}

	_, err := d.db.ExecContext(ctx, `
		INSERT INTO inventory_items
		(id, organization_id, warehouse_id, zone_id, product_id, sku, name, category,
		 quantity_on_hand, quantity_reserved, quantity_available, reorder_point, reorder_qty,
		 weight_kg, volume_m3, unit_cost_cents, currency, bin_location, batch_number,
		 expiry_date, supplier_id, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
		item.ID, item.OrganizationID, item.WarehouseID, item.ZoneID, item.ProductID,
		item.SKU, item.Name, item.Category, item.QuantityOnHand, item.QuantityReserved,
		item.QuantityAvailable, item.ReorderPoint, item.ReorderQty, item.WeightKg,
		item.VolumeM3, item.UnitCostCents, item.Currency, item.BinLocation,
		item.BatchNumber, item.ExpiryDate, item.SupplierID, item.Status,
		item.CreatedAt, item.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating inventory item: %w", err)
	}
	return item, nil
}

// AdjustQuantity applies a stock movement atomically within a transaction.
func (d *InventoryDAO) AdjustQuantity(ctx context.Context, itemID string, delta int, movementType, referenceID, referenceType, actorID, notes string) error {
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}

	var current int
	if err := tx.QueryRowContext(ctx,
		"SELECT quantity_on_hand FROM inventory_items WHERE id=$1 FOR UPDATE", itemID,
	).Scan(&current); err != nil {
		tx.Rollback() //nolint:errcheck
		return fmt.Errorf("locking inventory item: %w", err)
	}

	newQty := current + delta
	if newQty < 0 {
		tx.Rollback() //nolint:errcheck
		return fmt.Errorf("insufficient stock: current=%d, requested_delta=%d", current, delta)
	}

	now := time.Now().UTC()
	status := "active"
	if newQty == 0 {
		status = "out_of_stock"
	} else if newQty <= 10 {
		status = "low_stock"
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE inventory_items SET
		quantity_on_hand=$1,
		quantity_available=(quantity_on_hand + $2 - quantity_reserved),
		status=$3, updated_at=$4
		WHERE id=$5`, newQty, delta, status, now, itemID,
	); err != nil {
		tx.Rollback() //nolint:errcheck
		return fmt.Errorf("updating stock quantity: %w", err)
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO inventory_movements
		(id, inventory_id, movement_type, quantity_delta, reference_id, reference_type, actor_id, notes, occurred_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		uuid.New().String(), itemID, movementType, delta, referenceID, referenceType, actorID, notes, now,
	); err != nil {
		tx.Rollback() //nolint:errcheck
		return fmt.Errorf("recording movement: %w", err)
	}

	return tx.Commit()
}

// LowStockItems returns all items at or below their reorder point for an org.
func (d *InventoryDAO) LowStockItems(ctx context.Context, orgID string) ([]*InventoryItem, error) {
	rows, err := d.db.QueryContext(ctx, `
		SELECT id, organization_id, warehouse_id, zone_id, product_id, sku, name,
		category, quantity_on_hand, quantity_reserved, quantity_available,
		reorder_point, reorder_qty, weight_kg, volume_m3, unit_cost_cents,
		currency, bin_location, batch_number, expiry_date, supplier_id,
		status, created_at, updated_at
		FROM inventory_items
		WHERE organization_id=$1 AND quantity_on_hand <= reorder_point
		ORDER BY (reorder_point - quantity_on_hand) DESC`, orgID,
	)
	if err != nil {
		return nil, fmt.Errorf("listing low-stock items: %w", err)
	}
	defer rows.Close()

	var items []*InventoryItem
	for rows.Next() {
		var item InventoryItem
		if err := rows.Scan(
			&item.ID, &item.OrganizationID, &item.WarehouseID, &item.ZoneID,
			&item.ProductID, &item.SKU, &item.Name, &item.Category,
			&item.QuantityOnHand, &item.QuantityReserved, &item.QuantityAvailable,
			&item.ReorderPoint, &item.ReorderQty, &item.WeightKg, &item.VolumeM3,
			&item.UnitCostCents, &item.Currency, &item.BinLocation, &item.BatchNumber,
			&item.ExpiryDate, &item.SupplierID, &item.Status, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, &item)
	}
	return items, rows.Err()
}
