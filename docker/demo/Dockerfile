# A single public demo service: the real React UI and FastAPI application.
FROM node:24-alpine AS frontend
WORKDIR /build
COPY application/frontend/package.json application/frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY application/frontend/index.html application/frontend/vite.config.js ./
COPY application/frontend/public ./public
COPY application/frontend/src ./src
RUN npm run build

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OPSPULSE_ENVIRONMENT=hosted-demo \
    OPSPULSE_DATABASE_URL=sqlite+pysqlite:////tmp/opspulse-demo.sqlite3 \
    OPSPULSE_SEED_DEMO_DATA=true \
    OPSPULSE_STATIC_DIRECTORY=/app/frontend

WORKDIR /app
COPY application/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd --system --gid 10001 opspulse \
    && useradd --system --uid 10001 --gid opspulse --no-create-home --shell /usr/sbin/nologin opspulse
COPY application/backend/app ./app
COPY --from=frontend /build/dist ./frontend
USER 10001:10001
EXPOSE 8000
CMD ["sh", "-c", "exec uvicorn app.hosted_demo:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
