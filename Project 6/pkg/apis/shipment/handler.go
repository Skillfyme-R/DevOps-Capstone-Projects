// Package shipment implements the Shipment Management API for NexaFlow.

package shipment

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/nexaflow-io/nexaflow/pkg/bus"
	"github.com/nexaflow-io/nexaflow/pkg/consts"
	"github.com/nexaflow-io/nexaflow/pkg/dao"
	"github.com/nexaflow-io/nexaflow/pkg/database"
)

type handler struct {
	dao *dao.ShipmentDAO
	bus *bus.EventBus
	log *zap.Logger
}

// Register mounts all shipment routes on mux.
func Register(mux *http.ServeMux, db *database.Client, eb *bus.EventBus) {
	log, _ := zap.NewProduction()
	h := &handler{
		dao: dao.NewShipmentDAO(db.DB),
		bus: eb,
		log: log,
	}

	mux.HandleFunc("/api/v1/shipments", h.collection)
	mux.HandleFunc("/api/v1/shipments/", h.resource)
	mux.HandleFunc("/api/v1/shipments/track/", h.track)
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
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/shipments/")
	if id == "" {
		http.Error(w, "shipment ID required", http.StatusBadRequest)
		return
	}
	switch r.Method {
	case http.MethodGet:
		h.get(w, r, id)
	case http.MethodPatch:
		h.updateStatus(w, r, id)
	case http.MethodDelete:
		h.cancel(w, r, id)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) track(w http.ResponseWriter, r *http.Request) {
	trackingNum := strings.TrimPrefix(r.URL.Path, "/api/v1/shipments/track/")
	if trackingNum == "" {
		http.Error(w, "tracking number required", http.StatusBadRequest)
		return
	}
	ctx := r.Context()
	s, err := h.dao.GetByTracking(ctx, trackingNum)
	if err != nil {
		h.log.Error("track shipment", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to retrieve shipment")
		return
	}
	if s == nil {
		writeError(w, http.StatusNotFound, "shipment not found")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func (h *handler) list(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	if orgID == "" {
		orgID = r.URL.Query().Get("org_id")
	}

	status := r.URL.Query().Get("status")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > consts.MaxPageSize {
		limit = consts.DefaultPageSize
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	shipments, total, err := h.dao.List(ctx, orgID, status, limit, offset)
	if err != nil {
		h.log.Error("list shipments", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to list shipments")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"items":  shipments,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *handler) create(w http.ResponseWriter, r *http.Request) {
	var req dao.Shipment
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.TrackingNumber == "" {
		req.TrackingNumber = generateTrackingNumber()
	}

	ctx := r.Context()
	s, err := h.dao.Create(ctx, &req)
	if err != nil {
		h.log.Error("create shipment", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to create shipment")
		return
	}

	h.bus.Publish(ctx, bus.Event{
		Topic:   bus.TopicShipmentCreated,
		Payload: s,
		OrgID:   s.OrganizationID,
		Source:  "shipment-api",
	})

	writeJSON(w, http.StatusCreated, s)
}

func (h *handler) get(w http.ResponseWriter, r *http.Request, id string) {
	s, err := h.dao.GetByID(r.Context(), id)
	if err != nil {
		h.log.Error("get shipment", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to get shipment")
		return
	}
	if s == nil {
		writeError(w, http.StatusNotFound, "shipment not found")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func (h *handler) updateStatus(w http.ResponseWriter, r *http.Request, id string) {
	var req struct {
		Status      string `json:"status"`
		Description string `json:"description"`
		Location    string `json:"location"`
		ActorID     string `json:"actor_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Status == "" {
		writeError(w, http.StatusBadRequest, "status is required")
		return
	}

	ctx := r.Context()
	if err := h.dao.UpdateStatus(ctx, id, req.Status, req.ActorID, req.Description, req.Location); err != nil {
		h.log.Error("update shipment status", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to update status")
		return
	}

	h.bus.Publish(ctx, bus.Event{
		Topic:   bus.TopicShipmentUpdated,
		Payload: map[string]string{"id": id, "status": req.Status},
		Source:  "shipment-api",
	})

	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) cancel(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()
	if err := h.dao.Delete(ctx, id); err != nil {
		h.log.Error("cancel shipment", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to cancel shipment")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func generateTrackingNumber() string {
	return "NXF-" + strings.ToUpper(uuid.New().String()[:8])
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
