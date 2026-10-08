import { useState } from "react";
import api from "../../services/api";

export default function ApprovedPaymentReceipt({ paymentId }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function download() {
    setBusy(true);
    setError("");
    try {
      const response = await api.get(
        `/subscriptions/payments/${paymentId}/receipt`,
        { responseType: "blob" },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CERTIVERXIA-receipt-${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(
        "The approved payment receipt could not be downloaded. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className="saas-button"
        type="button"
        disabled={busy}
        onClick={download}
      >
        {busy ? "Preparing receipt…" : "Download approved receipt (PDF)"}
      </button>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
