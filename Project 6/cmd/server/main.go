// NexaFlow Logistics Orchestration Platform
// Server entry point — bootstraps all core services and starts the HTTP/gRPC server.

package main

import (
	"os"

	"github.com/nexaflow-io/nexaflow/pkg/server"
)

func main() {
	if err := server.NewCommand().Execute(); err != nil {
		os.Exit(1)
	}
}
