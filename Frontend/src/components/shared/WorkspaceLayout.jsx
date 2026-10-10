import { createElement, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRightOnRectangleIcon,
  ArrowPathIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
  Bars3Icon,
  XMarkIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import { AuthContext } from "../../contexts/AuthContext";
import BrandLogo from "./BrandLogo";
import "../../pages/SuperAdminDashboard.css";
import "./WorkspaceLayout.css";

export default function WorkspaceLayout({
  role,
  name,
  subtitle,
  logo,
  tabs,
  activeTab,
  onTabChange,
  onRefresh,
  loading,
  error,
  children,
}) {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const profileTab = role === "Teacher" ? "profile" : "settings";
  const avatar = logo ? (
    <img src={logo} alt="Institute logo" />
  ) : (
    (name || role).charAt(0).toUpperCase()
  );
  const logout = () => {
    auth?.logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };
  const select = (id) => {
    onTabChange(id);
    setMenuOpen(false);
  };
  useEffect(() => {
    setMenuOpen(false);
  }, [activeTab]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  return (
    <div className="admin-workspace member-workspace">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand" aria-label="CERTIVERXIA home">
          <BrandLogo imageClassName="w-full h-auto" />
        </Link>
        <div className="admin-workspace-label">
          <AcademicCapIcon aria-hidden="true" /> {role.toUpperCase()} WORKSPACE
        </div>
        <button
          className="admin-mobile-toggle"
          aria-label={
            menuOpen
              ? "Close workspace navigation"
              : "Open workspace navigation"
          }
          aria-expanded={menuOpen}
          aria-controls="workspace-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <XMarkIcon /> : <Bars3Icon />}
        </button>
        <nav
          id="workspace-navigation"
          aria-label="Workspace navigation"
          className={`admin-navigation ${menuOpen ? "is-open" : ""}`}
        >
          <p className="admin-nav-heading">YOUR WORKSPACE</p>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              aria-current={tab.id === active.id ? "page" : undefined}
              onClick={() => select(tab.id)}
            >
              {createElement(tab.icon, { "aria-hidden": true })}
              <span>{tab.name}</span>
            </button>
          ))}
          <div className="admin-nav-support">
            <span>Make achievement official.</span>
            <p>A dedicated place for your learners and their credentials.</p>
            <Link to="/verify">
              Verify a certificate <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </div>
        </nav>
        <div className="admin-sidebar-bottom">
          <button
            className="admin-account"
            onClick={() => select(profileTab)}
            aria-label="Open profile settings"
          >
            <span className="admin-avatar">{avatar}</span>
            <span>
              <strong>{name || role}</strong>
              <small>{role} account</small>
            </span>
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            {role}
            <span>/</span>
            <strong>{active.name}</strong>
          </div>
          <div className="admin-topbar-actions">
            <button
              className="admin-profile-button"
              aria-label="My profile"
              onClick={() => select(profileTab)}
            >
              <span className="admin-avatar">{avatar}</span>
              <span>{name || role}</span>
            </button>
            <button className="admin-logout" onClick={logout}>
              <ArrowRightOnRectangleIcon aria-hidden="true" /> Log out
            </button>
          </div>
        </header>
        <div className="admin-content">
          <div className="admin-page-heading">
            <div>
              <p className="admin-eyebrow">
                {subtitle || `YOUR ${role.toUpperCase()} WORKSPACE`}
              </p>
              <h1>
                {active.id === "dashboard"
                  ? `Welcome back${name ? `, ${name}` : ""}.`
                  : active.name}
              </h1>
              <p>{active.description}</p>
            </div>
            <button
              className="admin-secondary"
              onClick={onRefresh}
              disabled={loading}
            >
              <ArrowPathIcon
                aria-hidden="true"
                className={loading ? "animate-spin" : ""}
              />
              {loading ? "Refreshing…" : "Refresh overview"}
            </button>
          </div>
          {error && (
            <div className="admin-error" role="alert">
              {error}
              <button onClick={onRefresh}>Try again</button>
            </div>
          )}
          {children}
          <footer className="admin-footer">
            <span>© {new Date().getFullYear()} CERTIVERXIA</span>
            <div>
              <Link to="/terms">Terms</Link>
              <Link to="/privacy">Privacy</Link>
              <a href="mailto:info@certiverxia.com">Support</a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceMetrics({ metrics, loading }) {
  return (
    <section
      className="admin-metrics"
      aria-label="Workspace totals"
      aria-busy={loading}
    >
      {metrics.map((metric) => (
        <button
          className="admin-metric"
          key={metric.label}
          onClick={metric.onClick}
        >
          <div>
            <span className={`admin-metric-icon ${metric.color}`}>
              {createElement(metric.icon, { "aria-hidden": true })}
            </span>
            <ArrowUpRightIcon aria-hidden="true" />
          </div>
          <p>{metric.label}</p>
          <strong>
            {metric.value == null ? "—" : Number(metric.value).toLocaleString()}
          </strong>
          <small>{metric.detail}</small>
        </button>
      ))}
    </section>
  );
}

export function WorkspaceActions({ actions, onSelect }) {
  return (
    <section className="admin-shortcuts">
      <div className="admin-section-heading">
        <h2>Make your next move.</h2>
        <span>QUICK ACCESS</span>
      </div>
      <div className="admin-shortcut-grid">
        {actions.map((action) => (
          <button key={action.id} onClick={() => onSelect(action.id)}>
            {createElement(action.icon, { "aria-hidden": true })}
            <h3>{action.name}</h3>
            <p>{action.description}</p>
            <span>
              Open workspace <ArrowRightIcon aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
