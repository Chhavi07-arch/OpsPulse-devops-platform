#!/usr/bin/env bash
# Runs the same security checks as the CI pipeline, locally, using container images
# (only Docker is required). Reports are written to security/reports/ (gitignored).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORTS="$ROOT/security/reports"
mkdir -p "$REPORTS"
cd "$ROOT"

GITLEAKS_IMAGE="zricethezav/gitleaks:v8.30.1"
SEMGREP_IMAGE="semgrep/semgrep"
TRIVY_IMAGE="aquasec/trivy:0.75.0"
PYTHON_IMAGE="python:3.12-slim"

step() { printf '\n\033[1;35m▶ %s\033[0m\n' "$1"; }

step "Secret scanning (Gitleaks, full history)"
docker run --rm -v "$ROOT:/repo" "$GITLEAKS_IMAGE" git /repo --redact --no-banner \
  --report-path /repo/security/reports/gitleaks.json

step "SAST (Semgrep)"
docker run --rm -v "$ROOT:/src" -w /src "$SEMGREP_IMAGE" \
  semgrep scan --config p/default --severity ERROR --error --metrics=off \
  --exclude application/frontend/node_modules --exclude terraform/.terraform

step "SAST (Bandit) and SCA (pip-audit)"
docker run --rm -v "$ROOT:/src" -w /src "$PYTHON_IMAGE" sh -c '
  pip install -q --disable-pip-version-check bandit==1.9.4 pip-audit==2.10.1 &&
  bandit -q -r application/backend/app -c application/backend/pyproject.toml \
    --severity-level medium --confidence-level medium &&
  pip-audit -r application/backend/requirements.txt --strict'

step "SCA (npm audit, runtime dependencies)"
(cd application/frontend && npm audit --omit=dev --audit-level=high)

step "IaC misconfiguration (Trivy config)"
docker run --rm -v "$ROOT:/src" -w /src "$TRIVY_IMAGE" config \
  --config security/trivy.yaml --ignorefile security/.trivyignore \
  --skip-dirs application/frontend/node_modules --skip-dirs terraform/.terraform \
  --severity HIGH,CRITICAL --exit-code 1 .

for component in backend frontend; do
  step "Container image scan (Trivy) — $component"
  docker build -q -t "opspulse-$component:scan" -f "docker/$component/Dockerfile" . >/dev/null
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock "$TRIVY_IMAGE" image \
    --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 "opspulse-$component:scan"
done

printf '\n\033[1;32m✔ All security gates passed\033[0m\n'
