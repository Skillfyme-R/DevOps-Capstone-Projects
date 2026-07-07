// Package dao provides data-access objects for all NexaFlow domain entities.

package dao

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nexaflow-io/nexaflow/pkg/consts"
)

// Shipment represents a physical shipment moving through the supply chain.
type Shipment struct {
	ID              string    `json:"id" db:"id"`
	TrackingNumber  string    `json:"tracking_number" db:"tracking_number"`
	OrganizationID  string    `json:"organization_id" db:"organization_id"`
	OrderID         string    `json:"order_id,omitempty" db:"order_id"`
	Status          string    `json:"status" db:"status"`
	CarrierCode     string    `json:"carrier_code" db:"carrier_code"`
	ServiceLevel    string    `json:"service_level" db:"service_level"`
	OriginWarehouse string    `json:"origin_warehouse_id" db:"origin_warehouse_id"`
	DestinationAddr string    `json:"destination_address" db:"destination_address"`
	WeightKg        float64   `json:"weight_kg" db:"weight_kg"`
	VolumeM3        float64   `json:"volume_m3" db:"volume_m3"`
	SpecialHandling string    `json:"special_handling,omitempty" db:"special_handling"`
	EstimatedDelivery *time.Time `json:"estimated_delivery,omitempty" db:"estimated_delivery"`
	ActualDelivery    *time.Time `json:"actual_delivery,omitempty" db:"actual_delivery"`
	VehicleID       string    `json:"vehicle_id,omitempty" db:"vehicle_id"`
	DriverID        string    `json:"driver_id,omitempty" db:"driver_id"`
	Notes           string    `json:"notes,omitempty" db:"notes"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// ShipmentEvent is an immutable audit log entry for a shipment status transition.
type ShipmentEvent struct {
	ID          string    `json:"id"`
	ShipmentID  string    `json:"shipment_id"`
	EventType   string    `json:"event_type"`
	Description string    `json:"description"`
	Location    string    `json:"location,omitempty"`
	ActorID     string    `json:"actor_id,omitempty"`
	Metadata    string    `json:"metadata,omitempty"`
	OccurredAt  time.Time `json:"occurred_at"`
}

// ShipmentDAO handles all database operations for shipments.
type ShipmentDAO struct {
	db *sql.DB
}

// NewShipmentDAO returns a new ShipmentDAO bound to db.
func NewShipmentDAO(db *sql.DB) *ShipmentDAO {
	return &ShipmentDAO{db: db}
}

// Create inserts a new shipment record and returns it with generated fields.
func (d *ShipmentDAO) Create(ctx context.Context, s *Shipment) (*Shipment, error) {
	s.ID = uuid.New().String()
	s.CreatedAt = time.Now().UTC()
	s.UpdatedAt = s.CreatedAt
	if s.Status == "" {
		s.Status = consts.ShipmentStatusPending
	}

	q := `INSERT INTO shipments
		(id, tracking_number, organization_id, order_id, status, carrier_code,
		 service_level, origin_warehouse_id, destination_address, weight_kg,
		 volume_m3, special_handling, estimated_delivery, vehicle_id, driver_id,
		 notes, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`

	_, err := d.db.ExecContext(ctx, q,
		s.ID, s.TrackingNumber, s.OrganizationID, s.OrderID, s.Status,
		s.CarrierCode, s.ServiceLevel, s.OriginWarehouse, s.DestinationAddr,
		s.WeightKg, s.VolumeM3, s.SpecialHandling, s.EstimatedDelivery,
		s.VehicleID, s.DriverID, s.Notes, s.CreatedAt, s.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting shipment: %w", err)
	}
	return s, nil
}

// GetByID retrieves a shipment by its UUID.
func (d *ShipmentDAO) GetByID(ctx context.Context, id string) (*Shipment, error) {
	q := `SELECT id, tracking_number, organization_id, order_id, status,
		carrier_code, service_level, origin_warehouse_id, destination_address,
		weight_kg, volume_m3, special_handling, estimated_delivery, actual_delivery,
		vehicle_id, driver_id, notes, created_at, updated_at
		FROM shipments WHERE id = $1`

	row := d.db.QueryRowContext(ctx, q, id)
	return scanShipment(row)
}

// GetByTracking retrieves a shipment by its tracking number.
func (d *ShipmentDAO) GetByTracking(ctx context.Context, trackingNumber string) (*Shipment, error) {
	q := `SELECT id, tracking_number, organization_id, order_id, status,
		carrier_code, service_level, origin_warehouse_id, destination_address,
		weight_kg, volume_m3, special_handling, estimated_delivery, actual_delivery,
		vehicle_id, driver_id, notes, created_at, updated_at
		FROM shipments WHERE tracking_number = $1`

	row := d.db.QueryRowContext(ctx, q, trackingNumber)
	return scanShipment(row)
}

// List returns shipments for an organisation with optional status filter.
func (d *ShipmentDAO) List(ctx context.Context, orgID string, status string, limit, offset int) ([]*Shipment, int, error) {
	args := []interface{}{orgID}
	where := "WHERE organization_id = $1"
	argIdx := 2

	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	countQ := fmt.Sprintf("SELECT COUNT(*) FROM shipments %s", where)
	var total int
	if err := d.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting shipments: %w", err)
	}

	q := fmt.Sprintf(`SELECT id, tracking_number, organization_id, order_id, status,
		carrier_code, service_level, origin_warehouse_id, destination_address,
		weight_kg, volume_m3, special_handling, estimated_delivery, actual_delivery,
		vehicle_id, driver_id, notes, created_at, updated_at
		FROM shipments %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	args = append(args, limit, offset)
	rows, err := d.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("listing shipments: %w", err)
	}
	defer rows.Close()

	var shipments []*Shipment
	for rows.Next() {
		s, err := scanShipmentRow(rows)
		if err != nil {
			return nil, 0, err
		}
		shipments = append(shipments, s)
	}
	return shipments, total, rows.Err()
}

// UpdateStatus transitions a shipment to a new status and records an event.
func (d *ShipmentDAO) UpdateStatus(ctx context.Context, id, status, actorID, description, location string) error {
	now := time.Now().UTC()

	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}

	updates := "status = $1, updated_at = $2"
	args := []interface{}{status, now, id}

	if status == consts.ShipmentStatusDelivered {
		updates += ", actual_delivery = $4"
		args = append(args[:2], now, id)
	}

	if _, err := tx.ExecContext(ctx,
		fmt.Sprintf("UPDATE shipments SET %s WHERE id = $3", updates), args...); err != nil {
		tx.Rollback() //nolint:errcheck
		return fmt.Errorf("updating shipment status: %w", err)
	}

	event := ShipmentEvent{
		ID:          uuid.New().String(),
		ShipmentID:  id,
		EventType:   status,
		Description: description,
		Location:    location,
		ActorID:     actorID,
		OccurredAt:  now,
	}
	if _, err := tx.ExecContext(ctx,
		`INSERT INTO shipment_events (id, shipment_id, event_type, description, location, actor_id, occurred_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		event.ID, event.ShipmentID, event.EventType, event.Description,
		event.Location, event.ActorID, event.OccurredAt,
	); err != nil {
		tx.Rollback() //nolint:errcheck
		return fmt.Errorf("inserting shipment event: %w", err)
	}

	return tx.Commit()
}

// Delete soft-deletes a shipment (sets status to cancelled).
func (d *ShipmentDAO) Delete(ctx context.Context, id string) error {
	_, err := d.db.ExecContext(ctx,
		"UPDATE shipments SET status = $1, updated_at = $2 WHERE id = $3",
		consts.ShipmentStatusCancelled, time.Now().UTC(), id,
	)
	return err
}

func scanShipment(row *sql.Row) (*Shipment, error) {
	var s Shipment
	err := row.Scan(
		&s.ID, &s.TrackingNumber, &s.OrganizationID, &s.OrderID, &s.Status,
		&s.CarrierCode, &s.ServiceLevel, &s.OriginWarehouse, &s.DestinationAddr,
		&s.WeightKg, &s.VolumeM3, &s.SpecialHandling, &s.EstimatedDelivery,
		&s.ActualDelivery, &s.VehicleID, &s.DriverID, &s.Notes,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &s, err
}

func scanShipmentRow(rows *sql.Rows) (*Shipment, error) {
	var s Shipment
	err := rows.Scan(
		&s.ID, &s.TrackingNumber, &s.OrganizationID, &s.OrderID, &s.Status,
		&s.CarrierCode, &s.ServiceLevel, &s.OriginWarehouse, &s.DestinationAddr,
		&s.WeightKg, &s.VolumeM3, &s.SpecialHandling, &s.EstimatedDelivery,
		&s.ActualDelivery, &s.VehicleID, &s.DriverID, &s.Notes,
		&s.CreatedAt, &s.UpdatedAt,
	)
	return &s, err
}
