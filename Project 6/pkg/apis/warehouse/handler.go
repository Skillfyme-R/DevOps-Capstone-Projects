// Package warehouse implements the Warehouse Management API for NexaFlow.

package warehouse

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
	dao *dao.WarehouseDAO
	bus *bus.EventBus
	log *zap.Logger
}

func Register(mux *http.ServeMux, db *database.Client, eb *bus.EventBus) {
	log, _ := zap.NewProduction()
	h := &handler{
		dao: dao.NewWarehouseDAO(db.DB),
		bus: eb,
		log: log,
	}
	mux.HandleFunc("/api/v1/warehouses", h.collection)
	mux.HandleFunc("/api/v1/warehouses/", h.resource)
}

func (h *handler) collection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.list(w, r)
	case http.MethodPost:
		h.create(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) resource(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/warehouses/")
	if id == "" {
		http.Error(w, "warehouse ID required", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodGet:
		h.get(w, r, id)
	case http.MethodPut:
		h.update(w, r, id)
	case http.MethodDelete:
		h.deactivate(w, r, id)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) list(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	activeOnly := r.URL.Query().Get("active") != "false"

	warehouses, err := h.dao.List(r.Context(), orgID, activeOnly)
	if err != nil {
		h.log.Error("list warehouses", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to list warehouses")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": warehouses, "total": len(warehouses)})
}

func (h *handler) create(w http.ResponseWriter, r *http.Request) {
	var req dao.Warehouse
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := r.Context()
	wh, err := h.dao.Create(ctx, &req)
	if err != nil {
		h.log.Error("create warehouse", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to create warehouse")
		return
	}
	writeJSON(w, http.StatusCreated, wh)
}

func (h *handler) get(w http.ResponseWriter, r *http.Request, id string) {
	wh, err := h.dao.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get warehouse")
		return
	}
	if wh == nil {
		writeError(w, http.StatusNotFound, "warehouse not found")
		return
	}
	writeJSON(w, http.StatusOK, wh)
}

func (h *handler) update(w http.ResponseWriter, r *http.Request, id string) {
	var req dao.Warehouse
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.ID = id
	if err := h.dao.Update(r.Context(), &req); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update warehouse")
		return
	}
	writeJSON(w, http.StatusOK, req)
}

func (h *handler) deactivate(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.dao.Deactivate(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to deactivate warehouse")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
