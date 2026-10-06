import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Send, Server, Trash2, UserRound } from "lucide-react";
import StatusStepper from "../components/StatusStepper";
import Timeline from "../components/Timeline";
import { Card, ErrorState, IncidentStatusPill, SeverityBadge, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { INCIDENT_STATUSES, SEVERITIES } from "../lib/constants";
import { formatDateTime, formatDuration } from "../lib/format";
import { useLocalStorage, usePolling } from "../lib/hooks";
import { useToast } from "../lib/toast";

function nextStatus(status) {
  const index = INCIDENT_STATUSES.findIndex((s) => s.value === status);
  return INCIDENT_STATUSES[Math.min(index + 1, INCIDENT_STATUSES.length - 1)].value;
}

function UpdateForm({ incident, onPosted }) {
  const notify = useToast();
  const [name, setName] = useLocalStorage("opspulse.name", "");
  const [status, setStatus] = useState(() => nextStatus(incident.status));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.postUpdate(incident.id, { status, message, author: name });
      notify(status === "RESOLVED" ? "Incident resolved 🎉" : "Update posted to the timeline");
      setMessage("");
      onPosted(); // the form is keyed by status, so it resets to the next step
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <label className="field">
        <span>New status</span>
        <div className="segmented segmented--wrap">
          {INCIDENT_STATUSES.map((s) => (
            <button
              type="button"
              key={s.value}
              className={status === s.value ? "is-active" : ""}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </label>
      <label className="field">
        <span>Update</span>
        <textarea
          required
          rows={4}
          maxLength={2000}
          placeholder="What changed? What are we doing next?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Posted by</span>
        <input required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {error && <p className="form__error">{error.message}</p>}
      <button className={`btn ${status === "RESOLVED" ? "btn--success" : "btn--primary"}`} disabled={busy}>
        <Send size={16} /> {busy ? "Posting…" : status === "RESOLVED" ? "Resolve incident" : "Post update"}
      </button>
    </form>
  );
}

function SeverityEditor({ incident, onSaved }) {
  const notify = useToast();
  async function change(severity) {
    if (severity === incident.severity) return;
    try {
      await api.updateIncident(incident.id, { severity });
      notify(`Severity changed to ${severity}`, "info");
      onSaved();
    } catch (err) {
      notify(err.message, "error");
    }
  }
  return (
    <div className="chips">
      {SEVERITIES.map((sev) => (
        <button
          key={sev.value}
          className={`chip${incident.severity === sev.value ? " is-active" : ""}`}
          onClick={() => change(sev.value)}
          title={sev.hint}
        >
          {sev.value}
        </button>
      ))}
    </div>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useToast();
  const { data: incident, error, reload } = usePolling(() => api.incident(id), [id]);

  async function remove() {
    if (!window.confirm("Delete this incident and its timeline? This cannot be undone.")) return;
    try {
      await api.deleteIncident(id);
      notify("Incident deleted", "info");
      navigate("/incidents");
    } catch (err) {
      notify(err.message, "error");
    }
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!incident) return <Skeleton height={120} count={3} />;

  return (
    <>
      <Link to="/incidents" className="back-link">
        <ArrowLeft size={16} /> All incidents
      </Link>

      <header className={`incident-hero incident-hero--${incident.severity.toLowerCase()}`}>
        <div className="incident-hero__badges">
          <SeverityBadge severity={incident.severity} withName />
          <IncidentStatusPill status={incident.status} />
          <span className="mono muted">#{incident.id}</span>
        </div>
        <h1>{incident.title}</h1>
        {incident.summary && <p className="incident-hero__summary">{incident.summary}</p>}
        <div className="incident-hero__meta">
          <span>
            <Server size={16} /> {incident.service_name}
          </span>
          <span>
            <UserRound size={16} /> {incident.commander}
          </span>
          <span title={formatDateTime(incident.started_at)}>
            <Clock size={16} /> {incident.resolved_at ? "Lasted" : "Ongoing for"}{" "}
            {formatDuration(incident.duration_minutes)}
          </span>
        </div>
        <StatusStepper status={incident.status} />
      </header>

      <div className="grid grid--2-1">
        <Card title="Timeline" subtitle={`${incident.updates.length} updates`}>
          <Timeline updates={incident.updates} />
        </Card>
        <div className="stack">
          <Card title={incident.status === "RESOLVED" ? "Reopen or add a note" : "Post an update"}>
            <UpdateForm key={incident.status} incident={incident} onPosted={reload} />
          </Card>
          <Card title="Severity" subtitle="Re-classify as the impact becomes clear">
            <SeverityEditor incident={incident} onSaved={reload} />
          </Card>
          <button className="btn btn--ghost btn--danger-text" onClick={remove}>
            <Trash2 size={16} /> Delete incident
          </button>
        </div>
      </div>
    </>
  );
}
