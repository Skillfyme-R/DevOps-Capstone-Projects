// Package provider defines the interface and implementations for external financial data sources.
package provider

import (
	"context"
	"time"

	"github.com/vaultflow/vaultflow/core/pkg/model"
)

// Provider is the canonical interface all external financial data sources must implement.
type Provider interface {
	// Name returns the provider's identifier.
	Name() string

	// FetchTransactions retrieves transactions for the given account within the window.
	FetchTransactions(ctx context.Context, accountID string, start, end time.Time) ([]model.Transaction, error)

	// FetchBalance retrieves the current balance for the given account.
	FetchBalance(ctx context.Context, accountID string) (model.Money, error)

	// Ping verifies connectivity to the provider.
	Ping(ctx context.Context) error
}

// -------------------------------------------------------------------
// Mock Provider (for development / testing)
// -------------------------------------------------------------------

// MockProvider simulates a financial institution with seed data.
type MockProvider struct {
	providerName string
	transactions []model.Transaction
	balances     map[string]model.Money
}

// NewMockProvider creates a mock provider with generated seed data.
func NewMockProvider(name string) *MockProvider {
	return &MockProvider{
		providerName: name,
		balances:     make(map[string]model.Money),
	}
}

// Name returns the mock provider's identifier.
func (m *MockProvider) Name() string { return m.providerName }

// FetchTransactions returns seeded transactions filtered by window.
func (m *MockProvider) FetchTransactions(ctx context.Context, accountID string, start, end time.Time) ([]model.Transaction, error) {
	var result []model.Transaction
	for _, t := range m.transactions {
		if t.AccountID == accountID && !t.OccurredAt.Before(start) && !t.OccurredAt.After(end) {
			result = append(result, t)
		}
	}
	return result, nil
}

// FetchBalance returns the seeded balance for an account.
func (m *MockProvider) FetchBalance(ctx context.Context, accountID string) (model.Money, error) {
	if b, ok := m.balances[accountID]; ok {
		return b, nil
	}
	return model.NewMoney(0, model.CurrencyUSD), nil
}

// Ping always succeeds for the mock provider.
func (m *MockProvider) Ping(ctx context.Context) error { return nil }

// AddTransaction seeds a transaction into the mock provider.
func (m *MockProvider) AddTransaction(t model.Transaction) { m.transactions = append(m.transactions, t) }

// SetBalance seeds an account balance.
func (m *MockProvider) SetBalance(accountID string, balance model.Money) {
	m.balances[accountID] = balance
}

// -------------------------------------------------------------------
// Registry
// -------------------------------------------------------------------

// Registry holds all registered providers.
type Registry struct {
	providers map[string]Provider
}

// NewRegistry creates an empty provider registry.
func NewRegistry() *Registry {
	return &Registry{providers: make(map[string]Provider)}
}

// Register adds a provider to the registry.
func (r *Registry) Register(p Provider) {
	r.providers[p.Name()] = p
}

// Get retrieves a provider by name.
func (r *Registry) Get(name string) (Provider, bool) {
	p, ok := r.providers[name]
	return p, ok
}

// All returns all registered providers.
func (r *Registry) All() []Provider {
	list := make([]Provider, 0, len(r.providers))
	for _, p := range r.providers {
		list = append(list, p)
	}
	return list
}
