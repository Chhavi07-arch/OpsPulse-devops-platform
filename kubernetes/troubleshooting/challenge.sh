#!/usr/bin/env bash
# Troubleshooting challenge: deliberately break the running OpsPulse release, then repair it.
#   ./challenge.sh list          show the scenarios
#   ./challenge.sh break <n>     introduce fault n
#   ./challenge.sh fix <n>       apply the targeted fix for fault n
# The walkthrough (symptoms, investigation, root cause) is in docs/troubleshooting.md.
set -euo pipefail

NS="${NAMESPACE:-opspulse}"
RELEASE="${RELEASE:-opspulse}"
BACKEND="$RELEASE-backend"
DB_SECRET="${DB_SECRET:-$RELEASE-db}"
DB_KEY="postgres-password"

k() { kubectl -n "$NS" "$@"; }

scenarios=(
  "1  Bad image tag            -> ImagePullBackOff"
  "2  Wrong database password  -> migrate init container CrashLoopBackOff"
  "3  Service selector typo    -> Service has no endpoints, UI shows API errors"
  "4  Broken readiness probe   -> pods never Ready, traffic stops"
  "5  Memory limit too low     -> OOMKilled / CrashLoopBackOff"
  "6  Impossible CPU request   -> pods stuck Pending"
  "7  Ingress backend typo     -> /api returns 503"
)

break_1() { k set image "deployment/$BACKEND" backend=ghcr.io/opspulse/does-not-exist:missing migrate=ghcr.io/opspulse/does-not-exist:missing; }
fix_1() { k rollout undo "deployment/$BACKEND"; }

break_2() {
  k create secret generic "$DB_SECRET-backup" \
    --from-literal="$DB_KEY=$(k get secret "$DB_SECRET" -o jsonpath="{.data.$DB_KEY}" | base64 --decode)"
  k patch secret "$DB_SECRET" --type merge -p "{\"stringData\":{\"$DB_KEY\":\"wrong-password\"}}"
  k rollout restart "deployment/$BACKEND"
}
fix_2() {
  local saved
  saved="$(k get secret "$DB_SECRET-backup" -o jsonpath="{.data.$DB_KEY}")"
  k patch secret "$DB_SECRET" --type merge -p "{\"data\":{\"$DB_KEY\":\"$saved\"}}"
  k delete secret "$DB_SECRET-backup"
  k rollout restart "deployment/$BACKEND"
}

break_3() { k patch service "$BACKEND" --type merge -p '{"spec":{"selector":{"app.kubernetes.io/component":"api"}}}'; }
fix_3() { k patch service "$BACKEND" --type merge -p '{"spec":{"selector":{"app.kubernetes.io/component":"backend"}}}'; }

break_4() {
  k patch deployment "$BACKEND" --type json \
    -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/readyz"}]'
}
fix_4() { k rollout undo "deployment/$BACKEND"; }

break_5() { k set resources "deployment/$BACKEND" -c backend --limits=memory=24Mi --requests=memory=24Mi; }
fix_5() { k rollout undo "deployment/$BACKEND"; }

break_6() { k set resources "deployment/$BACKEND" -c backend --requests=cpu=64 --limits=cpu=64; }
fix_6() { k rollout undo "deployment/$BACKEND"; }

break_7() {
  k patch ingress "$RELEASE" --type json \
    -p '[{"op":"replace","path":"/spec/rules/0/http/paths/0/backend/service/name","value":"opspulse-api"}]'
}
fix_7() {
  k patch ingress "$RELEASE" --type json \
    -p "[{\"op\":\"replace\",\"path\":\"/spec/rules/0/http/paths/0/backend/service/name\",\"value\":\"$BACKEND\"}]"
}

usage() { sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

case "${1:-}" in
  list) printf '%s\n' "${scenarios[@]}" ;;
  break | fix)
    n="${2:-}"
    [[ "$n" =~ ^[1-7]$ ]] || usage
    "${1}_${n}"
    echo "${1} ${n} applied: ${scenarios[$((n - 1))]}"
    ;;
  *) usage ;;
esac
