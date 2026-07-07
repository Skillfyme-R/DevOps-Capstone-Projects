// Package server wires together all NexaFlow subsystems and exposes them via
// a unified HTTP/gRPC endpoint. It mirrors Walrus's server composition pattern
// but is fully re-implemented for the logistics domain.

package server

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/nexaflow-io/nexaflow/pkg/apis/analytics"
	"github.com/nexaflow-io/nexaflow/pkg/apis/auth"
	"github.com/nexaflow-io/nexaflow/pkg/apis/dashboard"
	"github.com/nexaflow-io/nexaflow/pkg/apis/fleet"
	"github.com/nexaflow-io/nexaflow/pkg/apis/health"
	"github.com/nexaflow-io/nexaflow/pkg/apis/inventory"
	"github.com/nexaflow-io/nexaflow/pkg/apis/order"
	"github.com/nexaflow-io/nexaflow/pkg/apis/route"
	"github.com/nexaflow-io/nexaflow/pkg/apis/shipment"
	"github.com/nexaflow-io/nexaflow/pkg/apis/supplier"
	"github.com/nexaflow-io/nexaflow/pkg/apis/warehouse"
	"github.com/nexaflow-io/nexaflow/pkg/apis/workflow"
	"github.com/nexaflow-io/nexaflow/pkg/bus"
	"github.com/nexaflow-io/nexaflow/pkg/database"
	"github.com/nexaflow-io/nexaflow/pkg/metric"
	"github.com/nexaflow-io/nexaflow/pkg/scheduler"
	"github.com/nexaflow-io/nexaflow/pkg/telemetry"
)

// Options holds all runtime configuration for the NexaFlow server.
type Options struct {
	BindAddress    string
	Port           int
	MetricsPort    int
	DatabaseURL    string
	RedisURL       string
	JWTSecret      string
	TLSCertFile    string
	TLSKeyFile     string
	EnableTLS      bool
	LogLevel       string
	OTLPEndpoint   string
	CORSAllowedOrigins []string
}

// Server is the top-level NexaFlow application server.
type Server struct {
	opts      Options
	log       *zap.Logger
	db        *database.Client
	bus       *bus.EventBus
	scheduler *scheduler.Scheduler
	httpSrv   *http.Server
}

// NewCommand returns the cobra command that starts the server.
func NewCommand() *cobra.Command {
	opts := Options{
		BindAddress: "0.0.0.0",
		Port:        8080,
		MetricsPort: 9090,
		LogLevel:    "info",
	}

	cmd := &cobra.Command{
		Use:   "nexaflow-server",
		Short: "NexaFlow Logistics Orchestration Platform server",
		Long: `nexaflow-server starts the NexaFlow platform API server.

NexaFlow is an enterprise-grade Logistics & Supply Chain SaaS platform that
orchestrates shipments, warehouses, fleet, routes, orders, suppliers, and
fulfilment workflows from a single control plane.`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return run(cmd.Context(), opts)
		},
	}

	f := cmd.Flags()
	f.StringVar(&opts.BindAddress, "bind-address", opts.BindAddress, "IP address to bind the server to")
	f.IntVar(&opts.Port, "port", opts.Port, "HTTP port to listen on")
	f.IntVar(&opts.MetricsPort, "metrics-port", opts.MetricsPort, "Prometheus metrics port")
	f.StringVar(&opts.DatabaseURL, "database-url", os.Getenv("NEXAFLOW_DB_URL"), "PostgreSQL connection string")
	f.StringVar(&opts.RedisURL, "redis-url", os.Getenv("NEXAFLOW_REDIS_URL"), "Redis connection string")
	f.StringVar(&opts.JWTSecret, "jwt-secret", os.Getenv("NEXAFLOW_JWT_SECRET"), "Secret key for JWT signing")
	f.StringVar(&opts.TLSCertFile, "tls-cert", "", "Path to TLS certificate file")
	f.StringVar(&opts.TLSKeyFile, "tls-key", "", "Path to TLS private key file")
	f.BoolVar(&opts.EnableTLS, "enable-tls", false, "Enable TLS termination")
	f.StringVar(&opts.LogLevel, "log-level", opts.LogLevel, "Log level (debug|info|warn|error)")
	f.StringVar(&opts.OTLPEndpoint, "otlp-endpoint", os.Getenv("NEXAFLOW_OTLP_ENDPOINT"), "OpenTelemetry collector endpoint")
	f.StringSliceVar(&opts.CORSAllowedOrigins, "cors-allowed-origins", []string{"*"}, "Allowed CORS origins")

	return cmd
}

func run(ctx context.Context, opts Options) error {
	log, err := newLogger(opts.LogLevel)
	if err != nil {
		return fmt.Errorf("initialising logger: %w", err)
	}
	defer log.Sync() //nolint:errcheck

	if opts.OTLPEndpoint != "" {
		shutdown, err := telemetry.InitTracer(ctx, "nexaflow-server", opts.OTLPEndpoint)
		if err != nil {
			return fmt.Errorf("initialising tracer: %w", err)
		}
		defer shutdown(ctx) //nolint:errcheck
	}

	db, err := database.New(ctx, opts.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connecting to database: %w", err)
	}
	defer db.Close()

	eb := bus.New(log)
	sched := scheduler.New(log)

	mux := http.NewServeMux()

	// Register API handler groups — each maps to one logistics domain.
	health.Register(mux, db)
	auth.Register(mux, db, opts.JWTSecret)
	dashboard.Register(mux, db)
	shipment.Register(mux, db, eb)
	warehouse.Register(mux, db, eb)
	inventory.Register(mux, db, eb)
	fleet.Register(mux, db, eb)
	route.Register(mux, db)
	order.Register(mux, db, eb)
	supplier.Register(mux, db)
	analytics.Register(mux, db)
	workflow.Register(mux, db, eb, sched)
	metric.Register(mux)

	addr := fmt.Sprintf("%s:%d", opts.BindAddress, opts.Port)
	httpSrv := &http.Server{
		Addr:         addr,
		Handler:      corsMiddleware(opts.CORSAllowedOrigins, loggingMiddleware(log, mux)),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	sched.Start(ctx)

	go func() {
		log.Info("NexaFlow server listening", zap.String("addr", addr))
		var serveErr error
		if opts.EnableTLS {
			serveErr = httpSrv.ListenAndServeTLS(opts.TLSCertFile, opts.TLSKeyFile)
		} else {
			serveErr = httpSrv.ListenAndServe()
		}
		if serveErr != nil && serveErr != http.ErrServerClosed {
			log.Error("server error", zap.Error(serveErr))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("shutting down NexaFlow server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	sched.Stop()

	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}

	log.Info("NexaFlow server stopped")
	return nil
}

func newLogger(level string) (*zap.Logger, error) {
	cfg := zap.NewProductionConfig()
	switch level {
	case "debug":
		cfg.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	case "warn":
		cfg.Level = zap.NewAtomicLevelAt(zap.WarnLevel)
	case "error":
		cfg.Level = zap.NewAtomicLevelAt(zap.ErrorLevel)
	default:
		cfg.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	}
	return cfg.Build()
}

func corsMiddleware(origins []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowed := false
		for _, o := range origins {
			if o == "*" || o == origin {
				allowed = true
				break
			}
		}
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Request-ID")
			w.Header().Set("Access-Control-Max-Age", "86400")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func loggingMiddleware(log *zap.Logger, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)
		log.Info("http",
			zap.String("method", r.Method),
			zap.String("path", r.URL.Path),
			zap.Int("status", rw.statusCode),
			zap.Duration("duration", time.Since(start)),
			zap.String("remote", r.RemoteAddr),
		)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
