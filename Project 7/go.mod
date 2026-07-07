module github.com/vaultflow/vaultflow

go 1.22

require (
	github.com/gin-gonic/gin v1.9.1
	github.com/google/uuid v1.6.0
	github.com/prometheus/client_golang v1.19.1
	github.com/rs/zerolog v1.33.0
	github.com/shopspring/decimal v1.4.0
	github.com/spf13/cobra v1.8.1
	github.com/spf13/viper v1.19.0
	gopkg.in/yaml.v3 v3.0.1
	github.com/vaultflow/vaultflow/core v0.0.0
)

replace github.com/vaultflow/vaultflow/core => ./core
