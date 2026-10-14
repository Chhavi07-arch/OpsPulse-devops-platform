import { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowUpRight, GitCommitHorizontal, Moon, Orbit, Sun } from "lucide-react";
import { api } from "../lib/api";
import { useLocalStorage, usePolling } from "../lib/hooks";

const NAV = [
  { to: "/", label: "Overview", end: true },
  { to: "/incidents", label: "Incidents" },
  { to: "/services", label: "Services" },
];

export default function Layout() {
  const [theme, setTheme] = useLocalStorage("opspulse.theme", "dark");
  const { data: meta } = usePolling(api.meta, [], 60000);
  const { data: stats, error } = usePolling(() => api.stats(), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="topbar">
        <Link to="/" className="brand" aria-label="OpsPulse home">
          <span className="brand__logo"><Orbit size={25} strokeWidth={1.4} /></span>
          <span className="brand__name">OPS<span>PULSE</span><small>MISSION CONTROL</small></span>
        </Link>
        <nav className="nav" aria-label="Main navigation">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className="nav__link">
              <span className="nav__indicator" />{label}
              {to === "/incidents" && stats?.active_incidents > 0 && <span className="nav__badge">{stats.active_incidents}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="topbar__actions">
          <button className="icon-btn theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link to="/status" className="topbar__status">Public status <ArrowUpRight size={15} /></Link>
        </div>
      </header>
      <main className="main" id="main-content"><Outlet /></main>
      <footer className="shell-footer">
        <span className="connection"><span className={`connection__dot${error ? " connection__dot--error" : ""}`} />
          {error ? "API connection interrupted" : stats ? "Connected to OpsPulse" : "Establishing connection"}
        </span>
        {meta && <div className="build" title="Build running in this environment">
          <span className="env">{meta.environment}</span>
          <span className="build__sha"><GitCommitHorizontal size={13} />{meta.git_sha.slice(0, 7)}</span>
          <span>v{meta.version}</span>
        </div>}
        <span className="shell-footer__note">A clearer view. A faster response.</span>
      </footer>
    </div>
  );
}
