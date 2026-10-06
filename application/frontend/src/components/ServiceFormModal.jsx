import { useState } from "react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { TIERS } from "../lib/constants";
import { useToast } from "../lib/toast";

export default function ServiceFormModal({ service, onClose, onSaved }) {
  const notify = useToast();
  const editing = Boolean(service);
  const [form, setForm] = useState({
    name: service?.name ?? "",
    team: service?.team ?? "",
    tier: service?.tier ?? "STANDARD",
    description: service?.description ?? "",
    url: service?.url ?? "",
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const body = { ...form, url: form.url.trim() || null };
    try {
      if (editing) await api.updateService(service.id, body);
      else await api.createService(body);
      notify(editing ? `${form.name} updated` : `${form.name} is now monitored`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={editing ? `Edit ${service.name}` : "Add a service"}
      subtitle="Services appear on the dashboard and the public status page."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="service-form" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Add service"}
          </button>
        </>
      }
    >
      <form id="service-form" className="form" onSubmit={submit}>
        <div className="form__row">
          <label className="field">
            <span>Name</span>
            <input required minLength={2} maxLength={80} value={form.name} onChange={set("name")} autoFocus />
          </label>
          <label className="field">
            <span>Owning team</span>
            <input required minLength={2} maxLength={80} value={form.team} onChange={set("team")} />
          </label>
        </div>
        <label className="field">
          <span>Tier</span>
          <div className="segmented">
            {TIERS.map((tier) => (
              <button
                type="button"
                key={tier.value}
                className={form.tier === tier.value ? "is-active" : ""}
                onClick={() => setForm({ ...form, tier: tier.value })}
              >
                {tier.label}
              </button>
            ))}
          </div>
        </label>
        <label className="field">
          <span>Description</span>
          <input maxLength={300} value={form.description} onChange={set("description")} />
        </label>
        <label className="field">
          <span>Link (optional)</span>
          <input type="url" placeholder="https://" value={form.url} onChange={set("url")} />
        </label>
        {error && <p className="form__error">{error.message}</p>}
      </form>
    </Modal>
  );
}
