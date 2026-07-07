// Package scheduler manages recurring cron-like jobs for the NexaFlow platform.
// Mirrors Walrus's cron/scheduler combination, adapted to logistics automation.

package scheduler

import (
	"context"
	"sync"

	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
)

// Job is a named periodic task.
type Job struct {
	Name     string
	Schedule string
	Fn       func(ctx context.Context)
}

// Scheduler wraps robfig/cron with lifecycle management.
type Scheduler struct {
	cron    *cron.Cron
	log     *zap.Logger
	jobs    []Job
	mu      sync.Mutex
	ctx     context.Context
	cancel  context.CancelFunc
}

// New creates a stopped Scheduler.
func New(log *zap.Logger) *Scheduler {
	return &Scheduler{
		cron: cron.New(cron.WithSeconds()),
		log:  log,
	}
}

// Register adds a job. Jobs registered after Start() are not automatically scheduled.
func (s *Scheduler) Register(j Job) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.jobs = append(s.jobs, j)
}

// Start initialises all registered jobs and begins the cron loop.
func (s *Scheduler) Start(ctx context.Context) {
	s.ctx, s.cancel = context.WithCancel(ctx)
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, j := range s.jobs {
		j := j
		if _, err := s.cron.AddFunc(j.Schedule, func() {
			s.log.Info("running scheduled job", zap.String("job", j.Name))
			j.Fn(s.ctx)
		}); err != nil {
			s.log.Error("failed to schedule job",
				zap.String("job", j.Name),
				zap.Error(err),
			)
		} else {
			s.log.Info("scheduled job registered",
				zap.String("job", j.Name),
				zap.String("schedule", j.Schedule),
			)
		}
	}

	s.cron.Start()
}

// Stop halts the cron loop and cancels all running job contexts.
func (s *Scheduler) Stop() {
	if s.cancel != nil {
		s.cancel()
	}
	s.cron.Stop()
}

// DefaultJobs returns the built-in logistics automation jobs.
// The caller should register these before calling Start().
func DefaultJobs() []Job {
	return []Job{
		{
			Name:     "low-stock-check",
			Schedule: "0 */30 * * * *", // every 30 minutes
		},
		{
			Name:     "shipment-eta-refresh",
			Schedule: "0 */15 * * * *", // every 15 minutes
		},
		{
			Name:     "fleet-telematics-sync",
			Schedule: "0 */5 * * * *", // every 5 minutes
		},
		{
			Name:     "daily-analytics-rollup",
			Schedule: "0 0 1 * * *", // 01:00 daily
		},
		{
			Name:     "supplier-performance-report",
			Schedule: "0 0 6 * * 1", // Monday 06:00
		},
	}
}
