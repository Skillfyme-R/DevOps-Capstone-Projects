package api

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vaultflow/vaultflow/core/pkg/model"
)

// HandleSeedDemo loads realistic demo data into the store so every UI
// section shows live content without needing external integrations.
func HandleSeedDemo(store *MemoryStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		seedDemoData(store)
		c.JSON(http.StatusOK, gin.H{
			"message":      "Demo data loaded successfully",
			"transactions": 30,
			"budgets":      6,
			"alerts":       5,
		})
	}
}

func seedDemoData(store *MemoryStore) {
	ctx := context.Background()
	now := time.Now().UTC()
	tenantID := "default"
	accountID := "acc-demo-001"

	// ── Transactions ─────────────────────────────────────────────────
	type txSeed struct {
		days   int; desc string; cat string
		amount float64; typ model.TransactionType; status model.TransactionStatus
	}
	txSeeds := []txSeed{
		{1,  "AWS Cloud Infrastructure",      "Cloud Services", 3842.50, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{2,  "Stripe Revenue – July",          "Revenue",       18750.00, model.TransactionTypeCredit, model.TransactionStatusCleared},
		{3,  "Google Workspace",               "SaaS Tools",      480.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{3,  "Payroll – Engineering",          "Payroll",       24600.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{5,  "Datadog Monitoring",             "Cloud Services",  920.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{6,  "Investor Transfer Q3",           "Funding",       50000.00, model.TransactionTypeCredit, model.TransactionStatusCleared},
		{7,  "GitHub Enterprise",              "SaaS Tools",      210.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{8,  "Payroll – Sales",                "Payroll",       18200.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{9,  "Office Lease – July",            "Facilities",     5500.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{10, "Customer Invoice #INV-1041",      "Revenue",        7200.00, model.TransactionTypeCredit, model.TransactionStatusCleared},
		{11, "Figma Team",                     "SaaS Tools",       75.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{12, "GCP BigQuery",                   "Cloud Services", 1140.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{13, "Marketing – LinkedIn Ads",        "Marketing",      2800.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{14, "Customer Invoice #INV-1042",      "Revenue",       12400.00, model.TransactionTypeCredit, model.TransactionStatusCleared},
		{15, "Payroll – Support",              "Payroll",        9800.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{16, "Cloudflare CDN",                 "Cloud Services",  320.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{17, "HubSpot CRM",                    "SaaS Tools",      890.00, model.TransactionTypeDebit,  model.TransactionStatusPending},
		{18, "Team Offsite – San Francisco",   "Travel",         4100.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{19, "Stripe Revenue – Adjustment",    "Revenue",        3600.00, model.TransactionTypeCredit, model.TransactionStatusCleared},
		{20, "Legal Retainer",                 "Legal",          2500.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{21, "Payroll – Design",               "Payroll",       11400.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{22, "Vercel Pro",                     "Cloud Services",  150.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{23, "AWS Reserved Instances",         "Cloud Services", 6200.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{24, "Customer Invoice #INV-1043",      "Revenue",        9900.00, model.TransactionTypeCredit, model.TransactionStatusCleared},
		{25, "Google Ads – Q3 Campaign",       "Marketing",      3750.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{26, "1Password Business",             "SaaS Tools",       95.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{27, "Payroll – Product",              "Payroll",       16800.00, model.TransactionTypeDebit,  model.TransactionStatusPending},
		{28, "PagerDuty On-Call",              "Cloud Services",  280.00, model.TransactionTypeDebit,  model.TransactionStatusCleared},
		{29, "Customer Invoice #INV-1044",      "Revenue",        5500.00, model.TransactionTypeCredit, model.TransactionStatusPending},
		{30, "Twilio SMS",                     "Cloud Services",  440.00, model.TransactionTypeDebit,  model.TransactionStatusFailed},
	}
	for _, s := range txSeeds {
		_ = store.CreateTransaction(ctx, model.Transaction{
			ID: uuid.NewString(), AccountID: accountID, TenantID: tenantID,
			Type: s.typ, Status: s.status,
			Amount:      model.NewMoney(s.amount, model.CurrencyUSD),
			Description: s.desc, Category: s.cat,
			OccurredAt: now.AddDate(0, 0, -s.days),
			CreatedAt:  now.AddDate(0, 0, -s.days),
		})
	}

	// ── Expenses (current month + 12 months historical for forecasting) ─
	type expSeed struct {
		days int; cat string; vendor string; amount float64
	}
	expSeeds := []expSeed{
		{1, "Cloud Services", "Amazon Web Services", 3842.50},
		{3, "SaaS Tools", "Google Workspace", 480.00},
		{3, "Payroll", "ADP Payroll", 24600.00},
		{5, "Cloud Services", "Datadog", 920.00},
		{7, "SaaS Tools", "GitHub", 210.00},
		{8, "Payroll", "ADP Payroll", 18200.00},
		{9, "Facilities", "WeWork", 5500.00},
		{11, "SaaS Tools", "Figma", 75.00},
		{12, "Cloud Services", "Google Cloud", 1140.00},
		{13, "Marketing", "LinkedIn", 2800.00},
		{15, "Payroll", "ADP Payroll", 9800.00},
		{16, "Cloud Services", "Cloudflare", 320.00},
		{17, "SaaS Tools", "HubSpot", 890.00},
		{18, "Travel", "Marriott Hotels", 4100.00},
		{20, "Legal", "Wilson Sonsini", 2500.00},
		{21, "Payroll", "ADP Payroll", 11400.00},
		{22, "Cloud Services", "Vercel", 150.00},
		{23, "Cloud Services", "Amazon Web Services", 6200.00},
		{25, "Marketing", "Google Ads", 3750.00},
		{26, "SaaS Tools", "1Password", 95.00},
		{27, "Payroll", "ADP Payroll", 16800.00},
		{28, "Cloud Services", "PagerDuty", 280.00},
		{30, "Cloud Services", "Twilio", 440.00},
	}
	for _, s := range expSeeds {
		_ = store.CreateExpense(ctx, model.Expense{
			ID: uuid.NewString(), TenantID: tenantID, AccountID: accountID,
			Category: s.cat, Vendor: s.vendor,
			Amount: model.NewMoney(s.amount, model.CurrencyUSD),
			Date:      now.AddDate(0, 0, -s.days),
			CreatedAt: now.AddDate(0, 0, -s.days),
		})
	}
	// Historical monthly totals so the forecast model has data to train on
	historicalMonthly := []float64{48200, 52100, 61400, 58900, 63200, 59800, 67100, 71400, 68900, 74200, 79100, 82400}
	for i, total := range historicalMonthly {
		monthsBack := len(historicalMonthly) - i
		for _, e := range []struct{ cat, vendor string; pct float64 }{
			{"Cloud Services", "AWS", 0.38},
			{"Payroll", "ADP Payroll", 0.52},
			{"Marketing", "Google Ads", 0.10},
		} {
			_ = store.CreateExpense(ctx, model.Expense{
				ID: uuid.NewString(), TenantID: tenantID, AccountID: accountID,
				Category: e.cat, Vendor: e.vendor,
				Amount:    model.NewMoney(total*e.pct, model.CurrencyUSD),
				Date:      now.AddDate(0, -monthsBack, 0),
				CreatedAt: now.AddDate(0, -monthsBack, 0),
			})
		}
	}

	// ── Budgets ───────────────────────────────────────────────────────
	monthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	monthEnd := monthStart.AddDate(0, 1, -1)
	type budSeed struct{ name, category string; allocated, spent float64 }
	budSeeds := []budSeed{
		{"Cloud Infrastructure", "Cloud Services", 15000, 13292.50},
		{"Team Payroll",         "Payroll",         85000, 80800.00},
		{"SaaS & Tooling",       "SaaS Tools",       3000,  1750.00},
		{"Marketing Budget",     "Marketing",        8000,  6550.00},
		{"Travel & Events",      "Travel",           6000,  4100.00},
		{"Facilities & Office",  "Facilities",       6000,  5500.00},
	}
	for _, s := range budSeeds {
		alloc := model.NewMoney(s.allocated, model.CurrencyUSD)
		spent := model.NewMoney(s.spent, model.CurrencyUSD)
		_ = store.CreateBudget(ctx, model.Budget{
			ID: uuid.NewString(), TenantID: tenantID,
			Name: s.name, Category: s.category, Period: model.BudgetPeriodMonthly,
			Allocated: alloc, Spent: spent, Remaining: alloc.Sub(spent),
			StartDate: monthStart, EndDate: monthEnd, CreatedAt: monthStart,
		})
	}

	// ── Alerts ────────────────────────────────────────────────────────
	type alertSeed struct {
		severity model.AlertSeverity; title, message, source string; minsAgo int
	}
	alertSeeds := []alertSeed{
		{model.AlertSeverityCritical, "Payroll Budget at 95%",        "Team Payroll is 95.1% utilized with 8 days remaining.",           "budget-engine",    12},
		{model.AlertSeverityWarning,  "Cloud Spend Spike Detected",    "AWS spend increased 22% vs last week.",                           "anomaly-detector", 45},
		{model.AlertSeverityWarning,  "Marketing Budget at 82%",       "Marketing budget reached 81.9% — Q3 campaign still running.",     "budget-engine",    120},
		{model.AlertSeverityInfo,     "3 Transactions Pending",        "HubSpot CRM, Payroll-Product and Invoice #INV-1044 are pending.", "reconciler",       180},
		{model.AlertSeverityInfo,     "Forecast Updated",              "August spend forecast revised to $91,200 based on July run-rate.","forecast-engine",  360},
	}
	for _, s := range alertSeeds {
		_ = store.CreateAlert(ctx, model.Alert{
			ID: uuid.NewString(), TenantID: tenantID,
			Severity: s.severity, Title: s.title, Message: s.message, Source: s.source,
			Resolved: false, CreatedAt: now.Add(-time.Duration(s.minsAgo) * time.Minute),
		})
	}
}
