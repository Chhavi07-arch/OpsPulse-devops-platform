import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { ToastContext } from "../lib/toast";

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const VISIBLE_MS = 4000;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const notify = useCallback((message, tone = "success") => {
    const id = ++nextId.current;
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), VISIBLE_MS);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(({ id, message, tone }) => {
          const Icon = ICONS[tone];
          return (
            <div key={id} className={`toast toast--${tone}`}>
              <Icon size={18} />
              <span>{message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
