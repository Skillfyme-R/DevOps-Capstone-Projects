# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Bake the API base URL at build time since this is a static SPA served by nginx, not a Node server
# that could read env vars at request time.
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# Use 127.0.0.1 explicitly, not localhost — /etc/hosts resolves localhost to ::1 first in this
# image, but nginx only binds 0.0.0.0 (IPv4), so "localhost" was reporting false-unhealthy.
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

# Build: docker build -t reelforge/pulsar-ui .
