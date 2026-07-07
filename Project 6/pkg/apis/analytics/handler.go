// Package analytics exposes aggregated KPI endpoints for the NexaFlow dashboard.

package analytics

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"go.uber.org/zap"

	"github.com/nexaflow-io/nexaflow/pkg/database"
)

type handler struct {
	db  *sql.DB
	log *zap.Logger
}

// KPISummary holds the top-level platform metrics for a time window.
type KPISummary struct {
	PeriodStart        time.Time `json:"period_start"`
	PeriodEnd          time.Time `json:"period_end"`
	TotalShipments     int       `json:"total_shipments"`
	DeliveredOnTime    int       `json:"delivered_on_time"`
	OnTimeRate         float64   `json:"on_time_delivery_rate"`
	AvgTransitHours    float64   `json:"avg_transit_hours"`
	TotalOrders        int       `json:"total_orders"`
	OrderFulfillRate   float64   `json:"order_fulfillment_rate"`
	ActiveVehicles     int       `json:"active_vehicles"`
	FleetUtilization   float64   `json:"fleet_utilization_rate"`
	WarehouseCount     int       `json:"warehouse_count"`
	LowStockAlerts     int       `json:"low_stock_alerts"`
	TotalRevenueCents  int64     `json:"total_revenue_cents"`
}

// ShipmentsByStatus groups shipment counts by their current status.
type ShipmentsByStatus struct {
	Status string `json:"status"`
	Count  int    `json:"count"`
}

// TopRoute represents the most-used origin→destination corridor.
type TopRoute struct {
	Origin      string  `json:"origin"`
	Destination string  `json:"destination"`
	ShipmentCount int   `json:"shipment_count"`
	AvgTransitH  float64 `json:"avg_transit_hours"`
}

func Register(mux *http.ServeMux, db *database.Client) {
	log, _ := zap.NewProduction()
	h := &handler{db: db.DB, log: log}

	mux.HandleFunc("/api/v1/analytics/kpi", h.kpiSummary)
	mux.HandleFunc("/api/v1/analytics/shipments-by-status", h.shipmentsByStatus)
	mux.HandleFunc("/api/v1/analytics/top-routes", h.topRoutes)
	mux.HandleFunc("/api/v1/analytics/fleet-utilization", h.fleetUtilization)
	mux.HandleFunc("/api/v1/analytics/revenue-trend", h.revenueTrend)
}

func (h *handler) kpiSummary(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	days := 30
	end := time.Now().UTC()
	start := end.AddDate(0, 0, -days)

	summary := KPISummary{
		PeriodStart: start,
		PeriodEnd:   end,
	}

	// Total shipments
	h.db.QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM shipments WHERE organization_id=$1 AND created_at BETWEEN $2 AND $3",
		orgID, start, end,
	).Scan(&summary.TotalShipments) //nolint:errcheck

	// Delivered on time
	h.db.QueryRowContext(r.Context(), `
		SELECT COUNT(*) FROM shipments
		WHERE organization_id=$1
		AND status='delivered'
		AND actual_delivery <= estimated_delivery
		AND created_at BETWEEN $2 AND $3`,
		orgID, start, end,
	).Scan(&summary.DeliveredOnTime) //nolint:errcheck

	if summary.TotalShipments > 0 {
		summary.OnTimeRate = float64(summary.DeliveredOnTime) / float64(summary.TotalShipments) * 100
	}

	// Average transit hours
	h.db.QueryRowContext(r.Context(), `
		SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (actual_delivery - created_at))/3600), 0)
		FROM shipments
		WHERE organization_id=$1 AND status='delivered' AND created_at BETWEEN $2 AND $3`,
		orgID, start, end,
	).Scan(&summary.AvgTransitHours) //nolint:errcheck

	// Total orders
	h.db.QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM orders WHERE organization_id=$1 AND created_at BETWEEN $2 AND $3",
		orgID, start, end,
	).Scan(&summary.TotalOrders) //nolint:errcheck

	// Low stock alerts
	h.db.QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM inventory_items WHERE organization_id=$1 AND status IN ('low_stock','out_of_stock')",
		orgID,
	).Scan(&summary.LowStockAlerts) //nolint:errcheck

	// Revenue from delivered orders
	h.db.QueryRowContext(r.Context(), `
		SELECT COALESCE(SUM(total_cents), 0) FROM orders
		WHERE organization_id=$1 AND status='delivered' AND created_at BETWEEN $2 AND $3`,
		orgID, start, end,
	).Scan(&summary.TotalRevenueCents) //nolint:errcheck

	writeJSON(w, http.StatusOK, summary)
}

func (h *handler) shipmentsByStatus(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT status, COUNT(*) as count
		FROM shipments WHERE organization_id=$1
		GROUP BY status ORDER BY count DESC`, orgID,
	)
	if err != nil {
		h.log.Error("shipments by status", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var result []ShipmentsByStatus
	for rows.Next() {
		var s ShipmentsByStatus
		rows.Scan(&s.Status, &s.Count) //nolint:errcheck
		result = append(result, s)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": result})
}

func (h *handler) topRoutes(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT origin_warehouse_id, destination_address,
		COUNT(*) as cnt,
		COALESCE(AVG(EXTRACT(EPOCH FROM (actual_delivery - created_at))/3600), 0) as avg_h
		FROM shipments WHERE organization_id=$1 AND status='delivered'
		GROUP BY origin_warehouse_id, destination_address
		ORDER BY cnt DESC LIMIT 10`, orgID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	var routes []TopRoute
	for rows.Next() {
		var rt TopRoute
		rows.Scan(&rt.Origin, &rt.Destination, &rt.ShipmentCount, &rt.AvgTransitH) //nolint:errcheck
		routes = append(routes, rt)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": routes})
}

func (h *handler) fleetUtilization(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")

	var total, onRoute int
	h.db.QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM vehicles WHERE organization_id=$1 AND is_active=true", orgID,
	).Scan(&total) //nolint:errcheck

	h.db.QueryRowContext(r.Context(),
		"SELECT COUNT(*) FROM vehicles WHERE organization_id=$1 AND status='on_route'", orgID,
	).Scan(&onRoute) //nolint:errcheck

	utilization := 0.0
	if total > 0 {
		utilization = float64(onRoute) / float64(total) * 100
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"total_vehicles":      total,
		"on_route":            onRoute,
		"utilization_percent": utilization,
	})
}

func (h *handler) revenueTrend(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")

	rows, err := h.db.QueryContext(r.Context(), `
		SELECT DATE_TRUNC('day', created_at) as day,
		SUM(total_cents) as revenue_cents,
		COUNT(*) as order_count
		FROM orders WHERE organization_id=$1 AND status='delivered'
		AND created_at >= NOW() - INTERVAL '30 days'
		GROUP BY day ORDER BY day`, orgID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "query failed")
		return
	}
	defer rows.Close()

	type DataPoint struct {
		Day          time.Time `json:"day"`
		RevenueCents int64     `json:"revenue_cents"`
		OrderCount   int       `json:"order_count"`
	}
	var trend []DataPoint
	for rows.Next() {
		var dp DataPoint
		rows.Scan(&dp.Day, &dp.RevenueCents, &dp.OrderCount) //nolint:errcheck
		trend = append(trend, dp)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"data": trend})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
