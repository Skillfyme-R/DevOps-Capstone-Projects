#!/usr/bin/env bash
# CartFlow local development helper
# Builds and runs the CartFlow API container locally for development and testing

set -euo pipefail

IMAGE_NAME="cartflow-api"
IMAGE_TAG="dev"
PORT="${PORT:-5000}"

echo "═══════════════════════════════════════════"
echo "  CartFlow Local Dev Runner"
echo "═══════════════════════════════════════════"

echo ""
echo "Building CartFlow image..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo ""
echo "Starting CartFlow API on port ${PORT}..."
docker run --rm \
    -p "${PORT}:5000" \
    -e ENVIRONMENT=development \
    -e DEBUG=true \
    -e APP_VERSION=dev \
    --name cartflow-local \
    "${IMAGE_NAME}:${IMAGE_TAG}"
