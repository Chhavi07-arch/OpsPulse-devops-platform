import { Link } from "react-router-dom";
import { Activity, AlertTriangle, CheckCircle2, XOctagon } from "lucide-react";
import UptimeBars from "../components/UptimeBars";
import { ErrorState, SeverityBadge, ServiceStatusPill, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { OVERALL_HEADLINE, SERVICE_STATUS, statusLabel } from "../lib/constants";
import { formatDateTime, formatDuration, timeAgo } from "../lib/format";
import { useNow, usePolling } from "../lib/hooks";

const HERO_ICON = { ok: CheckCircle2, warn: AlertTriangle, orange: AlertTriangle, danger: XOctagon };

export default function StatusPage() {
  const now = useNow();
  const { data: page, error, reload } = usePolling(() => api.statusPage(), [], 30000);

  return (
    <div className="public">
      <header className="public__header">
        <Link to="/" className="brand">
          <span className="brand__logo">
            <Activity size={20} />
          </span>
          <span className="brand__name">OpsPulse Status</span>
        </Link>
        {page && <span className="muted">Updated {timeAgo(page.generated_at, now)}</span>}
      </header>

      <main className="public__main">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !page ? (
          <Skeleton height={120} count={4} />
        ) : (
          <>
            <StatusHero overall={page.overall} />

            {page.active_incidents.length > 0 && (
              <section className="public__section">
                <h2>Ongoing incidents</h2>
                {page.active_incidents.map((incident) => (
                  <article key={incident.id} className={`public-incident sev-border--${incident.severity.toLowerCase()}`}>
                    <header>
                      <SeverityBadge severity={incident.severity} />
                      <h3>{incident.title}</h3>
                    </header>
                    <p className="muted">
                      Affecting <strong>{incident.service_name}</strong> · started{" "}
                      {formatDateTime(incident.started_at)}
                    </p>
                    <ol className="public-incident__updates">
                      {incident.updates.map((u) => (
                        <li key={u.id}>
                          <strong>{statusLabel(u.status)}</strong> — {u.message}
                          <span className="muted"> ({timeAgo(u.created_at, now)})</span>
                        </li>
                      ))}
                    </ol>
                  </article>
                ))}
              </section>
            )}

            <section className="public__section">
              <div className="public__section-head">
                <h2>Services</h2>
                <span className="muted">Last {page.services[0]?.history.length ?? 30} days</span>
              </div>
              <div className="public-services">
                {page.services.map((service) => (
                  <div key={service.id} className="public-service">
                    <div className="public-service__head">
                      <strong>{service.name}</strong>
                      <ServiceStatusPill status={service.status} />
                    </div>
                    <UptimeBars history={service.history} />
                    <div className="public-service__foot muted">
                      <span>{service.history.length} days ago</span>
                      <span>{service.uptime_percent.toFixed(2)}% uptime</span>
                      <span>Today</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="public__section">
              <h2>Resolved this week</h2>
              {page.recently_resolved.length === 0 ? (
                <p className="muted">No incidents in the last 7 days.</p>
              ) : (
                <ul className="past-incidents">
                  {page.recently_resolved.map((incident) => (
                    <li key={incident.id}>
                      <SeverityBadge severity={incident.severity} />
                      <div>
                        <strong>{incident.title}</strong>
                        <span className="muted">
                          {incident.service_name} · resolved {timeAgo(incident.resolved_at, now)} · lasted{" "}
                          {formatDuration(incident.duration_minutes)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="public__footer muted">Powered by OpsPulse</footer>
    </div>
  );
}

function StatusHero({ overall }) {
  const tone = SERVICE_STATUS[overall].tone;
  const Icon = HERO_ICON[tone];
  return (
    <div className={`status-hero status-hero--${tone}`}>
      <Icon size={32} />
      <div>
        <h1>{OVERALL_HEADLINE[overall]}</h1>
        <p>Live status of every OpsPulse-monitored service.</p>
      </div>
    </div>
  );
}
