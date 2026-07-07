// Package dashboard serves the aggregated platform overview for the NexaFlow UI.

package dashboard

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"

	"github.com/nexaflow-io/nexaflow/pkg/database"
)

// Overview is the top-level response for the main dashboard endpoint.
type Overview struct {
	GeneratedAt        time.Time          `json:"generated_at"`
	ActiveShipments    int                `json:"active_shipments"`
	PendingOrders      int                `json:"pending_orders"`
	AvailableVehicles  int                `json:"available_vehicles"`
	WarehouseCount     int                `json:"warehouse_count"`
	LowStockItems      int                `json:"low_stock_items"`
	RecentShipments    []RecentShipment   `json:"recent_shipments"`
	RecentAlerts       []Alert            `json:"recent_alerts"`
}

type RecentShipment struct {
	ID             string    `json:"id"`
	TrackingNumber string    `json:"tracking_number"`
	Status         string    `json:"status"`
	Destination    string    `json:"destination"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Alert struct {
	Level     string    `json:"level"` // info, warning, critical
	Message   string    `json:"message"`
	Entity    string    `json:"entity"`
	EntityID  string    `json:"entity_id"`
	CreatedAt time.Time `json:"created_at"`
}

type handler struct {
	db *sql.DB
}

func Register(mux *http.ServeMux, db *database.Client) {
	h := &handler{db: db.DB}
	mux.HandleFunc("/api/v1/dashboard", h.overview)
}

func (h *handler) overview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	ctx := r.Context()
	ov := Overview{GeneratedAt: time.Now().UTC()}

	h.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM shipments WHERE organization_id=$1 AND status IN ('in_transit','out_for_delivery','picked_up')", orgID,
	).Scan(&ov.ActiveShipments) //nolint:errcheck

	h.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM orders WHERE organization_id=$1 AND status IN ('draft','confirmed','processing')", orgID,
	).Scan(&ov.PendingOrders) //nolint:errcheck

	h.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM vehicles WHERE organization_id=$1 AND status='available' AND is_active=true", orgID,
	).Scan(&ov.AvailableVehicles) //nolint:errcheck

	h.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM warehouses WHERE organization_id=$1 AND is_active=true", orgID,
	).Scan(&ov.WarehouseCount) //nolint:errcheck

	h.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM inventory_items WHERE organization_id=$1 AND status IN ('low_stock','out_of_stock')", orgID,
	).Scan(&ov.LowStockItems) //nolint:errcheck

	rows, _ := h.db.QueryContext(ctx, `
		SELECT id, tracking_number, status, destination_address, updated_at
		FROM shipments WHERE organization_id=$1
		ORDER BY updated_at DESC LIMIT 5`, orgID,
	)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var rs RecentShipment
			rows.Scan(&rs.ID, &rs.TrackingNumber, &rs.Status, &rs.Destination, &rs.UpdatedAt) //nolint:errcheck
			ov.RecentShipments = append(ov.RecentShipments, rs)
		}
	}

	// Build contextual alerts
	if ov.LowStockItems > 0 {
		ov.RecentAlerts = append(ov.RecentAlerts, Alert{
			Level:     "warning",
			Message:   "Items below reorder point require immediate attention",
			Entity:    "inventory",
			CreatedAt: time.Now().UTC(),
		})
	}
	if ov.AvailableVehicles == 0 {
		ov.RecentAlerts = append(ov.RecentAlerts, Alert{
			Level:     "critical",
			Message:   "No vehicles available for dispatch",
			Entity:    "fleet",
			CreatedAt: time.Now().UTC(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ov) //nolint:errcheck
}
