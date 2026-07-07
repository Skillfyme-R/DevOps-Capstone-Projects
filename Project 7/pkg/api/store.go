// Package api — store interfaces used by handlers.
package api

import (
	"context"
	"time"

	"github.com/vaultflow/vaultflow/core/pkg/model"
)

// TransactionStore is the data access interface for transactions.
type TransactionStore interface {
	ListTransactions(ctx context.Context, tenantID string, start, end time.Time) ([]model.Transaction, error)
	CreateTransaction(ctx context.Context, t model.Transaction) error
	GetTransaction(ctx context.Context, id string) (model.Transaction, error)
}

// ExpenseStore is the data access interface for expenses.
type ExpenseStore interface {
	ListExpenses(ctx context.Context, tenantID string, start, end time.Time) ([]model.Expense, error)
	CreateExpense(ctx context.Context, e model.Expense) error
}

// BudgetStore is the data access interface for budgets.
type BudgetStore interface {
	ListBudgets(ctx context.Context, tenantID string) ([]model.Budget, error)
	CreateBudget(ctx context.Context, b model.Budget) error
	UpdateBudget(ctx context.Context, b model.Budget) error
}

// PortfolioStore is the data access interface for portfolio data.
type PortfolioStore interface {
	GetPortfolio(ctx context.Context, tenantID string) (model.Portfolio, error)
	UpdateHolding(ctx context.Context, portfolioID string, h model.Holding) error
}

// AlertStore is the data access interface for system alerts.
type AlertStore interface {
	ListAlerts(ctx context.Context, tenantID string, includeResolved bool) ([]model.Alert, error)
	CreateAlert(ctx context.Context, a model.Alert) error
	ResolveAlert(ctx context.Context, alertID string) error
}

// -------------------------------------------------------------------
// In-memory store (development / testing)
// -------------------------------------------------------------------

// MemoryStore implements all store interfaces using in-memory slices.
type MemoryStore struct {
	transactions []model.Transaction
	expenses     []model.Expense
	budgets      []model.Budget
	portfolios   map[string]model.Portfolio
	alerts       []model.Alert
}

// NewMemoryStore creates an initialized in-memory store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		portfolios: make(map[string]model.Portfolio),
	}
}

func (s *MemoryStore) ListTransactions(_ context.Context, tenantID string, start, end time.Time) ([]model.Transaction, error) {
	var result []model.Transaction
	for _, t := range s.transactions {
		if t.TenantID == tenantID && !t.OccurredAt.Before(start) && !t.OccurredAt.After(end) {
			result = append(result, t)
		}
	}
	return result, nil
}

func (s *MemoryStore) CreateTransaction(_ context.Context, t model.Transaction) error {
	s.transactions = append(s.transactions, t)
	return nil
}

func (s *MemoryStore) GetTransaction(_ context.Context, id string) (model.Transaction, error) {
	for _, t := range s.transactions {
		if t.ID == id {
			return t, nil
		}
	}
	return model.Transaction{}, nil
}

func (s *MemoryStore) ListExpenses(_ context.Context, tenantID string, start, end time.Time) ([]model.Expense, error) {
	var result []model.Expense
	for _, e := range s.expenses {
		if e.TenantID == tenantID && !e.Date.Before(start) && !e.Date.After(end) {
			result = append(result, e)
		}
	}
	return result, nil
}

func (s *MemoryStore) CreateExpense(_ context.Context, e model.Expense) error {
	s.expenses = append(s.expenses, e)
	return nil
}

func (s *MemoryStore) ListBudgets(_ context.Context, tenantID string) ([]model.Budget, error) {
	var result []model.Budget
	for _, b := range s.budgets {
		if b.TenantID == tenantID {
			result = append(result, b)
		}
	}
	return result, nil
}

func (s *MemoryStore) CreateBudget(_ context.Context, b model.Budget) error {
	s.budgets = append(s.budgets, b)
	return nil
}

func (s *MemoryStore) UpdateBudget(_ context.Context, b model.Budget) error {
	for i, existing := range s.budgets {
		if existing.ID == b.ID {
			s.budgets[i] = b
			return nil
		}
	}
	return nil
}

func (s *MemoryStore) GetPortfolio(_ context.Context, tenantID string) (model.Portfolio, error) {
	if p, ok := s.portfolios[tenantID]; ok {
		return p, nil
	}
	return model.Portfolio{TenantID: tenantID}, nil
}

func (s *MemoryStore) UpdateHolding(_ context.Context, portfolioID string, h model.Holding) error {
	p := s.portfolios[portfolioID]
	for i, existing := range p.Holdings {
		if existing.ID == h.ID {
			p.Holdings[i] = h
			s.portfolios[portfolioID] = p
			return nil
		}
	}
	p.Holdings = append(p.Holdings, h)
	s.portfolios[portfolioID] = p
	return nil
}

func (s *MemoryStore) ListAlerts(_ context.Context, tenantID string, includeResolved bool) ([]model.Alert, error) {
	var result []model.Alert
	for _, a := range s.alerts {
		if a.TenantID != tenantID {
			continue
		}
		if !includeResolved && a.Resolved {
			continue
		}
		result = append(result, a)
	}
	return result, nil
}

func (s *MemoryStore) CreateAlert(_ context.Context, a model.Alert) error {
	s.alerts = append(s.alerts, a)
	return nil
}

func (s *MemoryStore) ResolveAlert(_ context.Context, alertID string) error {
	for i, a := range s.alerts {
		if a.ID == alertID {
			s.alerts[i].Resolved = true
			return nil
		}
	}
	return nil
}
