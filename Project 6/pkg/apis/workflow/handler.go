// Package workflow implements logistics workflow orchestration for NexaFlow.
// A workflow is a named sequence of steps (pickup → sort → load → transit → deliver)
// that can be triggered manually or by domain events.

package workflow

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/nexaflow-io/nexaflow/pkg/bus"
	"github.com/nexaflow-io/nexaflow/pkg/database"
	"github.com/nexaflow-io/nexaflow/pkg/scheduler"
)

// WorkflowDef defines a reusable logistics workflow template.
type WorkflowDef struct {
	ID          string     `json:"id"`
	OrgID       string     `json:"organization_id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	TriggerType string     `json:"trigger_type"` // manual, event, schedule
	TriggerOn   string     `json:"trigger_on,omitempty"`
	Steps       []StepDef  `json:"steps"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
}

// StepDef describes one step within a workflow.
type StepDef struct {
	Order       int               `json:"order"`
	Name        string            `json:"name"`
	Type        string            `json:"type"`
	Config      map[string]string `json:"config,omitempty"`
	Timeout     int               `json:"timeout_seconds,omitempty"`
	RetryLimit  int               `json:"retry_limit,omitempty"`
	OnFailure   string            `json:"on_failure,omitempty"` // continue, abort, notify
}

// WorkflowExecution represents a running instance of a WorkflowDef.
type WorkflowExecution struct {
	ID          string            `json:"id"`
	WorkflowID  string            `json:"workflow_id"`
	OrgID       string            `json:"organization_id"`
	Status      string            `json:"status"` // running, completed, failed, cancelled
	CurrentStep int               `json:"current_step"`
	StepResults []StepResult      `json:"step_results"`
	Context     map[string]string `json:"context,omitempty"`
	StartedAt   time.Time         `json:"started_at"`
	FinishedAt  *time.Time        `json:"finished_at,omitempty"`
	Error       string            `json:"error,omitempty"`
}

// StepResult records the outcome of a single workflow step execution.
type StepResult struct {
	StepOrder  int        `json:"step_order"`
	StepName   string     `json:"step_name"`
	Status     string     `json:"status"` // pending, running, success, failed, skipped
	Output     string     `json:"output,omitempty"`
	Error      string     `json:"error,omitempty"`
	StartedAt  time.Time  `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
}

type handler struct {
	db        *sql.DB
	bus       *bus.EventBus
	scheduler *scheduler.Scheduler
	log       *zap.Logger
}

func Register(mux *http.ServeMux, db *database.Client, eb *bus.EventBus, sched *scheduler.Scheduler) {
	log, _ := zap.NewProduction()
	h := &handler{db: db.DB, bus: eb, scheduler: sched, log: log}

	mux.HandleFunc("/api/v1/workflows", h.workflowCollection)
	mux.HandleFunc("/api/v1/workflows/", h.workflowResource)
	mux.HandleFunc("/api/v1/workflow-executions", h.executionCollection)
	mux.HandleFunc("/api/v1/workflow-executions/", h.executionResource)

	// Subscribe to domain events that trigger workflows
	eb.Subscribe(bus.TopicShipmentCreated, h.onShipmentCreated)
	eb.Subscribe(bus.TopicOrderConfirmed, h.onOrderConfirmed)
}

func (h *handler) workflowCollection(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listWorkflows(w, r)
	case http.MethodPost:
		h.createWorkflow(w, r)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) workflowResource(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/v1/workflows/"), "/")
	id := parts[0]

	if len(parts) == 2 && parts[1] == "execute" && r.Method == http.MethodPost {
		h.triggerExecution(w, r, id)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getWorkflow(w, r, id)
	case http.MethodDelete:
		h.deactivateWorkflow(w, r, id)
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *handler) executionCollection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	rows, err := h.db.QueryContext(r.Context(), `
		SELECT id, workflow_id, organization_id, status, current_step,
		step_results, context, started_at, finished_at, error
		FROM workflow_executions WHERE organization_id=$1
		ORDER BY started_at DESC LIMIT 50`, orgID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list executions")
		return
	}
	defer rows.Close()

	var execs []WorkflowExecution
	for rows.Next() {
		var ex WorkflowExecution
		var stepResultsJSON, ctxJSON []byte
		rows.Scan(&ex.ID, &ex.WorkflowID, &ex.OrgID, &ex.Status, &ex.CurrentStep, //nolint:errcheck
			&stepResultsJSON, &ctxJSON, &ex.StartedAt, &ex.FinishedAt, &ex.Error)
		json.Unmarshal(stepResultsJSON, &ex.StepResults) //nolint:errcheck
		json.Unmarshal(ctxJSON, &ex.Context)             //nolint:errcheck
		execs = append(execs, ex)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": execs})
}

func (h *handler) executionResource(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/workflow-executions/")
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var ex WorkflowExecution
	var stepResultsJSON, ctxJSON []byte
	err := h.db.QueryRowContext(r.Context(), `
		SELECT id, workflow_id, organization_id, status, current_step,
		step_results, context, started_at, finished_at, error
		FROM workflow_executions WHERE id=$1`, id,
	).Scan(&ex.ID, &ex.WorkflowID, &ex.OrgID, &ex.Status, &ex.CurrentStep,
		&stepResultsJSON, &ctxJSON, &ex.StartedAt, &ex.FinishedAt, &ex.Error)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "execution not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get execution")
		return
	}
	json.Unmarshal(stepResultsJSON, &ex.StepResults) //nolint:errcheck
	json.Unmarshal(ctxJSON, &ex.Context)             //nolint:errcheck
	writeJSON(w, http.StatusOK, ex)
}

func (h *handler) createWorkflow(w http.ResponseWriter, r *http.Request) {
	var def WorkflowDef
	if err := json.NewDecoder(r.Body).Decode(&def); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	def.ID = uuid.New().String()
	def.CreatedAt = time.Now().UTC()
	def.IsActive = true

	stepsJSON, _ := json.Marshal(def.Steps)
	if _, err := h.db.ExecContext(r.Context(), `
		INSERT INTO workflow_definitions
		(id, organization_id, name, description, trigger_type, trigger_on, steps, is_active, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
		def.ID, def.OrgID, def.Name, def.Description, def.TriggerType,
		def.TriggerOn, stepsJSON, def.IsActive, def.CreatedAt,
	); err != nil {
		h.log.Error("create workflow", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to create workflow")
		return
	}
	writeJSON(w, http.StatusCreated, def)
}

func (h *handler) listWorkflows(w http.ResponseWriter, r *http.Request) {
	orgID := r.Header.Get("X-NexaFlow-Org-ID")
	rows, err := h.db.QueryContext(r.Context(),
		"SELECT id, organization_id, name, description, trigger_type, trigger_on, steps, is_active, created_at FROM workflow_definitions WHERE organization_id=$1 ORDER BY name",
		orgID,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list workflows")
		return
	}
	defer rows.Close()

	var defs []WorkflowDef
	for rows.Next() {
		var d WorkflowDef
		var stepsJSON []byte
		rows.Scan(&d.ID, &d.OrgID, &d.Name, &d.Description, &d.TriggerType, &d.TriggerOn, &stepsJSON, &d.IsActive, &d.CreatedAt) //nolint:errcheck
		json.Unmarshal(stepsJSON, &d.Steps)                                                                                        //nolint:errcheck
		defs = append(defs, d)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"items": defs})
}

func (h *handler) getWorkflow(w http.ResponseWriter, r *http.Request, id string) {
	var d WorkflowDef
	var stepsJSON []byte
	err := h.db.QueryRowContext(r.Context(),
		"SELECT id, organization_id, name, description, trigger_type, trigger_on, steps, is_active, created_at FROM workflow_definitions WHERE id=$1", id,
	).Scan(&d.ID, &d.OrgID, &d.Name, &d.Description, &d.TriggerType, &d.TriggerOn, &stepsJSON, &d.IsActive, &d.CreatedAt)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "workflow not found")
		return
	}
	json.Unmarshal(stepsJSON, &d.Steps) //nolint:errcheck
	writeJSON(w, http.StatusOK, d)
}

func (h *handler) deactivateWorkflow(w http.ResponseWriter, r *http.Request, id string) {
	h.db.ExecContext(r.Context(), "UPDATE workflow_definitions SET is_active=false WHERE id=$1", id) //nolint:errcheck
	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) triggerExecution(w http.ResponseWriter, r *http.Request, workflowID string) {
	var ctxData map[string]string
	json.NewDecoder(r.Body).Decode(&ctxData) //nolint:errcheck

	exec, err := h.startExecution(context.Background(), workflowID, "", ctxData)
	if err != nil {
		writeError(w, http.StatusInternalServerError, fmt.Sprintf("failed to start execution: %v", err))
		return
	}
	writeJSON(w, http.StatusAccepted, exec)
}

func (h *handler) startExecution(ctx context.Context, workflowID, orgID string, ctxData map[string]string) (*WorkflowExecution, error) {
	exec := &WorkflowExecution{
		ID:         uuid.New().String(),
		WorkflowID: workflowID,
		OrgID:      orgID,
		Status:     "running",
		Context:    ctxData,
		StartedAt:  time.Now().UTC(),
	}

	ctxJSON, _ := json.Marshal(exec.Context)
	stepsJSON, _ := json.Marshal(exec.StepResults)

	if _, err := h.db.ExecContext(ctx, `
		INSERT INTO workflow_executions
		(id, workflow_id, organization_id, status, current_step, step_results, context, started_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		exec.ID, exec.WorkflowID, exec.OrgID, exec.Status, exec.CurrentStep,
		stepsJSON, ctxJSON, exec.StartedAt,
	); err != nil {
		return nil, err
	}

	h.bus.Publish(ctx, bus.Event{
		Topic:   bus.TopicWorkflowStarted,
		Payload: exec,
		OrgID:   orgID,
		Source:  "workflow-engine",
	})

	return exec, nil
}

func (h *handler) onShipmentCreated(ctx context.Context, event bus.Event) {
	h.log.Info("workflow trigger: shipment created", zap.Any("payload", event.Payload))
}

func (h *handler) onOrderConfirmed(ctx context.Context, event bus.Event) {
	h.log.Info("workflow trigger: order confirmed", zap.Any("payload", event.Payload))
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
