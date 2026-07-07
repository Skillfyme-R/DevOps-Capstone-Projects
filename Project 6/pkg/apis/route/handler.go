// Package route implements route optimization for the NexaFlow fleet management system.

package route

import (
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/nexaflow-io/nexaflow/pkg/consts"
	"github.com/nexaflow-io/nexaflow/pkg/database"
)

// Waypoint is a lat/lon coordinate with an address label.
type Waypoint struct {
	ID        string  `json:"id"`
	Label     string  `json:"label"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	StopType  string  `json:"stop_type"` // pickup, delivery, depot
	TimeWindow *TimeWindow `json:"time_window,omitempty"`
}

// TimeWindow constrains when a waypoint may be visited.
type TimeWindow struct {
	EarliestArrival time.Time `json:"earliest_arrival"`
	LatestArrival   time.Time `json:"latest_arrival"`
}

// OptimizeRequest describes a route to be optimised.
type OptimizeRequest struct {
	VehicleID  string     `json:"vehicle_id"`
	Mode       string     `json:"mode"` // fastest, economic, green, multi_stop
	Depot      Waypoint   `json:"depot"`
	Stops      []Waypoint `json:"stops"`
	MaxStops   int        `json:"max_stops,omitempty"`
}

// OptimizeResponse contains the optimised route plan.
type OptimizeResponse struct {
	RouteID          string     `json:"route_id"`
	VehicleID        string     `json:"vehicle_id"`
	Mode             string     `json:"mode"`
	OptimisedStops   []Waypoint `json:"optimised_stops"`
	TotalDistanceKm  float64    `json:"total_distance_km"`
	EstimatedHours   float64    `json:"estimated_hours"`
	FuelEstimateLiters float64  `json:"fuel_estimate_liters,omitempty"`
	CO2EstimateKg    float64    `json:"co2_estimate_kg,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type handler struct {
	db  *database.Client
	log *zap.Logger
}

func Register(mux *http.ServeMux, db *database.Client) {
	log, _ := zap.NewProduction()
	h := &handler{db: db, log: log}
	mux.HandleFunc("/api/v1/routes/optimize", h.optimize)
	mux.HandleFunc("/api/v1/routes", h.list)
}

func (h *handler) optimize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req OptimizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.Stops) == 0 {
		writeError(w, http.StatusBadRequest, "at least one stop is required")
		return
	}
	if req.Mode == "" {
		req.Mode = consts.RouteModeFastest
	}

	optimised := nearestNeighborTSP(req.Depot, req.Stops)
	totalKm := totalDistance(req.Depot, optimised)
	avgSpeedKmh := 60.0
	if req.Mode == consts.RouteModeEconomic {
		avgSpeedKmh = 80.0
	}

	fuelLitersPer100km := 12.0
	if req.Mode == consts.RouteModeGreen {
		fuelLitersPer100km = 8.0
	}
	fuelLiters := totalKm * fuelLitersPer100km / 100
	co2Kg := fuelLiters * 2.64 // diesel CO2 factor

	resp := OptimizeResponse{
		RouteID:            uuid.New().String(),
		VehicleID:          req.VehicleID,
		Mode:               req.Mode,
		OptimisedStops:     optimised,
		TotalDistanceKm:    math.Round(totalKm*10) / 10,
		EstimatedHours:     math.Round(totalKm/avgSpeedKmh*10) / 10,
		FuelEstimateLiters: math.Round(fuelLiters*10) / 10,
		CO2EstimateKg:      math.Round(co2Kg*10) / 10,
		CreatedAt:          time.Now().UTC(),
	}

	h.log.Info("route optimized",
		zap.String("route_id", resp.RouteID),
		zap.Float64("total_km", resp.TotalDistanceKm),
		zap.Int("stops", len(optimised)),
	)

	writeJSON(w, http.StatusOK, resp)
}

func (h *handler) list(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": []interface{}{}, "message": "route history coming soon"})
}

// nearestNeighborTSP is a greedy nearest-neighbour heuristic for the TSP.
func nearestNeighborTSP(depot Waypoint, stops []Waypoint) []Waypoint {
	if len(stops) == 0 {
		return nil
	}

	remaining := make([]Waypoint, len(stops))
	copy(remaining, stops)

	var route []Waypoint
	current := depot

	for len(remaining) > 0 {
		nearestIdx := 0
		nearestDist := haversineKm(current.Latitude, current.Longitude,
			remaining[0].Latitude, remaining[0].Longitude)

		for i := 1; i < len(remaining); i++ {
			d := haversineKm(current.Latitude, current.Longitude,
				remaining[i].Latitude, remaining[i].Longitude)
			if d < nearestDist {
				nearestDist = d
				nearestIdx = i
			}
		}

		next := remaining[nearestIdx]
		route = append(route, next)
		current = next
		remaining = append(remaining[:nearestIdx], remaining[nearestIdx+1:]...)
	}

	// Respect time windows by sorting deliveries before pickups at same distance
	sort.SliceStable(route, func(i, j int) bool {
		if route[i].TimeWindow != nil && route[j].TimeWindow != nil {
			return route[i].TimeWindow.LatestArrival.Before(route[j].TimeWindow.LatestArrival)
		}
		return false
	})

	return route
}

// haversineKm returns the great-circle distance between two lat/lon pairs.
func haversineKm(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKm * c
}

func totalDistance(depot Waypoint, stops []Waypoint) float64 {
	if len(stops) == 0 {
		return 0
	}
	total := haversineKm(depot.Latitude, depot.Longitude, stops[0].Latitude, stops[0].Longitude)
	for i := 1; i < len(stops); i++ {
		total += haversineKm(stops[i-1].Latitude, stops[i-1].Longitude, stops[i].Latitude, stops[i].Longitude)
	}
	total += haversineKm(stops[len(stops)-1].Latitude, stops[len(stops)-1].Longitude, depot.Latitude, depot.Longitude)
	return total
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
