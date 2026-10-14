#!/usr/bin/env bash
# Builds the complete OpsPulse demo inside a Codespace (or any machine with ~12 GB free memory):
# minikube + Ingress + metrics-server, Prometheus/Grafana, Argo CD, and OpsPulse deployed by Argo CD
# from this repository. Re-running it is safe. Afterwards it forwards the UIs to localhost.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1;35m▶ %s\033[0m\n' "$1"; }

step "Kubernetes cluster (minikube)"
if ! minikube status >/dev/null 2>&1; then
  minikube start --cpus=4 --memory=12g
fi
minikube update-context
kubectl config use-context minikube >/dev/null
minikube addons enable ingress
minikube addons enable metrics-server

step "Namespace and database Secret (generated here, never stored in Git)"
kubectl apply -f kubernetes/namespace.yaml
kubectl get secret opspulse-db -n opspulse >/dev/null 2>&1 ||
  kubectl create secret generic opspulse-db -n opspulse \
    --from-literal=postgres-password="$(openssl rand -hex 16)"

step "Prometheus + Grafana"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo update prometheus-community >/dev/null
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f monitoring/kube-prometheus-stack-values.yaml --wait --timeout 10m

step "Argo CD"
kubectl get namespace argocd >/dev/null 2>&1 || kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml >/dev/null
kubectl wait --for=condition=Available deployment --all -n argocd --timeout=10m

step "OpsPulse, deployed by Argo CD from Git"
kubectl apply -f gitops/argocd/project.yaml -f gitops/argocd/application.yaml
deadline=$((SECONDS + 600))
until [ "$(kubectl get application opspulse -n argocd --request-timeout=15s -o jsonpath='{.status.sync.status}/{.status.health.status}' 2>/dev/null)" = "Synced/Healthy" ]; do
  if (( SECONDS >= deadline )); then
    echo "Argo CD did not reach Synced/Healthy within 10 minutes. Inspect these results:" >&2
    kubectl get application opspulse -n argocd -o yaml --request-timeout=15s >&2 || true
    kubectl get pods -n opspulse --request-timeout=15s >&2 || true
    exit 1
  fi
  echo "  waiting for Argo CD to sync ($(kubectl get application opspulse -n argocd --request-timeout=15s -o jsonpath='{.status.sync.status}/{.status.health.status}' 2>/dev/null))"
  sleep 10
done
kubectl get pods,svc,ingress,hpa,pvc -n opspulse

step "Checking and forwarding the UIs"
exec bash .devcontainer/demo-forward.sh
