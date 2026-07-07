FROM python:3.11-slim AS base

LABEL maintainer="CartFlow Engineering <engineering@cartflow.io>"
LABEL org.opencontainers.image.title="CartFlow Commerce API"
LABEL org.opencontainers.image.description="E-Commerce SaaS API service for CartFlow Inc."
LABEL org.opencontainers.image.vendor="CartFlow Inc."

WORKDIR /app

COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ .

ENV APP_VERSION="2.0.0" \
    ENVIRONMENT="production" \
    PORT="5000" \
    DEBUG="false"

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

USER nobody

CMD ["python", "app.py"]
