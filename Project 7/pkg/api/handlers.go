// Package api implements the VaultFlow REST API handlers.
package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/vaultflow/vaultflow/core/pkg/analytics"
	"github.com/vaultflow/vaultflow/core/pkg/budget"
	"github.com/vaultflow/vaultflow/core/pkg/forecast"
	"github.com/vaultflow/vaultflow/core/pkg/model"
)

// HealthResponse is the shape of the health-check endpoint response.
type HealthResponse struct {
	Status    string    `json:"status"`
	Version   string    `json:"version"`
	Timestamp time.Time `json:"timestamp"`
}

// HandleHealth returns 200 OK with service status.
func HandleHealth(version string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(http.StatusOK, HealthResponse{
			Status:    "ok",
			Version:   version,
			Timestamp: time.Now().UTC(),
		})
	}
}

// -------------------------------------------------------------------
// Transactions
// -------------------------------------------------------------------

// HandleListTransactions returns paginated transactions for an account.
func HandleListTransactions(store TransactionStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := c.GetHeader("X-Tenant-ID")
		if tenantID == "" {
			tenantID = "default"
		}

		startStr := c.DefaultQuery("start", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
		endStr := c.DefaultQuery("end", time.Now().Format("2006-01-02"))

		start, err := time.Parse("2006-01-02", startStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start date"})
			return
		}
		end, err := time.Parse("2006-01-02", endStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end date"})
			return
		}

		txns, err := store.ListTransactions(c.Request.Context(), tenantID, start, end)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"transactions": txns, "count": len(txns)})
	}
}

// HandleCreateTransaction records a new transaction.
func HandleCreateTransaction(store TransactionStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req model.Transaction
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		req.ID = uuid.NewString()
		req.CreatedAt = time.Now().UTC()
		if req.OccurredAt.IsZero() {
			req.OccurredAt = req.CreatedAt
		}
		if req.Status == "" {
			req.Status = model.TransactionStatusPending
		}

		if err := store.CreateTransaction(c.Request.Context(), req); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, req)
	}
}

// -------------------------------------------------------------------
// Expenses
// -------------------------------------------------------------------

// HandleExpenseSummary returns an aggregated expense summary.
func HandleExpenseSummary(store ExpenseStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := c.DefaultQuery("tenant_id", "default")
		startStr := c.DefaultQuery("start", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
		endStr := c.DefaultQuery("end", time.Now().Format("2006-01-02"))

		start, _ := time.Parse("2006-01-02", startStr)
		end, _ := time.Parse("2006-01-02", endStr)

		expenses, err := store.ListExpenses(c.Request.Context(), tenantID, start, end)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		window := analytics.Window{Start: start, End: end}
		summary := analytics.AggregateExpenses(expenses, window, model.CurrencyUSD)
		c.JSON(http.StatusOK, summary)
	}
}

// -------------------------------------------------------------------
// Budgets
// -------------------------------------------------------------------

// HandleListBudgets returns all budgets for a tenant.
func HandleListBudgets(store BudgetStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := c.DefaultQuery("tenant_id", "default")
		budgets, err := store.ListBudgets(c.Request.Context(), tenantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"budgets": budgets})
	}
}

// HandleBudgetVariance returns variance analysis for all active budgets.
func HandleBudgetVariance(budgetStore BudgetStore, expenseStore ExpenseStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := c.DefaultQuery("tenant_id", "default")

		budgets, err := budgetStore.ListBudgets(c.Request.Context(), tenantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		now := time.Now()
		expenses, err := expenseStore.ListExpenses(c.Request.Context(), tenantID, now.AddDate(0, -3, 0), now)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		eng := budget.NewEngine()
		results := eng.ComputeVariance(budgets, expenses)
		c.JSON(http.StatusOK, gin.H{"variance": results})
	}
}

// -------------------------------------------------------------------
// Forecasting
// -------------------------------------------------------------------

// HandleForecast returns spending forecasts for the next N months.
func HandleForecast(store ExpenseStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := c.DefaultQuery("tenant_id", "default")
		months := 3

		now := time.Now()
		expenses, err := store.ListExpenses(c.Request.Context(), tenantID, now.AddDate(-1, 0, 0), now)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// aggregate into monthly totals
		monthly := make(map[string]float64)
		for _, e := range expenses {
			key := e.Date.Format("2006-01")
			amt, _ := e.Amount.Amount.Float64()
			monthly[key] += amt
		}

		results := forecast.ExpensesForecast(monthly, months, model.CurrencyUSD)
		c.JSON(http.StatusOK, gin.H{"forecasts": results, "horizon_months": months})
	}
}

// -------------------------------------------------------------------
// Portfolios
// -------------------------------------------------------------------

// HandleGetPortfolio returns portfolio holdings and performance.
func HandleGetPortfolio(store PortfolioStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := c.DefaultQuery("tenant_id", "default")
		portfolio, err := store.GetPortfolio(c.Request.Context(), tenantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, portfolio)
	}
}

// -------------------------------------------------------------------
// Alerts
// -------------------------------------------------------------------

// HandleListAlerts returns unresolved alerts for a tenant.
func HandleListAlerts(store AlertStore) gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantID := c.DefaultQuery("tenant_id", "default")
		alerts, err := store.ListAlerts(c.Request.Context(), tenantID, false)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"alerts": alerts, "count": len(alerts)})
	}
}
