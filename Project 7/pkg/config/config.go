// Package config manages VaultFlow server configuration via file and environment.
package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

// Config holds the complete VaultFlow runtime configuration.
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Cache    CacheConfig    `mapstructure:"cache"`
	Auth     AuthConfig     `mapstructure:"auth"`
	Metrics  MetricsConfig  `mapstructure:"metrics"`
	Features FeatureConfig  `mapstructure:"features"`
	Logging  LoggingConfig  `mapstructure:"logging"`
}

// ServerConfig contains HTTP server settings.
type ServerConfig struct {
	Host            string   `mapstructure:"host"`
	Port            int      `mapstructure:"port"`
	MetricsPort     int      `mapstructure:"metrics_port"`
	AllowedOrigins  []string `mapstructure:"allowed_origins"`
	ReadTimeoutSec  int      `mapstructure:"read_timeout_sec"`
	WriteTimeoutSec int      `mapstructure:"write_timeout_sec"`
	ShutdownTimeout int      `mapstructure:"shutdown_timeout_sec"`
}

// DatabaseConfig contains primary datastore settings.
type DatabaseConfig struct {
	URL          string `mapstructure:"url"`
	MaxOpenConns int    `mapstructure:"max_open_conns"`
	MaxIdleConns int    `mapstructure:"max_idle_conns"`
	ConnLifetime int    `mapstructure:"conn_lifetime_min"`
}

// CacheConfig holds Redis cache settings.
type CacheConfig struct {
	URL      string `mapstructure:"url"`
	Password string `mapstructure:"password"`
	DB       int    `mapstructure:"db"`
	TTLMin   int    `mapstructure:"ttl_min"`
}

// AuthConfig contains authentication settings.
type AuthConfig struct {
	JWTSecret     string `mapstructure:"jwt_secret"`
	TokenTTLHours int    `mapstructure:"token_ttl_hours"`
	APIKeyHeader  string `mapstructure:"api_key_header"`
}

// MetricsConfig controls Prometheus metrics exposition.
type MetricsConfig struct {
	Enabled   bool   `mapstructure:"enabled"`
	Namespace string `mapstructure:"namespace"`
	Path      string `mapstructure:"path"`
}

// FeatureConfig toggles optional platform capabilities.
type FeatureConfig struct {
	Reconciliation bool `mapstructure:"reconciliation"`
	Forecasting    bool `mapstructure:"forecasting"`
	Alerting       bool `mapstructure:"alerting"`
	Portfolio      bool `mapstructure:"portfolio"`
}

// LoggingConfig controls structured logging behaviour.
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"` // json or text
}

// Load reads configuration from file and environment variables.
// Environment variables override file values (prefix: VAULTFLOW).
func Load(configPath string) (*Config, error) {
	v := viper.New()

	// defaults
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 9090)
	v.SetDefault("server.metrics_port", 9091)
	v.SetDefault("server.allowed_origins", []string{"*"})
	v.SetDefault("server.read_timeout_sec", 30)
	v.SetDefault("server.write_timeout_sec", 30)
	v.SetDefault("server.shutdown_timeout_sec", 15)
	v.SetDefault("database.max_open_conns", 25)
	v.SetDefault("database.max_idle_conns", 5)
	v.SetDefault("database.conn_lifetime_min", 30)
	v.SetDefault("cache.url", "redis://localhost:6379")
	v.SetDefault("cache.ttl_min", 10)
	v.SetDefault("auth.jwt_secret", "")
	v.SetDefault("auth.token_ttl_hours", 24)
	v.SetDefault("auth.api_key_header", "X-VaultFlow-API-Key")
	v.SetDefault("metrics.enabled", true)
	v.SetDefault("metrics.namespace", "vaultflow")
	v.SetDefault("metrics.path", "/metrics")
	v.SetDefault("features.reconciliation", true)
	v.SetDefault("features.forecasting", true)
	v.SetDefault("features.alerting", true)
	v.SetDefault("features.portfolio", true)
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "json")

	if configPath != "" {
		if _, err := os.Stat(configPath); os.IsNotExist(err) {
			return nil, fmt.Errorf("config file not found: %s", configPath)
		}
		v.SetConfigFile(configPath)
		if err := v.ReadInConfig(); err != nil {
			return nil, fmt.Errorf("reading config: %w", err)
		}
	}

	// allow env override: VAULTFLOW_SERVER_PORT → server.port
	v.SetEnvPrefix("VAULTFLOW")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshalling config: %w", err)
	}
	return &cfg, nil
}
