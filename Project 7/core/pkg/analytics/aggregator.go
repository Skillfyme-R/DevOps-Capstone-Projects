// Package analytics provides financial aggregation and computation engines.
package analytics

import (
	"sort"
	"time"

	"github.com/shopspring/decimal"
	"github.com/vaultflow/vaultflow/core/pkg/model"
)

// Window defines a time range for aggregation.
type Window struct {
	Start time.Time
	End   time.Time
}

// Duration returns the window duration.
func (w Window) Duration() time.Duration { return w.End.Sub(w.Start) }

// Contains reports whether t falls within the window (inclusive).
func (w Window) Contains(t time.Time) bool {
	return !t.Before(w.Start) && !t.After(w.End)
}

// -------------------------------------------------------------------
// ExpenseAggregator
// -------------------------------------------------------------------

// CategoryTotal holds aggregated expense totals per category.
type CategoryTotal struct {
	Category    string        `json:"category"`
	Total       model.Money   `json:"total"`
	Count       int           `json:"count"`
	Percentage  float64       `json:"percentage"`
}

// ExpenseSummary is the result of aggregating expenses over a window.
type ExpenseSummary struct {
	Window      Window           `json:"window"`
	TotalSpend  model.Money      `json:"total_spend"`
	Categories  []CategoryTotal  `json:"categories"`
	TopVendors  []VendorTotal    `json:"top_vendors"`
	DailyTotals []DailyTotal     `json:"daily_totals"`
}

// VendorTotal holds aggregated totals per vendor.
type VendorTotal struct {
	Vendor string      `json:"vendor"`
	Total  model.Money `json:"total"`
	Count  int         `json:"count"`
}

// DailyTotal holds the aggregate spending for a single day.
type DailyTotal struct {
	Date  time.Time   `json:"date"`
	Total model.Money `json:"total"`
}

// AggregateExpenses computes an ExpenseSummary from a slice of expenses.
func AggregateExpenses(expenses []model.Expense, window Window, currency model.Currency) ExpenseSummary {
	catMap := make(map[string]*CategoryTotal)
	vendorMap := make(map[string]*VendorTotal)
	dayMap := make(map[string]*DailyTotal)

	totalAmount := decimal.Zero

	for _, e := range expenses {
		if !window.Contains(e.Date) {
			continue
		}

		amt := e.Amount.Amount

		// category
		if _, ok := catMap[e.Category]; !ok {
			catMap[e.Category] = &CategoryTotal{
				Category: e.Category,
				Total:    model.Money{Currency: currency},
			}
		}
		catMap[e.Category].Total.Amount = catMap[e.Category].Total.Amount.Add(amt)
		catMap[e.Category].Count++

		// vendor
		if _, ok := vendorMap[e.Vendor]; !ok {
			vendorMap[e.Vendor] = &VendorTotal{
				Vendor: e.Vendor,
				Total:  model.Money{Currency: currency},
			}
		}
		vendorMap[e.Vendor].Total.Amount = vendorMap[e.Vendor].Total.Amount.Add(amt)
		vendorMap[e.Vendor].Count++

		// daily
		dayKey := e.Date.Format("2006-01-02")
		if _, ok := dayMap[dayKey]; !ok {
			dayMap[dayKey] = &DailyTotal{
				Date:  truncateDay(e.Date),
				Total: model.Money{Currency: currency},
			}
		}
		dayMap[dayKey].Total.Amount = dayMap[dayKey].Total.Amount.Add(amt)

		totalAmount = totalAmount.Add(amt)
	}

	// build category slice with percentages
	cats := make([]CategoryTotal, 0, len(catMap))
	for _, c := range catMap {
		if !totalAmount.IsZero() {
			pct, _ := c.Total.Amount.Div(totalAmount).Mul(decimal.NewFromInt(100)).Float64()
			c.Percentage = pct
		}
		cats = append(cats, *c)
	}
	sort.Slice(cats, func(i, j int) bool {
		return cats[i].Total.Amount.GreaterThan(cats[j].Total.Amount)
	})

	// build vendor slice (top 10)
	vendors := make([]VendorTotal, 0, len(vendorMap))
	for _, v := range vendorMap {
		vendors = append(vendors, *v)
	}
	sort.Slice(vendors, func(i, j int) bool {
		return vendors[i].Total.Amount.GreaterThan(vendors[j].Total.Amount)
	})
	if len(vendors) > 10 {
		vendors = vendors[:10]
	}

	// build daily slice
	days := make([]DailyTotal, 0, len(dayMap))
	for _, d := range dayMap {
		days = append(days, *d)
	}
	sort.Slice(days, func(i, j int) bool { return days[i].Date.Before(days[j].Date) })

	return ExpenseSummary{
		Window:      window,
		TotalSpend:  model.Money{Amount: totalAmount, Currency: currency},
		Categories:  cats,
		TopVendors:  vendors,
		DailyTotals: days,
	}
}

func truncateDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// -------------------------------------------------------------------
// CashFlowAggregator
// -------------------------------------------------------------------

// CashFlowPeriod holds net cash flow metrics for a single period.
type CashFlowPeriod struct {
	Label    string      `json:"label"`
	Inflows  model.Money `json:"inflows"`
	Outflows model.Money `json:"outflows"`
	Net      model.Money `json:"net"`
}

// CashFlowSummary aggregates transactions into period-level cash flow.
type CashFlowSummary struct {
	Window  Window           `json:"window"`
	Periods []CashFlowPeriod `json:"periods"`
	NetFlow model.Money      `json:"net_flow"`
}

// AggregateCashFlow groups transactions by month and computes cash flow.
func AggregateCashFlow(txns []model.Transaction, window Window, currency model.Currency) CashFlowSummary {
	type monthKey struct{ year int; month time.Month }
	periodMap := make(map[monthKey]*CashFlowPeriod)

	for _, t := range txns {
		if !window.Contains(t.OccurredAt) {
			continue
		}
		key := monthKey{t.OccurredAt.Year(), t.OccurredAt.Month()}
		if _, ok := periodMap[key]; !ok {
			label := t.OccurredAt.Format("Jan 2006")
			periodMap[key] = &CashFlowPeriod{
				Label:    label,
				Inflows:  model.Money{Currency: currency},
				Outflows: model.Money{Currency: currency},
				Net:      model.Money{Currency: currency},
			}
		}
		p := periodMap[key]
		if t.Type == model.TransactionTypeCredit {
			p.Inflows.Amount = p.Inflows.Amount.Add(t.Amount.Amount)
		} else {
			p.Outflows.Amount = p.Outflows.Amount.Add(t.Amount.Amount)
		}
		p.Net.Amount = p.Inflows.Amount.Sub(p.Outflows.Amount)
	}

	periods := make([]CashFlowPeriod, 0, len(periodMap))
	for _, p := range periodMap {
		periods = append(periods, *p)
	}
	sort.Slice(periods, func(i, j int) bool { return periods[i].Label < periods[j].Label })

	netFlow := decimal.Zero
	for _, p := range periods {
		netFlow = netFlow.Add(p.Net.Amount)
	}

	return CashFlowSummary{
		Window:  window,
		Periods: periods,
		NetFlow: model.Money{Amount: netFlow, Currency: currency},
	}
}
