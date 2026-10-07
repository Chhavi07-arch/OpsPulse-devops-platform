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
until [ "$(kubectl get application opspulse -n argocd -o jsonpath='{.status.sync.status}/{.status.health.status}' 2>/dev/null)" = "Synced/Healthy" ]; do
  echo "  waiting for Argo CD to sync ($(kubectl get application opspulse -n argocd -o jsonpath='{.status.sync.status}/{.status.health.status}' 2>/dev/null))"
  sleep 10
done
kubectl get pods,svc,ingress,hpa,pvc -n opspulse

step "Forwarding the UIs (logs in /tmp/port-forward-*.log)"
forward() { # namespace service local:remote
  pkill -f "port-forward -n $1 svc/$2" 2>/dev/null || true
  nohup kubectl port-forward -n "$1" "svc/$2" "$3" >"/tmp/port-forward-$2.log" 2>&1 &
}
forward opspulse opspulse-frontend 3000:8080
forward monitoring monitoring-grafana 3001:80
forward argocd argocd-server 8443:443
forward monitoring monitoring-kube-prometheus-prometheus 9090:9090

cat <<EOF

OpsPulse is running. Open the forwarded ports from the PORTS tab:
  3000  OpsPulse dashboard (and /status for the public status page)
  3001  Grafana     user: admin   password: $(kubectl get secret -n monitoring monitoring-grafana -o jsonpath='{.data.admin-password}' | base64 -d)
  8443  Argo CD     user: admin   password: $(kubectl get secret -n argocd argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)
  9090  Prometheus
EOF
