import { useState, useEffect, useContext, useCallback, createElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Squares2X2Icon,
  BuildingOffice2Icon,
  UsersIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  ArrowRightOnRectangleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  ClockIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";
import { AuthContext } from "../contexts/AuthContext";
import api from "../services/api";
import BrandLogo from "../components/shared/BrandLogo";
import InstituteManagement from "../components/admin/InstituteManagement.jsx";
import Analytics from "../components/admin/Analytics.jsx";
import SystemLogs from "../components/admin/SystemLogs.jsx";
import SystemSettings from "../components/admin/SystemSetting.jsx";
import UserManagement from "../components/admin/UserManagement.jsx";
import UserProfile from "../components/admin/UserProfile.jsx";
import { AdminSubscriptions } from "../components/shared/Subscriptions";
import "./SuperAdminDashboard.css";

const API_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const tabs = [
  {
    id: "overview",
    name: "Overview",
    icon: Squares2X2Icon,
    description: "Your platform at a glance. Keep the important work moving.",
  },
  {
    id: "institutes",
    name: "Institutes",
    icon: BuildingOffice2Icon,
    description: "Review registrations and manage institute access.",
  },
  {
    id: "users",
    name: "Users",
    icon: UsersIcon,
    description: "Manage the people and roles across your platform.",
  },
  ...(import.meta.env.VITE_SAAS_ENABLED === "true"
    ? [
        {
          id: "subscriptions",
          name: "Packages & Payments",
          icon: CreditCardIcon,
          description:
            "Review bank payments, manage packages, and follow subscriber activity.",
        },
      ]
    : []),
  {
    id: "analytics",
    name: "Analytics",
    icon: ChartBarIcon,
    description: "Explore platform activity and certificate performance.",
  },
  {
    id: "logs",
    name: "System Logs",
    icon: ClipboardDocumentListIcon,
    description: "Review the activity behind important platform changes.",
  },
  {
    id: "settings",
    name: "Settings",
    icon: Cog6ToothIcon,
    description: "Configure your platform and communication preferences.",
  },
];
function storedUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const [user] = useState(storedUser);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const active = tabs.find((tab) => tab.id === params.get("tab")) || tabs[0];
  const handleLogout = useCallback(() => {
    auth?.logout();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [auth, navigate]);
  const fetchDashboardStats = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await api.get("/admin/stats");
      if (!response.data.success)
        throw new Error(
          response.data.message || "Unable to load dashboard totals.",
        );
      const data = response.data.data || {};
      setStats({
        ...data,
        pendingApprovals: data.pendingApprovals ?? data.pendingInstitutes ?? 0,
      });
      setUpdatedAt(new Date());
    } catch (failure) {
      setError(
        failure.response?.data?.message ||
          failure.message ||
          "Unable to load dashboard totals.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!localStorage.getItem("token") || user?.userType !== "superadmin") {
      navigate("/login", { replace: true });
      return;
    }
    fetchDashboardStats();
  }, [user, navigate, fetchDashboardStats]);
  useEffect(() => {
    setMenuOpen(false);
  }, [params]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  const openTab = (tab, status) =>
    setParams(status ? { tab, status } : { tab });
  if (!user || user.userType !== "superadmin") return null;
  const name =
    user.superAdminName || user.adminName || user.firstName || "Administrator";
  const total = (key) =>
    stats ? Number(stats[key] || 0).toLocaleString() : "—";
  const metrics = [
    {
      label: "Total institutes",
      key: "totalInstitutes",
      icon: BuildingOffice2Icon,
      detail: "Registered on the platform",
      tab: "institutes",
      color: "blue",
    },
    {
      label: "Pending approvals",
      key: "pendingApprovals",
      icon: ClockIcon,
      detail: "Institute registrations to review",
      tab: "institutes",
      status: "pending",
      color: "amber",
    },
    {
      label: "Certificates",
      key: "totalCertificates",
      icon: DocumentCheckIcon,
      detail: "Platform certificate records",
      tab: "analytics",
      color: "violet",
    },
    {
      label: "Active users",
      key: "activeUsers",
      icon: UsersIcon,
      detail: `${total("totalUsers")} total user accounts`,
      tab: "users",
      color: "green",
    },
  ];
  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <Link to="/" className="admin-brand" aria-label="CERTIVERXIA home">
          <BrandLogo imageClassName="w-full h-auto" />
        </Link>
        <div className="admin-workspace-label">
          <ShieldCheckIcon aria-hidden="true" /> SUPER ADMIN WORKSPACE
        </div>
        <button
          className="admin-mobile-toggle"
          aria-label={
            menuOpen ? "Close admin navigation" : "Open admin navigation"
          }
          aria-expanded={menuOpen}
          aria-controls="admin-navigation"
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <XMarkIcon /> : <Bars3Icon />}
        </button>
        <nav
          id="admin-navigation"
          aria-label="Admin navigation"
          className={menuOpen ? "admin-navigation is-open" : "admin-navigation"}
        >
          <p className="admin-nav-heading">MANAGE YOUR PLATFORM</p>
          {tabs.map(({ id, name: label, icon: Icon }) => (
            <button
              key={id}
              aria-current={active.id === id ? "page" : undefined}
              onClick={() => openTab(id)}
            >
              {createElement(Icon, { "aria-hidden": true })}
              <span>{label}</span>
              {id === "institutes" && !!stats?.pendingApprovals && (
                <span className="admin-nav-count">
                  {stats.pendingApprovals}
                </span>
              )}
            </button>
          ))}
          <div className="admin-nav-support">
            <span>Built for confidence.</span>
            <p>Manage the institutions behind every achievement.</p>
            <Link to="/verify">
              Open verification portal <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </div>
        </nav>
        <div className="admin-sidebar-bottom">
          <button
            onClick={() => setShowUserProfile(true)}
            className="admin-account"
            aria-label="Open my profile"
          >
            <span className="admin-avatar">{name.charAt(0).toUpperCase()}</span>
            <span>
              <strong>{name}</strong>
              <small>Super administrator</small>
            </span>
            <Cog6ToothIcon aria-hidden="true" />
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            Workspace <span>/</span> <strong>{active.name}</strong>
          </div>
          <div className="admin-topbar-actions">
            <button
              onClick={() => setShowUserProfile(true)}
              className="admin-profile-button"
              aria-label="My profile"
            >
              <span className="admin-avatar">
                {name.charAt(0).toUpperCase()}
              </span>
              <span>{name}</span>
            </button>
            <button onClick={handleLogout} className="admin-logout">
              <ArrowRightOnRectangleIcon aria-hidden="true" /> Log out
            </button>
          </div>
        </header>
        <div className="admin-content">
          <div className="admin-page-heading">
            <div>
              <p className="admin-eyebrow">CERTIVERXIA CONTROL CENTRE</p>
              <h1>
                {active.id === "overview"
                  ? `Welcome back, ${name}.`
                  : active.name}
              </h1>
              <p>{active.description}</p>
            </div>
            <button
              onClick={fetchDashboardStats}
              disabled={isLoading}
              className="admin-secondary"
            >
              <ArrowPathIcon
                aria-hidden="true"
                className={isLoading ? "animate-spin" : ""}
              />
              {isLoading ? "Refreshing…" : "Refresh totals"}
            </button>
          </div>
          {error && (
            <div role="alert" className="admin-error">
              {error} <button onClick={fetchDashboardStats}>Try again</button>
            </div>
          )}
          {active.id === "overview" ? (
            <>
              <section
                className="admin-metrics"
                aria-label="Platform totals"
                aria-busy={isLoading}
              >
                {metrics.map(
                  ({ label, key, icon: Icon, detail, tab, status, color }) => (
                    <button
                      key={key}
                      className="admin-metric"
                      onClick={() => openTab(tab, status)}
                    >
                      <div>
                        <span className={`admin-metric-icon ${color}`}>
                          {createElement(Icon, { "aria-hidden": true })}
                        </span>
                        <ArrowUpRightIcon aria-hidden="true" />
                      </div>
                      <p>{label}</p>
                      <strong>{total(key)}</strong>
                      <small>{detail}</small>
                    </button>
                  ),
                )}
              </section>
              <div className="admin-overview-grid">
                <section className="admin-focus">
                  <span className="admin-eyebrow">YOUR NEXT STEP</span>
                  <h2>
                    {stats?.pendingApprovals
                      ? `${total("pendingApprovals")} institute${stats.pendingApprovals === 1 ? "" : "s"} waiting for review.`
                      : stats
                        ? "Your approval queue is clear."
                        : "Review your institute registrations."}
                  </h2>
                  <p>
                    Help institutes get started. Check their registration
                    details and decide who can access the platform.
                  </p>
                  <button
                    className="admin-primary"
                    onClick={() => openTab("institutes", "pending")}
                  >
                    Review institute requests{" "}
                    <ArrowRightIcon aria-hidden="true" />
                  </button>
                  <ShieldCheckIcon
                    className="admin-focus-art"
                    aria-hidden="true"
                  />
                </section>
                <section className="admin-status-card">
                  <div className="admin-section-heading">
                    <h2>Institute status</h2>
                    <button onClick={() => openTab("institutes")}>
                      View all <ArrowRightIcon aria-hidden="true" />
                    </button>
                  </div>
                  {[
                    ["Approved", "approvedInstitutes", "approved"],
                    ["Pending review", "pendingApprovals", "pending"],
                    ["Suspended", "suspendedInstitutes", "suspended"],
                    ["Rejected", "rejectedInstitutes", "rejected"],
                  ].map(([label, key, status]) => (
                    <button
                      className="admin-status-row"
                      key={key}
                      onClick={() => openTab("institutes", status)}
                    >
                      <span>
                        <i className={`admin-dot ${status}`} />
                        {label}
                      </span>
                      <strong>{total(key)}</strong>
                    </button>
                  ))}
                </section>
              </div>
              <section className="admin-shortcuts">
                <div className="admin-section-heading">
                  <h2>Everything you need, one place.</h2>
                  <span>QUICK ACCESS</span>
                </div>
                <div className="admin-shortcut-grid">
                  {tabs
                    .filter((tab) =>
                      ["subscriptions", "users", "logs", "settings"].includes(
                        tab.id,
                      ),
                    )
                    .map(({ id, name: label, description, icon: Icon }) => (
                      <button key={id} onClick={() => openTab(id)}>
                        {createElement(Icon, { "aria-hidden": true })}
                        <h3>{label}</h3>
                        <p>{description}</p>
                        <span>
                          Open workspace <ArrowRightIcon aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                </div>
              </section>
              <p className="admin-updated" role="status">
                {isLoading
                  ? "Loading platform totals…"
                  : updatedAt
                    ? `Totals updated ${updatedAt.toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo" })} · Sri Lanka time`
                    : "Platform totals are unavailable."}
              </p>
            </>
          ) : (
            <div className="admin-panel">
              {active.id === "subscriptions" && <AdminSubscriptions />}
              {active.id === "institutes" && (
                <InstituteManagement
                  key={params.get("status") || "all"}
                  initialStatus={params.get("status") || "all"}
                  API_URL={API_URL}
                  user={user}
                  onStatsUpdate={fetchDashboardStats}
                />
              )}
              {active.id === "users" && (
                <UserManagement API_URL={API_URL} user={user} />
              )}
              {active.id === "analytics" && stats && (
                <Analytics
                  API_URL={API_URL}
                  stats={stats}
                  onViewActivity={() => openTab("logs")}
                />
              )}
              {active.id === "logs" && <SystemLogs API_URL={API_URL} />}
              {active.id === "settings" && <SystemSettings API_URL={API_URL} />}
            </div>
          )}
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
      {showUserProfile && (
        <UserProfile
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          user={user}
          API_URL={API_URL}
        />
      )}
    </div>
  );
}
