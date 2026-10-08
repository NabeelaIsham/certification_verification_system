import { ReceiptReview } from "./ManualPayment";
import BankDetailsEditor from "./BankDetailsEditor";
import { useEffect, useState } from "react";
import api from "../../services/api";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import "./Subscriptions.css";

const money = (value) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(
    value / 100,
  );
const date = (value) =>
  value ? new Date(value).toLocaleDateString() : "Not activated";
const message = (error) =>
  error.response?.data?.message ||
  "Unable to complete the request. Please retry.";
const button = "saas-button";
const input = "saas-input";

function PageHeading({ eyebrow, title, description }) {
  return (
    <header className="saas-heading">
      <div className="saas-eyebrow">
        <ShieldCheckIcon aria-hidden="true" />
        {eyebrow}
      </div>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
function Metric({ label, value, detail }) {
  return (
    <div className="saas-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function PlanEditor({ plan, save, busy }) {
  const [value, setValue] = useState(
    () =>
      plan || {
        name: "",
        priceMinor: 0,
        limits: { certificates: 100, teachers: 2, templates: 2 },
        features: { bulkCertificateIssue: true, secureSharing: true },
        active: false,
        recommended: false,
        displayOrder: 0,
      },
  );
  const change = (key, content) =>
    setValue((previous) => ({ ...previous, [key]: content }));
  return (
    <form
      className="grid gap-3 rounded border p-4 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        save(value);
      }}
    >
      <label>
        Plan name
        <input
          required
          maxLength={100}
          className={input}
          value={value.name}
          onChange={(event) => change("name", event.target.value)}
        />
      </label>
      <label>
        Annual price (LKR)
        <input
          type="number"
          min="0"
          step="0.01"
          required
          className={input}
          value={value.priceMinor / 100}
          onChange={(event) =>
            change("priceMinor", Math.round(Number(event.target.value) * 100))
          }
        />
      </label>
      {["certificates", "teachers", "templates"].map((kind) => (
        <label key={kind}>
          {kind}
          <input
            type="number"
            min={kind === "certificates" ? 1 : 0}
            step="1"
            required
            className={input}
            value={value.limits[kind]}
            onChange={(event) =>
              change("limits", {
                ...value.limits,
                [kind]: Number(event.target.value),
              })
            }
          />
        </label>
      ))}
      <label>
        Display order
        <input
          type="number"
          step="1"
          className={input}
          value={value.displayOrder}
          onChange={(event) =>
            change("displayOrder", Number(event.target.value))
          }
        />
      </label>
      {["active", "recommended"].map((key) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={value[key]}
            onChange={(event) => change(key, event.target.checked)}
          />{" "}
          {key}
        </label>
      ))}
      {["bulkCertificateIssue", "secureSharing"].map((key) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={value.features[key]}
            onChange={(event) =>
              change("features", {
                ...value.features,
                [key]: event.target.checked,
              })
            }
          />{" "}
          {key === "bulkCertificateIssue"
            ? "Bulk certificate issuance"
            : "Secure sharing"}
        </label>
      ))}
      <button className={button} disabled={busy}>
        Save plan
      </button>
    </form>
  );
}
function SubscriptionActions({ sub, act, busy }) {
  const reference = sub.paymentProof?.transactionNumber || "";
  const [amount, setAmount] = useState(""),
    [reason, setReason] = useState("");
  const expired = sub.endsAt && new Date(sub.endsAt) <= new Date();
  return (
    <div className="space-y-3">
      {sub.activation !== "trial" && (
        <ReceiptReview sub={sub} act={act} busy={busy} />
      )}
      {sub.status === "pending" && sub.paymentProof?.status === "submitted" && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            act(`/subscriptions/admin/subscriptions/${sub._id}/activate`, {
              reference,
              amountMinor: Math.round(Number(amount) * 100),
              receiptVersion: sub.paymentProof.receiptVersion,
            });
          }}
        >
          <label>
            Bank transaction number
            <input
              required
              minLength={3}
              maxLength={100}
              className={input}
              value={reference}
              readOnly
            />
          </label>
          <label>
            Amount received (LKR)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className={input}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label className="block">
            <input type="checkbox" required /> I verified this bank payment.
          </label>
          <button className={button} disabled={busy}>
            Record payment and activate
          </button>
        </form>
      )}
      {["pending", "active", "suspended"].includes(sub.status) && (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            act(`/subscriptions/admin/subscriptions/${sub._id}/status`, {
              status:
                sub.status === "pending"
                  ? "cancelled"
                  : expired
                    ? "expired"
                    : sub.status === "active"
                      ? "suspended"
                      : "active",
              reason,
            });
          }}
        >
          <input
            aria-label="Reason for status change"
            placeholder="Reason for status change"
            required
            minLength={3}
            maxLength={500}
            className={input}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <button className={button} disabled={busy}>
            {sub.status === "pending"
              ? "Cancel request"
              : expired
                ? "Close expired term"
                : sub.status === "active"
                  ? "Suspend"
                  : "Resume"}
          </button>
        </form>
      )}
    </div>
  );
}
export function AdminSubscriptions() {
  const [plans, setPlans] = useState([]),
    [subscriptions, setSubscriptions] = useState([]),
    [events, setEvents] = useState([]),
    [editing, setEditing] = useState(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [reviews, setReviews] = useState([]);
  async function refresh() {
    const responses = await Promise.all(
      [
        "/admin/plans",
        "/admin/subscriptions",
        "/admin/events",
        "/admin/reviews",
      ].map((path) => api.get(`/subscriptions${path}`)),
    );
    setPlans(responses[0].data.data);
    setSubscriptions(responses[1].data.data);
    setEvents(responses[2].data.data);
    setLoaded(true);
    setReviews(responses[3].data.data);
  }
  useEffect(() => {
    refresh().catch((error) => setError(message(error)));
  }, []);
  async function act(url, body, method = "post") {
    setBusy(true);
    setError("");
    try {
      await api[method](url, body);
      await refresh();
      setEditing(null);
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  const save = (value) =>
    act(
      `/subscriptions/admin/plans${value._id ? `/${value._id}` : ""}`,
      Object.fromEntries(
        [
          "name",
          "priceMinor",
          "limits",
          "features",
          "active",
          "recommended",
          "displayOrder",
        ].map((key) => [key, value[key]]),
      ),
      value._id ? "put" : "post",
    );
  return (
    <section className="saas-shell saas-admin space-y-6">
      <PageHeading
        eyebrow="ADMIN WORKSPACE / SUBSCRIPTIONS"
        title="Plans and manual subscriptions"
        description="Shape your packages, review payments, and keep every institute moving forward."
      />
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {!loaded && !error && <p>Loading subscriptions…</p>}
      {loaded && (
        <div className="saas-metrics">
          <Metric
            label="Published plans"
            value={plans.filter((plan) => plan.active).length}
            detail="Available in your catalogue"
          />
          <Metric
            label="Pending review"
            value={reviews.length}
            detail="Awaiting payment verification"
          />
          <Metric
            label="Active subscriptions"
            value={
              subscriptions.filter(
                (sub) =>
                  sub.status === "active" && new Date(sub.endsAt) > new Date(),
              ).length
            }
            detail="Within the latest 200 records"
          />
          <Metric
            label="Suspended"
            value={
              subscriptions.filter((sub) => sub.status === "suspended").length
            }
            detail="Accounts requiring your attention"
          />
        </div>
      )}
      <section className="space-y-4" aria-label="Payment approval queue">
        <div className="subscription-title">
          <h2 className="text-2xl font-semibold">
            Payment approvals ({reviews.length})
          </h2>
          <button
            className={button}
            disabled={busy}
            onClick={() => refresh().catch((error) => setError(message(error)))}
          >
            Refresh payments
          </button>
        </div>
        {loaded && !reviews.length && <p>No receipts are awaiting approval.</p>}
        {reviews.map((sub) => (
          <article
            className="payment-review-card"
            key={`${sub._id}-${sub.paymentProof.receiptVersion}`}
          >
            <h3>
              {sub.instituteId?.instituteName || "Institute"} ·{" "}
              {sub.snapshot.name}
            </h3>
            <p>
              {sub.instituteId?.email} · Amount due:{" "}
              {money(sub.snapshot.priceMinor)}
            </p>
            <SubscriptionActions sub={sub} act={act} busy={busy} />
          </article>
        ))}
      </section>
      <details className="saas-current-plan">
        <summary>Bank account settings</summary>
        <BankDetailsEditor />
      </details>
      {loaded && !plans.length && (
        <button
          className={button}
          disabled={busy}
          onClick={() => act("/subscriptions/admin/plans/bootstrap", {})}
        >
          Create default packages
        </button>
      )}
      <div className="flex flex-wrap gap-3">
        {plans.map((plan) => (
          <button
            className="rounded border p-3"
            key={plan._id}
            onClick={() => setEditing(plan)}
          >
            {plan.name} · {money(plan.priceMinor)} ·{" "}
            {plan.active ? "Active" : "Hidden"}
          </button>
        ))}
        <button className={button} onClick={() => setEditing({})}>
          New plan
        </button>
      </div>
      {editing && (
        <PlanEditor
          key={editing._id || "new"}
          plan={editing._id ? editing : null}
          save={save}
          busy={busy}
        />
      )}
      <p>
        Plan edits affect future requests. Purchased prices and limits remain
        unchanged.
      </p>
      <h2 className="text-xl">Subscriptions (latest 200)</h2>
      {subscriptions
        .filter((sub) => !reviews.some((review) => review._id === sub._id))
        .map((sub) => (
          <article
            key={`${sub._id}-${sub.paymentProof?.receiptVersion || "none"}`}
            className="space-y-3 rounded border bg-white p-5"
          >
            <h3 className="font-semibold">
              {sub.instituteId?.instituteName ||
                sub.instituteId?._id ||
                "Institute unavailable"}{" "}
              · {sub.snapshot.name}
            </h3>
            <p>
              {["active", "trial"].includes(sub.status) && new Date(sub.endsAt) <= new Date()
                ? "expired"
                : sub.status}{" "}
              · {money(sub.snapshot.priceMinor)} · {sub.consumed}/
              {sub.allocated} consumed · {sub.reserved} reserved · Expires{" "}
              {date(sub.endsAt)}
            </p>
            <SubscriptionActions sub={sub} act={act} busy={busy} />
          </article>
        ))}
      <h2 className="text-xl">Recent audit events</h2>
      <ul>
        {events.map((event) => (
          <li key={event._id}>
            {date(event.createdAt)} · {event.event.replaceAll("_", " ")}
          </li>
        ))}
      </ul>
    </section>
  );
}

export {
  Pricing,
  InstituteSubscription,
  PackageCheckout,
  PackagePayment,
} from "./SubscriptionPages";
