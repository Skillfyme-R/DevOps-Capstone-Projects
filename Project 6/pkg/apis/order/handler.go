// Package order implements the Order Fulfilment API for NexaFlow.

package order

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"go.uber.org/zap"

	"github.com/nexaflow-io/nexaflow/pkg/bus"
	"github.com/nexaflow-io/nexaflow/pkg/consts"
	"github.com/nexaflow-io/nexaflow/pkg/dao"
	"github.com/nexaflow-io/nexaflow/pkg/database"
)

type handler struct {
	dao *dao.OrderDAO
	bus *bus.EventBus
	log *zap.Logger
}

func Register(mux *http.ServeMux, db *database.Client, eb *bus.EventBus) {
	log, _ := zap.NewProduction()
	h := &handler{
		dao: dao.NewOrderDAO(db.DB),
		bus: eb,
		log: log,
	}
	mux.HandleFunc("/api/v1/orders", h.collection)
	mux.HandleFunc("/api/v1/orders/", h.resource)
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
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/v1/orders/"), "/")
	id := parts[0]

	if len(parts) == 2 {
		switch {
		case parts[1] == "confirm" && r.Method == http.MethodPost:
			h.confirm(w, r, id)
			return
		case parts[1] == "cancel" && r.Method == http.MethodPost:
			h.cancel(w, r, id)
			return
		}
	}

	switch r.Method {
	case http.MethodGet:
		h.get(w, r, id)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) list(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	status := r.URL.Query().Get("status")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = consts.DefaultPageSize
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	orders, total, err := h.dao.ListByStatus(r.Context(), orgID, status, limit, offset)
	if err != nil {
		h.log.Error("list orders", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to list orders")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": orders, "total": total, "limit": limit, "offset": offset})
}

func (h *handler) create(w http.ResponseWriter, r *http.Request) {
	var req dao.Order
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := r.Context()
	o, err := h.dao.Create(ctx, &req)
	if err != nil {
		h.log.Error("create order", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to create order")
		return
	}
	h.bus.Publish(ctx, bus.Event{Topic: bus.TopicOrderCreated, Payload: o, OrgID: o.OrganizationID, Source: "order-api"})
	writeJSON(w, http.StatusCreated, o)
}

func (h *handler) get(w http.ResponseWriter, r *http.Request, id string) {
	o, err := h.dao.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get order")
		return
	}
	if o == nil {
		writeError(w, http.StatusNotFound, "order not found")
		return
	}
	writeJSON(w, http.StatusOK, o)
}

func (h *handler) confirm(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()
	if err := h.dao.UpdateStatus(ctx, id, consts.OrderStatusConfirmed); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to confirm order")
		return
	}
	h.bus.Publish(ctx, bus.Event{Topic: bus.TopicOrderConfirmed, Payload: map[string]string{"order_id": id}, Source: "order-api"})
	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) cancel(w http.ResponseWriter, r *http.Request, id string) {
	ctx := r.Context()
	if err := h.dao.UpdateStatus(ctx, id, consts.OrderStatusCancelled); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to cancel order")
		return
	}
	h.bus.Publish(ctx, bus.Event{Topic: bus.TopicOrderCancelled, Payload: map[string]string{"order_id": id}, Source: "order-api"})
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
