// Package env provides typed access to VaultFlow environment variables.
package env

import (
	"os"
	"strconv"
)

func getString(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func getBool(key string, defaultVal bool) bool {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return defaultVal
	}
	return b
}

func getInt(key string, defaultVal int) int {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	i, err := strconv.Atoi(v)
	if err != nil {
		return defaultVal
	}
	return i
}

// --- Server ---

// GetHTTPPort returns the port VaultFlow listens on.
func GetHTTPPort() string { return getString("VAULTFLOW_HTTP_PORT", "9090") }

// GetMetricsPort returns the Prometheus metrics port.
func GetMetricsPort() string { return getString("VAULTFLOW_METRICS_PORT", "9091") }

// GetLogLevel returns the log verbosity level.
func GetLogLevel() string { return getString("VAULTFLOW_LOG_LEVEL", "info") }

// GetEnvironment returns the deployment environment (production/staging/development).
func GetEnvironment() string { return getString("VAULTFLOW_ENV", "development") }

// --- Database ---

// GetDatabaseURL returns the primary database connection string.
func GetDatabaseURL() string { return getString("VAULTFLOW_DATABASE_URL", "") }

// GetDatabaseMaxConns returns the maximum DB connection pool size.
func GetDatabaseMaxConns() int { return getInt("VAULTFLOW_DB_MAX_CONNS", 25) }

// GetRedisURL returns the Redis cache connection URL.
func GetRedisURL() string { return getString("VAULTFLOW_REDIS_URL", "redis://localhost:6379") }

// --- Security ---

// GetJWTSecret returns the secret key used to sign JWTs.
func GetJWTSecret() string { return getString("VAULTFLOW_JWT_SECRET", "change-me-in-production") }

// GetAPIKeyHeaderName returns the header name for API key auth.
func GetAPIKeyHeaderName() string { return getString("VAULTFLOW_API_KEY_HEADER", "X-VaultFlow-API-Key") }

// --- Cloud Providers ---

// GetAWSRegion returns the target AWS region.
func GetAWSRegion() string { return getString("AWS_REGION", "us-east-1") }

// GetGCPProject returns the GCP project ID.
func GetGCPProject() string { return getString("GCP_PROJECT_ID", "") }

// GetAzureSubscription returns the Azure subscription ID.
func GetAzureSubscription() string { return getString("AZURE_SUBSCRIPTION_ID", "") }

// --- Features ---

// IsReconciliationEnabled returns whether payment reconciliation is active.
func IsReconciliationEnabled() bool { return getBool("VAULTFLOW_RECONCILIATION_ENABLED", true) }

// IsForecastingEnabled returns whether ML-based forecasting is active.
func IsForecastingEnabled() bool { return getBool("VAULTFLOW_FORECASTING_ENABLED", true) }

// IsAlertingEnabled returns whether the alerting subsystem is active.
func IsAlertingEnabled() bool { return getBool("VAULTFLOW_ALERTING_ENABLED", true) }

// GetDefaultCurrency returns the platform's default currency code.
func GetDefaultCurrency() string { return getString("VAULTFLOW_DEFAULT_CURRENCY", "USD") }

// --- Prometheus ---

// GetPrometheusEnabled returns whether Prometheus exposition is active.
func GetPrometheusEnabled() bool { return getBool("VAULTFLOW_PROMETHEUS_ENABLED", true) }

// GetPrometheusNamespace returns the metrics namespace prefix.
func GetPrometheusNamespace() string { return getString("VAULTFLOW_PROMETHEUS_NAMESPACE", "vaultflow") }
