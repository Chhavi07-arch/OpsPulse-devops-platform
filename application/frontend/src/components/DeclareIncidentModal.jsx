import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Siren } from "lucide-react";
import Modal from "./Modal";
import { api } from "../lib/api";
import { SEVERITIES } from "../lib/constants";
import { useLocalStorage } from "../lib/hooks";
import { useToast } from "../lib/toast";

export default function DeclareIncidentModal({ onClose, defaultServiceId }) {
  const navigate = useNavigate();
  const notify = useToast();
  const [name, setName] = useLocalStorage("opspulse.name", "");
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: "",
    service_id: defaultServiceId ?? "",
    severity: "SEV2",
    summary: "",
    message: "We are investigating reports of an issue.",
  });

  useEffect(() => {
    api.services().then(setServices, setError);
  }, []);

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const incident = await api.declareIncident({
        ...form,
        service_id: Number(form.service_id),
        commander: name,
      });
      notify(`${incident.severity} declared: ${incident.title}`);
      onClose();
      navigate(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Declare an incident"
      subtitle="Opens the incident, notifies the status page and starts the timeline."
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="declare-form" className="btn btn--danger" disabled={submitting}>
            <Siren size={16} /> {submitting ? "Declaring…" : "Declare incident"}
          </button>
        </>
      }
    >
      <form id="declare-form" className="form" onSubmit={submit}>
        <label className="field">
          <span>What is happening?</span>
          <input
            required
            minLength={4}
            maxLength={160}
            placeholder="e.g. Checkout requests timing out"
            value={form.title}
            onChange={set("title")}
            autoFocus
          />
        </label>

        <div className="form__row">
          <label className="field">
            <span>Affected service</span>
            <select required value={form.service_id} onChange={set("service_id")}>
              <option value="" disabled>
                Select a service
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Incident commander</span>
            <input
              required
              minLength={2}
              maxLength={80}
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>

        <fieldset className="field">
          <span>Severity</span>
          <div className="severity-picker">
            {SEVERITIES.map((sev) => (
              <label key={sev.value} className={`severity-option sev-border--${sev.value.toLowerCase()}`}>
                <input
                  type="radio"
                  name="severity"
                  value={sev.value}
                  checked={form.severity === sev.value}
                  onChange={set("severity")}
                />
                <strong>
                  {sev.label} · {sev.name}
                </strong>
                <small>{sev.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>Summary (optional)</span>
          <textarea rows={2} maxLength={2000} value={form.summary} onChange={set("summary")} />
        </label>
        <label className="field">
          <span>First public update</span>
          <textarea required rows={2} maxLength={2000} value={form.message} onChange={set("message")} />
        </label>
        {error && <p className="form__error">{error.message}</p>}
      </form>
    </Modal>
  );
}
