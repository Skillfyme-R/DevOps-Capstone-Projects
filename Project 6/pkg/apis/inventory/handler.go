// Package inventory implements the Inventory Tracking API for NexaFlow.

package inventory

import (
	"encoding/json"
	"net/http"
	"strings"

	"go.uber.org/zap"

	"github.com/nexaflow-io/nexaflow/pkg/bus"
	"github.com/nexaflow-io/nexaflow/pkg/dao"
	"github.com/nexaflow-io/nexaflow/pkg/database"
)

type handler struct {
	dao *dao.InventoryDAO
	bus *bus.EventBus
	log *zap.Logger
}

func Register(mux *http.ServeMux, db *database.Client, eb *bus.EventBus) {
	log, _ := zap.NewProduction()
	h := &handler{dao: dao.NewInventoryDAO(db.DB), bus: eb, log: log}
	mux.HandleFunc("/api/v1/inventory", h.collection)
	mux.HandleFunc("/api/v1/inventory/", h.resource)
	mux.HandleFunc("/api/v1/inventory/alerts/low-stock", h.lowStock)
}

func (h *handler) collection(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var item dao.InventoryItem
		if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		created, err := h.dao.Create(r.Context(), &item)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create inventory item")
			return
		}
		writeJSON(w, http.StatusCreated, created)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (h *handler) resource(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/v1/inventory/"), "/")
	id := parts[0]

	if len(parts) == 2 && parts[1] == "adjust" && r.Method == http.MethodPost {
		var req struct {
			Delta         int    `json:"quantity_delta"`
			MovementType  string `json:"movement_type"`
			ReferenceID   string `json:"reference_id"`
			ReferenceType string `json:"reference_type"`
			ActorID       string `json:"actor_id"`
			Notes         string `json:"notes"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if err := h.dao.AdjustQuantity(r.Context(), id, req.Delta,
			req.MovementType, req.ReferenceID, req.ReferenceType, req.ActorID, req.Notes,
		); err != nil {
			h.log.Error("adjust inventory", zap.Error(err))
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return
	}

	http.Error(w, "not found", http.StatusNotFound)
}

func (h *handler) lowStock(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	items, err := h.dao.LowStockItems(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get low-stock items")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": items, "total": len(items)})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
