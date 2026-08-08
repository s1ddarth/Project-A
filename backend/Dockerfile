# Plain container with all config in environment variables, so moving to Cloud
# Run later (for batch production) is a deployment change and not a rewrite.
# Deploy to an EU region — the funds are Irish and CBI-regulated.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first so the layer caches across code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY srri_engine/ ./srri_engine/
COPY api/ ./api/

# Fail the build rather than the first request if the engine regressed.
RUN python srri_engine/test_srri_engine.py

RUN useradd --create-home --uid 10001 appuser
USER appuser

WORKDIR /app/api
EXPOSE 8000

# PORT is honoured by Cloud Run and Render; CORS_ORIGINS must be set in deployment.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
