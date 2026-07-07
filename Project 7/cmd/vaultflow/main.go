package main

import (
	"os"

	"github.com/rs/zerolog/log"
	"github.com/vaultflow/vaultflow/pkg/cmd"
)

func main() {
	if err := cmd.Execute(nil); err != nil {
		log.Fatal().Err(err).Msg("VaultFlow exited with error")
		os.Exit(1)
	}
}
