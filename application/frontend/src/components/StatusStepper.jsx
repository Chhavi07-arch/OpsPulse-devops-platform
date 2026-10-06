import { Check } from "lucide-react";
import { INCIDENT_STATUSES } from "../lib/constants";

export default function StatusStepper({ status }) {
  const current = INCIDENT_STATUSES.findIndex((s) => s.value === status);
  return (
    <ol className="stepper">
      {INCIDENT_STATUSES.map((step, index) => {
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li key={step.value} className={`stepper__step stepper__step--${state}`}>
            <span className="stepper__icon">{state === "done" ? <Check size={14} /> : index + 1}</span>
            <span className="stepper__label">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
