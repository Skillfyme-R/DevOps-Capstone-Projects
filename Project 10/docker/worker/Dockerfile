################################################################################
# Celery worker image — same base as API, different CMD
################################################################################
FROM python:3.12-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl wget unzip \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 wget unzip git \
    && rm -rf /var/lib/apt/lists/*

ARG TERRAFORM_VERSION=1.6.4
RUN wget -q https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip -d /usr/local/bin/ && \
    rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

RUN groupadd -r deploypilot && useradd -r -g deploypilot -d /app deploypilot
RUN mkdir -p /tmp/deploypilot/runs && chown deploypilot:deploypilot /tmp/deploypilot/runs

COPY deploypilot/ ./deploypilot/
RUN chown -R deploypilot:deploypilot /app

USER deploypilot

CMD ["celery", "-A", "deploypilot.workers.celery_app", "worker", \
     "--loglevel=info", "--concurrency=4", "--queues=celery,high_priority"]
