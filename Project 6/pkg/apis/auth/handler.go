// Package auth handles JWT-based authentication for the NexaFlow API.

package auth

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/nexaflow-io/nexaflow/pkg/database"
)

type handler struct {
	db        *database.Client
	jwtSecret []byte
	log       *zap.Logger
}

// Claims holds the NexaFlow JWT payload.
type Claims struct {
	UserID string `json:"user_id"`
	OrgID  string `json:"org_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func Register(mux *http.ServeMux, db *database.Client, jwtSecret string) {
	log, _ := zap.NewProduction()
	h := &handler{db: db, jwtSecret: []byte(jwtSecret), log: log}

	mux.HandleFunc("/api/v1/auth/login", h.login)
	mux.HandleFunc("/api/v1/auth/refresh", h.refresh)
	mux.HandleFunc("/api/v1/auth/logout", h.logout)
	mux.HandleFunc("/api/v1/auth/me", h.me)
}

func (h *handler) login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Look up user by email
	var userID, orgID, hashedPw, role string
	err := h.db.DB.QueryRowContext(r.Context(),
		"SELECT id, organization_id, password_hash, role FROM users WHERE email=$1 AND is_active=true",
		req.Email,
	).Scan(&userID, &orgID, &hashedPw, &role)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPw), []byte(req.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	token, err := h.issueToken(userID, orgID, req.Email, role)
	if err != nil {
		h.log.Error("issuing JWT", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "failed to issue token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token":      token,
		"expires_in": 86400,
		"user_id":    userID,
		"org_id":     orgID,
		"role":       role,
	})
}

func (h *handler) refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	claims, err := h.validateBearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid or expired token")
		return
	}

	token, err := h.issueToken(claims.UserID, claims.OrgID, claims.Email, claims.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to refresh token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token":      token,
		"expires_in": 86400,
	})
}

func (h *handler) logout(w http.ResponseWriter, r *http.Request) {
	// Stateless JWT: client discards the token.
	w.WriteHeader(http.StatusNoContent)
}

func (h *handler) me(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	claims, err := h.validateBearerToken(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "invalid or expired token")
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"user_id": claims.UserID,
		"org_id":  claims.OrgID,
		"email":   claims.Email,
		"role":    claims.Role,
	})
}

func (h *handler) issueToken(userID, orgID, email, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		OrgID:  orgID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			Issuer:    "nexaflow.io",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(h.jwtSecret)
}

func (h *handler) validateBearerToken(r *http.Request) (*Claims, error) {
	authHeader := r.Header.Get("Authorization")
	if len(authHeader) < 8 || authHeader[:7] != "Bearer " {
		return nil, jwt.ErrTokenMalformed
	}
	tokenStr := authHeader[7:]

	claims := &Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return h.jwtSecret, nil
	})
	return claims, err
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
