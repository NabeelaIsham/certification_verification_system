import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import api from "../src/services/api";
import { AuthContext } from "../src/contexts/AuthContext";
import SuperAdminDashboard from "../src/pages/SuperAdminDashboard";

vi.mock("../src/services/api", () => ({ default: { get: vi.fn() } }));
vi.mock("../src/components/admin/InstituteManagement.jsx", () => ({
  default: ({ initialStatus }) => <p>Institute filter: {initialStatus}</p>,
}));
vi.mock("../src/components/admin/Analytics.jsx", () => ({
  default: () => <p>Analytics workspace</p>,
}));
vi.mock("../src/components/admin/SystemLogs.jsx", () => ({
  default: () => null,
}));
vi.mock("../src/components/admin/SystemSetting.jsx", () => ({
  default: () => null,
}));
vi.mock("../src/components/admin/UserManagement.jsx", () => ({
  default: () => null,
}));
vi.mock("../src/components/admin/UserProfile.jsx", () => ({
  default: () => null,
}));
vi.mock("../src/components/shared/Subscriptions", () => ({
  AdminSubscriptions: () => null,
}));
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  localStorage.setItem("token", "test-only");
  localStorage.setItem(
    "user",
    JSON.stringify({ userType: "superadmin", superAdminName: "Test Admin" }),
  );
  api.get.mockResolvedValue({
    data: {
      success: true,
      data: {
        totalInstitutes: 14,
        pendingApprovals: 3,
        totalCertificates: 80,
        activeUsers: 20,
      },
    },
  });
});
function setup(logout = vi.fn()) {
  render(
    <AuthContext.Provider value={{ logout }}>
      <MemoryRouter initialEntries={["/admin/dashboard"]}>
        <Routes>
          <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}
test("approval shortcut opens the pending filter and navigation returns to overview", async () => {
  setup();
  expect(
    await screen.findByText("3 institutes waiting for review."),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /Review institute requests/ }),
  );
  expect(screen.getByText("Institute filter: pending")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Overview" }));
  expect(
    screen.getByRole("heading", { name: "Welcome back, Test Admin." }),
  ).toBeInTheDocument();
});
test("logout clears authentication and returns to login", async () => {
  const logout = vi.fn();
  setup(logout);
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(await screen.findByText("Login page")).toBeInTheDocument();
  expect(logout).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("token")).toBeNull();
  expect(localStorage.getItem("user")).toBeNull();
});
test("failed stats display an error and allow a retry", async () => {
  api.get.mockRejectedValueOnce(new Error("Connection unavailable"));
  setup();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection unavailable",
  );
  expect(
    screen.queryByText("Your approval queue is clear."),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByText("3 institutes waiting for review."),
  ).toBeInTheDocument();
});
