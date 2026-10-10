import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Squares2X2Icon,
  BookOpenIcon,
  UsersIcon,
  DocumentCheckIcon,
  ClockIcon,
  PlusCircleIcon,
  UserCircleIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import WorkspaceLayout, {
  WorkspaceMetrics,
  WorkspaceActions,
} from "../shared/WorkspaceLayout";
import axios from "axios";
import TeacherStudents from "./TeacherStudents";
import TeacherIssueCertificate from "./TeacherIssueCertificate";
import TeacherProfile from "./TeacherProfile";
import TeacherCreateCourse from "./TeacherCreateCourse";

const TeacherDashboard = ({
  API_URL = import.meta.env.VITE_API_BASE_URL || "/api",
  teacher,
}) => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState(teacher);
  const [error, setError] = useState("");
  const live = useRef(true);
  const tabs = [
    {
      id: "dashboard",
      name: "Overview",
      icon: Squares2X2Icon,
      description:
        "A clear view of your courses, learners, and their achievements.",
    },
    {
      id: "courses",
      name: "My Courses",
      icon: BookOpenIcon,
      description: "Follow certificate progress across your assigned courses.",
    },
    {
      id: "students",
      name: "My Students",
      icon: UsersIcon,
      description: "Review the learners in your assigned courses.",
    },
    {
      id: "create-course",
      name: "Create Course",
      permission: "canCreateCourses",
      icon: PlusCircleIcon,
      description: "Build a new course for your institute.",
    },
    {
      id: "issue",
      name: "Issue Certificates",
      permission: "canIssueCertificates",
      icon: DocumentCheckIcon,
      description:
        "Recognise completed learning with a verifiable certificate.",
    },
    {
      id: "profile",
      name: "My Profile",
      icon: UserCircleIcon,
      description:
        "Keep your personal details and account security up to date.",
    },
  ].filter(
    (tab) => !tab.permission || teacherData?.permissions?.[tab.permission],
  );
  const activeTab = tabs.some((tab) => tab.id === params.get("tab"))
    ? params.get("tab")
    : "dashboard";
  const setActiveTab = (tab) => setParams({ tab });
  useEffect(() => {
    live.current = true;
    fetchDashboardData();
    return () => {
      live.current = false;
    };
  }, [API_URL]);
  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }
      const options = { headers: { Authorization: `Bearer ${token}` } };
      const profileRes = await axios.get(
        `${API_URL}/teachers/profile/me`,
        options,
      );
      if (!live.current) return;
      if (!profileRes.data.success)
        throw new Error("Unable to load your teacher profile.");
      setTeacherData(profileRes.data.data);
      const [studentsRes, coursesRes] = await Promise.all([
        axios.get(`${API_URL}/teachers/students/my`, options),
        axios.get(`${API_URL}/teachers/courses/my`, options),
      ]);
      if (!live.current) return;
      if (!studentsRes.data.success || !coursesRes.data.success)
        throw new Error("Unable to load your courses and students.");
      const students = studentsRes.data.data || [];
      const issuedCount = students.filter(
        (student) => student.hasCertificate,
      ).length;
      const assigned = coursesRes.data.data || [];
      setStats({
        totalStudents: students.length,
        totalCourses: assigned.length,
        certificatesIssued: issuedCount,
        pendingCertificates: students.length - issuedCount,
      });
      setCourses(assigned);
    } catch (failure) {
      if (!live.current) return;
      if (failure.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
      } else
        setError(
          failure.response?.data?.message ||
            failure.message ||
            "Failed to load your overview. Please try again.",
        );
    } finally {
      if (live.current) setLoading(false);
    }
  };
  const name = [teacherData?.firstName, teacherData?.lastName]
    .filter(Boolean)
    .join(" ");
  const institute = teacherData?.instituteId;
  const canIssue = teacherData?.permissions?.canIssueCertificates;
  const metrics = [
    {
      label: "My courses",
      value: stats?.totalCourses,
      icon: BookOpenIcon,
      color: "blue",
      detail: "Assigned to you",
      onClick: () => setActiveTab("courses"),
    },
    {
      label: "My students",
      value: stats?.totalStudents,
      icon: UsersIcon,
      color: "green",
      detail: "Learners in your courses",
      onClick: () => setActiveTab("students"),
    },
    {
      label: "Certificates issued",
      value: stats?.certificatesIssued,
      icon: DocumentCheckIcon,
      color: "violet",
      detail: "Students with a certificate",
      onClick: () => setActiveTab("students"),
    },
    {
      label: "Awaiting certificates",
      value: stats?.pendingCertificates,
      icon: ClockIcon,
      color: "amber",
      detail: "Students without a certificate",
      onClick: () => setActiveTab(canIssue ? "issue" : "students"),
    },
  ];
  const courseList = (
    <div className="workspace-course-list">
      {courses.length ? (
        courses.map((course) => (
          <article key={course._id} className="workspace-course">
            <div className="workspace-course-heading">
              <div>
                <h3>{course.courseName}</h3>
                <small>{course.courseCode}</small>
              </div>
              <span>{course.studentCount || 0} students</span>
            </div>
            <div className="workspace-course-progress" aria-hidden="true">
              <span
                style={{
                  width: `${course.studentCount ? Math.min(100, ((course.certificateCount || 0) / course.studentCount) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="workspace-course-footer">
              <span>{course.certificateCount || 0} certificates issued</span>
              <span>
                {course.studentCount
                  ? Math.min(
                      100,
                      Math.round(
                        ((course.certificateCount || 0) / course.studentCount) *
                          100,
                      ),
                    )
                  : 0}
                % of students
              </span>
            </div>
          </article>
        ))
      ) : (
        <div className="workspace-empty">
          <p>
            {loading
              ? "Loading your courses..."
              : stats
                ? "No courses assigned yet"
                : "Course information is unavailable"}
          </p>
          <small>
            {stats
              ? "Your institute administrator can assign courses to your account."
              : "Refresh the overview to try again."}
          </small>
        </div>
      )}
    </div>
  );
  return (
    <WorkspaceLayout
      role="Teacher"
      name={name}
      subtitle={institute?.instituteName || "YOUR TEACHING WORKSPACE"}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={fetchDashboardData}
      loading={loading}
      error={error}
    >
      {activeTab === "dashboard" ? (
        <>
          <WorkspaceMetrics metrics={metrics} loading={loading} />
          <div className="admin-overview-grid">
            <section className="admin-focus">
              <span className="admin-eyebrow">SUPPORT EVERY ACHIEVEMENT</span>
              <h2>
                {canIssue
                  ? "Their hard work. Your recognition."
                  : "A clearer view of your learners."}
              </h2>
              <p>
                {canIssue
                  ? "Review your learners and issue certificates when they have met your institute's requirements."
                  : "Keep track of your assigned courses and learner records in one workspace."}
              </p>
              <button
                className="admin-primary"
                onClick={() => setActiveTab(canIssue ? "issue" : "students")}
              >
                {canIssue ? "Issue a certificate" : "View my students"}
                <ArrowRightIcon aria-hidden="true" />
              </button>
              <AcademicCapIcon className="admin-focus-art" aria-hidden="true" />
            </section>
            <section className="admin-status-card">
              <div className="admin-section-heading">
                <h2>My assigned courses</h2>
                <button onClick={() => setActiveTab("courses")}>
                  View all <ArrowRightIcon aria-hidden="true" />
                </button>
              </div>
              {courseList}
            </section>
          </div>
          <WorkspaceActions
            actions={tabs.filter((tab) =>
              ["students", "create-course", "issue", "profile"].includes(
                tab.id,
              ),
            )}
            onSelect={setActiveTab}
          />
          {institute?.instituteName && (
            <div className="workspace-affiliation">
              <BuildingOffice2Icon aria-hidden="true" />
              <div>
                <p>{institute.instituteName}</p>
                <small>{institute.email}</small>
              </div>
              <span>
                {[teacherData?.designation, teacherData?.department]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          )}
          <p className="workspace-note" role="status">
            {loading
              ? "Loading your teaching overview..."
              : "Certificate access follows your institute's package and the permissions assigned to you."}
          </p>
        </>
      ) : (
        <div className="admin-panel">
          {activeTab === "courses" && (
            <section className="workspace-course-panel">
              <div className="admin-section-heading">
                <h2>Course certificate progress</h2>
              </div>
              {courseList}
            </section>
          )}
          {activeTab === "students" && teacherData && (
            <TeacherStudents
              API_URL={API_URL}
              teacherId={teacherData._id}
              permissions={teacherData.permissions}
              assignedCourses={teacherData.assignedCourses || []}
              instituteId={institute?._id || institute}
            />
          )}
          {activeTab === "create-course" &&
            teacherData?.permissions?.canCreateCourses && (
              <TeacherCreateCourse
                API_URL={API_URL}
                onCreated={fetchDashboardData}
              />
            )}
          {activeTab === "issue" && canIssue && (
            <TeacherIssueCertificate
              API_URL={API_URL}
              teacher={teacherData}
              assignedCourses={teacherData.assignedCourses || []}
              instituteId={institute?._id || institute}
              onCertificateIssued={fetchDashboardData}
            />
          )}
          {activeTab === "profile" && teacherData && (
            <TeacherProfile
              API_URL={API_URL}
              teacher={teacherData}
              onProfileUpdate={(updated) => {
                setTeacherData((current) => ({ ...current, ...updated }));
                let stored;
                try {
                  stored = JSON.parse(localStorage.getItem("user"));
                } catch {
                  stored = {};
                }
                localStorage.setItem(
                  "user",
                  JSON.stringify({ ...stored, ...updated }),
                );
              }}
            />
          )}
        </div>
      )}
    </WorkspaceLayout>
  );
};
export default TeacherDashboard;
