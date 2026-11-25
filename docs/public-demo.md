# Public career-profile demo

This deployment serves the existing React UI and FastAPI backend from one Render
URL. The Dockerfile builds the frontend and packages it with the Python app, so
API requests and browser navigation work on the same origin without CORS setup.

## Scope

- Uses seeded example services and incidents, with the normal create/update,
  timeline, reporting and status-page workflows.
- Runs as a non-root user with one Uvicorn worker and a disposable SQLite database
  under `/tmp`. Everyone sees the same demonstration data; changes can disappear
  when the service restarts or is redeployed. Do not enter private information.
- The normal PostgreSQL, Helm, Kubernetes, GitOps and monitoring configurations
  are retained. This web demo does not claim to deploy an EKS cluster or Grafana.
- The Blueprint explicitly selects Render's free web-service plan and creates no
  managed database or persistent disk. Free services may need time to wake up.

## Publish

1. Push the `deploy/career-demo` branch to the repository above.
2. Create a Render Blueprint from that repository and branch using `render.yaml`.
3. Wait for the image build and `/ready` health check to pass.
4. Use the actual service URL returned by Render; no deployment URL is assumed.

## Verify the deployed service

Check `/health`, `/ready`, `/api/services` and `/api/status`. Open `/`, `/incidents`,
`/services` and `/status`, including refreshing those nested browser routes.
Create a test incident, post a timeline update and resolve it. Confirm the public
status page reflects the change. A missing `/api/unknown` or JavaScript asset must
return 404, not the frontend HTML.

## Current preparation status

The `deploy/career-demo` branch is published on GitHub. The frontend production
build, all 31 backend tests, and a hosted-demo smoke check passed. The smoke check
covered seeded data, browser routes, readiness, and declaring, resolving, and
deleting an incident. Publishing the service still requires an authenticated
Render connection. A public URL is not available until Render confirms a
successful deployment.
