import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import axios from "axios";
import TeacherDashboard from "../src/components/teacher/TeacherDashboard";
import InstituteDashboard from "../src/pages/InstituteDashboard";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../src/services/api", () => ({ default: {} }));
vi.mock("../src/components/teacher/TeacherStudents", () => ({
  default: () => <p>Teacher student workspace</p>,
}));
vi.mock("../src/components/teacher/TeacherIssueCertificate", () => ({
  default: () => <p>Teacher certificate workspace</p>,
}));
vi.mock("../src/components/teacher/TeacherCreateCourse", () => ({
  default: () => <p>Create course workspace</p>,
}));
vi.mock("../src/components/teacher/TeacherProfile", () => ({
  default: () => <p>Teacher profile workspace</p>,
}));
vi.mock("../src/components/institute/CourseManagement", () => ({
  default: () => <p>Institute courses workspace</p>,
}));
vi.mock("../src/components/institute/StudentManagement", () => ({
  default: () => null,
}));
vi.mock("../src/components/institute/TeacherManagement", () => ({
  default: () => null,
}));
vi.mock("../src/components/institute/CertificateManagement", () => ({
  default: () => null,
}));
vi.mock("../src/components/institute/BulkUpload", () => ({
  default: () => null,
}));
vi.mock("../src/components/institute/InstituteSettings", () => ({
  default: () => <p>Institute profile workspace</p>,
}));
vi.mock("../src/components/shared/Subscriptions", () => ({
  InstituteSubscription: () => null,
}));

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  localStorage.setItem("token", "test-only");
});
function setup(role, query = "") {
  localStorage.setItem(
    "user",
    JSON.stringify({ userType: role, instituteName: "Example Institute" }),
  );
  render(
    <MemoryRouter initialEntries={[`/${role}/dashboard${query}`]}>
      <Routes>
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/institute/dashboard" element={<InstituteDashboard />} />
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
function teacherResponses(permissions) {
  axios.get.mockImplementation((url) =>
    Promise.resolve({
      data: {
        success: true,
        data: url.endsWith("/profile/me")
          ? {
              firstName: "Example",
              lastName: "Teacher",
              permissions,
              assignedCourses: [],
              instituteId: { instituteName: "Example Institute" },
            }
          : url.endsWith("/students/my")
            ? [{ hasCertificate: true }, { hasCertificate: false }]
            : [
                {
                  _id: "course",
                  courseName: "Design Basics",
                  studentCount: 2,
                  certificateCount: 1,
                },
              ],
      },
    }),
  );
}
test("teacher overview and direct links respect permissions", async () => {
  teacherResponses({});
  setup("teacher", "?tab=issue");
  expect(await screen.findByText("Design Basics")).toBeInTheDocument();
  expect(
    screen.queryByText("Teacher certificate workspace"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Issue Certificates" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Create Course" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Workspace navigation" }),
    ).getByRole("button", { name: "My Students" }),
  );
  expect(screen.getByText("Teacher student workspace")).toBeInTheDocument();
});
test("permitted teachers can issue certificates and log out", async () => {
  teacherResponses({ canIssueCertificates: true });
  setup("teacher");
  fireEvent.click(
    await screen.findByRole("button", { name: "Issue a certificate" }),
  );
  expect(screen.getByText("Teacher certificate workspace")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(await screen.findByText("Login page")).toBeInTheDocument();
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("user")).toBeNull();
});
test("institute overview keeps its course and profile controls available", async () => {
  axios.get.mockImplementation((url) =>
    Promise.resolve({
      data: {
        success: true,
        data: url.endsWith("/profile")
          ? { instituteName: "Example Institute", userType: "institute" }
          : {
              totalStudents: 22,
              totalCourses: 4,
              certificatesIssued: 10,
              totalTemplates: 3,
              activeCourses: 2,
            },
      },
    }),
  );
  setup("institute");
  expect(await screen.findByText("22")).toBeInTheDocument();
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Workspace navigation" }),
    ).getByRole("button", { name: "Courses" }),
  );
  expect(screen.getByText("Institute courses workspace")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "My profile" }));
  expect(screen.getByText("Institute profile workspace")).toBeInTheDocument();
});
