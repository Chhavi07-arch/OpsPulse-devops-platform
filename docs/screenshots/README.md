# Screenshot index

[← Project tour](../../README.md)

Captured on **14 October 2026** from the running OpsPulse application and GitHub Actions. Application captures use the orbital UI at commit `fa87670`, an isolated local SQLite database and seeded example services/incidents. The browser uses UTC for the refreshed overview, incident, service and status captures. PostgreSQL remains the database used by Compose and Kubernetes.

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

**CI source:** [run 38599535048](https://github.com/Chhavi07-arch/OpsPulse-devops-platform/actions/runs/38599535048), commit `fa87670`. Its logs report 30 passing backend tests, 97% backend coverage and all 10 jobs successful, including the kind/Helm deployment test.

These are captures of real pages, not generated mock-ups. Demo incident text is fictional seed/test content. No screenshot here claims a currently running AWS deployment.

## Evidence scope

Live Argo CD, Grafana, Prometheus and terminal captures are omitted at the author's request. The application/API screenshots and real CI summary are the presentation's visual evidence. No cluster was created or started for screenshots. AWS remains deferred; these images do not show an AWS deployment.
