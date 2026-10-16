import { useState } from 'react';

export default function CertificateSharing({ code, shareUrl }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const url = shareUrl || `${window.location.origin}/certificate/${encodeURIComponent(code)}`;
  const text = 'View this certificate on CERTIVERXIA';
  const encoded = encodeURIComponent(url);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Certificate link copied.');
    } catch { setMessage('Copy the certificate link from the field below.'); }
  };
  const share = async () => {
    setMessage('');
    if (!navigator.share) return copy();
    setBusy(true);
    try {
      await navigator.share({ title: 'CERTIVERXIA certificate', text, url });
    } catch (error) {
      if (error.name !== 'AbortError') setMessage('Choose a social button or copy the certificate link below.');
    } finally { setBusy(false); }
  };
  return (
    <section className="my-6 rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-label="Share certificate">
      <h3 className="text-lg font-semibold text-blue-950">Share your certificate</h3>
      <p className="mt-1 text-sm text-slate-600">Choose a platform to share your certificate. Anyone opening the link can view the certificate on CERTIVERXIA and check its verification details.</p>
      <div className="my-4 flex flex-wrap gap-3">
        {[
          ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`],
          ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`],
          ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encoded}`],
          ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encoded}`],
        ].map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700">{label}</a>)}
        <button disabled={busy} onClick={share} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Share certificate</button>
      </div>
      <label htmlFor="certificate-share-link" className="text-sm font-medium">Certificate link</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input id="certificate-share-link" value={url} readOnly onFocus={event => event.target.select()} className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white p-3 text-sm" />
        <button onClick={copy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Copy link</button>
      </div>
      {message && <p role="status" className="mt-2 text-sm text-blue-900">{message}</p>}
    </section>
  );
}
