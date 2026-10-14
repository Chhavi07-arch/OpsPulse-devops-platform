# Screenshot index

[← Project tour](../../README.md)

Application and CI images captured on **14 October 2026** from the running OpsPulse application and GitHub Actions. Application captures use the orbital UI at commit `fa87670`, an isolated local SQLite database and seeded example services/incidents. The browser uses UTC for the refreshed overview, incident, service and status captures. PostgreSQL remains the database used by Compose and Kubernetes.

| Image | Source / what it demonstrates |
|---|---|
| [Landing page](landing-page.png) | Wider 1800-pixel capture with navigation, full hero and overview counters |
| [Hero](overview-hero.png) | Overview’s Earth artwork and live counts from the local API |
| [Desktop overview](overview-desktop.png) | Complete overview page |
| [Operational dashboard](operations-dashboard.png) | KPIs, trend chart, severity, service health and activity |
| [Declare incident](declare-incident.png) | Real form filled before submission |
| [Incident detail](incident-detail.png) | A declared incident after posting an Identified update |
| [Incidents](incidents.png) | Incident table and available filters |
| [Services](services.png) | Service ownership, criticality and derived health |
| [Light theme](services-light.png) | The same catalogue in light mode |
| [Public status](public-status.png) | Active impact, updates, history and recent resolutions |
| [Uptime history](uptime-history.png) | Thirty-day incident-derived uptime bars |
| [Mobile](overview-mobile.png) | 390 × 844 viewport; horizontal overflow checked |
| [API docs](api-docs.png) | Swagger UI served by the running FastAPI API |
| [CI pipeline](ci-pipeline.png) | Actual GitHub Actions summary for successful run 38599535048 |
| [Grafana dashboard](grafana-dashboard.png) | Live provisioned OpsPulse dashboard: API traffic, latency, incident severity, two backend replicas, CPU and memory |
| [Argo CD application](argocd-application.png) | Live resource tree with Synced / Healthy and Sync OK at revision `91e3b64` |

**CI source:** [run 38599535048](https://github.com/Chhavi07-arch/OpsPulse-devops-platform/actions/runs/38599535048), commit `fa87670`. Its logs report 30 passing backend tests, 97% backend coverage and all 10 jobs successful, including the kind/Helm deployment test.

These are captures of real pages, not generated mock-ups. Demo incident text is fictional seed/test content. No screenshot here claims a currently running AWS deployment.

## Evidence scope

The **Argo CD and Grafana screenshots were captured on 15 October 2026 (IST)** through private port forwards to the existing Codespaces **minikube** cluster. The stopped cluster was resumed; no new cluster was created. Both frontend replicas, both backend replicas and PostgreSQL were ready, along with the monitoring stack. Argo CD reported **Synced / Healthy** and **Sync OK** at Git revision `91e3b64`; the application image tag was `fa87670dab4b4e78fb9d0d151b115e7c31cc7225`.

Grafana uses real Prometheus measurements from that cluster. A temporary script sent **240 read-only GET requests** over approximately two minutes to `/api/services`, `/api/incidents`, `/api/stats` and `/api/status`. The screenshot displays **14 October, 21:45–21:51 UTC** (15 October, 03:15–03:21 IST). This is a small illustrative workload, not a load test or production performance benchmark. Existing incident data was retained. The 5xx and incident-transition panels show **No data** because the corresponding series were not recorded in this window; no errors, declarations or resolutions were generated for the capture.

No credentials, login screens or tokens are included. The separate Prometheus targets page, alert firing/recovery and terminal captures remain outside this screenshot set. AWS remains deferred; none of these images shows an AWS deployment. The presentation files retain their earlier application/API and CI captures.
