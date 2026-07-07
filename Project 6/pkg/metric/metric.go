// Package metric exposes Prometheus metrics for the NexaFlow platform.

package metric

import (
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const ns = "nexaflow"

var (
	ShipmentsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: ns,
		Subsystem: "shipments",
		Name:      "total",
		Help:      "Total number of shipments created.",
	}, []string{"org_id", "status"})

	ShipmentDurationHours = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: ns,
		Subsystem: "shipments",
		Name:      "transit_duration_hours",
		Help:      "Distribution of shipment transit durations in hours.",
		Buckets:   []float64{1, 4, 8, 24, 48, 72, 120, 168},
	}, []string{"org_id", "service_level"})

	OrdersTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: ns,
		Subsystem: "orders",
		Name:      "total",
		Help:      "Total number of orders created.",
	}, []string{"org_id", "status"})

	InventoryLowStockEvents = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: ns,
		Subsystem: "inventory",
		Name:      "low_stock_events_total",
		Help:      "Total low-stock alerts triggered.",
	}, []string{"org_id", "warehouse_id"})

	FleetVehiclesActive = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Namespace: ns,
		Subsystem: "fleet",
		Name:      "vehicles_active",
		Help:      "Number of vehicles currently on a route.",
	}, []string{"org_id"})

	FleetVehiclesAvailable = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Namespace: ns,
		Subsystem: "fleet",
		Name:      "vehicles_available",
		Help:      "Number of vehicles available for dispatch.",
	}, []string{"org_id"})

	APIRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: ns,
		Subsystem: "api",
		Name:      "request_duration_seconds",
		Help:      "HTTP API request latency distribution.",
		Buckets:   prometheus.DefBuckets,
	}, []string{"method", "path", "status_code"})

	WorkflowExecutionsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Namespace: ns,
		Subsystem: "workflow",
		Name:      "executions_total",
		Help:      "Total workflow executions by result.",
	}, []string{"org_id", "workflow_type", "result"})

	RouteOptimizationDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: ns,
		Subsystem: "route",
		Name:      "optimization_duration_seconds",
		Help:      "Time taken for route optimization computations.",
		Buckets:   []float64{0.1, 0.5, 1, 2, 5, 10, 30},
	}, []string{"mode", "stops"})
)

// Register mounts the Prometheus metrics handler at /metrics.
func Register(mux *http.ServeMux) {
	mux.Handle("/metrics", promhttp.Handler())
}
