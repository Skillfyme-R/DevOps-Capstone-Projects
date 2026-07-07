package dao

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nexaflow-io/nexaflow/pkg/consts"
)

// Vehicle represents a transport asset in the NexaFlow fleet.
type Vehicle struct {
	ID             string     `json:"id"`
	OrganizationID string     `json:"organization_id"`
	RegistrationNo string     `json:"registration_no"`
	FleetCode      string     `json:"fleet_code"`
	Make           string     `json:"make"`
	Model          string     `json:"model"`
	Year           int        `json:"year"`
	VehicleType    string     `json:"vehicle_type"` // truck, van, motorcycle, cargo_ship, air_freight
	Status         string     `json:"status"`
	PayloadCapKg   float64    `json:"payload_capacity_kg"`
	VolumeCapM3    float64    `json:"volume_capacity_m3"`
	FuelType       string     `json:"fuel_type"` // diesel, petrol, electric, hybrid, lng
	CurrentLat     *float64   `json:"current_latitude,omitempty"`
	CurrentLon     *float64   `json:"current_longitude,omitempty"`
	CurrentLocation string    `json:"current_location,omitempty"`
	AssignedDepotID string    `json:"assigned_depot_id,omitempty"`
	DriverID       string     `json:"driver_id,omitempty"`
	LastServiceAt  *time.Time `json:"last_service_at,omitempty"`
	NextServiceAt  *time.Time `json:"next_service_at,omitempty"`
	OdometerKm     float64    `json:"odometer_km"`
	IsActive       bool       `json:"is_active"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// Driver represents a delivery driver or fleet operator.
type Driver struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	FirstName      string    `json:"first_name"`
	LastName       string    `json:"last_name"`
	Email          string    `json:"email"`
	Phone          string    `json:"phone"`
	LicenseNumber  string    `json:"license_number"`
	LicenseExpiry  time.Time `json:"license_expiry"`
	Status         string    `json:"status"` // active, on_duty, off_duty, suspended
	AssignedVehicleID string `json:"assigned_vehicle_id,omitempty"`
	TotalDeliveries int     `json:"total_deliveries"`
	RatingAvg       float64  `json:"rating_avg"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

// VehicleDAO handles fleet vehicle persistence.
type VehicleDAO struct {
	db *sql.DB
}

func NewVehicleDAO(db *sql.DB) *VehicleDAO {
	return &VehicleDAO{db: db}
}

func (d *VehicleDAO) Create(ctx context.Context, v *Vehicle) (*Vehicle, error) {
	v.ID = uuid.New().String()
	v.CreatedAt = time.Now().UTC()
	v.UpdatedAt = v.CreatedAt
	v.IsActive = true
	if v.Status == "" {
		v.Status = consts.VehicleStatusAvailable
	}

	_, err := d.db.ExecContext(ctx, `
		INSERT INTO vehicles
		(id, organization_id, registration_no, fleet_code, make, model, year,
		 vehicle_type, status, payload_capacity_kg, volume_capacity_m3, fuel_type,
		 assigned_depot_id, driver_id, odometer_km, is_active, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		v.ID, v.OrganizationID, v.RegistrationNo, v.FleetCode, v.Make, v.Model,
		v.Year, v.VehicleType, v.Status, v.PayloadCapKg, v.VolumeCapM3,
		v.FuelType, v.AssignedDepotID, v.DriverID, v.OdometerKm, v.IsActive,
		v.CreatedAt, v.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating vehicle: %w", err)
	}
	return v, nil
}

func (d *VehicleDAO) GetByID(ctx context.Context, id string) (*Vehicle, error) {
	q := `SELECT id, organization_id, registration_no, fleet_code, make, model,
		year, vehicle_type, status, payload_capacity_kg, volume_capacity_m3,
		fuel_type, current_latitude, current_longitude, current_location,
		assigned_depot_id, driver_id, last_service_at, next_service_at,
		odometer_km, is_active, created_at, updated_at
		FROM vehicles WHERE id = $1`

	var v Vehicle
	err := d.db.QueryRowContext(ctx, q, id).Scan(
		&v.ID, &v.OrganizationID, &v.RegistrationNo, &v.FleetCode, &v.Make,
		&v.Model, &v.Year, &v.VehicleType, &v.Status, &v.PayloadCapKg,
		&v.VolumeCapM3, &v.FuelType, &v.CurrentLat, &v.CurrentLon,
		&v.CurrentLocation, &v.AssignedDepotID, &v.DriverID, &v.LastServiceAt,
		&v.NextServiceAt, &v.OdometerKm, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &v, err
}

func (d *VehicleDAO) UpdateLocation(ctx context.Context, id string, lat, lon float64, location string) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE vehicles SET current_latitude=$1, current_longitude=$2,
		current_location=$3, updated_at=$4 WHERE id=$5`,
		lat, lon, location, time.Now().UTC(), id,
	)
	return err
}

func (d *VehicleDAO) UpdateStatus(ctx context.Context, id, status string) error {
	_, err := d.db.ExecContext(ctx,
		"UPDATE vehicles SET status=$1, updated_at=$2 WHERE id=$3",
		status, time.Now().UTC(), id,
	)
	return err
}

func (d *VehicleDAO) AssignDriver(ctx context.Context, vehicleID, driverID string) error {
	_, err := d.db.ExecContext(ctx,
		"UPDATE vehicles SET driver_id=$1, updated_at=$2 WHERE id=$3",
		driverID, time.Now().UTC(), vehicleID,
	)
	return err
}

func (d *VehicleDAO) ListAvailable(ctx context.Context, orgID string) ([]*Vehicle, error) {
	q := `SELECT id, organization_id, registration_no, fleet_code, make, model,
		year, vehicle_type, status, payload_capacity_kg, volume_capacity_m3,
		fuel_type, current_latitude, current_longitude, current_location,
		assigned_depot_id, driver_id, last_service_at, next_service_at,
		odometer_km, is_active, created_at, updated_at
		FROM vehicles WHERE organization_id=$1 AND status=$2 AND is_active=true`

	rows, err := d.db.QueryContext(ctx, q, orgID, consts.VehicleStatusAvailable)
	if err != nil {
		return nil, fmt.Errorf("listing available vehicles: %w", err)
	}
	defer rows.Close()

	var vehicles []*Vehicle
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(
			&v.ID, &v.OrganizationID, &v.RegistrationNo, &v.FleetCode, &v.Make,
			&v.Model, &v.Year, &v.VehicleType, &v.Status, &v.PayloadCapKg,
			&v.VolumeCapM3, &v.FuelType, &v.CurrentLat, &v.CurrentLon,
			&v.CurrentLocation, &v.AssignedDepotID, &v.DriverID, &v.LastServiceAt,
			&v.NextServiceAt, &v.OdometerKm, &v.IsActive, &v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &v)
	}
	return vehicles, rows.Err()
}
