# =============================================================================
# NexusFinance Frontend — Docker Image
#
# Multi-stage:
#   Stage 1: Build React app → static HTML/CSS/JS files in /build
#   Stage 2: Serve with Nginx (web server, not Node.js)
#
# Why Nginx instead of `node app.js`?
#   React builds to STATIC FILES. There's no server-side code.
#   Nginx is purpose-built to serve static files and is:
#     - 10x faster than Express for serving files
#     - Uses way less CPU and memory
#     - Handles 50,000 requests/second on a single core
#     - Has built-in gzip, caching headers, HTTPS
# =============================================================================

# ── Stage 1: Build React App ───────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/app/package.json ./packages/app/

RUN yarn install --frozen-lockfile

COPY packages/app/ ./packages/app/

# Build arguments (injected at build time from CI/CD)
ARG REACT_APP_API_URL=https://api.nexusfinance.io
ARG REACT_APP_ENVIRONMENT=production
ARG REACT_APP_VERSION=1.0.0

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT
ENV REACT_APP_VERSION=$REACT_APP_VERSION

RUN yarn workspace @nexusfinance/app build

# ── Stage 2: Serve with Nginx ─────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Copy compiled static files to Nginx's serving directory
COPY --from=builder /app/packages/app/build /usr/share/nginx/html

# Custom Nginx config with security headers and SPA routing
COPY infrastructure/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
