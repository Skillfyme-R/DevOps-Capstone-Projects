// Package bus implements a lightweight in-process event bus for NexaFlow domain events.
// It mirrors Walrus's bus package but is adapted to the logistics domain.

package bus

import (
	"context"
	"sync"

	"go.uber.org/zap"
)

// Event is a domain event published by any NexaFlow service.
type Event struct {
	Topic   string
	Payload interface{}
	OrgID   string
	Source  string
}

// Handler is a function that processes an event asynchronously.
type Handler func(ctx context.Context, event Event)

// EventBus dispatches domain events to subscribed handlers.
type EventBus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
	log      *zap.Logger
}

// New creates a new EventBus.
func New(log *zap.Logger) *EventBus {
	return &EventBus{
		handlers: make(map[string][]Handler),
		log:      log,
	}
}

// Subscribe registers handler for a given topic.
func (b *EventBus) Subscribe(topic string, h Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[topic] = append(b.handlers[topic], h)
}

// Publish dispatches e to all handlers subscribed to e.Topic.
// Each handler is called in its own goroutine so publication never blocks.
func (b *EventBus) Publish(ctx context.Context, e Event) {
	b.mu.RLock()
	handlers := b.handlers[e.Topic]
	b.mu.RUnlock()

	for _, h := range handlers {
		go func(fn Handler) {
			defer func() {
				if r := recover(); r != nil {
					b.log.Error("event handler panic",
						zap.String("topic", e.Topic),
						zap.Any("recover", r),
					)
				}
			}()
			fn(ctx, e)
		}(h)
	}
}

// Well-known logistics event topics.
const (
	TopicShipmentCreated   = "shipment.created"
	TopicShipmentUpdated   = "shipment.status_updated"
	TopicShipmentDelivered = "shipment.delivered"
	TopicShipmentException = "shipment.exception"

	TopicOrderCreated   = "order.created"
	TopicOrderConfirmed = "order.confirmed"
	TopicOrderShipped   = "order.shipped"
	TopicOrderDelivered = "order.delivered"
	TopicOrderCancelled = "order.cancelled"

	TopicInventoryLow       = "inventory.low_stock"
	TopicInventoryOutOfStock = "inventory.out_of_stock"
	TopicInventoryReceived  = "inventory.received"

	TopicVehicleStatusChanged = "fleet.vehicle_status_changed"
	TopicVehicleLocationUpdate = "fleet.vehicle_location_updated"

	TopicWorkflowStarted   = "workflow.started"
	TopicWorkflowCompleted = "workflow.completed"
	TopicWorkflowFailed    = "workflow.failed"

	TopicAlertCreated = "alert.created"
)
