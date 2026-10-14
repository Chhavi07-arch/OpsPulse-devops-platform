#!/usr/bin/env bash
# Restore UI access after resuming the Codespace, without reinstalling the stack.
# Leave this terminal running. Ctrl+C stops only the forwards started here.
set -euo pipefail

CONTEXT="${OPSPULSE_KUBE_CONTEXT:-minikube}"
LOG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/opspulse-forward.XXXXXX")"
pids=()

cleanup() {
  if (( ${#pids[@]} > 0 )); then
    for pid in "${pids[@]}"; do
      kill "$pid" 2>/dev/null || true
    done
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

kubectl --context "$CONTEXT" get nodes --request-timeout=15s >/dev/null
kubectl --context "$CONTEXT" -n opspulse rollout status deployment/opspulse-frontend --timeout=120s
kubectl --context "$CONTEXT" -n opspulse rollout status deployment/opspulse-backend --timeout=120s

forward() {
  local namespace="$1" service="$2" ports="$3" url="$4" log_file pid attempt
  log_file="$LOG_DIR/$service.log"
  # A previous forward can still be healthy; leave it running if its endpoint responds.
  if curl --fail --silent --insecure --max-time 3 "$url" >/dev/null; then
    printf 'Port %s already responds; reusing the existing listener.\n' "${ports%%:*}"
    return
  fi
  kubectl --context "$CONTEXT" port-forward -n "$namespace" "svc/$service" "$ports" >"$log_file" 2>&1 &
  pid=$!
  pids+=("$pid")
  for attempt in {1..30}; do
    if ! kill -0 "$pid" 2>/dev/null; then
      printf 'Forward for %s failed. Details:\n' "$service" >&2
      cat "$log_file" >&2
      return 1
    fi
    if curl --fail --silent --insecure --max-time 2 "$url" >/dev/null; then
      printf 'Ready: %s on port %s\n' "$service" "${ports%%:*}"
      return
    fi
    sleep 1
  done
  printf 'Timed out waiting for %s. Log: %s\n' "$service" "$log_file" >&2
  cat "$log_file" >&2
  return 1
}

forward opspulse opspulse-frontend 3000:8080 http://127.0.0.1:3000/api/meta
forward monitoring monitoring-grafana 3001:80 http://127.0.0.1:3001/api/health
forward argocd argocd-server 8443:443 https://127.0.0.1:8443/healthz
forward monitoring monitoring-kube-prometheus-prometheus 9090:9090 http://127.0.0.1:9090/-/ready

printf '\nUI endpoints responded. Open ports 3000, 3001, 8443 and 9090 in the Codespaces Ports tab.\n'
printf 'Leave this terminal running. Ctrl+C stops the forwards started here. Logs: %s\n' "$LOG_DIR"
while true; do
  if (( ${#pids[@]} > 0 )); then
    for pid in "${pids[@]}"; do
      if ! kill -0 "$pid" 2>/dev/null; then
        printf 'A port-forward stopped. Inspect %s and rerun this script.\n' "$LOG_DIR" >&2
        exit 1
      fi
    done
  fi
  sleep 5
done
