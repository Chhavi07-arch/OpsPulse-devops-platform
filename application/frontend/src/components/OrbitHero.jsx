import { ArrowDown, ArrowUpRight, Crosshair, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export default function OrbitHero({ stats, updatedAt, onDeclare }) {
  const healthy = stats ? stats.services_operational === stats.services_total : false;
  return (
    <section className="orbit-hero" aria-labelledby="overview-title">
      <div className="orbit-hero__art" aria-hidden="true" />
      <div className="orbit-hero__ring" aria-hidden="true"><span /></div>
      <div className="orbit-hero__coordinate" aria-hidden="true">OP / 001 <span>LIVE OBSERVATION</span></div>
      <div className="orbit-hero__copy">
        <div className="eyebrow"><span className="signal-mark" /> YOUR OPERATIONS, IN ORBIT</div>
        <h1 id="overview-title">Observe.<br />Respond.<br /><em>Stay ahead.</em></h1>
        <p>Every service. Every signal. One clear view.<br />Keep your systems steady, wherever the next incident lands.</p>
        <div className="orbit-hero__actions">
          <button className="btn btn--primary" onClick={onDeclare}>Declare incident <Plus size={16} /></button>
          <Link className="btn btn--ghost" to="/status">View status page <ArrowUpRight size={16} /></Link>
        </div>
      </div>
      <div className="orbit-hero__telemetry">
        <div className="telemetry-label"><Crosshair size={15} /> SYSTEM TELEMETRY</div>
        <strong>{stats ? String(stats.services_total).padStart(2, "0") : "—"}</strong>
        <span>services in view</span>
        <div className="telemetry-divider" />
        <strong>{stats ? String(stats.active_incidents).padStart(2, "0") : "—"}</strong>
        <span>active incidents</span>
      </div>
      <div className="orbit-hero__caption"><span className="cross-mark">+</span> ONE PLATFORM. TOTAL PERSPECTIVE.</div>
      <div className="orbit-hero__bottom">
        <a href="#operations" className="orbit-hero__scroll"><ArrowDown size={14} /> Explore operations</a>
        <span className="orbit-hero__state"><span className={`signal-mark${stats && !healthy ? " signal-mark--warn" : ""}`} />
          {!stats ? "ACQUIRING SIGNAL" : healthy ? "ALL SERVICES OPERATIONAL" : `${stats.services_total - stats.services_operational} SERVICES NEED ATTENTION`}
        </span>
        <span className="orbit-hero__timestamp">{updatedAt ? `UPDATED ${new Date(updatedAt).toISOString().slice(11, 19)} UTC` : "CONNECTING"}</span>
      </div>
    </section>
  );
}
