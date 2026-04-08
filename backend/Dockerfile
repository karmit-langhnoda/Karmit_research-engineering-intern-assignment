# --- Stage 1: Builder --------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# Build-time system dependencies for native Python wheels.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install project dependencies into an isolated virtual environment.
COPY backend/requirements.txt /build/requirements.txt
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r /build/requirements.txt


# --- Stage 2: Runtime --------------------------------------------------------
FROM python:3.11-slim AS runtime

# Run as non-root for better container security.
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Runtime libraries and curl for Docker health checks.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH="/app/backend" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Copy backend code and local data used by DuckDB/Chroma paths.
COPY backend /app/backend
COPY data /app/data

# Writable cache dirs for model downloads at runtime.
RUN mkdir -p /app/models /home/appuser/.cache/huggingface && \
    chown -R appuser:appuser /app /home/appuser

USER appuser

WORKDIR /app/backend

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--log-level", "info"]
