import { useEffect, useState } from "react";
import api from "../../services/api";
import ApprovedPaymentReceipt from "./ApprovedPaymentReceipt";

const money = (value) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(
    value / 100,
  );
const timestamp = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        timeZone: "Asia/Colombo",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not yet";

export default function SubscriberAnalytics({ revision = 0, renderActions }) {
  const [analytics, setAnalytics] = useState(null),
    [list, setList] = useState(null),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [filters, setFilters] = useState({ search: "", status: "all", page: 1 });
  const [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/subscriptions/admin/analytics"),
      api.get("/subscriptions/admin/subscribers", { params: filters }),
    ])
      .then(([summary, records]) => {
        if (active) {
          setAnalytics(summary.data.data);
          setList(records.data.data);
        }
      })
      .catch((error) => {
        if (active)
          setError(
            error.response?.data?.message ||
              "Unable to load subscriber analytics.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, revision, refresh]);
  const totals = analytics?.totals,
    statuses = analytics?.statuses || {};
  const maxRevenue = Math.max(
    1,
    ...(analytics?.months || []).map((row) => row.revenueMinor),
  );
  return (
    <section className="space-y-6" aria-label="Subscriber analytics">
      <div className="subscription-title">
        <div>
          <h2 className="text-2xl font-bold">Subscriber overview</h2>
          <p className="text-sm text-gray-500">
            All subscriber records. Dates and times are shown in Sri Lanka time
            (UTC+05:30).
          </p>
        </div>
        <button
          className="saas-button"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh analytics
        </button>
      </div>
      {error && (
        <p role="alert" className="saas-error">
          {error}
        </p>
      )}
      {loading && <p role="status">Loading subscriber analytics…</p>}
      {totals && (
        <>
          <div className="saas-metrics">
            {[
              ["Institutes", totals.institutes],
              ["Active paid packages", statuses.active || 0],
              ["Active trials", statuses.trial || 0],
              ["Expired packages", statuses.expired || 0],
              ["Stopped packages", statuses.suspended || 0],
              ["Expiring in 7 days", totals.expiringSoon],
              ["Awaiting payment review", totals.pendingReview],
              ["Approved revenue", money(totals.revenueMinor)],
            ].map(([label, value]) => (
              <div className="saas-metric" key={label}>
                <span>{label}</span>
                <strong
                  className={
                    label === "Approved revenue" ? "analytics-revenue" : ""
                  }
                >
                  {value}
                </strong>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">
            {totals.packages} package records · {totals.approvedPayments}{" "}
            approved payments · {totals.consumed} certificates issued ·{" "}
            {totals.activeCredits} usable credits remaining · Updated{" "}
            {timestamp(analytics.asOf)}
          </p>
          <div className="analytics-breakdown">
            <div className="saas-current-plan">
              <h3 className="text-lg font-semibold">
                Revenue over the last 12 months
              </h3>
              <p>Approved payments by calendar month (UTC).</p>
              <div className="revenue-chart">
                {analytics.months.map((month) => (
                  <div className="revenue-row" key={month._id}>
                    <span>{month._id}</span>
                    <div className="revenue-track">
                      <span
                        style={{
                          width: `${Math.max(month.revenueMinor ? 1 : 0, (month.revenueMinor / maxRevenue) * 100)}%`,
                        }}
                      />
                    </div>
                    <span>{money(month.revenueMinor)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="saas-current-plan">
              <h3 className="text-lg font-semibold">Package distribution</h3>
              <div className="overflow-x-auto">
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Package</th>
                      <th>Total</th>
                      <th>Active</th>
                      <th>Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.plans.map((plan) => (
                      <tr key={plan._id}>
                        <td>{plan._id}</td>
                        <td>{plan.subscriptions}</td>
                        <td>{plan.active}</td>
                        <td>{plan.consumed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Historical package records include renewals and trials.</p>
            </div>
          </div>
        </>
      )}
      <form
        className="subscriber-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setFilters((value) => ({ ...value, search: search.trim(), page: 1 }));
        }}
      >
        <label>
          Search institute, email, or package
          <input
            className="saas-input"
            maxLength={100}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a subscriber"
          />
        </label>
        <label>
          Package status
          <select
            className="saas-input"
            value={filters.status}
            onChange={(event) =>
              setFilters((value) => ({
                ...value,
                status: event.target.value,
                page: 1,
              }))
            }
          >
            {[
              "all",
              "active",
              "trial",
              "pending",
              "expired",
              "suspended",
              "cancelled",
            ].map((status) => (
              <option value={status} key={status}>
                {status === "suspended"
                  ? "Stopped"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <button className="saas-button" disabled={loading}>
          Search subscribers
        </button>
      </form>
      {list && (
        <div className="space-y-4" aria-busy={loading}>
          <p>{list.total} matching package records</p>
          {!list.items.length && <p>No subscribers match these filters.</p>}
          {list.items.map((sub) => (
            <article
              className="payment-review-card subscriber-record"
              key={`${sub._id}-${sub.status}-${sub.paymentProof?.receiptVersion || ""}`}
            >
              <div className="subscription-title">
                <div>
                  <h3>
                    {sub.instituteId?.instituteName || "Institute unavailable"}
                  </h3>
                  <p>
                    {sub.instituteId?.email} · {sub.snapshot.name}
                  </p>
                </div>
                <span className="saas-badge">
                  {sub.effectiveStatus === "suspended"
                    ? "Stopped"
                    : sub.effectiveStatus}
                </span>
              </div>
              <dl className="subscriber-dates">
                {[
                  ["Requested", sub.createdAt],
                  ["Starts", sub.startsAt],
                  ["Expires", sub.endsAt],
                  ["Proof submitted", sub.paymentProof?.submittedAt],
                  ["Payment reviewed", sub.paymentProof?.reviewedAt],
                  ["Last status change", sub.lastStatusChange?.at],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{timestamp(value)}</dd>
                  </div>
                ))}
              </dl>
              <p>
                {money(sub.snapshot.priceMinor)} · {sub.consumed}/
                {sub.allocated} certificates issued · {sub.reserved} processing
              </p>
              {sub.lastStatusChange?.reason && (
                <p>Status reason: {sub.lastStatusChange.reason}</p>
              )}
              {sub.expiryEmail && (
                <div className="payment-notice">
                  <strong>
                    Expiry email:{" "}
                    {sub.expiryEmail.status === "sent"
                      ? "Sent"
                      : sub.expiryEmail.status === "failed"
                        ? "Retry scheduled"
                        : "Queued"}
                  </strong>
                  <p>
                    {sub.expiryEmail.sentAt
                      ? `Sent ${timestamp(sub.expiryEmail.sentAt)}`
                      : `Next attempt ${timestamp(sub.expiryEmail.nextAttemptAt)}`}{" "}
                    · Attempts: {sub.expiryEmail.attempts}
                  </p>
                  {sub.expiryEmail.lastError && (
                    <p>{sub.expiryEmail.lastError}</p>
                  )}
                </div>
              )}
              {sub.payments.map((payment) => (
                <div key={payment._id} className="space-y-2">
                  <p>Approved payment: {timestamp(payment.paidAt)}</p>
                  <ApprovedPaymentReceipt paymentId={payment._id} />
                </div>
              ))}
              <details>
                <summary>Manage package and payment</summary>
                <div className="mt-4">{renderActions(sub)}</div>
              </details>
            </article>
          ))}
          <div className="subscription-title">
            <button
              className="saas-button"
              disabled={loading || list.page <= 1}
              onClick={() =>
                setFilters((value) => ({ ...value, page: value.page - 1 }))
              }
            >
              Previous page
            </button>
            <span>
              Page {list.page} of{" "}
              {Math.max(1, Math.ceil(list.total / list.pageSize))}
            </span>
            <button
              className="saas-button"
              disabled={loading || list.page * list.pageSize >= list.total}
              onClick={() =>
                setFilters((value) => ({ ...value, page: value.page + 1 }))
              }
            >
              Next page
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
