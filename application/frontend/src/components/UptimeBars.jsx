import { SERVICE_STATUS } from "../lib/constants";
import { formatDay } from "../lib/format";

export default function UptimeBars({ history }) {
  return (
    <div className="uptime" role="img" aria-label={`${history.length}-day status history`}>
      {history.map(({ day, status }) => (
        <span
          key={day}
          className={`uptime__bar uptime__bar--${SERVICE_STATUS[status].tone}`}
          title={`${formatDay(day)} — ${SERVICE_STATUS[status].label}`}
        />
      ))}
    </div>
  );
}
