import { useEffect, useState } from "react";
import api from "../../services/api";

const fields = [
  ["bankName", "Bank name", 120],
  ["accountHolder", "Account holder", 160],
  ["accountNumber", "Account number", 60],
  ["branch", "Bank branch", 120],
];
const values = (data) =>
  Object.fromEntries(fields.map(([key]) => [key, data?.[key] || ""]));

export default function BankDetailsEditor() {
  const [bank, setBank] = useState(values(null));
  const [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .get("/subscriptions/admin/bank-details")
      .then((response) => {
        if (active) {
          setBank(values(response.data.data));
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active)
          setError("Unable to load bank details. Reload this page to retry.");
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await api.put("/subscriptions/admin/bank-details", bank);
      setBank(values(response.data.data));
      setSaved(true);
    } catch (failure) {
      setError(
        failure.response?.data?.message ||
          "Bank details were not saved. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="saas-current-plan space-y-3"
      aria-label="Bank payment settings"
    >
      <h2 className="text-xl font-semibold">
        Bank account for manual payments
      </h2>
      <p>
        Update the account institutes should pay. Saved changes appear when they
        open or refresh payment instructions. Existing receipts and payments are
        preserved.
      </p>
      {!loaded && !error && <p>Loading bank details…</p>}
      {loaded && (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label, max]) => (
            <label key={key}>
              {label}
              <input
                required
                maxLength={max}
                className="saas-input"
                value={bank[key]}
                onChange={(event) => {
                  setBank((previous) => ({
                    ...previous,
                    [key]: event.target.value,
                  }));
                  setSaved(false);
                }}
              />
            </label>
          ))}
          <button disabled={busy} className="saas-button">
            {busy ? "Saving bank details…" : "Save bank details"}
          </button>
        </form>
      )}
      {saved && (
        <p role="status">Bank details saved. No server restart is needed.</p>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
