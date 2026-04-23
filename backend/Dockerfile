FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (lxml needs libxml2/libxslt; bcrypt needs build tools on slim)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    curl \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.prod.txt requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8001/api/ || exit 1

# Single worker: APScheduler + auto_expire_loop must not run twice.
# For a small-team CRM this is plenty. Scale by adding more container replicas
# behind Caddy if needed (and then move the scheduler to a dedicated one-worker
# service).
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
