package dao

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Supplier represents an upstream vendor or carrier in the supply chain.
type Supplier struct {
	ID             string    `json:"id"`
	OrganizationID string    `json:"organization_id"`
	Name           string    `json:"name"`
	Code           string    `json:"code"`
	Tier           string    `json:"tier"` // premium, preferred, standard
	Category       string    `json:"category"` // manufacturer, distributor, carrier, 3pl, customs_broker
	ContactName    string    `json:"contact_name"`
	ContactEmail   string    `json:"contact_email"`
	ContactPhone   string    `json:"contact_phone"`
	AddressLine1   string    `json:"address_line_1"`
	City           string    `json:"city"`
	Country        string    `json:"country"`
	TaxID          string    `json:"tax_id,omitempty"`
	PaymentTerms   string    `json:"payment_terms,omitempty"` // net_30, net_60, prepaid
	LeadTimeDays   int       `json:"lead_time_days"`
	RatingScore    float64   `json:"rating_score"`
	IsActive       bool      `json:"is_active"`
	Notes          string    `json:"notes,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// SupplierDAO handles supplier record persistence.
type SupplierDAO struct {
	db *sql.DB
}

func NewSupplierDAO(db *sql.DB) *SupplierDAO {
	return &SupplierDAO{db: db}
}

func (d *SupplierDAO) Create(ctx context.Context, s *Supplier) (*Supplier, error) {
	s.ID = uuid.New().String()
	s.CreatedAt = time.Now().UTC()
	s.UpdatedAt = s.CreatedAt
	s.IsActive = true

	_, err := d.db.ExecContext(ctx, `
		INSERT INTO suppliers
		(id, organization_id, name, code, tier, category, contact_name, contact_email,
		 contact_phone, address_line_1, city, country, tax_id, payment_terms,
		 lead_time_days, rating_score, is_active, notes, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
		s.ID, s.OrganizationID, s.Name, s.Code, s.Tier, s.Category, s.ContactName,
		s.ContactEmail, s.ContactPhone, s.AddressLine1, s.City, s.Country, s.TaxID,
		s.PaymentTerms, s.LeadTimeDays, s.RatingScore, s.IsActive, s.Notes,
		s.CreatedAt, s.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("creating supplier: %w", err)
	}
	return s, nil
}

func (d *SupplierDAO) GetByID(ctx context.Context, id string) (*Supplier, error) {
	var s Supplier
	err := d.db.QueryRowContext(ctx, `
		SELECT id, organization_id, name, code, tier, category, contact_name, contact_email,
		contact_phone, address_line_1, city, country, tax_id, payment_terms,
		lead_time_days, rating_score, is_active, notes, created_at, updated_at
		FROM suppliers WHERE id=$1`, id,
	).Scan(
		&s.ID, &s.OrganizationID, &s.Name, &s.Code, &s.Tier, &s.Category,
		&s.ContactName, &s.ContactEmail, &s.ContactPhone, &s.AddressLine1,
		&s.City, &s.Country, &s.TaxID, &s.PaymentTerms, &s.LeadTimeDays,
		&s.RatingScore, &s.IsActive, &s.Notes, &s.CreatedAt, &s.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &s, err
}

func (d *SupplierDAO) List(ctx context.Context, orgID string, tier string) ([]*Supplier, error) {
	q := "SELECT id, organization_id, name, code, tier, category, contact_name, contact_email, contact_phone, address_line_1, city, country, tax_id, payment_terms, lead_time_days, rating_score, is_active, notes, created_at, updated_at FROM suppliers WHERE organization_id=$1"
	args := []interface{}{orgID}
	if tier != "" {
		q += " AND tier=$2"
		args = append(args, tier)
	}
	q += " ORDER BY name"

	rows, err := d.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("listing suppliers: %w", err)
	}
	defer rows.Close()

	var suppliers []*Supplier
	for rows.Next() {
		var s Supplier
		if err := rows.Scan(
			&s.ID, &s.OrganizationID, &s.Name, &s.Code, &s.Tier, &s.Category,
			&s.ContactName, &s.ContactEmail, &s.ContactPhone, &s.AddressLine1,
			&s.City, &s.Country, &s.TaxID, &s.PaymentTerms, &s.LeadTimeDays,
			&s.RatingScore, &s.IsActive, &s.Notes, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		suppliers = append(suppliers, &s)
	}
	return suppliers, rows.Err()
}

func (d *SupplierDAO) UpdateRating(ctx context.Context, id string, score float64) error {
	_, err := d.db.ExecContext(ctx,
		"UPDATE suppliers SET rating_score=$1, updated_at=$2 WHERE id=$3",
		score, time.Now().UTC(), id,
	)
	return err
}
