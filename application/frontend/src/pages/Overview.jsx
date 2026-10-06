import { useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertOctagon, CheckCircle2, Flame, Plus, Server, Timer } from "lucide-react";
import DeclareIncidentModal from "../components/DeclareIncidentModal";
import {
  Card,
  ErrorState,
  IncidentStatusPill,
  PageHeader,
  SeverityBadge,
  Skeleton,
  StatusDot,
  TierBadge,
} from "../components/ui";
import { api } from "../lib/api";
import { SEVERITIES } from "../lib/constants";
import { formatDay, formatDuration, timeAgo } from "../lib/format";
import { useNow, usePolling } from "../lib/hooks";

function Kpi({ icon: Icon, label, value, hint, tone = "accent" }) {
  return (
    <div className={`kpi kpi--${tone}`}>
      <span className="kpi__icon">
        <Icon size={20} />
      </span>
      <div>
        <p className="kpi__label">{label}</p>
        <p className="kpi__value">{value}</p>
        {hint && <p className="kpi__hint">{hint}</p>}
      </div>
    </div>
  );
}

function TrendChart({ trend }) {
  const data = trend.map((point) => ({ ...point, label: formatDay(point.day) }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="opened" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ok)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--ok)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--text)",
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
        {/* Static series: the data refreshes every 15s and re-animating on each poll looks glitchy. */}
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="opened"
          name="Opened"
          stroke="var(--danger)"
          strokeWidth={2}
          fill="url(#opened)"
        />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="resolved"
          name="Resolved"
          stroke="var(--ok)"
          strokeWidth={2}
          fill="url(#resolved)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SeverityMix({ bySeverity }) {
  const max = Math.max(1, ...Object.values(bySeverity));
  return (
    <ul className="sev-mix">
      {SEVERITIES.map((sev) => (
        <li key={sev.value}>
          <SeverityBadge severity={sev.value} />
          <span className="sev-mix__name">{sev.name}</span>
          <span className="sev-mix__track">
            <span
              className={`sev-mix__fill sev-fill--${sev.value.toLowerCase()}`}
              style={{ width: `${(bySeverity[sev.value] / max) * 100}%` }}
            />
          </span>
          <strong>{bySeverity[sev.value]}</strong>
        </li>
      ))}
    </ul>
  );
}

export default function Overview() {
  const now = useNow();
  const [declaring, setDeclaring] = useState(false);
  const stats = usePolling(() => api.stats(), []);
  const services = usePolling(api.services, []);
  const recent = usePolling(() => api.incidents({ limit: 6 }), []);

  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.reload} />;
  const s = stats.data;
  const critical = s ? s.active_by_severity.SEV1 + s.active_by_severity.SEV2 : 0;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={s ? `Live health across ${s.services_total} services` : "Loading live health…"}
      >
        <span className="live">
          <span className="live__dot" /> Live
        </span>
        <button className="btn btn--danger" onClick={() => setDeclaring(true)}>
          <Plus size={16} /> Declare incident
        </button>
      </PageHeader>

      {critical > 0 && (
        <Link to="/incidents?active=true" className="alert-banner">
          <AlertOctagon size={20} />
          <span>
            <strong>
              {critical} high-severity incident{critical > 1 ? "s" : ""} in progress.
            </strong>{" "}
            Customers are impacted — review the response.
          </span>
        </Link>
      )}

      <div className="kpis">
        {s ? (
          <>
            <Kpi
              icon={Flame}
              tone={s.active_incidents ? "danger" : "ok"}
              label="Active incidents"
              value={s.active_incidents}
              hint={s.active_incidents ? `${critical} SEV1/SEV2` : "Nothing on fire"}
            />
            <Kpi
              icon={Timer}
              label="Mean time to resolve"
              value={formatDuration(s.mttr_minutes)}
              hint="Last 30 days"
            />
            <Kpi
              icon={Server}
              tone={s.services_operational === s.services_total ? "ok" : "warn"}
              label="Services operational"
              value={`${s.services_operational}/${s.services_total}`}
              hint={
                s.services_total
                  ? `${Math.round((s.services_operational / s.services_total) * 100)}% healthy`
                  : "No services yet"
              }
            />
            <Kpi icon={CheckCircle2} tone="ok" label="Resolved" value={s.resolved_last_30d} hint="Last 30 days" />
          </>
        ) : (
          <Skeleton height={96} count={4} />
        )}
      </div>

      <div className="grid grid--2-1">
        <Card title="Incident trend" subtitle="Opened vs resolved, last 14 days">
          {s ? <TrendChart trend={s.trend} /> : <Skeleton height={260} />}
        </Card>
        <Card title="Severity mix" subtitle="Currently open incidents">
          {s ? <SeverityMix bySeverity={s.active_by_severity} /> : <Skeleton height={28} count={4} />}
        </Card>
      </div>

      <div className="grid grid--2">
        <Card title="Service health" action={<Link to="/services" className="link">All services</Link>}>
          {services.data ? (
            <ul className="health-list">
              {services.data.map((service) => (
                <li key={service.id}>
                  <StatusDot status={service.status} pulse />
                  <div className="health-list__name">
                    <strong>{service.name}</strong>
                    <span>{service.team}</span>
                  </div>
                  <TierBadge tier={service.tier} />
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton height={40} count={5} />
          )}
        </Card>

        <Card title="Recent activity" action={<Link to="/incidents" className="link">All incidents</Link>}>
          {recent.data ? (
            <ul className="activity">
              {recent.data.map((incident) => (
                <li key={incident.id}>
                  <Link to={`/incidents/${incident.id}`}>
                    <SeverityBadge severity={incident.severity} />
                    <div className="activity__body">
                      <strong>{incident.title}</strong>
                      <span>
                        {incident.service_name} · {timeAgo(incident.started_at, now)}
                      </span>
                    </div>
                    <IncidentStatusPill status={incident.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Skeleton height={48} count={5} />
          )}
        </Card>
      </div>

      {declaring && <DeclareIncidentModal onClose={() => setDeclaring(false)} />}
    </>
  );
}
