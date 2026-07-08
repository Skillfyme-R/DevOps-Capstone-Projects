FROM python:3.11-slim AS base

LABEL org.opencontainers.image.title="MediNova Appointment & Patient Management API"
LABEL org.opencontainers.image.description="Healthcare Appointment Platform — MediNova Health Solutions"
LABEL org.opencontainers.image.vendor="MediNova Health Solutions"
LABEL org.opencontainers.image.url="https://medinova.health"
LABEL org.opencontainers.image.source="https://github.com/medinova-health/medinova-platform"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_HOST=0.0.0.0 \
    FLASK_PORT=8080

WORKDIR /app

# Create non-root user
RUN addgroup --system medinova && adduser --system --ingroup medinova medinova

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY src/ ./src/

RUN chown -R medinova:medinova /app

USER medinova

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["gunicorn", \
     "--bind", "0.0.0.0:8080", \
     "--workers", "2", \
     "--threads", "4", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "src.main:app"]
