// Package fleet implements the Fleet Management API for NexaFlow.

package fleet

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
	vehicleDAO *dao.VehicleDAO
	bus        *bus.EventBus
	log        *zap.Logger
}

func Register(mux *http.ServeMux, db *database.Client, eb *bus.EventBus) {
	log, _ := zap.NewProduction()
	h := &handler{
		vehicleDAO: dao.NewVehicleDAO(db.DB),
		bus:        eb,
		log:        log,
	}
	mux.HandleFunc("/api/v1/fleet/vehicles", h.vehicleCollection)
	mux.HandleFunc("/api/v1/fleet/vehicles/", h.vehicleResource)
	mux.HandleFunc("/api/v1/fleet/vehicles/available", h.availableVehicles)
}

func (h *handler) vehicleCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listVehicles(w, r)
	case http.MethodPost:
		h.createVehicle(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) vehicleResource(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/fleet/vehicles/")
	parts := strings.SplitN(path, "/", 2)
	id := parts[0]

	if len(parts) == 2 {
		switch parts[1] {
		case "location":
			h.updateLocation(w, r, id)
			return
		case "status":
			h.updateStatus(w, r, id)
			return
		case "assign-driver":
			h.assignDriver(w, r, id)
			return
		}
	}

	switch r.Method {
	case http.MethodGet:
		h.getVehicle(w, r, id)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) availableVehicles(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	vehicles, err := h.vehicleDAO.ListAvailable(r.Context(), orgID)
	if err != nil {
		h.log.Error("list available vehicles", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to list available vehicles")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": vehicles, "total": len(vehicles)})
}

func (h *handler) listVehicles(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	vehicles, err := h.vehicleDAO.ListAvailable(r.Context(), orgID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list vehicles")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": vehicles})
}

func (h *handler) createVehicle(w http.ResponseWriter, r *http.Request) {
	var req dao.Vehicle
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	v, err := h.vehicleDAO.Create(r.Context(), &req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create vehicle")
		return
	}
	writeJSON(w, http.StatusCreated, v)
}

func (h *handler) getVehicle(w http.ResponseWriter, r *http.Request, id string) {
	v, err := h.vehicleDAO.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get vehicle")
		return
	}
	if v == nil {
		writeError(w, http.StatusNotFound, "vehicle not found")
		return
	}
	writeJSON(w, http.StatusOK, v)
}

func (h *handler) updateLocation(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
		Location  string  `json:"location"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := r.Context()
	if err := h.vehicleDAO.UpdateLocation(ctx, id, req.Latitude, req.Longitude, req.Location); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update location")
		return
	}
	h.bus.Publish(ctx, bus.Event{
		Topic: bus.TopicVehicleLocationUpdate,
		Payload: map[string]interface{}{
			"vehicle_id": id,
			"lat":        req.Latitude,
			"lon":        req.Longitude,
			"location":   req.Location,
		},
		Source: "fleet-api",
	})
	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) updateStatus(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.vehicleDAO.UpdateStatus(r.Context(), id, req.Status); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update vehicle status")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) assignDriver(w http.ResponseWriter, r *http.Request, id string) {
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		DriverID string `json:"driver_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.vehicleDAO.AssignDriver(r.Context(), id, req.DriverID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to assign driver")
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
