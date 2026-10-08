import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { vi } from "vitest";
import axios from "axios";
import Register from "../src/pages/Register";

vi.mock("axios", () => ({ default: { post: vi.fn() } }));
const fields = {
  "Institute name": "Example Academy",
  "Institute type": "College",
  "Phone number": "0771234567",
  "Approximate student count": "50",
  "Institute address": "Colombo",
  "Full name": "Example Admin",
  "Email address": "admin@example.com",
  Password: "ExamplePass123",
  "Confirm password": "ExamplePass123",
};
function NextStep() {
  const { state } = useLocation();
  return <p>Verify email: {state?.email}</p>;
}
function fillForm() {
  for (const [label, value] of Object.entries(fields))
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole("checkbox"));
}
beforeEach(() => vi.resetAllMocks());

test("registration preserves account details and continues to email verification", async () => {
  axios.post.mockResolvedValue({ data: { success: true } });
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/OTPVerification" element={<NextStep />} />
      </Routes>
    </MemoryRouter>,
  );
  fillForm();
  fireEvent.click(
    screen.getByRole("button", { name: "Create institute account" }),
  );
  expect(
    await screen.findByText("Verify email: admin@example.com"),
  ).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining("/auth/register"),
    expect.objectContaining({
      instituteName: "Example Academy",
      email: "admin@example.com",
      phone: "0771234567",
      password: "ExamplePass123",
      agreeToTerms: true,
    }),
  );
});

test("password mismatch is shown inline without submitting the registration", () => {
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
  fillForm();
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "DifferentPass123" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Create institute account" }),
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  expect(axios.post).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Email address")).toHaveValue(
    "admin@example.com",
  );
});
