import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Squares2X2Icon,
  BookOpenIcon,
  UsersIcon,
  AcademicCapIcon,
  DocumentCheckIcon,
  ArrowUpTrayIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  RectangleStackIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import WorkspaceLayout, {
  WorkspaceMetrics,
  WorkspaceActions,
} from "../components/shared/WorkspaceLayout";
import axios from "axios";
import CourseManagement from "../components/institute/CourseManagement";
import StudentManagement from "../components/institute/StudentManagement";
import TeacherManagement from "../components/institute/TeacherManagement";
import CertificateManagement from "../components/institute/CertificateManagement"; // Changed this line
import BulkUpload from "../components/institute/BulkUpload";
import InstituteSettings from "../components/institute/InstituteSettings";
import { InstituteSubscription } from "../components/shared/Subscriptions";

const API_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const getUploadUrl = (filePath) => {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
  if (/^https?:\/\//i.test(API_URL)) {
    return `${API_URL.replace(/\/api\/?$/, "")}${normalizedPath}`;
  }

  return normalizedPath;
};

const InstituteDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [params, setParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const live = useRef(true);
  const tabs = [
    {
      id: "dashboard",
      name: "Overview",
      icon: Squares2X2Icon,
      description:
        "Your learners, courses, and achievements, all in one place.",
    },
    {
      id: "courses",
      name: "Courses",
      icon: BookOpenIcon,
      description:
        "Organise your programmes and the learning behind every achievement.",
    },
    {
      id: "students",
      name: "Students",
      icon: UsersIcon,
      description: "Manage learner records and course enrolments.",
    },
    {
      id: "teachers",
      name: "Teachers",
      icon: AcademicCapIcon,
      description:
        "Manage your teaching team, assigned courses, and permissions.",
    },
    {
      id: "certificates",
      name: "Certificates",
      icon: DocumentCheckIcon,
      description: "Create, issue, and manage your institute's credentials.",
    },
    {
      id: "bulk-upload",
      name: "Bulk Upload",
      icon: ArrowUpTrayIcon,
      description:
        "Bring learner records into your workspace with a bulk upload.",
    },
    ...(import.meta.env.VITE_SAAS_ENABLED === "true"
      ? [
          {
            id: "subscription",
            name: "My Package",
            icon: CreditCardIcon,
            description:
              "Review your allowances, payments, and available upgrades.",
          },
        ]
      : []),
    {
      id: "settings",
      name: "Settings",
      icon: Cog6ToothIcon,
      description:
        "Keep your institute profile and security settings up to date.",
    },
  ];
  const activeTab = tabs.some((tab) => tab.id === params.get("tab"))
    ? params.get("tab")
    : "dashboard";
  const setActiveTab = (tab) => setParams({ tab });

  useEffect(() => {
    const token = localStorage.getItem("token");
    live.current = true;
    let userData;
    try {
      userData = JSON.parse(localStorage.getItem("user"));
    } catch {
      userData = null;
    }

    if (!token || !userData || userData.userType !== "institute") {
      navigate("/login");
      return;
    }

    setUser(userData);
    fetchProfile();
    fetchStats();
    return () => {
      live.current = false;
    };
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${API_URL}/institute/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!live.current) return;
      if (response.data.success) {
        const profile = response.data.data;
        const updatedUser = {
          ...(JSON.parse(localStorage.getItem("user")) || {}),
          ...profile,
          id: profile._id || profile.id,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      if (!live.current) return;
      console.error("Error fetching profile:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${API_URL}/institute/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!live.current) return;
      if (response.data.success) {
        setStats(response.data.data);
      } else {
        throw new Error("Unable to load institute totals.");
      }
    } catch (error) {
      if (!live.current) return;
      setError("Unable to load institute totals. Please try again.");
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      if (live.current) setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    live.current = false;
    navigate("/login", { replace: true });
  };

  const handleUserUpdate = (updatedUser) => {
    const merged = { ...user, ...updatedUser };
    setUser(merged);
    localStorage.setItem("user", JSON.stringify(merged));
  };

  if (!user) return null;
  const value = (key) => stats?.[key];
  const metrics = [
    {
      label: "Total students",
      value: value("totalStudents"),
      icon: UsersIcon,
      color: "blue",
      detail: "Learners in your institute",
      onClick: () => setActiveTab("students"),
    },
    {
      label: "Courses",
      value: value("totalCourses"),
      icon: BookOpenIcon,
      color: "green",
      detail: stats
        ? `${stats.activeCourses ?? 0} active courses`
        : "Your course catalogue",
      onClick: () => setActiveTab("courses"),
    },
    {
      label: "Certificates",
      value: value("certificatesIssued"),
      icon: DocumentCheckIcon,
      color: "violet",
      detail: "Certificate records in your workspace",
      onClick: () => setActiveTab("certificates"),
    },
    {
      label: "Templates",
      value: value("totalTemplates"),
      icon: RectangleStackIcon,
      color: "amber",
      detail: "Your certificate designs",
      onClick: () => setActiveTab("certificates"),
    },
  ];
  return (
    <WorkspaceLayout
      role="Institute"
      name={user.instituteName || "your institute"}
      logo={getUploadUrl(user.logo)}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={fetchStats}
      loading={loading}
      error={error}
    >
      {activeTab === "dashboard" ? (
        <>
          <WorkspaceMetrics metrics={metrics} loading={loading} />
          <div className="admin-overview-grid">
            <section className="admin-focus">
              <span className="admin-eyebrow">
                TURN LEARNING INTO RECOGNITION
              </span>
              <h2>Make their next achievement official.</h2>
              <p>
                Bring your learners, certificate designs, and issuing tools
                together. Start with your certificate workspace.
              </p>
              <button
                className="admin-primary"
                onClick={() => setActiveTab("certificates")}
              >
                Manage certificates <ArrowRightIcon aria-hidden="true" />
              </button>
              <ShieldCheckIcon className="admin-focus-art" aria-hidden="true" />
            </section>
            <section className="admin-status-card">
              <div className="admin-section-heading">
                <h2>A simple path to your next certificate.</h2>
              </div>
              <div className="workspace-guide">
                <div>
                  <span>01</span>
                  <div>
                    <h3>Organise your courses</h3>
                    <p>Set up the programmes your learners will complete.</p>
                  </div>
                </div>
                <div>
                  <span>02</span>
                  <div>
                    <h3>Bring in your learners</h3>
                    <p>Add students individually or use bulk upload.</p>
                  </div>
                </div>
                <div>
                  <span>03</span>
                  <div>
                    <h3>Issue and share</h3>
                    <p>Choose a design and issue a verifiable credential.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <WorkspaceActions
            actions={tabs.filter((tab) =>
              [
                "courses",
                "students",
                "teachers",
                ...(import.meta.env.VITE_SAAS_ENABLED === "true"
                  ? ["subscription"]
                  : ["bulk-upload"]),
              ].includes(tab.id),
            )}
            onSelect={setActiveTab}
          />
          <p className="workspace-note" role="status">
            {loading
              ? "Loading your institute overview..."
              : "Totals reflect your institute records. Refresh the overview after making changes."}
          </p>
        </>
      ) : (
        <div className="admin-panel">
          {activeTab === "courses" && <CourseManagement API_URL={API_URL} />}
          {activeTab === "subscription" && <InstituteSubscription />}
          {activeTab === "students" && <StudentManagement API_URL={API_URL} />}
          {activeTab === "teachers" && <TeacherManagement API_URL={API_URL} />}
          {activeTab === "certificates" && (
            <CertificateManagement API_URL={API_URL} />
          )}
          {activeTab === "bulk-upload" && <BulkUpload API_URL={API_URL} />}
          {activeTab === "settings" && (
            <InstituteSettings
              API_URL={API_URL}
              user={user}
              onUserUpdate={handleUserUpdate}
            />
          )}
        </div>
      )}
    </WorkspaceLayout>
  );
};
export default InstituteDashboard;
