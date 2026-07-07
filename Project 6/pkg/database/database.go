// Package database manages PostgreSQL connections and schema migrations for NexaFlow.

package database

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"go.uber.org/zap"
)

// Client wraps a *sql.DB with NexaFlow-specific helpers.
type Client struct {
	DB  *sql.DB
	log *zap.Logger
}

// Config holds database connection parameters.
type Config struct {
	URL             string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// New creates a new database client and verifies connectivity.
func New(ctx context.Context, url string) (*Client, error) {
	return NewWithConfig(ctx, Config{
		URL:             url,
		MaxOpenConns:    25,
		MaxIdleConns:    5,
		ConnMaxLifetime: 5 * time.Minute,
		ConnMaxIdleTime: 1 * time.Minute,
	})
}

// NewWithConfig creates a new database client using full configuration.
func NewWithConfig(ctx context.Context, cfg Config) (*Client, error) {
	if cfg.URL == "" {
		return nil, fmt.Errorf("database URL is required (set NEXAFLOW_DB_URL)")
	}

	db, err := sql.Open("pgx", cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("opening database connection: %w", err)
	}

	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, fmt.Errorf("pinging database: %w", err)
	}

	log, _ := zap.NewProduction()
	log.Info("database connection established", zap.String("url", maskURL(cfg.URL)))

	return &Client{DB: db, log: log}, nil
}

// Close releases all database connections.
func (c *Client) Close() error {
	return c.DB.Close()
}

// Healthy returns nil if the database can be reached.
func (c *Client) Healthy(ctx context.Context) error {
	return c.DB.PingContext(ctx)
}

// WithTx executes fn inside a database transaction, rolling back on error.
func (c *Client) WithTx(ctx context.Context, fn func(tx *sql.Tx) error) error {
	tx, err := c.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			c.log.Error("rollback failed", zap.Error(rbErr))
		}
		return err
	}

	return tx.Commit()
}

// maskURL redacts the password from a database connection URL for logging.
func maskURL(url string) string {
	for i, c := range url {
		if c == '@' {
			// Find the start of credentials (after "://")
			start := 0
			for j := i - 1; j >= 0; j-- {
				if url[j] == '/' && j > 0 && url[j-1] == '/' {
					start = j + 1
					break
				}
			}
			if start > 0 {
				return url[:start] + "****:****" + url[i:]
			}
		}
	}
	return url
}
