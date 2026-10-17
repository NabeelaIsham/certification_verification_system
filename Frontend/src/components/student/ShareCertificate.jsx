import { useId, useState } from 'react';

const ShareCertificate = ({ certificateCode }) => {
  const inputId = useId();
  const [message, setMessage] = useState('');
  if (!certificateCode) return null;
  const url = 'https://certiverxia.com/verify/' + encodeURIComponent(certificateCode);
  const text = 'View my certificate on Certiverxia';
  const options = [
    ['LinkedIn', 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url)],
    ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)],
    ['WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url)],
    ['X', 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text)]
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Verification link copied.');
    } catch {
      setMessage('Copy is unavailable. Select the link above and copy it manually.');
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: 'Certiverxia certificate', text, url });
    } catch (error) {
      if (error.name !== 'AbortError') setMessage('Sharing is unavailable. Use a social button or copy the link.');
    }
  };
  return (
    <section aria-label="Share certificate" className="my-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-emerald-950">Share your achievement</h2>
      <p className="mt-2 text-sm text-gray-700">Share the public verification page. Anyone with the link can see its public certificate details; private files stay protected.</p>
      <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map(([name, href]) => <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-emerald-300 bg-white px-4 py-3 text-center font-medium text-emerald-900 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2">{name}</a>)}
      </div>
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">Public verification link</label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input id={inputId} readOnly value={url} onFocus={event => event.target.select()} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white p-3 text-sm" />
        <button type="button" onClick={copy} className="rounded-lg bg-emerald-800 px-4 py-3 text-white">Copy link</button>
      </div>
      {typeof navigator.share === 'function' && <button type="button" onClick={share} className="mt-3 rounded-lg border border-emerald-700 px-4 py-2 text-emerald-900">Share with an app</button>}
      <p role="status" className="mt-2 text-sm text-gray-700">{message}</p>
    </section>
  );
};
export default ShareCertificate;
