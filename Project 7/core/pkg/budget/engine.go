// Package budget implements budget tracking and variance analysis.
package budget

import (
	"time"

	"github.com/shopspring/decimal"
	"github.com/vaultflow/vaultflow/core/pkg/model"
)

// VarianceResult holds the computed variance for a single budget.
type VarianceResult struct {
	Budget      model.Budget    `json:"budget"`
	Actual      model.Money     `json:"actual"`
	Variance    model.Money     `json:"variance"`
	Utilization float64         `json:"utilization"`
	Status      VarianceStatus  `json:"status"`
}

// VarianceStatus classifies the budget health.
type VarianceStatus string

const (
	VarianceStatusOnTrack   VarianceStatus = "on_track"
	VarianceStatusWarning   VarianceStatus = "warning"
	VarianceStatusExceeded  VarianceStatus = "exceeded"
	VarianceStatusUnderspend VarianceStatus = "underspend"
)

// Engine computes budget metrics against actual expenses.
type Engine struct {
	WarningThreshold float64 // percentage at which to trigger a warning (default 80)
}

// NewEngine creates a budget engine with sensible defaults.
func NewEngine() *Engine {
	return &Engine{WarningThreshold: 80.0}
}

// ComputeVariance evaluates all budgets against the supplied expenses.
func (e *Engine) ComputeVariance(budgets []model.Budget, expenses []model.Expense) []VarianceResult {
	results := make([]VarianceResult, 0, len(budgets))
	for _, b := range budgets {
		actual := e.sumExpenses(expenses, b.Category, b.StartDate, b.EndDate, b.Allocated.Currency)
		variance := b.Allocated.Amount.Sub(actual.Amount)
		utilization, _ := actual.Amount.Div(b.Allocated.Amount).Mul(decimal.NewFromInt(100)).Float64()

		status := VarianceStatusOnTrack
		switch {
		case utilization > 100:
			status = VarianceStatusExceeded
		case utilization >= e.WarningThreshold:
			status = VarianceStatusWarning
		case utilization < 50 && time.Now().After(b.EndDate.Add(-72*time.Hour)):
			status = VarianceStatusUnderspend
		}

		results = append(results, VarianceResult{
			Budget:      b,
			Actual:      actual,
			Variance:    model.Money{Amount: variance, Currency: b.Allocated.Currency},
			Utilization: utilization,
			Status:      status,
		})
	}
	return results
}

// sumExpenses accumulates expense amounts matching category and date range.
func (e *Engine) sumExpenses(expenses []model.Expense, category string, start, end time.Time, currency model.Currency) model.Money {
	sum := decimal.Zero
	for _, ex := range expenses {
		if ex.Category != category {
			continue
		}
		if ex.Date.Before(start) || ex.Date.After(end) {
			continue
		}
		sum = sum.Add(ex.Amount.Amount)
	}
	return model.Money{Amount: sum, Currency: currency}
}
