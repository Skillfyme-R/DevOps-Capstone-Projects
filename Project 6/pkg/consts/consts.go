// Package consts holds platform-wide constants for the NexaFlow logistics platform.

package consts

const (
	// Platform identity
	PlatformName    = "NexaFlow"
	PlatformVersion = "1.0.0"
	PlatformDomain  = "nexaflow.io"

	// Shipment statuses
	ShipmentStatusPending    = "pending"
	ShipmentStatusPickedUp   = "picked_up"
	ShipmentStatusInTransit  = "in_transit"
	ShipmentStatusOutForDel  = "out_for_delivery"
	ShipmentStatusDelivered  = "delivered"
	ShipmentStatusException  = "exception"
	ShipmentStatusCancelled  = "cancelled"
	ShipmentStatusReturned   = "returned"

	// Order statuses
	OrderStatusDraft      = "draft"
	OrderStatusConfirmed  = "confirmed"
	OrderStatusProcessing = "processing"
	OrderStatusPacked     = "packed"
	OrderStatusShipped    = "shipped"
	OrderStatusDelivered  = "delivered"
	OrderStatusCancelled  = "cancelled"

	// Fleet — vehicle statuses
	VehicleStatusAvailable  = "available"
	VehicleStatusOnRoute    = "on_route"
	VehicleStatusLoading    = "loading"
	VehicleStatusMaintenance = "maintenance"
	VehicleStatusOffline    = "offline"

	// Warehouse zone types
	ZoneTypeReceiving  = "receiving"
	ZoneTypeStorage    = "storage"
	ZoneTypePicking    = "picking"
	ZoneTypePacking    = "packing"
	ZoneTypeShipping   = "shipping"
	ZoneTypeReturns    = "returns"
	ZoneTypeColdChain  = "cold_chain"
	ZoneTypeHazmat     = "hazmat"

	// Inventory
	InventoryStatusActive      = "active"
	InventoryStatusLowStock    = "low_stock"
	InventoryStatusOutOfStock  = "out_of_stock"
	InventoryStatusDiscontinued = "discontinued"
	InventoryStatusReserved    = "reserved"

	// Workflow step types
	WorkflowStepPickup     = "pickup"
	WorkflowStepInspection = "inspection"
	WorkflowStepSorting    = "sorting"
	WorkflowStepLoading    = "loading"
	WorkflowStepTransit    = "transit"
	WorkflowStepDelivery   = "delivery"
	WorkflowStepSignature  = "signature"
	WorkflowStepPhoto      = "photo_proof"

	// Route optimization modes
	RouteModeFastest   = "fastest"
	RouteModeEconomic  = "economic"
	RouteModeGreen     = "green"
	RouteModeMultiStop = "multi_stop"

	// Supplier tiers
	SupplierTierPremium   = "premium"
	SupplierTierStandard  = "standard"
	SupplierTierPreferred = "preferred"

	// API pagination defaults
	DefaultPageSize = 20
	MaxPageSize     = 200

	// Context keys
	CtxKeyUserID    = "nexaflow_user_id"
	CtxKeyOrgID     = "nexaflow_org_id"
	CtxKeyRequestID = "nexaflow_request_id"
	CtxKeyTraceID   = "nexaflow_trace_id"

	// Header names
	HeaderRequestID    = "X-NexaFlow-Request-ID"
	HeaderCorrelationID = "X-NexaFlow-Correlation-ID"
	HeaderAPIVersion   = "X-NexaFlow-API-Version"

	// Metrics namespace
	MetricsNamespace = "nexaflow"

	// Cache TTLs (seconds)
	CacheTTLShort  = 60
	CacheTTLMedium = 300
	CacheTTLLong   = 3600

	// Default date/time formats
	DateFormat     = "2006-01-02"
	DateTimeFormat = "2006-01-02T15:04:05Z07:00"
)
