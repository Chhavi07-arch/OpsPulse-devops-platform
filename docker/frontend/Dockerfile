# Build context: repository root (docker build -f docker/frontend/Dockerfile .)

# Stage 1: build the React app with Node.
FROM node:24-alpine AS build
WORKDIR /app
COPY application/frontend/package.json application/frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY application/frontend/index.html application/frontend/vite.config.js ./
COPY application/frontend/public ./public
COPY application/frontend/src ./src
RUN npm run build

# Stage 2: serve the static files with an Nginx that runs as a non-root user (uid 101).
FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime
USER root
RUN apk upgrade --no-cache
USER 101

# Where Nginx forwards /api requests; overridden per environment (Compose, Helm).
# NGINX_ENTRYPOINT_LOCAL_RESOLVERS exposes the container's DNS servers to the config template.
ENV OPSPULSE_API_UPSTREAM=http://backend:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY docker/frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD ["wget", "-qO-", "http://127.0.0.1:8080/healthz"]
