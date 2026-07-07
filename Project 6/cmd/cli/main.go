// NexaFlow CLI — command-line interface for managing logistics platform resources.

package main

import (
	"os"

	"github.com/nexaflow-io/nexaflow/pkg/cli"
)

func main() {
	if err := cli.NewRootCommand().Execute(); err != nil {
		os.Exit(1)
	}
}
