import { useState } from 'react';

export default function CertificateSharing({ code }) {
  const [message, setMessage] = useState('');
  const url = `${window.location.origin}/verify/${encodeURIComponent(code)}`;
  const text = 'View this certificate on CERTIVERXIA';
  const encoded = encodeURIComponent(url);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Verification link copied.');
    } catch { setMessage('Copy the verification link from the field below.'); }
  };
  const share = async () => {
    try { await navigator.share({ title: 'CERTIVERXIA certificate', text, url }); }
    catch (error) { if (error.name !== 'AbortError') setMessage('Sharing is unavailable. Copy the link below.'); }
  };
  return (
    <section className="my-6 rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-label="Share certificate">
      <h3 className="text-lg font-semibold text-blue-950">Share your certificate</h3>
      <p className="mt-1 text-sm text-slate-600">Let others view your certificate and check its current status. Anyone with this link can see the certificate and its details.</p>
      <div className="my-4 flex flex-wrap gap-3">
        {[
          ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`],
          ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`],
          ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encoded}`],
          ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encoded}`],
        ].map(([label, href]) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700">{label}</a>)}
        {typeof navigator.share === 'function' && <button onClick={share} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">More sharing options</button>}
      </div>
      <label htmlFor="certificate-share-link" className="text-sm font-medium">Verification link</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input id="certificate-share-link" value={url} readOnly onFocus={event => event.target.select()} className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white p-3 text-sm" />
        <button onClick={copy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Copy link</button>
      </div>
      {message && <p role="status" className="mt-2 text-sm text-blue-900">{message}</p>}
    </section>
  );
}
