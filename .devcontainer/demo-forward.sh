#!/usr/bin/env bash
# Restore UI access after resuming the Codespace, without reinstalling the stack.
# Leave this terminal running. Ctrl+C stops only the forwards started here.
set -euo pipefail

CONTEXT="${OPSPULSE_KUBE_CONTEXT:-}"
context_exists() {
  [[ -n "$1" ]] && kubectl config get-contexts "$1" -o name | grep -Fxq -- "$1"
}
if [[ -z "$CONTEXT" ]]; then
  CONTEXT="$(kubectl config current-context 2>/dev/null || true)"
  # A resumed minikube may have lost its kubeconfig entry. Recover only a
  # running existing profile; never create a new cluster as part of forwarding.
  if { [[ -z "$CONTEXT" ]] || [[ "$CONTEXT" == "minikube" ]]; } && ! context_exists "$CONTEXT" && command -v minikube >/dev/null 2>&1; then
    host_status="$(minikube -p minikube status --format '{{.Host}}' 2>/dev/null || true)"
    if [[ "$host_status" == "Running" ]]; then
      minikube -p minikube update-context
      CONTEXT=minikube
    fi
  fi
fi

if ! context_exists "$CONTEXT"; then
  cat >&2 <<'EOF'
No usable Kubernetes context was found. No cluster has been created or reset.
Run these in the Codespaces terminal to identify the existing cluster:
  kubectl config get-contexts
  minikube profile list
  docker ps --format '{{.Names}}'
For a running minikube profile, restore its connection with:
  minikube -p PROFILE_NAME update-context
For an existing kind cluster, restore its connection with:
  kind export kubeconfig --name CLUSTER_NAME
Then retry this script. To select an existing context explicitly:
  OPSPULSE_KUBE_CONTEXT=CONTEXT_NAME bash .devcontainer/demo-forward.sh
EOF
  exit 1
fi
printf 'Using Kubernetes context: %s\n' "$CONTEXT"
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
if ! kubectl --context "$CONTEXT" -n opspulse get service opspulse-frontend --request-timeout=15s >/dev/null; then
  printf 'OpsPulse was not found in context %s. Select the context of your existing demo cluster.\n' "$CONTEXT" >&2
  kubectl config get-contexts >&2
  exit 1
fi
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
