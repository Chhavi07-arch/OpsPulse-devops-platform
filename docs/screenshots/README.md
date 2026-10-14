# Screenshot index

[← Project tour](../../README.md)

Captured on **14 October 2026** from the running OpsPulse application and GitHub Actions. Application captures use the orbital UI at commit `fa87670`, an isolated local SQLite database and seeded example services/incidents. The browser uses UTC for the refreshed overview, incident, service and status captures. PostgreSQL remains the database used by Compose and Kubernetes.

| Image | Source / what it demonstrates |
|---|---|
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

## Remaining live deployment captures

The local minikube profiles were stopped during this documentation pass. The running Codespace’s authenticated Kubernetes/monitoring interfaces were not accessible from this session. Capture these from the existing Codespace when it is available:

1. **Argo CD, port 8443:** OpsPulse Application with both `Synced` and `Healthy`, plus its resource tree.
2. **Grafana, port 3001:** “OpsPulse — Service Overview” with a recent time range and populated graphs.
3. **Prometheus, port 9090:** targets page showing the OpsPulse backend targets `UP`.
4. **Codespace terminal:** `kubectl get pods,svc,hpa,pvc -n opspulse`, showing readiness, CPU metrics and a Bound PVC.

Run `bash .devcontainer/demo-forward.sh` from the repository in the existing Codespace, then use its **Ports** tab. For a missing context, follow the [recovery instructions](../operations-guide.md#kubernetes-and-helm); do not create another cluster just to obtain screenshots.

After the intentionally deferred AWS demo, capture the EKS cluster/nodes, running app through the AWS context, and teardown verification. Hide passwords, tokens, login callback URLs and personal billing details before adding images to Git.
