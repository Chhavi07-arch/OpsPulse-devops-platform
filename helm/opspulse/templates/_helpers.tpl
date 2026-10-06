{{- define "opspulse.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "opspulse.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else if contains (include "opspulse.name" .) .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "opspulse.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "opspulse.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
app.kubernetes.io/name: {{ include "opspulse.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: opspulse
{{- end -}}

{{/* Selector labels for one component: include "opspulse.selectorLabels" (dict "ctx" . "component" "backend") */}}
{{- define "opspulse.selectorLabels" -}}
app.kubernetes.io/name: {{ include "opspulse.name" .ctx }}
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end -}}

{{- define "opspulse.componentName" -}}
{{- printf "%s-%s" (include "opspulse.fullname" .ctx) .component | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "opspulse.dbSecretName" -}}
{{- default (printf "%s-db" (include "opspulse.fullname" .)) .Values.postgresql.auth.existingSecret -}}
{{- end -}}

{{- define "opspulse.image" -}}
{{- printf "%s:%s" .image.repository (required (printf "%s.image.tag is required (e.g. the Git commit SHA)" .component) .image.tag) -}}
{{- end -}}

{{/* Hardened container settings shared by every OpsPulse container. */}}
{{- define "opspulse.containerSecurityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: ["ALL"]
{{- end -}}
