import { useEffect, useState } from 'react';

export default function CertificateSharing({ code, imageUrl }) {
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setFile(null);
    if (imageUrl) fetch(imageUrl, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Image unavailable');
      return response.blob();
    }).then(blob => {
      if (!['image/jpeg', 'image/png'].includes(blob.type)) throw new Error('Invalid image');
      if (!controller.signal.aborted) setFile(new File([blob], `certificate-${code}.${blob.type === 'image/png' ? 'png' : 'jpg'}`, { type: blob.type }));
    }).catch(() => {});
    return () => controller.abort();
  }, [code, imageUrl]);
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
  const share = async (platform, href) => {
    setMessage('');
    setSelected({ platform, href });
    if (!file || !navigator.canShare?.({ files: [file] }) || !navigator.share) return;
    setBusy(true);
    try {
      await navigator.share({ files: [file], title: 'CERTIVERXIA certificate', text: `${text} ${url}` });
      setSelected(null);
    } catch (error) {
      if (error.name === 'AbortError') setSelected(null);
      else setMessage('Use the download option below to attach your certificate.');
    } finally { setBusy(false); }
  };
  const download = () => {
    const objectUrl = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = file.name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setMessage('Certificate downloaded. Attach it to your social media post.');
  };
  return (
    <section className="my-6 rounded-2xl border border-blue-100 bg-blue-50 p-5" aria-label="Share certificate">
      <h3 className="text-lg font-semibold text-blue-950">Share your certificate</h3>
      <p className="mt-1 text-sm text-slate-600">Share the certificate image with your achievement. On supported devices, choose your social app in the share menu. Otherwise, download the image and attach it to your post.</p>
      <div className="my-4 flex flex-wrap gap-3">
        {[
          ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`],
          ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`],
          ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encoded}`],
          ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encoded}`],
        ].map(([label, href]) => <button key={label} disabled={busy} onClick={() => share(label, href)} className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700">{label}</button>)}
        <button disabled={busy} onClick={() => share('your social app', null)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Share certificate image</button>
      </div>
      {selected && <div className="mb-4 rounded-lg bg-white p-4" role="region" aria-label="Share certificate image instructions">
        <p className="text-sm text-slate-700">Download your certificate, then attach the image to a post in {selected.platform}. Copy the verification link below to include it in your caption.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button disabled={!file} onClick={download} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">Download certificate image</button>
          {selected.href && <a href={selected.href} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-4 py-2 text-sm">Open {selected.platform}</a>}
        </div>
        {!file && <p role="status" className="mt-2 text-sm">The image is not ready. If it does not load, verify the certificate again.</p>}
      </div>}
      <label htmlFor="certificate-share-link" className="text-sm font-medium">Verification link</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input id="certificate-share-link" value={url} readOnly onFocus={event => event.target.select()} className="min-w-0 flex-1 rounded-lg border border-blue-200 bg-white p-3 text-sm" />
        <button onClick={copy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Copy link</button>
      </div>
      {message && <p role="status" className="mt-2 text-sm text-blue-900">{message}</p>}
    </section>
  );
}
