import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import DeclareIncidentModal from "../components/DeclareIncidentModal";
import { EmptyState, ErrorState, IncidentStatusPill, PageHeader, SeverityBadge, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { INCIDENT_STATUSES, SEVERITIES } from "../lib/constants";
import { formatDateTime, formatDuration, timeAgo } from "../lib/format";
import { useNow, usePolling } from "../lib/hooks";

const STATUS_TABS = [{ value: "", label: "All" }, { value: "active", label: "Active" }, ...INCIDENT_STATUSES];

export default function Incidents() {
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const [declaring, setDeclaring] = useState(false);
  const [search, setSearch] = useState(params.get("q") ?? "");

  const statusTab = params.get("active") === "true" ? "active" : (params.get("status") ?? "");
  const severity = params.get("severity") ?? "";
  const serviceId = params.get("service_id") ?? "";
  const q = params.get("q") ?? "";

  const services = usePolling(api.services, [], 60000);
  const incidents = usePolling(
    () =>
      api.incidents({
        active: statusTab === "active" ? true : undefined,
        status: statusTab && statusTab !== "active" ? statusTab : undefined,
        severity,
        service_id: serviceId,
        q,
      }),
    [statusTab, severity, serviceId, q],
  );

  function update(changes) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace: true });
  }

  function selectTab(value) {
    update({ active: value === "active" ? "true" : "", status: value === "active" ? "" : value });
  }

  return (
    <>
      <PageHeader title="Incidents" subtitle="Every outage, its response timeline and its resolution.">
        <button className="btn btn--danger" onClick={() => setDeclaring(true)}>
          <Plus size={16} /> Declare incident
        </button>
      </PageHeader>

      <div className="toolbar">
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: search.trim() });
          }}
        >
          <Search size={16} />
          <input
            type="search"
            placeholder="Search incidents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => update({ q: search.trim() })}
          />
        </form>
        <div className="segmented">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              className={statusTab === tab.value ? "is-active" : ""}
              onClick={() => selectTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="chips">
          {SEVERITIES.map((sev) => (
            <button
              key={sev.value}
              className={`chip${severity === sev.value ? " is-active" : ""}`}
              onClick={() => update({ severity: severity === sev.value ? "" : sev.value })}
            >
              {sev.value}
            </button>
          ))}
        </div>
        <select className="select" value={serviceId} onChange={(e) => update({ service_id: e.target.value })}>
          <option value="">All services</option>
          {services.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {incidents.error ? (
        <ErrorState error={incidents.error} onRetry={incidents.reload} />
      ) : !incidents.data ? (
        <Skeleton height={64} count={6} />
      ) : incidents.data.length === 0 ? (
        <EmptyState title="No incidents match these filters" hint="Quiet is good. Adjust the filters to see history." />
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Incident</th>
                <th>Status</th>
                <th>Commander</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {incidents.data.map((incident) => (
                <tr key={incident.id}>
                  <td>
                    <SeverityBadge severity={incident.severity} />
                  </td>
                  <td>
                    <Link to={`/incidents/${incident.id}`} className="table__title">
                      {incident.title}
                    </Link>
                    <span className="table__sub">{incident.service_name}</span>
                  </td>
                  <td>
                    <IncidentStatusPill status={incident.status} />
                  </td>
                  <td>{incident.commander}</td>
                  <td title={formatDateTime(incident.started_at)}>{timeAgo(incident.started_at, now)}</td>
                  <td className="mono">{formatDuration(incident.duration_minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {declaring && <DeclareIncidentModal onClose={() => setDeclaring(false)} />}
    </>
  );
}
