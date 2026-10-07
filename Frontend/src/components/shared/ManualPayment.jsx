import { useEffect, useState } from 'react';
import api from '../../services/api';

export function ReceiptDownload({ subscriptionId }) {
  const [error, setError] = useState('');
  async function download() {
    setError('');
    try {
      const response = await api.get(`/subscriptions/${subscriptionId}/receipt`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = 'payment-receipt.jpg'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError('Receipt could not be downloaded. Please retry.'); }
  }
  return <div><button type="button" className="saas-button" onClick={download}>Download receipt</button>{error && <p role="alert">{error}</p>}</div>;
}

export function ManualPayment({ subscription, refresh }) {
  const [bank, setBank] = useState(null), [loaded, setLoaded] = useState(false);
  const [bankRefresh, setBankRefresh] = useState(0);
  const [transactionNumber, setTransactionNumber] = useState(''), [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setBank(null); setLoaded(false);
    api.get('/subscriptions/bank-details').then(res => { if (active) { setBank(res.data.data); setLoaded(true); } })
      .catch(() => { if (active) setError('Bank details could not be loaded. Please refresh before paying.'); });
    return () => { active = false; };
  }, [bankRefresh]);
  async function submit(event) {
    event.preventDefault(); setError('');
    if (!receipt || !['image/jpeg', 'image/png'].includes(receipt.type) || receipt.size > 5 * 1024 * 1024) {
      setError('Choose a JPEG or PNG receipt up to 5 MB.'); return;
    }
    setBusy(true);
    try {
      const body = new FormData(); body.append('transactionNumber', transactionNumber.trim()); body.append('receipt', receipt);
      await api.post(`/subscriptions/${subscription._id}/payment-proof`, body);
      await refresh();
    } catch (failure) { setError(failure.response?.data?.message || 'Receipt upload failed. Please refresh and retry.'); }
    finally { setBusy(false); }
  }
  const proof = subscription.paymentProof;
  return <section className="saas-current-plan space-y-4" aria-label="Manual bank payment">
    <h2 className="text-xl font-semibold">Pay by bank transfer</h2>
    <button type="button" className="saas-button" onClick={() => { setError(''); setBankRefresh(value => value + 1); }}>Refresh bank details</button>
    <p>Amount: {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(subscription.snapshot.priceMinor / 100)}</p>
    <label className="block">Payment reference (package)<input className="saas-input" readOnly value={subscription.snapshot.name} /></label>
    <p>Use this package name as the reference on your bank transfer receipt. Enter the bank's transaction number separately below.</p>
    {bank ? <dl className="grid gap-3 sm:grid-cols-2">{[['Bank', bank.bankName], ['Account holder', bank.accountHolder], ['Account number', bank.accountNumber], ['Branch', bank.branch]].map(([label, value]) => <div key={label}><dt className="text-sm text-gray-600">{label}</dt><dd className="break-words font-semibold">{value}</dd></div>)}</dl>
      : <p>{loaded ? 'Bank details are not configured. Contact info@certiverxia.com before making a payment.' : 'Loading bank details…'}</p>}
    {proof?.status === 'submitted' && <p role="status">Receipt submitted. Awaiting manual payment approval. No credits have been activated.</p>}
    {proof?.status === 'rejected' && <p role="status">Receipt rejected: {proof.rejectionReason}. Correct the details and upload your receipt again.</p>}
    {proof?.transactionNumber && <><p>Transaction number: {proof.transactionNumber}</p><ReceiptDownload subscriptionId={subscription._id} /></>}
    {bank && !['submitted', 'approved'].includes(proof?.status) && <form onSubmit={submit} className="space-y-3">
      <label className="block">Bank transaction number<input required minLength={3} maxLength={100} className="saas-input" value={transactionNumber} onChange={event => setTransactionNumber(event.target.value)} /></label>
      <label className="block">Receipt image (JPEG or PNG, up to 5 MB)<input type="file" required accept="image/jpeg,image/png" className="block max-w-full" onChange={event => setReceipt(event.target.files?.[0] || null)} /></label>
      <button disabled={busy} className="saas-button">{busy ? 'Uploading…' : 'Submit payment receipt'}</button>
    </form>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}

export function ReceiptReview({ sub, act, busy }) {
  const [reason, setReason] = useState('');
  if (!sub.paymentProof?.transactionNumber) return <p>No payment receipt submitted. Activation is unavailable.</p>;
  return <section className="space-y-3">
    <p>Receipt reference: {sub.paymentProof.packageReference} · Transaction: {sub.paymentProof.transactionNumber} · {sub.paymentProof.status}</p>
    <ReceiptDownload subscriptionId={sub._id} />
    {sub.status === 'pending' && sub.paymentProof.status === 'submitted' && <form onSubmit={event => { event.preventDefault(); act(`/subscriptions/admin/subscriptions/${sub._id}/reject-receipt`, { reason, receiptVersion: sub.paymentProof.receiptVersion }); }} className="space-y-2">
      <label>Receipt rejection reason<input required minLength={3} maxLength={500} className="saas-input" value={reason} onChange={event => setReason(event.target.value)} /></label>
      <button disabled={busy} className="saas-button">Reject receipt</button>
    </form>}
  </section>;
}
