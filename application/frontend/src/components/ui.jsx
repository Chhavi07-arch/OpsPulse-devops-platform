import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { SERVICE_STATUS, SEVERITIES, TIERS, statusLabel } from "../lib/constants";

export function SeverityBadge({ severity, withName = false }) {
  const info = SEVERITIES.find((s) => s.value === severity);
  return (
    <span className={`sev sev--${severity.toLowerCase()}`} title={info?.hint}>
      {severity}
      {withName && info ? ` · ${info.name}` : ""}
    </span>
  );
}

export function IncidentStatusPill({ status }) {
  return (
    <span className={`pill pill--${status.toLowerCase()}`}>
      <span className="pill__dot" />
      {statusLabel(status)}
    </span>
  );
}

export function ServiceStatusPill({ status }) {
  const info = SERVICE_STATUS[status];
  return (
    <span className={`pill pill--tone-${info.tone}`}>
      <span className="pill__dot" />
      {info.label}
    </span>
  );
}

export function StatusDot({ status, pulse = false }) {
  const tone = SERVICE_STATUS[status]?.tone ?? "ok";
  return <span className={`dot dot--${tone}${pulse && tone !== "ok" ? " dot--pulse" : ""}`} />;
}

export function TierBadge({ tier }) {
  return <span className={`tier tier--${tier.toLowerCase()}`}>{TIERS.find((t) => t.value === tier)?.label}</span>;
}

export function Card({ title, subtitle, action, className = "", children }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <header className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="empty">
      <Inbox size={28} />
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty empty--error">
      <AlertTriangle size={28} />
      <strong>Could not reach the OpsPulse API</strong>
      <p>{error?.message}</p>
      {onRetry && (
        <button className="btn btn--ghost" onClick={onRetry}>
          <RefreshCw size={16} /> Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ height = 16, width = "100%", count = 1 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className="skeleton" style={{ height, width }} />
  ));
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-header__actions">{children}</div>}
    </div>
  );
}
