// Package api — router wires all VaultFlow API routes.
package api

import (
	"github.com/gin-gonic/gin"
	"github.com/vaultflow/vaultflow/pkg/metrics"
	"github.com/vaultflow/vaultflow/pkg/middleware"
)

// RouterConfig holds dependencies for route setup.
type RouterConfig struct {
	Version        string
	AllowedOrigins []string
	APIKeyHeader   string
	APIKeySecret   string
	Metrics        *metrics.Registry
	Store          *MemoryStore
}

// NewRouter builds and returns the configured Gin engine.
func NewRouter(cfg RouterConfig) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	r.Use(
		middleware.Recovery(),
		middleware.RequestID(),
		middleware.RequestLogger(),
		middleware.CORS(cfg.AllowedOrigins),
	)

	if cfg.Metrics != nil {
		r.Use(middleware.PrometheusMiddleware(cfg.Metrics))
	}

	// Public routes
	r.GET("/health", HandleHealth(cfg.Version))
	r.GET("/readyz", HandleHealth(cfg.Version))

	// Metrics handled separately via pkg/metrics.Handler()
	// mounted at a different port in main.

	// API v1 — authenticated
	v1 := r.Group("/api/v1")
	if cfg.APIKeySecret != "" {
		v1.Use(middleware.RequireAPIKey(cfg.APIKeyHeader, cfg.APIKeySecret))
	}
	{
		// Transactions
		txn := v1.Group("/transactions")
		txn.GET("", HandleListTransactions(cfg.Store))
		txn.POST("", HandleCreateTransaction(cfg.Store))

		// Expenses
		exp := v1.Group("/expenses")
		exp.GET("/summary", HandleExpenseSummary(cfg.Store))

		// Budgets
		bgt := v1.Group("/budgets")
		bgt.GET("", HandleListBudgets(cfg.Store))
		bgt.GET("/variance", HandleBudgetVariance(cfg.Store, cfg.Store))

		// Forecasting
		v1.GET("/forecasts", HandleForecast(cfg.Store))

		// Portfolio
		v1.GET("/portfolio", HandleGetPortfolio(cfg.Store))

		// Alerts
		v1.GET("/alerts", HandleListAlerts(cfg.Store))

		// Demo data — loads realistic seed data into the in-memory store
		v1.POST("/demo/seed", HandleSeedDemo(cfg.Store))
	}

	return r
}
