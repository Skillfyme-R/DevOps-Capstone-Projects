FROM python:3.11-slim AS base

LABEL org.opencontainers.image.title="MediCart Healthcare Platform API"
LABEL org.opencontainers.image.description="Healthcare E-Commerce SaaS — MediCart Health Technologies Pvt. Ltd."
LABEL org.opencontainers.image.vendor="MediCart Health Technologies Pvt. Ltd."
LABEL org.opencontainers.image.url="https://medicart.health"
LABEL org.opencontainers.image.source="https://github.com/medicart-health/medicart-platform"

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_HOST=0.0.0.0 \
    FLASK_PORT=8080

WORKDIR /app

RUN addgroup --system medicart && adduser --system --ingroup medicart medicart

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

RUN chown -R medicart:medicart /app

USER medicart

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--threads", "4", "--timeout", "60", "--access-logfile", "-", "src.app:app"]
