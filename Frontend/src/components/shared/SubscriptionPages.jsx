import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CheckIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import api from "../../services/api";
import { ManualPayment } from "./ManualPayment";
import { ReceiptDownload } from "./ManualPayment";
import ApprovedPaymentReceipt from "./ApprovedPaymentReceipt";
import "./Subscriptions.css";

const money = (value) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value / 100);
const date = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        timeZone: "Asia/Colombo",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "After approval";
const message = (error) =>
  error.response?.data?.message ||
  "Unable to load your package. Please try again.";

function Heading({ title, children }) {
  return (
    <header className="saas-heading">
      <div className="saas-eyebrow">
        <ShieldCheckIcon /> CERTIVERXIA / PACKAGES
      </div>
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}
export function PaymentSteps({ step = 1 }) {
  return (
    <ol className="payment-steps" aria-label="Package activation progress">
      {["Choose a package", "Bank payment", "Admin approval"].map(
        (label, index) => (
          <li
            key={label}
            className={step >= index + 1 ? "step-current" : ""}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            <span>{index + 1}</span>
            {label}
          </li>
        ),
      )}
    </ol>
  );
}
function PlanCards({ plans, blocked = false }) {
  return (
    <div className="saas-plans">
      {plans.map((plan) => (
        <article
          key={plan._id}
          className={`saas-plan ${plan.recommended ? "saas-plan-featured" : ""}`}
        >
          <div className="saas-plan-top">
            <span className="saas-eyebrow">ANNUAL PACKAGE</span>
            {plan.recommended && (
              <span className="saas-badge">Recommended</span>
            )}
          </div>
          <h2>{plan.name}</h2>
          <p className="saas-plan-caption">
            A full year to issue, manage, and share achievements.
          </p>
          <p className="saas-price">
            {money(plan.priceMinor)} <span>/ year</span>
          </p>
          <ul className="saas-features">
            <li>
              <CheckIcon />
              {plan.limits.certificates} certificate credits
            </li>
            <li>
              <CheckIcon />
              {plan.limits.teachers} teachers
            </li>
            <li>
              <CheckIcon />
              {plan.limits.templates} templates
            </li>
            <li>
              <CheckIcon />
              {plan.features?.bulkCertificateIssue
                ? "Bulk issuance included"
                : "Individual certificate issuance"}
            </li>
            <li>
              <CheckIcon />
              {plan.features?.secureSharing
                ? "Secure certificate sharing"
                : "Certificate verification"}
            </li>
          </ul>
          {blocked ? (
            <button className="saas-button" disabled>
              Choose {plan.name}
            </button>
          ) : (
            <Link
              className="saas-button"
              to={`/institute/subscription/checkout/${plan._id}`}
            >
              Choose {plan.name}
              <ArrowRightIcon />
            </Link>
          )}
          <p className="plan-footnote">
            Bank transfer · Activated after approval
          </p>
        </article>
      ))}
    </div>
  );
}
export function Pricing() {
  const [plans, setPlans] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/subscriptions/plans")
      .then((res) => setPlans(res.data.data))
      .catch((error) => setError(message(error)));
  }, []);
  return (
    <section className="saas-shell saas-pricing space-y-6">
      <Heading title="Start free. Grow with confidence.">
        Every new institute receives a 14-day free trial with Starter package
        limits. Choose an annual package whenever you are ready.
      </Heading>
      <div className="trial-banner">
        <div>
          <span className="saas-badge">14 DAYS FREE</span>
          <h2>Meet your new certificate workspace.</h2>
          <p>
            Starter allowances. No payment required. Your trial begins at
            registration; account verification is required before use.
          </p>
        </div>
        <Link to="/register" className="saas-button">
          Start free trial <ArrowRightIcon />
        </Link>
      </div>
      <PaymentSteps />
      {error && (
        <p role="alert" className="saas-error">
          {error}
        </p>
      )}
      {plans ? (
        <PlanCards plans={plans} />
      ) : (
        !error && <p role="status">Loading packages…</p>
      )}
      {plans?.length === 0 && (
        <p>
          Annual packages are being prepared. You can still register for your
          free trial.
        </p>
      )}
      <p>
        Paid packages last 12 months from approval. No automatic renewal.
        Existing certificates remain verifiable after your package expires.
      </p>
    </section>
  );
}
export function InstituteSubscription() {
  const [data, setData] = useState(null),
    [plans, setPlans] = useState([]),
    [error, setError] = useState("");
  async function refresh() {
    try {
      const [mine, catalogue] = await Promise.all([
        api.get("/subscriptions/mine"),
        api.get("/subscriptions/plans"),
      ]);
      setData(mine.data.data);
      setPlans(catalogue.data.data);
      setError("");
    } catch (error) {
      setError(message(error));
    }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const pending = data?.subscriptions.find(
    (sub) => sub.effectiveStatus === "pending",
  );
  const current =
    data?.subscriptions.find((sub) =>
      ["active", "trial", "suspended"].includes(sub.effectiveStatus),
    ) || data?.subscriptions.find((sub) => sub.effectiveStatus === "expired");
  const blocked =
    !data ||
    !!pending ||
    !!data?.subscriptions.some((sub) => sub.effectiveStatus === "suspended");
  const availablePlans =
    current?.effectiveStatus === "active"
      ? plans.filter(
          (plan) =>
            plan._id !== current.planId &&
            plan.priceMinor > current.snapshot.priceMinor &&
            ["certificates", "teachers", "templates"].every(
              (key) => plan.limits[key] >= current.snapshot.limits[key],
            ) &&
            ["bulkCertificateIssue", "secureSharing"].every(
              (key) =>
                !current.snapshot.features?.[key] || plan.features?.[key],
            ),
        )
      : plans;
  const percent = current?.allocated
    ? Math.floor((current.consumed / current.allocated) * 100)
    : 0;
  const days = current?.endsAt
    ? Math.max(0, Math.ceil((new Date(current.endsAt) - Date.now()) / 86400000))
    : 0;
  return (
    <section className="saas-shell space-y-6">
      <Heading title="Your package, made simple.">
        Track your allowance, choose your next package, and follow your payment
        approval in one place.
      </Heading>
      {error && (
        <div role="alert" className="saas-error">
          {error} <button onClick={refresh}>Retry</button>
        </div>
      )}
      {!data && !error && <p role="status">Loading your subscription…</p>}
      {current && (
        <article className="saas-current-plan space-y-4">
          <div className="subscription-title">
            <div>
              <span className="saas-eyebrow">YOUR CURRENT PACKAGE</span>
              <h2>{current.snapshot.name}</h2>
            </div>
            <span className="saas-badge">
              {current.effectiveStatus === "trial"
                ? `${days} days left in your trial`
                : current.effectiveStatus}
            </span>
          </div>
          <div className="saas-metrics">
            <div className="saas-metric">
              <span>Available certificates</span>
              <strong>{current.remaining}</strong>
              <small>
                {current.consumed} of {current.allocated} issued ·{" "}
                {current.reserved} processing
              </small>
            </div>
            <div className="saas-metric">
              <span>Teachers</span>
              <strong>
                {data.teachers} / {current.snapshot.limits.teachers}
              </strong>
            </div>
            <div className="saas-metric">
              <span>Templates</span>
              <strong>
                {data.templates} / {current.snapshot.limits.templates}
              </strong>
            </div>
            <div className="saas-metric">
              <span>Expires</span>
              <strong className="expiry-date">{date(current.endsAt)}</strong>
              <small>
                {days
                  ? `${days} days remaining`
                  : "Choose a package to continue"}
              </small>
            </div>
          </div>
          <div
            className="saas-progress"
            role="progressbar"
            aria-label="Certificate allowance used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(100, percent)}
          >
            <span style={{ width: `${Math.min(100, percent)}%` }} />
          </div>
          {percent >= 75 && (
            <p role="status">
              {percent >= 100
                ? "Certificate allowance exhausted."
                : `${percent >= 90 ? "90%" : "75%"} usage threshold reached.`}
            </p>
          )}
          {current.effectiveStatus === "trial" && (
            <p>
              Your trial includes Starter allowances. You can choose a paid
              package now and keep using your trial until it expires or your
              payment is approved.
            </p>
          )}
          {current.effectiveStatus === "suspended" && (
            <p role="status">
              Your package has been stopped by the super admin. Package features
              are unavailable. Contact support for assistance.
              {current.lastStatusChange?.reason &&
                ` Reason: ${current.lastStatusChange.reason}`}
            </p>
          )}
          {current.effectiveStatus === "expired" && (
            <p role="status">
              Your package has expired. Choose an annual package to continue
              issuing certificates.
            </p>
          )}
        </article>
      )}
      {pending && (
        <div className="trial-banner">
          <div>
            <span className="saas-eyebrow">
              {pending.paymentProof?.status === "submitted"
                ? "AWAITING APPROVAL"
                : "CONTINUE YOUR PAYMENT"}
            </span>
            <h2>{pending.snapshot.name}</h2>
            <p>
              {pending.paymentProof?.status === "submitted"
                ? "Your receipt has been sent to the super admin. Your paid package starts after approval."
                : pending.paymentProof?.status === "rejected"
                  ? `Receipt needs attention: ${pending.paymentProof.rejectionReason}`
                  : "Your package is selected. Complete the bank transfer and upload your receipt."}
            </p>
          </div>
          <Link
            className="saas-button"
            to={`/institute/subscription/payment/${pending._id}`}
          >
            View payment <ArrowRightIcon />
          </Link>
        </div>
      )}
      <div className="saas-section-title">
        <span>YOUR NEXT STEP</span>
        <h2>
          {current?.effectiveStatus === "active"
            ? "Upgrade your package"
            : "Choose your annual package"}
        </h2>
      </div>
      <PaymentSteps />
      {blocked && data && (
        <p>
          {pending
            ? "Continue your existing payment above. You can change the package before submitting a receipt."
            : "Your package is stopped. Contact the super admin for assistance."}
        </p>
      )}
      {current?.effectiveStatus === "active" && (
        <p>
          Your current package stays usable while your upgrade payment is
          reviewed. Pay the full displayed price by bank transfer. Once
          approved, your upgrade starts a fresh 12-month term with new
          allowances. Unused credits and remaining time are not carried over or
          refunded. Your paid invoice will be emailed after approval.
        </p>
      )}
      <PlanCards plans={availablePlans} blocked={blocked} />
      {current?.effectiveStatus === "active" && availablePlans.length === 0 && (
        <p>
          You already have the highest available package for your current
          allowances.
        </p>
      )}
      {data && plans.length === 0 && (
        <p>No annual packages are available yet.</p>
      )}
      <details className="saas-current-plan">
        <summary>Payment history ({data?.payments.length || 0})</summary>
        {data?.payments.length ? (
          data.payments.map((payment) => (
            <div className="py-3 border-b space-y-3" key={payment._id}>
              <p>
                {date(payment.paidAt)} · {money(payment.amountMinor)} ·{" "}
                {payment.reference} · Approved
              </p>
              <ApprovedPaymentReceipt paymentId={payment._id} />
              <ReceiptDownload subscriptionId={payment.subscriptionId} />
            </div>
          ))
        ) : (
          <p className="mt-4">No approved payments yet.</p>
        )}
      </details>
    </section>
  );
}
export function PackageCheckout() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(null);
  useEffect(() => {
    let active = true;
    const keyName = `package-checkout:${planId}`;
    const requestKey = sessionStorage.getItem(keyName) || crypto.randomUUID();
    sessionStorage.setItem(keyName, requestKey);
    // Share the in-flight request across StrictMode effect replays.
    if (inFlight.current?.planId !== planId) {
      inFlight.current = {
        planId,
        promise: api.post(
          "/subscriptions/requests",
          { planId },
          { headers: { "Idempotency-Key": requestKey } },
        ),
      };
    }
    inFlight.current.promise
      .then((res) => {
        if (active) {
          sessionStorage.removeItem(keyName);
          navigate(`/institute/subscription/payment/${res.data.data._id}`, {
            replace: true,
          });
        }
      })
      .catch((failure) => {
        if (active) setError(message(failure));
      });
    return () => {
      active = false;
    };
  }, [planId, navigate, attempt]);
  return (
    <section className="saas-shell space-y-6">
      <Heading title="Preparing your payment">
        Your selected package will be reserved at its current price.
      </Heading>
      <PaymentSteps step={2} />
      {error ? (
        <div className="saas-error" role="alert">
          <p>{error}</p>
          <button
            className="saas-button mt-4"
            onClick={() => {
              inFlight.current = null;
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <p role="status">Opening your bank payment instructions…</p>
      )}
      <Link to="/institute/subscription" className="text-blue-600">
        Back to my packages
      </Link>
    </section>
  );
}
export function PackagePayment() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null),
    [payment, setPayment] = useState(null),
    [error, setError] = useState(""),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  async function refresh() {
    const response = await api.get("/subscriptions/mine");
    setSubscription(
      response.data.data.subscriptions.find(
        (sub) => sub._id === subscriptionId,
      ) || null,
    );
    setLoaded(true);
    setPayment(
      response.data.data.payments.find(
        (row) => row.subscriptionId === subscriptionId,
      ) || null,
    );
  }
  useEffect(() => {
    const update = () => refresh().catch((error) => setError(message(error)));
    update();
    const timer = setInterval(update, 15000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, [subscriptionId]);
  async function cancel() {
    setBusy(true);
    setError("");
    try {
      await api.post(`/subscriptions/${subscriptionId}/cancel`);
      sessionStorage.removeItem(`package-checkout:${subscription.planId}`);
      navigate("/institute/subscription");
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  const pending = subscription?.effectiveStatus === "pending";
  const review = subscription?.paymentProof?.status === "submitted";
  return (
    <section className="saas-shell space-y-6">
      <Link to="/institute/subscription" className="text-blue-600">
        ← My packages
      </Link>
      <Heading
        title={
          review
            ? "Your payment is being reviewed."
            : pending
              ? "Complete your bank payment."
              : "Your package status"
        }
      >
        Transfer the package amount, upload your receipt, and we will let you
        know once the super admin approves it.
      </Heading>
      <PaymentSteps
        step={review || subscription?.effectiveStatus === "active" ? 3 : 2}
      />
      {error && (
        <p role="alert" className="saas-error">
          {error}
        </p>
      )}
      {!loaded && !error && <p role="status">Loading payment details…</p>}
      {loaded && !subscription && (
        <p role="alert">This payment request could not be found.</p>
      )}
      {subscription && (
        <div className="payment-layout">
          <aside className="payment-summary">
            <span className="saas-eyebrow">YOUR SELECTED PACKAGE</span>
            <h2>{subscription.snapshot.name}</h2>
            <p className="saas-price">
              {money(subscription.snapshot.priceMinor)}
              <span> / year</span>
            </p>
            <p>
              {subscription.snapshot.limits.certificates} certificate credits
            </p>
            <p>
              {subscription.snapshot.limits.teachers} teachers ·{" "}
              {subscription.snapshot.limits.templates} templates
            </p>
            <hr />
            <p>
              Your 12-month term starts after approval. Selecting a package or
              uploading a receipt does not activate it.
            </p>
            {subscription.replacesSubscriptionId && (
              <p>
                This upgrade costs the full displayed annual price. Your current
                package remains usable until its expiry or upgrade approval.
                Approval replaces it with fresh allowances; unused credits and
                remaining time are not carried over or refunded.
              </p>
            )}
            <p>
              A PDF invoice marked PAID will be emailed after super admin
              approval and will remain available in your payment history.
            </p>
            {pending && !review && (
              <button
                disabled={busy}
                className="text-blue-600 underline"
                onClick={cancel}
              >
                {busy ? "Cancelling…" : "Change package"}
              </button>
            )}
          </aside>
          {pending ? (
            <ManualPayment
              key={subscription._id}
              subscription={subscription}
              refresh={refresh}
            />
          ) : (
            <div className="saas-current-plan space-y-4">
              <span className="saas-badge">{subscription.effectiveStatus}</span>
              <h2>
                {subscription.effectiveStatus === "active"
                  ? "Payment approved. You’re ready to go."
                  : "This request is no longer awaiting payment."}
              </h2>
              <p>
                Package term: {date(subscription.startsAt)} –{" "}
                {date(subscription.endsAt)}
              </p>
              {payment && <ApprovedPaymentReceipt paymentId={payment._id} />}
              <Link className="saas-button" to="/institute/dashboard">
                Go to dashboard <ArrowRightIcon />
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
