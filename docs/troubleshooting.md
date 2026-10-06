# Troubleshooting challenge

Seven faults are introduced into a healthy OpsPulse release with
[`kubernetes/troubleshooting/challenge.sh`](../kubernetes/troubleshooting/challenge.sh), then diagnosed and fixed.
Every investigation follows the same loop:

```text
symptom → kubectl get → describe / events → logs → root cause → fix → verify
```

> If the release is managed by Argo CD with `selfHeal`, Argo reverts most of these faults by itself
> within seconds, which is GitOps reconciliation at work. Run the challenge against the Helm release
> installed with `helm upgrade --install` to investigate each fault manually.

```bash
cd kubernetes/troubleshooting
./challenge.sh list
NS=opspulse                      # used in the commands below
```

---

## 1. Bad image tag → `ImagePullBackOff`

```bash
./challenge.sh break 1
```

**Symptom:** new backend pods never start; `kubectl get pods` shows `ErrImagePull`, then `ImagePullBackOff`
(old pods keep serving because the rolling update cannot progress). With `values-local.yaml`
(`pullPolicy: Never`) the same fault appears as `ErrImageNeverPull`: the image is not in the node's cache.

**Investigate**

```bash
kubectl get pods -n $NS -l app.kubernetes.io/component=backend
kubectl describe pod -n $NS <new-backend-pod> | sed -n '/Events/,$p'
kubectl rollout status deployment/opspulse-backend -n $NS --timeout=20s
```

**Root cause:** the Events show `Failed to pull image "ghcr.io/opspulse/does-not-exist:missing"`:
the image reference does not exist in the registry.

**Fix:** roll back to the last working ReplicaSet (in a real incident, also fix the tag in Git).

```bash
./challenge.sh fix 1          # kubectl rollout undo deployment/opspulse-backend
kubectl rollout status deployment/opspulse-backend -n $NS
```

---

## 2. Wrong database password → init container `CrashLoopBackOff`

```bash
./challenge.sh break 2
```

**Symptom:** new pods show `Init:Error`, then `Init:CrashLoopBackOff`; the rollout hangs while the old
pods keep serving.

**Investigate**

```bash
kubectl get pods -n $NS -l app.kubernetes.io/component=backend
kubectl logs -n $NS <new-backend-pod> -c migrate
kubectl get secret opspulse-db -n $NS -o jsonpath='{.data.postgres-password}' | base64 --decode; echo
```

**Root cause:** the `migrate` init container logs
`password authentication failed for user "opspulse"`. The Secret no longer matches the password the
database was initialised with.

**Fix:** restore the correct Secret value and restart the rollout.

```bash
./challenge.sh fix 2
kubectl rollout status deployment/opspulse-backend -n $NS
```

---

## 3. Service selector typo → no endpoints

```bash
./challenge.sh break 3
```

**Symptom:** every pod is `Running` and `Ready`, yet the dashboard shows "Could not reach the OpsPulse
API" and `/api/*` returns `502`/`503`.

**Investigate**

```bash
kubectl get endpointslices -n $NS -l kubernetes.io/service-name=opspulse-backend
kubectl get service opspulse-backend -n $NS -o jsonpath='{.spec.selector}'; echo
kubectl get pods -n $NS --show-labels | grep backend
```

**Root cause:** the Service selects `app.kubernetes.io/component=api`, but the pods are labelled
`app.kubernetes.io/component=backend`, so the Service has no endpoints and traffic goes nowhere.

**Fix**

```bash
./challenge.sh fix 3
kubectl get endpointslices -n $NS -l kubernetes.io/service-name=opspulse-backend   # pod IPs are back
```

---

## 4. Broken readiness probe → pods never Ready

```bash
./challenge.sh break 4
```

**Symptom:** new backend pods are `Running` but `0/1 READY`; the rollout never completes.

**Investigate**

```bash
kubectl get pods -n $NS -l app.kubernetes.io/component=backend
kubectl describe pod -n $NS <new-backend-pod> | grep -A3 -E 'Readiness|Unhealthy'
kubectl exec -n $NS deploy/opspulse-frontend -- wget -qSO- http://opspulse-backend:8000/readyz
```

**Root cause:** Events show `Readiness probe failed: HTTP probe failed with statuscode: 404`. The probe
calls `/readyz`, but the API serves `/ready`. Readiness failures stop traffic to the pod without
restarting it (liveness still passes).

**Fix**

```bash
./challenge.sh fix 4          # rollout undo restores the /ready probe
```

---

## 5. Memory limit too low → `OOMKilled`

```bash
./challenge.sh break 5
```

**Symptom:** backend pods restart repeatedly and end up in `CrashLoopBackOff`.

**Investigate**

```bash
kubectl get pods -n $NS -l app.kubernetes.io/component=backend
kubectl describe pod -n $NS <new-backend-pod> | grep -A5 'Last State'
kubectl get deployment opspulse-backend -n $NS -o jsonpath='{.spec.template.spec.containers[0].resources}'; echo
kubectl top pods -n $NS
```

**Root cause:** `Last State: Terminated, Reason: OOMKilled, Exit Code: 137`. The container limit was set to
`24Mi`, but the API needs about 60–70 MiB (see `kubectl top pods`), so the kernel kills it.

**Fix:** restore the previous limits (`128Mi` request, `384Mi` limit from the chart).

```bash
./challenge.sh fix 5
```

---

## 6. Impossible CPU request → `Pending`

```bash
./challenge.sh break 6
```

**Symptom:** a new backend pod stays `Pending` forever.

**Investigate**

```bash
kubectl get pods -n $NS -l app.kubernetes.io/component=backend
kubectl describe pod -n $NS <pending-pod> | sed -n '/Events/,$p'
kubectl describe node | grep -A5 'Allocatable'
```

**Root cause:** `FailedScheduling: 0/1 nodes are available: 1 Insufficient cpu`. The pod requests
64 CPUs, more than any node has, so the scheduler cannot place it.

**Fix**

```bash
./challenge.sh fix 6
```

---

## 7. Ingress backend typo → `/api` returns 503

```bash
./challenge.sh break 7
```

**Symptom:** the dashboard loads through `http://opspulse.local` but every API call fails with `503`;
the API works through `kubectl port-forward`.

**Investigate**

```bash
kubectl describe ingress opspulse -n $NS
kubectl get service -n $NS
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller --tail=20 | grep opspulse
```

**Root cause:** the Ingress rule for `/api` points at Service `opspulse-api`, which does not exist
(`describe` shows `<error: services "opspulse-api" not found>`).

**Fix**

```bash
./challenge.sh fix 7
curl -s -H 'Host: opspulse.local' http://127.0.0.1/api/meta     # with minikube tunnel running
```

---

## Quick reference

| Symptom | First command | Usual cause |
|---|---|---|
| `ImagePullBackOff` | `kubectl describe pod` → Events | wrong image/tag, missing pull secret |
| `CrashLoopBackOff` | `kubectl logs --previous` (and `-c <init>`) | app/config error, bad credentials, OOM |
| `Running` but `0/1` | `kubectl describe pod` → Readiness | wrong probe path/port, dependency down |
| `Pending` | `kubectl describe pod` → FailedScheduling | resources, node selectors, unbound PVC |
| Service has no endpoints | `kubectl get endpointslices` + `--show-labels` | selector/label mismatch, pods not Ready |
| Ingress 503 | `kubectl describe ingress` | wrong Service name/port, no ready endpoints |
