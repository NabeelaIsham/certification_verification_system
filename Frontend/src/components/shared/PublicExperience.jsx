import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckBadgeIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import "./PublicExperience.css";

export function AuthLayout({ children, registration = false }) {
  return (
    <section
      className={`cvx-public cvx-auth ${registration ? "cvx-auth-register" : ""}`}
    >
      <div className="cvx-auth-layout">
        <aside className="cvx-auth-story">
          <div className="cvx-story-orbit" aria-hidden="true" />
          <div className="cvx-story-content">
            <span className="cvx-kicker">
              <span /> CREDENTIALS. WITH CONFIDENCE.
            </span>
            <h2>
              {registration ? (
                <>
                  Every achievement <br />
                  deserves to be <br />
                  <em>recognised.</em>
                </>
              ) : (
                <>
                  Your work. <br />
                  Their achievements. <br />
                  <em>One trusted place.</em>
                </>
              )}
            </h2>
            <p>
              {registration
                ? "Give your institute a dedicated space to issue, manage, and verify certificates."
                : "Welcome to your space for managing credentials and celebrating the people behind them."}
            </p>
            <div className="cvx-certificate-art" aria-hidden="true">
              <div className="cvx-art-top">
                <img src="/favicon.svg" alt="" />
                <span>CERTIVERXIA</span>
                <span>01 / 03</span>
              </div>
              <div className="cvx-art-label">AN ACHIEVEMENT WORTH SHARING</div>
              <div className="cvx-art-title">Make it official.</div>
              <div className="cvx-art-lines">
                <i />
                <i />
              </div>
              <div className="cvx-art-bottom">
                <span>ISSUE · MANAGE · VERIFY</span>
                <CheckBadgeIcon />
              </div>
              <div className="cvx-art-seal">
                <ShieldCheckIcon />
                <div>
                  Designed for trust
                  <small>From your institute to the world</small>
                </div>
              </div>
            </div>
            <div className="cvx-story-features">
              <span>
                <DocumentCheckIcon /> Verifiable credentials
              </span>
              <span>
                <LockClosedIcon /> Controlled sharing
              </span>
            </div>
          </div>
          <div className="cvx-story-bottom">
            Built for educators. Made for achievement.<span>✦</span>
          </div>
        </aside>
        <div className="cvx-auth-form-panel">{children}</div>
      </div>
      <div className="cvx-public-bottom">
        <span>Credentials that connect achievement with trust.</span>
        <Link to="/verify">
          Just checking a certificate? Verify here <ArrowRightIcon />
        </Link>
      </div>
    </section>
  );
}

export function FormField({ label, id, error, hint, children }) {
  return (
    <div className="cvx-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="cvx-field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="cvx-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
