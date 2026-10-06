export const SEVERITIES = [
  { value: "SEV1", label: "SEV1", name: "Critical", hint: "Full outage of a customer-facing service" },
  { value: "SEV2", label: "SEV2", name: "Major", hint: "Significant degradation for many users" },
  { value: "SEV3", label: "SEV3", name: "Minor", hint: "Partial impact, a workaround exists" },
  { value: "SEV4", label: "SEV4", name: "Low", hint: "Cosmetic or internal-only impact" },
];

export const INCIDENT_STATUSES = [
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "IDENTIFIED", label: "Identified" },
  { value: "MONITORING", label: "Monitoring" },
  { value: "RESOLVED", label: "Resolved" },
];

export const SERVICE_STATUS = {
  OPERATIONAL: { label: "Operational", tone: "ok" },
  DEGRADED: { label: "Degraded performance", tone: "warn" },
  PARTIAL_OUTAGE: { label: "Partial outage", tone: "orange" },
  MAJOR_OUTAGE: { label: "Major outage", tone: "danger" },
};

export const OVERALL_HEADLINE = {
  OPERATIONAL: "All systems operational",
  DEGRADED: "Some systems are experiencing degraded performance",
  PARTIAL_OUTAGE: "Partial system outage",
  MAJOR_OUTAGE: "Major system outage",
};

export const TIERS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "STANDARD", label: "Standard" },
];

export const statusLabel = (value) => INCIDENT_STATUSES.find((s) => s.value === value)?.label ?? value;

export const REFRESH_INTERVAL_MS = 15000;
