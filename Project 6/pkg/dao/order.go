package dao

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nexaflow-io/nexaflow/pkg/consts"
)

// Order represents a customer purchase that drives fulfilment and shipment creation.
type Order struct {
	ID              string      `json:"id"`
	OrganizationID  string      `json:"organization_id"`
	OrderNumber     string      `json:"order_number"`
	CustomerID      string      `json:"customer_id"`
	CustomerName    string      `json:"customer_name"`
	CustomerEmail   string      `json:"customer_email"`
	Status          string      `json:"status"`
	Priority        string      `json:"priority"` // standard, express, same_day, economy
	ShippingAddress string      `json:"shipping_address"`
	BillingAddress  string      `json:"billing_address,omitempty"`
	LineItems       []LineItem  `json:"line_items"`
	SubtotalCents   int64       `json:"subtotal_cents"`
	ShippingCents   int64       `json:"shipping_cents"`
	TaxCents        int64       `json:"tax_cents"`
	TotalCents      int64       `json:"total_cents"`
	Currency        string      `json:"currency"`
	PaymentMethod   string      `json:"payment_method,omitempty"`
	WarehouseID     string      `json:"warehouse_id,omitempty"`
	ShipmentID      string      `json:"shipment_id,omitempty"`
	SupplierID      string      `json:"supplier_id,omitempty"`
	SpecialInstructions string  `json:"special_instructions,omitempty"`
	RequiredByDate  *time.Time  `json:"required_by_date,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

// LineItem represents a single product line within an order.
type LineItem struct {
	ProductID   string  `json:"product_id"`
	SKU         string  `json:"sku"`
	Name        string  `json:"name"`
	Quantity    int     `json:"quantity"`
	UnitCents   int64   `json:"unit_price_cents"`
	TotalCents  int64   `json:"total_price_cents"`
	WeightKg    float64 `json:"weight_kg"`
}

// OrderDAO handles order persistence.
type OrderDAO struct {
	db *sql.DB
}

func NewOrderDAO(db *sql.DB) *OrderDAO {
	return &OrderDAO{db: db}
}

func (d *OrderDAO) Create(ctx context.Context, o *Order) (*Order, error) {
	o.ID = uuid.New().String()
	o.CreatedAt = time.Now().UTC()
	o.UpdatedAt = o.CreatedAt
	if o.Status == "" {
		o.Status = consts.OrderStatusDraft
	}
	if o.Currency == "" {
		o.Currency = "USD"
	}

	lineItemsJSON, err := json.Marshal(o.LineItems)
	if err != nil {
		return nil, fmt.Errorf("marshalling line items: %w", err)
	}

	_, err = d.db.ExecContext(ctx, `
		INSERT INTO orders
		(id, organization_id, order_number, customer_id, customer_name, customer_email,
		 status, priority, shipping_address, billing_address, line_items,
		 subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
		 payment_method, warehouse_id, supplier_id, special_instructions,
		 required_by_date, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
		o.ID, o.OrganizationID, o.OrderNumber, o.CustomerID, o.CustomerName,
		o.CustomerEmail, o.Status, o.Priority, o.ShippingAddress, o.BillingAddress,
		lineItemsJSON, o.SubtotalCents, o.ShippingCents, o.TaxCents, o.TotalCents,
		o.Currency, o.PaymentMethod, o.WarehouseID, o.SupplierID,
		o.SpecialInstructions, o.RequiredByDate, o.CreatedAt, o.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating order: %w", err)
	}
	return o, nil
}

func (d *OrderDAO) GetByID(ctx context.Context, id string) (*Order, error) {
	q := `SELECT id, organization_id, order_number, customer_id, customer_name, customer_email,
		status, priority, shipping_address, billing_address, line_items,
		subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
		payment_method, warehouse_id, shipment_id, supplier_id, special_instructions,
		required_by_date, created_at, updated_at
		FROM orders WHERE id = $1`

	var o Order
	var lineItemsJSON []byte
	err := d.db.QueryRowContext(ctx, q, id).Scan(
		&o.ID, &o.OrganizationID, &o.OrderNumber, &o.CustomerID, &o.CustomerName,
		&o.CustomerEmail, &o.Status, &o.Priority, &o.ShippingAddress, &o.BillingAddress,
		&lineItemsJSON, &o.SubtotalCents, &o.ShippingCents, &o.TaxCents, &o.TotalCents,
		&o.Currency, &o.PaymentMethod, &o.WarehouseID, &o.ShipmentID, &o.SupplierID,
		&o.SpecialInstructions, &o.RequiredByDate, &o.CreatedAt, &o.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(lineItemsJSON, &o.LineItems); err != nil {
		return nil, fmt.Errorf("unmarshalling line items: %w", err)
	}
	return &o, nil
}

func (d *OrderDAO) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := d.db.ExecContext(ctx,
		"UPDATE orders SET status=$1, updated_at=$2 WHERE id=$3",
		status, time.Now().UTC(), id,
	)
	return err
}

func (d *OrderDAO) LinkShipment(ctx context.Context, orderID, shipmentID string) error {
	_, err := d.db.ExecContext(ctx,
		"UPDATE orders SET shipment_id=$1, status=$2, updated_at=$3 WHERE id=$4",
		shipmentID, consts.OrderStatusShipped, time.Now().UTC(), orderID,
	)
	return err
}

func (d *OrderDAO) ListByStatus(ctx context.Context, orgID, status string, limit, offset int) ([]*Order, int, error) {
	args := []interface{}{orgID}
	where := "WHERE organization_id = $1"
	if status != "" {
		where += " AND status = $2"
		args = append(args, status)
	}

	var total int
	if err := d.db.QueryRowContext(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM orders %s", where), args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	argIdx := len(args) + 1
	q := fmt.Sprintf(`SELECT id, organization_id, order_number, customer_id, customer_name,
		customer_email, status, priority, shipping_address, billing_address, line_items,
		subtotal_cents, shipping_cents, tax_cents, total_cents, currency,
		payment_method, warehouse_id, shipment_id, supplier_id, special_instructions,
		required_by_date, created_at, updated_at
		FROM orders %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, argIdx, argIdx+1,
	)
	args = append(args, limit, offset)

	rows, err := d.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var orders []*Order
	for rows.Next() {
		var o Order
		var lineItemsJSON []byte
		if err := rows.Scan(
			&o.ID, &o.OrganizationID, &o.OrderNumber, &o.CustomerID, &o.CustomerName,
			&o.CustomerEmail, &o.Status, &o.Priority, &o.ShippingAddress, &o.BillingAddress,
			&lineItemsJSON, &o.SubtotalCents, &o.ShippingCents, &o.TaxCents, &o.TotalCents,
			&o.Currency, &o.PaymentMethod, &o.WarehouseID, &o.ShipmentID, &o.SupplierID,
			&o.SpecialInstructions, &o.RequiredByDate, &o.CreatedAt, &o.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		json.Unmarshal(lineItemsJSON, &o.LineItems) //nolint:errcheck
		orders = append(orders, &o)
	}
	return orders, total, rows.Err()
}
