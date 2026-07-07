package dao

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Warehouse represents a physical storage facility in the NexaFlow network.
type Warehouse struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Name           string    `json:"name"`
	Code           string    `json:"code"`
	Type           string    `json:"type"` // fulfillment, cross_dock, cold_chain, distribution
	AddressLine1   string    `json:"address_line_1"`
	AddressLine2   string    `json:"address_line_2,omitempty"`
	City           string    `json:"city"`
	State          string    `json:"state"`
	PostalCode     string    `json:"postal_code"`
	Country        string    `json:"country"`
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	TotalAreaSqM   float64   `json:"total_area_sq_m"`
	UsableAreaSqM  float64   `json:"usable_area_sq_m"`
	MaxWeightKg    float64   `json:"max_weight_kg"`
	ManagerID      string    `json:"manager_id,omitempty"`
	OperatingHours string    `json:"operating_hours,omitempty"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// WarehouseZone represents a named zone within a warehouse.
type WarehouseZone struct {
	ID          string  `json:"id"`
	WarehouseID string  `json:"warehouse_id"`
	Name        string  `json:"name"`
	ZoneType    string  `json:"zone_type"`
	AreaSqM     float64 `json:"area_sq_m"`
	MaxItems    int     `json:"max_items"`
	Temperature *float64 `json:"temperature_celsius,omitempty"`
	IsActive    bool    `json:"is_active"`
}

// WarehouseDAO handles database access for warehouses and zones.
type WarehouseDAO struct {
	db *sql.DB
}

func NewWarehouseDAO(db *sql.DB) *WarehouseDAO {
	return &WarehouseDAO{db: db}
}

func (d *WarehouseDAO) Create(ctx context.Context, w *Warehouse) (*Warehouse, error) {
	w.ID = uuid.New().String()
	w.CreatedAt = time.Now().UTC()
	w.UpdatedAt = w.CreatedAt
	w.IsActive = true

	_, err := d.db.ExecContext(ctx, `
		INSERT INTO warehouses
		(id, organization_id, name, code, type, address_line_1, address_line_2,
		 city, state, postal_code, country, latitude, longitude, total_area_sq_m,
		 usable_area_sq_m, max_weight_kg, manager_id, operating_hours, is_active,
		 created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
		w.ID, w.OrganizationID, w.Name, w.Code, w.Type, w.AddressLine1, w.AddressLine2,
		w.City, w.State, w.PostalCode, w.Country, w.Latitude, w.Longitude,
		w.TotalAreaSqM, w.UsableAreaSqM, w.MaxWeightKg, w.ManagerID,
		w.OperatingHours, w.IsActive, w.CreatedAt, w.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating warehouse: %w", err)
	}
	return w, nil
}

func (d *WarehouseDAO) GetByID(ctx context.Context, id string) (*Warehouse, error) {
	q := `SELECT id, organization_id, name, code, type, address_line_1, address_line_2,
		city, state, postal_code, country, latitude, longitude, total_area_sq_m,
		usable_area_sq_m, max_weight_kg, manager_id, operating_hours, is_active,
		created_at, updated_at FROM warehouses WHERE id = $1`

	var w Warehouse
	err := d.db.QueryRowContext(ctx, q, id).Scan(
		&w.ID, &w.OrganizationID, &w.Name, &w.Code, &w.Type, &w.AddressLine1,
		&w.AddressLine2, &w.City, &w.State, &w.PostalCode, &w.Country,
		&w.Latitude, &w.Longitude, &w.TotalAreaSqM, &w.UsableAreaSqM,
		&w.MaxWeightKg, &w.ManagerID, &w.OperatingHours, &w.IsActive,
		&w.CreatedAt, &w.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &w, err
}

func (d *WarehouseDAO) List(ctx context.Context, orgID string, activeOnly bool) ([]*Warehouse, error) {
	q := `SELECT id, organization_id, name, code, type, address_line_1, address_line_2,
		city, state, postal_code, country, latitude, longitude, total_area_sq_m,
		usable_area_sq_m, max_weight_kg, manager_id, operating_hours, is_active,
		created_at, updated_at FROM warehouses WHERE organization_id = $1`

	args := []interface{}{orgID}
	if activeOnly {
		q += " AND is_active = true"
	}
	q += " ORDER BY name"

	rows, err := d.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("listing warehouses: %w", err)
	}
	defer rows.Close()

	var warehouses []*Warehouse
	for rows.Next() {
		var w Warehouse
		if err := rows.Scan(
			&w.ID, &w.OrganizationID, &w.Name, &w.Code, &w.Type, &w.AddressLine1,
			&w.AddressLine2, &w.City, &w.State, &w.PostalCode, &w.Country,
			&w.Latitude, &w.Longitude, &w.TotalAreaSqM, &w.UsableAreaSqM,
			&w.MaxWeightKg, &w.ManagerID, &w.OperatingHours, &w.IsActive,
			&w.CreatedAt, &w.UpdatedAt,
		); err != nil {
			return nil, err
		}
		warehouses = append(warehouses, &w)
	}
	return warehouses, rows.Err()
}

func (d *WarehouseDAO) Update(ctx context.Context, w *Warehouse) error {
	w.UpdatedAt = time.Now().UTC()
	_, err := d.db.ExecContext(ctx, `
		UPDATE warehouses SET name=$1, code=$2, type=$3, address_line_1=$4,
		address_line_2=$5, city=$6, state=$7, postal_code=$8, country=$9,
		total_area_sq_m=$10, usable_area_sq_m=$11, max_weight_kg=$12,
		operating_hours=$13, is_active=$14, updated_at=$15 WHERE id=$16`,
		w.Name, w.Code, w.Type, w.AddressLine1, w.AddressLine2, w.City, w.State,
		w.PostalCode, w.Country, w.TotalAreaSqM, w.UsableAreaSqM, w.MaxWeightKg,
		w.OperatingHours, w.IsActive, w.UpdatedAt, w.ID,
	)
	return err
}

func (d *WarehouseDAO) Deactivate(ctx context.Context, id string) error {
	_, err := d.db.ExecContext(ctx,
		"UPDATE warehouses SET is_active=false, updated_at=$1 WHERE id=$2",
		time.Now().UTC(), id,
	)
	return err
}
