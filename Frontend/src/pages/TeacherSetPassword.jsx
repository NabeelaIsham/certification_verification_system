import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AuthLayout, FormField } from "../components/shared/PublicExperience";
const API_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export default function TeacherSetPassword() {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    // Keep the secret out of subsequent browser history entries and copied URLs.
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  }, []);
  const validLink = /^[a-f0-9]{64}$/.test(token);
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setError("Use uppercase, lowercase, and a number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await axios.post(`${API_URL}/teachers/password-setup`, {
        token,
        newPassword: password,
      });
      setPassword("");
      setConfirm("");
      setDone(true);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (failure) {
      setError(
        failure.response?.data?.message ||
          "Unable to set your password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthLayout>
      <header className="cvx-form-heading">
        <span className="cvx-kicker">YOUR TEACHER WORKSPACE</span>
        <h1>{done ? "You’re ready to sign in." : "Choose your password."}</h1>
        <p>
          {done
            ? "Your password has been saved. Sign in with your teacher email address and new password."
            : "Set a password for your CERTIVERXIA teacher account. This link expires after 24 hours and works once."}
        </p>
      </header>
      {done ? (
        <a href="/login" className="cvx-submit">
          Sign in to teacher dashboard
        </a>
      ) : validLink ? (
        <form className="cvx-form" onSubmit={submit}>
          <FormField
            id="teacher-new-password"
            label="New password"
            hint="10–128 characters, uppercase, lowercase, and a number."
          >
            <input
              id="teacher-new-password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-describedby="teacher-new-password-hint"
            />
          </FormField>
          <FormField id="teacher-confirm-password" label="Confirm password">
            <input
              id="teacher-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </FormField>
          {error && (
            <div role="alert" className="cvx-alert">
              {error}
            </div>
          )}
          <button type="submit" className="cvx-submit" disabled={busy}>
            {busy ? "Saving password…" : "Set my password"}
          </button>
        </form>
      ) : (
        <div role="alert" className="cvx-alert">
          This password link is missing or invalid. Open the link in your
          invitation email, or ask your institute admin to send a new one.
        </div>
      )}
      {!done && (
        <p className="cvx-form-switch">
          Already have access? <Link to="/login">Sign in</Link>
        </p>
      )}
    </AuthLayout>
  );
}
