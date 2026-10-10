import { beforeEach, expect, test, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import TeacherSetPassword from "../pages/TeacherSetPassword";
import TeacherPasswordReset from "../components/institute/TeacherPasswordReset";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState(
    {},
    "",
    "/teacher/set-password#token=" + "a".repeat(64),
  );
});

test("email link keeps its token in memory and submits a new password", async () => {
  axios.post.mockResolvedValue({ data: { success: true } });
  render(
    <MemoryRouter>
      <TeacherSetPassword />
    </MemoryRouter>,
  );
  expect(window.location.hash).toBe("");
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "TeacherPass123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "TeacherPass123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Set my password" }));
  await screen.findByRole("link", { name: "Sign in to teacher dashboard" });
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining("/teachers/password-setup"),
    { token: "a".repeat(64), newPassword: "TeacherPass123" },
  );
});

test("mismatching passwords stay local and expired links show the server error", async () => {
  render(
    <MemoryRouter>
      <TeacherSetPassword />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "TeacherPass123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "DifferentPass123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Set my password" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  expect(axios.post).not.toHaveBeenCalled();
  axios.post.mockRejectedValue({
    response: {
      data: { message: "This password link is invalid or expired." },
    },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "TeacherPass123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Set my password" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("invalid or expired"),
  );
});

test("institute recovery supports both email and direct password reset", async () => {
  localStorage.setItem("token", "admin-session");
  axios.post.mockResolvedValue({ data: { message: "Access updated." } });
  render(
    <TeacherPasswordReset
      teacher={{
        _id: "teacher-id",
        firstName: "Jane",
        email: "jane@example.com",
        isActive: true,
      }}
      API_URL="/api"
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  await screen.findByRole("status");
  expect(axios.post).toHaveBeenLastCalledWith(
    "/api/teachers/teacher-id/password-link",
    {},
    { headers: { Authorization: "Bearer admin-session" } },
  );
  fireEvent.click(screen.getByText("Set a new password directly"));
  fireEvent.change(screen.getByLabelText("New teacher password"), {
    target: { value: "TeacherPass123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "TeacherPass123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
  await waitFor(() =>
    expect(axios.post).toHaveBeenLastCalledWith(
      "/api/teachers/teacher-id/reset-password",
      { newPassword: "TeacherPass123" },
      { headers: { Authorization: "Bearer admin-session" } },
    ),
  );
});
