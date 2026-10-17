import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractCertificateCode } from './verification/verificationData';

export default function StudentPortal() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const lookup = event => {
    event.preventDefault();
    const code = extractCertificateCode(input);
    if (!/^[A-Z0-9][A-Z0-9-]{2,99}$/.test(code)) {
      setError('Enter a valid certificate code or certificate link.');
      return;
    }
    navigate(`/verify/${encodeURIComponent(code)}`);
  };
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <section className="mx-auto max-w-xl rounded-2xl border border-blue-100 bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-3xl font-bold text-gray-900">Find your certificate</h1>
        <p className="mt-4 text-gray-600">Enter the code or link supplied by your institute to view, verify and share your certificate.</p>
        <form onSubmit={lookup} className="mt-6 space-y-4">
          <label htmlFor="student-certificate-code" className="block font-medium">Certificate code or link</label>
          <input id="student-certificate-code" required value={input} onChange={event => { setInput(event.target.value); setError(''); }} className="w-full rounded-lg border border-gray-300 p-3" autoComplete="off" aria-describedby={error ? 'student-certificate-error' : undefined} aria-invalid={Boolean(error)} />
          {error && <p id="student-certificate-error" role="alert" className="text-red-700">{error}</p>}
          <button className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white">Find certificate</button>
        </form>
      </section>
    </div>
  );
}
