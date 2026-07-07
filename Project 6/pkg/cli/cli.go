// Package cli implements the nexaflow CLI for managing platform resources.

package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

const banner = `
  _   _                 _____ _
 | \ | |               |  ___| |
 |  \| | _____  ____ _ | |_  | | _____      __
 | . ` + "`" + ` |/ _ \ \/ / _` + "`" + ` ||  _| | |/ _ \ \ /\ / /
 | |\  |  __/>  < (_| || |   | | (_) \ V  V /
 |_| \_|\___/_/\_\__,_||_|   |_|\___/ \_/\_/

 Intelligent Logistics Orchestration Platform
 Version: %s
`

var version = "dev"

// NewRootCommand returns the root cobra command for the nexaflow CLI.
func NewRootCommand() *cobra.Command {
	var serverURL string

	root := &cobra.Command{
		Use:   "nexaflow",
		Short: "NexaFlow CLI — manage your logistics platform from the terminal",
		Long:  fmt.Sprintf(banner, version),
	}

	root.PersistentFlags().StringVar(&serverURL, "server", getEnvOrDefault("NEXAFLOW_SERVER", "http://localhost:8080"), "NexaFlow API server URL")

	root.AddCommand(
		newVersionCmd(),
		newShipmentCmd(serverURL),
		newWarehouseCmd(serverURL),
		newFleetCmd(serverURL),
		newOrderCmd(serverURL),
	)

	return root
}

func newVersionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "version",
		Short: "Print the NexaFlow CLI version",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("nexaflow version %s\n", version)
		},
	}
}

func newShipmentCmd(server string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "shipment",
		Short: "Manage shipments",
	}

	track := &cobra.Command{
		Use:   "track [tracking-number]",
		Short: "Track a shipment by its tracking number",
		Args:  cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Printf("Fetching tracking info for %s from %s...\n", args[0], server)
			// In a full CLI, this would call the API and pretty-print the result.
		},
	}

	list := &cobra.Command{
		Use:   "list",
		Short: "List recent shipments",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Listing shipments...")
		},
	}

	cmd.AddCommand(track, list)
	return cmd
}

func newWarehouseCmd(server string) *cobra.Command {
	return &cobra.Command{
		Use:   "warehouse",
		Short: "Manage warehouses",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Listing warehouses...")
		},
	}
}

func newFleetCmd(server string) *cobra.Command {
	return &cobra.Command{
		Use:   "fleet",
		Short: "Manage fleet vehicles",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Listing vehicles...")
		},
	}
}

func newOrderCmd(server string) *cobra.Command {
	return &cobra.Command{
		Use:   "order",
		Short: "Manage orders",
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("Listing orders...")
		},
	}
}

func getEnvOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
