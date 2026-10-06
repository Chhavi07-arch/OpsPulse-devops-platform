import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Pencil, Plus, Siren, Trash2, Users } from "lucide-react";
import DeclareIncidentModal from "../components/DeclareIncidentModal";
import ServiceFormModal from "../components/ServiceFormModal";
import { EmptyState, ErrorState, PageHeader, ServiceStatusPill, Skeleton, TierBadge } from "../components/ui";
import { api } from "../lib/api";
import { usePolling } from "../lib/hooks";
import { useToast } from "../lib/toast";

export default function Services() {
  const notify = useToast();
  const { data: services, error, reload } = usePolling(api.services, []);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, service = edit
  const [declaringFor, setDeclaringFor] = useState(null);

  async function remove(service) {
    if (!window.confirm(`Stop monitoring ${service.name}?`)) return;
    try {
      await api.deleteService(service.id);
      notify(`${service.name} removed`, "info");
      reload();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  return (
    <>
      <PageHeader title="Services" subtitle="What we run, who owns it and how healthy it is right now.">
        <button className="btn btn--primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Add service
        </button>
      </PageHeader>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !services ? (
        <div className="service-grid">
          <Skeleton height={180} count={6} />
        </div>
      ) : services.length === 0 ? (
        <EmptyState
          title="No services yet"
          hint="Add the systems you operate to start tracking their health."
          action={
            <button className="btn btn--primary" onClick={() => setEditing({})}>
              <Plus size={16} /> Add your first service
            </button>
          }
        />
      ) : (
        <div className="service-grid">
          {services.map((service) => (
            <article key={service.id} className={`service-card service-card--${service.status.toLowerCase()}`}>
              <header>
                <h3>{service.name}</h3>
                <TierBadge tier={service.tier} />
              </header>
              <ServiceStatusPill status={service.status} />
              <p className="service-card__desc">{service.description || "No description"}</p>
              <div className="service-card__meta">
                <span>
                  <Users size={14} /> {service.team}
                </span>
                {service.active_incidents > 0 && (
                  <Link to={`/incidents?service_id=${service.id}&active=true`} className="service-card__incidents">
                    <Siren size={14} /> {service.active_incidents} active
                  </Link>
                )}
                {service.url && (
                  <a href={service.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} /> Open
                  </a>
                )}
              </div>
              <footer>
                <button className="btn btn--sm btn--ghost" onClick={() => setDeclaringFor(service.id)}>
                  <Siren size={14} /> Declare
                </button>
                <button className="icon-btn" onClick={() => setEditing(service)} aria-label={`Edit ${service.name}`}>
                  <Pencil size={16} />
                </button>
                <button className="icon-btn" onClick={() => remove(service)} aria-label={`Delete ${service.name}`}>
                  <Trash2 size={16} />
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <ServiceFormModal
          service={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}
      {declaringFor && (
        <DeclareIncidentModal defaultServiceId={declaringFor} onClose={() => setDeclaringFor(null)} />
      )}
    </>
  );
}
