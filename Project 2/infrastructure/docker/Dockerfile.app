# =============================================================================
# VendorVault Frontend — Multi-stage Docker Image
#
# Stage 1: Build React app → static HTML/CSS/JS files
# Stage 2: Serve with Nginx (purpose-built for static files, fast & lean)
#
# Build:
#   docker build -f infrastructure/docker/Dockerfile.app \
#     --build-arg REACT_APP_API_URL=https://api.vendorvault.io \
#     -t vendorvault-frontend .
# =============================================================================

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY packages/app/package.json ./packages/app/

RUN yarn install --frozen-lockfile

COPY packages/app/ ./packages/app/

ARG REACT_APP_API_URL=https://api.vendorvault.io
ARG REACT_APP_ENVIRONMENT=production
ARG REACT_APP_VERSION=1.0.0

ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ENVIRONMENT=$REACT_APP_ENVIRONMENT
ENV REACT_APP_VERSION=$REACT_APP_VERSION

RUN yarn workspace @vendorvault/app build

# ── Stage 2: Nginx Serve ──────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

COPY --from=builder /app/packages/app/build /usr/share/nginx/html
COPY infrastructure/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
