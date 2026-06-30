# ─── Build stage ─────────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

COPY requirements.txt ./

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Non-root user for least privilege
RUN groupadd --gid 1001 shieldgrid && \
    useradd --uid 1001 --gid shieldgrid --shell /bin/bash --create-home shieldgrid

WORKDIR /app

# Install runtime deps
COPY --from=builder /build/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY --chown=shieldgrid:shieldgrid app/ ./app/
COPY --chown=shieldgrid:shieldgrid migrations/ ./migrations/
COPY --chown=shieldgrid:shieldgrid alembic.ini .

USER shieldgrid

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
