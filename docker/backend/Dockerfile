# Build context: repository root (docker build -f docker/backend/Dockerfile .)

FROM python:3.12-slim AS build
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
COPY application/backend/requirements.txt /tmp/requirements.txt
RUN python -m venv /opt/venv \
    && /opt/venv/bin/pip install -r /tmp/requirements.txt

FROM python:3.12-slim AS runtime
ARG GIT_SHA=local
ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    OPSPULSE_GIT_SHA=${GIT_SHA}

# OS security patches newer than the base image, plus an unprivileged user.
RUN apt-get update \
    && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 10001 opspulse \
    && useradd --system --uid 10001 --gid opspulse --no-create-home --shell /usr/sbin/nologin opspulse

WORKDIR /app
COPY --from=build /opt/venv /opt/venv
COPY application/backend/alembic.ini ./
COPY application/backend/alembic ./alembic
COPY application/backend/app ./app
COPY docker/backend/entrypoint.sh /usr/local/bin/entrypoint.sh

USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
