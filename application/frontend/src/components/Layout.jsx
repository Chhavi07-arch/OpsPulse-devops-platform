import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, ExternalLink, GitCommitHorizontal, LayoutDashboard, Moon, Server, Siren, Sun } from "lucide-react";
import { api } from "../lib/api";
import { useLocalStorage, usePolling } from "../lib/hooks";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/incidents", label: "Incidents", icon: Siren },
  { to: "/services", label: "Services", icon: Server },
];

export default function Layout() {
  const [theme, setTheme] = useLocalStorage("opspulse.theme", "dark");
  const { data: meta } = usePolling(api.meta, [], 60000);
  const { data: stats } = usePolling(() => api.stats(), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__logo">
            <Activity size={20} />
          </span>
          <span className="brand__name">OpsPulse</span>
        </div>

        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav__link">
              <Icon size={18} />
              <span>{label}</span>
              {to === "/incidents" && stats?.active_incidents > 0 && (
                <span className="nav__badge">{stats.active_incidents}</span>
              )}
            </NavLink>
          ))}
          <a className="nav__link" href="/status" target="_blank" rel="noreferrer">
            <ExternalLink size={18} />
            <span>Status page</span>
          </a>
        </nav>

        <div className="sidebar__footer">
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle colour theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          {meta && (
            <div className="build" title="Build running in this environment">
              <span className={`env env--${meta.environment}`}>{meta.environment}</span>
              <span className="build__sha">
                <GitCommitHorizontal size={14} />
                {meta.git_sha.slice(0, 7)}
              </span>
              <span className="build__version">v{meta.version}</span>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
