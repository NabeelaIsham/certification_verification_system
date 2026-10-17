import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import api from "../src/services/api";
import {
  Pricing,
  InstituteSubscription,
  AdminSubscriptions,
  PackageCheckout,
  PackagePayment,
} from "../src/components/shared/Subscriptions";
vi.mock("../src/services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));
const plan = {
  _id: "plan",
  name: "Starter",
  priceMinor: 1490000,
  limits: { certificates: 100, teachers: 2, templates: 2 },
  features: {},
  active: true,
};
const empty = {
  subscriptions: [],
  payments: [],
  usage: [],
  teachers: 0,
  templates: 0,
};
const trial = {
  _id: "trial",
  snapshot: { ...plan, name: "Free trial" },
  activation: "trial",
  effectiveStatus: "trial",
  consumed: 0,
  allocated: 100,
  remaining: 100,
  reserved: 0,
  endsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
};
beforeEach(() => {
  vi.resetAllMocks();
  sessionStorage.clear();
});

test("pricing keeps the selected plan in the checkout URL and offers a free trial", async () => {
  api.get.mockResolvedValue({ data: { data: [plan] } });
  render(
    <MemoryRouter>
      <Pricing />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText("100 certificate credits"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Start free trial" }),
  ).toHaveAttribute("href", "/register");
  expect(screen.getByRole("link", { name: "Choose Starter" })).toHaveAttribute(
    "href",
    "/institute/subscription/checkout/plan",
  );
});

test("checkout reuses the request key after failure and redirects to the returned payment", async () => {
  api.post
    .mockRejectedValueOnce({ response: { data: { message: "Try again" } } })
    .mockResolvedValue({ data: { data: { _id: "subscription" } } });
  render(
    <MemoryRouter initialEntries={["/checkout/plan"]}>
      <Routes>
        <Route path="/checkout/:planId" element={<PackageCheckout />} />
        <Route
          path="/institute/subscription/payment/:subscriptionId"
          element={<p>Payment destination</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Try again");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("Payment destination")).toBeInTheDocument();
  expect(api.post.mock.calls[0][1]).toEqual({ planId: "plan" });
  expect(api.post.mock.calls[0][2].headers["Idempotency-Key"]).toBe(
    api.post.mock.calls[1][2].headers["Idempotency-Key"],
  );
});

test("an active paid package offers higher upgrades and displays usage warnings and payment terms", async () => {
  const data = {
    ...empty,
    subscriptions: [
      {
        ...trial,
        activation: "manual",
        snapshot: plan,
        effectiveStatus: "active",
        consumed: 90,
        remaining: 9,
        reserved: 1,
      },
    ],
  };
  const higher = {
    ...plan,
    _id: "higher",
    name: "Professional",
    priceMinor: 2990000,
  };
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: { data: url.endsWith("/mine") ? data : [plan, higher] },
    }),
  );
  render(
    <MemoryRouter>
      <InstituteSubscription />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText("90% usage threshold reached."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Choose Starter" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Choose Professional" }),
  ).toHaveAttribute("href", "/institute/subscription/checkout/higher");
  expect(screen.getByText(/Pay the full displayed price/)).toBeInTheDocument();
});

test("trial can upgrade; pending upgrade still displays usable trial credits", async () => {
  const pending = {
    _id: "pending",
    snapshot: plan,
    effectiveStatus: "pending",
    paymentProof: { status: "submitted" },
  };
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: {
        data: url.endsWith("/mine")
          ? { ...empty, subscriptions: [pending, trial] }
          : [plan],
      },
    }),
  );
  render(
    <MemoryRouter>
      <InstituteSubscription />
    </MemoryRouter>,
  );
  expect(await screen.findByText("Free trial")).toBeInTheDocument();
  expect(screen.getByText("100")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View payment" })).toHaveAttribute(
    "href",
    "/institute/subscription/payment/pending",
  );
});

test("an active trial offers upgrade links without waiting for expiry", async () => {
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: {
        data: url.endsWith("/mine")
          ? { ...empty, subscriptions: [trial] }
          : [plan],
      },
    }),
  );
  render(
    <MemoryRouter>
      <InstituteSubscription />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("link", { name: "Choose Starter" }),
  ).toHaveAttribute("href", "/institute/subscription/checkout/plan");
});

test("approval sends the receipt version and verified amount", async () => {
  const sub = {
    _id: "subscription",
    instituteId: { instituteName: "Test Institute" },
    snapshot: plan,
    status: "pending",
    consumed: 0,
    allocated: 0,
    reserved: 0,
    paymentProof: {
      transactionNumber: "BANK-123",
      status: "submitted",
      receiptVersion: "receipt-1",
    },
  };
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: {
        data: url.endsWith("/analytics")
          ? { totals: {}, statuses: {}, months: [], plans: [] }
          : url.endsWith("/subscribers")
            ? { items: [], total: 0, page: 1, pageSize: 25 }
            : url.endsWith("/plans")
              ? [plan]
              : url.endsWith("/events")
                ? []
                : url.endsWith("/bank-details")
                  ? null
                  : [sub],
      },
    }),
  );
  api.post.mockResolvedValue({ data: {} });
  render(<AdminSubscriptions />);
  expect(await screen.findByLabelText("Bank transaction number")).toHaveValue(
    "BANK-123",
  );
  fireEvent.change(screen.getByLabelText("Amount received (LKR)"), {
    target: { value: "14900" },
  });
  fireEvent.click(screen.getByLabelText("I verified this bank payment."));
  fireEvent.click(
    screen.getByRole("button", { name: "Record payment and activate" }),
  );
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/subscriptions/admin/subscriptions/subscription/activate",
      {
        reference: "BANK-123",
        amountMinor: 1490000,
        receiptVersion: "receipt-1",
      },
    ),
  );
});

test("payment page shows approval status and does not allow changing a submitted payment", async () => {
  const pending = {
    _id: "pending",
    snapshot: plan,
    effectiveStatus: "pending",
    paymentProof: { status: "submitted", transactionNumber: "BANK-123" },
  };
  api.get.mockImplementation((url) =>
    Promise.resolve({
      data: {
        data: url.endsWith("/mine")
          ? { ...empty, subscriptions: [pending] }
          : null,
      },
    }),
  );
  render(
    <MemoryRouter initialEntries={["/payment/pending"]}>
      <Routes>
        <Route path="/payment/:subscriptionId" element={<PackagePayment />} />
      </Routes>
    </MemoryRouter>,
  );
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("Receipt received"),
  );
  expect(
    screen.queryByRole("button", { name: "Change package" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Submit payment receipt" }),
  ).not.toBeInTheDocument();
});
