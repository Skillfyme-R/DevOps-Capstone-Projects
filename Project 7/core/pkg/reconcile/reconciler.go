// Package reconcile implements payment and transaction reconciliation logic.
package reconcile

import (
	"fmt"
	"time"

	"github.com/shopspring/decimal"
	"github.com/vaultflow/vaultflow/core/pkg/model"
)

// MatchStatus describes the outcome of a reconciliation match.
type MatchStatus string

const (
	MatchStatusMatched    MatchStatus = "matched"
	MatchStatusUnmatched  MatchStatus = "unmatched"
	MatchStatusDuplicate  MatchStatus = "duplicate"
	MatchStatusPartial    MatchStatus = "partial"
)

// ReconciliationEntry pairs an external record with an internal transaction.
type ReconciliationEntry struct {
	ExternalID     string           `json:"external_id"`
	ExternalAmount model.Money      `json:"external_amount"`
	ExternalDate   time.Time        `json:"external_date"`
	ExternalRef    string           `json:"external_ref"`
	InternalTxn    *model.Transaction `json:"internal_txn,omitempty"`
	Status         MatchStatus      `json:"status"`
	Discrepancy    model.Money      `json:"discrepancy,omitempty"`
	Notes          string           `json:"notes,omitempty"`
}

// ReconciliationReport is the final output of a reconciliation run.
type ReconciliationReport struct {
	RunID         string                `json:"run_id"`
	TenantID      string                `json:"tenant_id"`
	PeriodStart   time.Time             `json:"period_start"`
	PeriodEnd     time.Time             `json:"period_end"`
	TotalExternal int                   `json:"total_external"`
	TotalInternal int                   `json:"total_internal"`
	Matched       int                   `json:"matched"`
	Unmatched     int                   `json:"unmatched"`
	Duplicates    int                   `json:"duplicates"`
	Partials      int                   `json:"partials"`
	Entries       []ReconciliationEntry `json:"entries"`
	GeneratedAt   time.Time             `json:"generated_at"`
}

// Reconciler matches external payment records against internal transactions.
type Reconciler struct {
	// AmountTolerance is the acceptable money difference for a partial match.
	AmountTolerance decimal.Decimal
	// DateTolerance is the acceptable date drift for matching.
	DateTolerance time.Duration
}

// NewReconciler creates a Reconciler with sensible defaults.
func NewReconciler() *Reconciler {
	return &Reconciler{
		AmountTolerance: decimal.NewFromFloat(0.01),
		DateTolerance:   48 * time.Hour,
	}
}

// ExternalRecord is a payment record from an external source (bank, gateway).
type ExternalRecord struct {
	ID     string
	Amount model.Money
	Date   time.Time
	Ref    string
}

// Reconcile matches external records against internal transactions and returns a report.
func (r *Reconciler) Reconcile(runID, tenantID string, external []ExternalRecord, internal []model.Transaction, window model.Report) ReconciliationReport {
	seen := make(map[string]bool)
	entries := make([]ReconciliationEntry, 0, len(external))

	matched, unmatched, duplicates, partials := 0, 0, 0, 0

	for _, ext := range external {
		entry := ReconciliationEntry{
			ExternalID:     ext.ID,
			ExternalAmount: ext.Amount,
			ExternalDate:   ext.Date,
			ExternalRef:    ext.Ref,
			Status:         MatchStatusUnmatched,
		}

		for i := range internal {
			txn := &internal[i]
			if seen[txn.ID] {
				continue
			}
			if !r.datesMatch(ext.Date, txn.OccurredAt) {
				continue
			}

			diff := ext.Amount.Amount.Sub(txn.Amount.Amount).Abs()
			if diff.IsZero() {
				entry.Status = MatchStatusMatched
				entry.InternalTxn = txn
				seen[txn.ID] = true
				matched++
				break
			} else if diff.LessThanOrEqual(r.AmountTolerance) {
				entry.Status = MatchStatusPartial
				entry.InternalTxn = txn
				entry.Discrepancy = model.Money{Amount: diff, Currency: ext.Amount.Currency}
				entry.Notes = fmt.Sprintf("Amount discrepancy of %s", diff.StringFixed(2))
				seen[txn.ID] = true
				partials++
				break
			}
		}

		if entry.Status == MatchStatusUnmatched {
			unmatched++
		}

		entries = append(entries, entry)
	}

	// detect duplicates in external set by external ref
	refCount := make(map[string]int)
	for _, ext := range external {
		if ext.Ref != "" {
			refCount[ext.Ref]++
		}
	}
	for i := range entries {
		if refCount[entries[i].ExternalRef] > 1 {
			entries[i].Status = MatchStatusDuplicate
			duplicates++
		}
	}

	return ReconciliationReport{
		RunID:         runID,
		TenantID:      tenantID,
		TotalExternal: len(external),
		TotalInternal: len(internal),
		Matched:       matched,
		Unmatched:     unmatched,
		Duplicates:    duplicates,
		Partials:      partials,
		Entries:       entries,
		GeneratedAt:   time.Now().UTC(),
	}
}

func (r *Reconciler) datesMatch(a, b time.Time) bool {
	diff := a.Sub(b)
	if diff < 0 {
		diff = -diff
	}
	return diff <= r.DateTolerance
}
