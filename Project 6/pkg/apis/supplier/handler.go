// Package supplier implements the Supplier Management API for NexaFlow.

package supplier

import (
	"encoding/json"
	"net/http"
	"strings"

	"go.uber.org/zap"

	"github.com/nexaflow-io/nexaflow/pkg/dao"
	"github.com/nexaflow-io/nexaflow/pkg/database"
)

type handler struct {
	dao *dao.SupplierDAO
	log *zap.Logger
}

func Register(mux *http.ServeMux, db *database.Client) {
	log, _ := zap.NewProduction()
	h := &handler{dao: dao.NewSupplierDAO(db.DB), log: log}
	mux.HandleFunc("/api/v1/suppliers", h.collection)
	mux.HandleFunc("/api/v1/suppliers/", h.resource)
}

func (h *handler) collection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		orgID := r.Header.Get("X-NexaFlow-Org-ID")
		tier := r.URL.Query().Get("tier")
		suppliers, err := h.dao.List(r.Context(), orgID, tier)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to list suppliers")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"items": suppliers, "total": len(suppliers)})
	case http.MethodPost:
		var req dao.Supplier
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		s, err := h.dao.Create(r.Context(), &req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create supplier")
			return
		}
		writeJSON(w, http.StatusCreated, s)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) resource(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/suppliers/")
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	s, err := h.dao.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get supplier")
		return
	}
	if s == nil {
		writeError(w, http.StatusNotFound, "supplier not found")
		return
	}
	writeJSON(w, http.StatusOK, s)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
