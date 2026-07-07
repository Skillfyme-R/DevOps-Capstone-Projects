// Package model defines the canonical financial domain types used throughout VaultFlow.
package model

import (
	"time"

	"github.com/shopspring/decimal"
)

// Currency represents an ISO 4217 currency code.
type Currency string

const (
	CurrencyUSD Currency = "USD"
	CurrencyEUR Currency = "EUR"
	CurrencyGBP Currency = "GBP"
	CurrencyINR Currency = "INR"
	CurrencyJPY Currency = "JPY"
)

// Money is an immutable amount with an associated currency.
type Money struct {
	Amount   decimal.Decimal `json:"amount"`
	Currency Currency        `json:"currency"`
}

// Add returns the sum of m and other. Panics if currencies differ.
func (m Money) Add(other Money) Money {
	if m.Currency != other.Currency {
		panic("currency mismatch: " + string(m.Currency) + " vs " + string(other.Currency))
	}
	return Money{Amount: m.Amount.Add(other.Amount), Currency: m.Currency}
}

// Sub returns the difference m - other.
func (m Money) Sub(other Money) Money {
	if m.Currency != other.Currency {
		panic("currency mismatch: " + string(m.Currency) + " vs " + string(other.Currency))
	}
	return Money{Amount: m.Amount.Sub(other.Amount), Currency: m.Currency}
}

// IsZero reports whether the amount is zero.
func (m Money) IsZero() bool { return m.Amount.IsZero() }

// IsNegative reports whether the amount is negative.
func (m Money) IsNegative() bool { return m.Amount.IsNegative() }

// String implements fmt.Stringer.
func (m Money) String() string { return m.Amount.StringFixed(2) + " " + string(m.Currency) }

// NewMoney constructs a Money value from a float64.
func NewMoney(amount float64, currency Currency) Money {
	return Money{Amount: decimal.NewFromFloat(amount), Currency: currency}
}

// -------------------------------------------------------------------
// Account
// -------------------------------------------------------------------

// AccountType classifies a financial account.
type AccountType string

const (
	AccountTypeChecking   AccountType = "checking"
	AccountTypeSavings    AccountType = "savings"
	AccountTypeCredit     AccountType = "credit"
	AccountTypeInvestment AccountType = "investment"
	AccountTypeExpense    AccountType = "expense"
)

// Account represents a tracked financial account belonging to a tenant.
type Account struct {
	ID           string      `json:"id"`
	TenantID     string      `json:"tenant_id"`
	Name         string      `json:"name"`
	Type         AccountType `json:"type"`
	Currency     Currency    `json:"currency"`
	Balance      Money       `json:"balance"`
	Institution  string      `json:"institution"`
	ExternalRef  string      `json:"external_ref,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

// -------------------------------------------------------------------
// Transaction
// -------------------------------------------------------------------

// TransactionType classifies the direction of a transaction.
type TransactionType string

const (
	TransactionTypeDebit  TransactionType = "debit"
	TransactionTypeCredit TransactionType = "credit"
)

// TransactionStatus reflects the current lifecycle state.
type TransactionStatus string

const (
	TransactionStatusPending   TransactionStatus = "pending"
	TransactionStatusCleared   TransactionStatus = "cleared"
	TransactionStatusFailed    TransactionStatus = "failed"
	TransactionStatusReversed  TransactionStatus = "reversed"
)

// Transaction is an atomic financial event against an account.
type Transaction struct {
	ID          string            `json:"id"`
	AccountID   string            `json:"account_id"`
	TenantID    string            `json:"tenant_id"`
	Type        TransactionType   `json:"type"`
	Status      TransactionStatus `json:"status"`
	Amount      Money             `json:"amount"`
	Description string            `json:"description"`
	Category    string            `json:"category"`
	Tags        []string          `json:"tags,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	OccurredAt  time.Time         `json:"occurred_at"`
	CreatedAt   time.Time         `json:"created_at"`
}

// -------------------------------------------------------------------
// Budget
// -------------------------------------------------------------------

// BudgetPeriod defines the recurrence of a budget.
type BudgetPeriod string

const (
	BudgetPeriodMonthly   BudgetPeriod = "monthly"
	BudgetPeriodQuarterly BudgetPeriod = "quarterly"
	BudgetPeriodAnnual    BudgetPeriod = "annual"
)

// Budget defines an allocation of funds for a category over a period.
type Budget struct {
	ID         string       `json:"id"`
	TenantID   string       `json:"tenant_id"`
	Name       string       `json:"name"`
	Category   string       `json:"category"`
	Period     BudgetPeriod `json:"period"`
	Allocated  Money        `json:"allocated"`
	Spent      Money        `json:"spent"`
	Remaining  Money        `json:"remaining"`
	StartDate  time.Time    `json:"start_date"`
	EndDate    time.Time    `json:"end_date"`
	CreatedAt  time.Time    `json:"created_at"`
}

// Utilization returns the percentage of budget consumed (0–100+).
func (b Budget) Utilization() float64 {
	if b.Allocated.IsZero() {
		return 0
	}
	util, _ := b.Spent.Amount.Div(b.Allocated.Amount).Mul(decimal.NewFromInt(100)).Float64()
	return util
}

// -------------------------------------------------------------------
// Expense
// -------------------------------------------------------------------

// Expense is a classified spending event, derived from one or more transactions.
type Expense struct {
	ID          string    `json:"id"`
	TenantID    string    `json:"tenant_id"`
	AccountID   string    `json:"account_id"`
	Category    string    `json:"category"`
	Subcategory string    `json:"subcategory,omitempty"`
	Vendor      string    `json:"vendor"`
	Amount      Money     `json:"amount"`
	Date        time.Time `json:"date"`
	Notes       string    `json:"notes,omitempty"`
	Tags        []string  `json:"tags,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

// -------------------------------------------------------------------
// Portfolio
// -------------------------------------------------------------------

// AssetClass classifies an investment instrument.
type AssetClass string

const (
	AssetClassEquity      AssetClass = "equity"
	AssetClassFixedIncome AssetClass = "fixed_income"
	AssetClassCash        AssetClass = "cash"
	AssetClassAlternative AssetClass = "alternative"
	AssetClassCrypto      AssetClass = "crypto"
)

// Holding represents a single investment position.
type Holding struct {
	ID         string     `json:"id"`
	PortfolioID string    `json:"portfolio_id"`
	Symbol     string     `json:"symbol"`
	Name       string     `json:"name"`
	AssetClass AssetClass `json:"asset_class"`
	Quantity   decimal.Decimal `json:"quantity"`
	CostBasis  Money      `json:"cost_basis"`
	MarketValue Money     `json:"market_value"`
	UnrealizedPnL Money   `json:"unrealized_pnl"`
	Weight     float64    `json:"weight"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// Portfolio aggregates holdings for a tenant.
type Portfolio struct {
	ID           string    `json:"id"`
	TenantID     string    `json:"tenant_id"`
	Name         string    `json:"name"`
	TotalValue   Money     `json:"total_value"`
	TotalCost    Money     `json:"total_cost"`
	TotalPnL     Money     `json:"total_pnl"`
	Holdings     []Holding `json:"holdings"`
	LastSyncedAt time.Time `json:"last_synced_at"`
	CreatedAt    time.Time `json:"created_at"`
}

// -------------------------------------------------------------------
// Report
// -------------------------------------------------------------------

// ReportType enumerates the available report categories.
type ReportType string

const (
	ReportTypeExpenseSummary  ReportType = "expense_summary"
	ReportTypeCashFlow        ReportType = "cash_flow"
	ReportTypeBudgetVariance  ReportType = "budget_variance"
	ReportTypePortfolioPerf   ReportType = "portfolio_performance"
	ReportTypeReconciliation  ReportType = "reconciliation"
)

// Report is a pre-computed analytical result.
type Report struct {
	ID        string                 `json:"id"`
	TenantID  string                 `json:"tenant_id"`
	Type      ReportType             `json:"type"`
	PeriodStart time.Time            `json:"period_start"`
	PeriodEnd   time.Time            `json:"period_end"`
	Data      map[string]interface{} `json:"data"`
	GeneratedAt time.Time            `json:"generated_at"`
}

// -------------------------------------------------------------------
// Alert
// -------------------------------------------------------------------

// AlertSeverity represents the urgency of an alert.
type AlertSeverity string

const (
	AlertSeverityInfo     AlertSeverity = "info"
	AlertSeverityWarning  AlertSeverity = "warning"
	AlertSeverityCritical AlertSeverity = "critical"
)

// Alert is a system-generated notification for financial events.
type Alert struct {
	ID        string        `json:"id"`
	TenantID  string        `json:"tenant_id"`
	Severity  AlertSeverity `json:"severity"`
	Title     string        `json:"title"`
	Message   string        `json:"message"`
	Source    string        `json:"source"`
	Resolved  bool          `json:"resolved"`
	CreatedAt time.Time     `json:"created_at"`
}
