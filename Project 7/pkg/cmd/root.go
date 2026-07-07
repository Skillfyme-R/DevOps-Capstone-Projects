// Package cmd implements the VaultFlow CLI commands.
package cmd

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
	"github.com/vaultflow/vaultflow/pkg/api"
	"github.com/vaultflow/vaultflow/pkg/config"
	"github.com/vaultflow/vaultflow/pkg/metrics"
)

const (
	appName    = "vaultflow"
	appVersion = "1.0.0"
	appBanner  = `
 __   __          _ _   ___ _
 \ \ / /_ _ _   _| | |_|  _| | _____      __
  \ V / _\ | | | | | __| |_| |/ _ \ \ /\ / /
   | | (_| | |_| | | |_|  _| | (_) \ V  V /
   |_|\__,_|\__,_|_|\__|_| |_|\___/ \_/\_/

  VaultFlow Technologies — Financial Intelligence Platform
  Version: %s  |  Every dollar. Every decision. In focus.
`
)

// Execute is the entrypoint called by main.
func Execute(args []string) error {
	root := newRootCmd()
	if args != nil {
		root.SetArgs(args)
	}
	return root.Execute()
}

func newRootCmd() *cobra.Command {
	var configPath string
	var logLevel string

	root := &cobra.Command{
		Use:   appName,
		Short: "VaultFlow — Real-time financial analytics platform",
		Long:  fmt.Sprintf(appBanner, appVersion),
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			return configureLogging(logLevel)
		},
	}

	root.PersistentFlags().StringVarP(&configPath, "config", "c", "", "Path to configuration file (YAML)")
	root.PersistentFlags().StringVar(&logLevel, "log-level", "info", "Log level: debug|info|warn|error")

	root.AddCommand(newServeCmd(&configPath))
	root.AddCommand(newVersionCmd())

	return root
}

func newVersionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print the VaultFlow version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("VaultFlow %s\n", appVersion)
		},
	}
}

func newServeCmd(configPath *string) *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start the VaultFlow API server",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runServer(*configPath)
		},
	}
}

func runServer(configPath string) error {
	cfg, err := config.Load(configPath)
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	log.Info().
		Str("version", appVersion).
		Str("env", cfg.Logging.Level).
		Msg("starting VaultFlow")

	// Prometheus metrics
	var reg *metrics.Registry
	if cfg.Metrics.Enabled {
		reg = metrics.New(cfg.Metrics.Namespace)
		log.Info().Int("port", cfg.Server.MetricsPort).Msg("metrics server starting")
		go func() {
			mux := http.NewServeMux()
			mux.Handle(cfg.Metrics.Path, metrics.Handler())
			addr := fmt.Sprintf(":%d", cfg.Server.MetricsPort)
			if err := http.ListenAndServe(addr, mux); err != nil {
				log.Error().Err(err).Msg("metrics server error")
			}
		}()
	}

	// Store
	store := api.NewMemoryStore()

	// Router
	router := api.NewRouter(api.RouterConfig{
		Version:        appVersion,
		AllowedOrigins: cfg.Server.AllowedOrigins,
		APIKeyHeader:   cfg.Auth.APIKeyHeader,
		APIKeySecret:   cfg.Auth.JWTSecret,
		Metrics:        reg,
		Store:          store,
	})

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeoutSec) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeoutSec) * time.Second,
	}

	log.Info().Str("addr", addr).Msg("API server starting")

	// graceful shutdown
	done := make(chan error, 1)
	go func() {
		done <- srv.ListenAndServe()
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-quit:
		log.Info().Str("signal", sig.String()).Msg("shutting down gracefully")
		ctx, cancel := context.WithTimeout(context.Background(), time.Duration(cfg.Server.ShutdownTimeout)*time.Second)
		defer cancel()
		return srv.Shutdown(ctx)
	case err := <-done:
		if err != nil && err != http.ErrServerClosed {
			return err
		}
	}
	return nil
}

func configureLogging(level string) error {
	lvl, err := zerolog.ParseLevel(level)
	if err != nil {
		return fmt.Errorf("invalid log level %q", level)
	}
	zerolog.SetGlobalLevel(lvl)
	log.Logger = zerolog.New(os.Stdout).With().Timestamp().Caller().Logger()
	return nil
}
