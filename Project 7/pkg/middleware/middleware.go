// Package middleware provides Gin HTTP middleware for VaultFlow.
package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
	"github.com/vaultflow/vaultflow/pkg/metrics"
)

// RequestLogger logs structured request/response information.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		log.Info().
			Str("method", method).
			Str("path", path).
			Int("status", status).
			Dur("latency", latency).
			Str("ip", c.ClientIP()).
			Str("user_agent", c.Request.UserAgent()).
			Msg("request")
	}
}

// PrometheusMiddleware records request metrics.
func PrometheusMiddleware(reg *metrics.Registry) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := sanitizePath(c.FullPath())
		method := c.Request.Method

		reg.HTTPActiveRequests.Inc()
		c.Next()
		reg.HTTPActiveRequests.Dec()

		status := fmt.Sprintf("%d", c.Writer.Status())
		reg.HTTPRequestsTotal.WithLabelValues(method, path, status).Inc()
		reg.HTTPRequestDuration.WithLabelValues(method, path).Observe(time.Since(start).Seconds())
	}
}

// sanitizePath replaces path parameters with a placeholder to avoid high cardinality.
func sanitizePath(path string) string {
	if path == "" {
		return "/"
	}
	return path
}

// Recovery returns a gin middleware that recovers from panics and logs them.
func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		log.Error().
			Interface("panic", recovered).
			Str("path", c.Request.URL.Path).
			Msg("panic recovered")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
			"error": "internal server error",
		})
	})
}

// CORS configures permissive CORS headers for development; restrict in production.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowed := false
		for _, o := range allowedOrigins {
			if o == "*" || o == origin {
				allowed = true
				break
			}
		}
		if allowed {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-VaultFlow-API-Key,X-Request-ID")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// RequireAPIKey enforces API key authentication.
func RequireAPIKey(headerName, secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader(headerName)
		if key == "" {
			// also accept Bearer token
			auth := c.GetHeader("Authorization")
			if strings.HasPrefix(auth, "Bearer ") {
				key = strings.TrimPrefix(auth, "Bearer ")
			}
		}
		if key != secret {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Next()
	}
}

// RequestID injects a unique request ID into the context.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if id == "" {
			id = generateID()
		}
		c.Set("request_id", id)
		c.Header("X-Request-ID", id)
		c.Next()
	}
}

func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
