import { useState } from "react";
import axios from "axios";

export default function TeacherPasswordReset({ teacher, API_URL, onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const send = async (direct) => {
    if (busy) return;
    if (direct && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await axios.post(
        `${API_URL}/teachers/${teacher._id}/${direct ? "reset-password" : "password-link"}`,
        direct ? { newPassword: password } : {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setMessage(response.data.message);
      setPassword("");
      setConfirm("");
    } catch (failure) {
      setError(
        failure.response?.data?.message ||
          "Unable to reset access. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-reset-title"
        className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 id="teacher-reset-title" className="text-xl font-semibold">
            Reset teacher access
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-sm text-blue-600"
          >
            Close
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-4 break-all">
          {teacher.firstName} {teacher.lastName} · {teacher.email}
        </p>
        <p className="text-sm text-gray-600 mb-3">
          Send a one-time link so the teacher can choose a password. Sending a
          new link replaces any previous one.
        </p>
        <button
          className="cvx-submit"
          type="button"
          disabled={busy || !teacher.isActive}
          onClick={() => send(false)}
        >
          {busy ? "Please wait…" : "Send reset link"}
        </button>
        {!teacher.isActive && (
          <p className="text-sm text-amber-700 mt-2">
            The account must be active to use an email setup link.
          </p>
        )}
        <details className="mt-5 border-t pt-4">
          <summary className="text-sm font-semibold cursor-pointer">
            Set a new password directly
          </summary>
          <p className="text-xs text-gray-600 mt-3 mb-4">
            Use this if email recovery is unavailable. Existing sessions will be
            signed out. Share the new password securely; it is not emailed.
            Resetting does not activate a stopped account.
          </p>
          <form
            className="cvx-form"
            onSubmit={(event) => {
              event.preventDefault();
              send(true);
            }}
          >
            <div className="cvx-field">
              <label htmlFor="admin-teacher-password">
                New teacher password
              </label>
              <input
                id="admin-teacher-password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                maxLength={128}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="cvx-field-hint">
                10–128 characters with uppercase, lowercase, and a number.
              </p>
            </div>
            <div className="cvx-field">
              <label htmlFor="admin-teacher-confirm">Confirm password</label>
              <input
                id="admin-teacher-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
            <button className="cvx-submit" disabled={busy}>
              Set new password
            </button>
          </form>
        </details>
        {message && (
          <p
            role="status"
            className="mt-4 rounded-lg p-3 bg-green-50 text-green-800 text-sm"
          >
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="cvx-alert mt-4">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
