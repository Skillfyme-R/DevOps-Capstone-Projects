// Package health exposes liveness and readiness probes for NexaFlow.

package health

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/nexaflow-io/nexaflow/pkg/database"
)

type status struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Version   string            `json:"version"`
	Checks    map[string]string `json:"checks,omitempty"`
}

func Register(mux *http.ServeMux, db *database.Client) {
	mux.HandleFunc("/healthz", liveness())
	mux.HandleFunc("/readyz", readiness(db))
}

func liveness() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, status{
			Status:    "ok",
			Timestamp: time.Now().UTC(),
			Version:   "1.0.0",
		})
	}
}

func readiness(db *database.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		checks := map[string]string{}
		httpStatus := http.StatusOK
		overall := "ok"

		if err := db.Healthy(r.Context()); err != nil {
			checks["database"] = "unhealthy: " + err.Error()
			overall = "degraded"
			httpStatus = http.StatusServiceUnavailable
		} else {
			checks["database"] = "healthy"
		}

		writeJSON(w, httpStatus, status{
			Status:    overall,
			Timestamp: time.Now().UTC(),
			Version:   "1.0.0",
			Checks:    checks,
		})
	}
}

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}
