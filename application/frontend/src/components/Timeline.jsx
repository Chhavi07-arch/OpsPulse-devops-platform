import { statusLabel } from "../lib/constants";
import { formatDateTime, timeAgo } from "../lib/format";
import { useNow } from "../lib/hooks";

export default function Timeline({ updates }) {
  const now = useNow();
  return (
    <ol className="timeline">
      {updates.map((update) => (
        <li key={update.id} className={`timeline__item timeline__item--${update.status.toLowerCase()}`}>
          <span className="timeline__marker" />
          <div className="timeline__content">
            <div className="timeline__meta">
              <strong>{statusLabel(update.status)}</strong>
              <span title={formatDateTime(update.created_at)}>{timeAgo(update.created_at, now)}</span>
              <span>· {update.author}</span>
            </div>
            <p>{update.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
