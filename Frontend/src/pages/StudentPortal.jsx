import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudentPortal() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();
  const lookup = event => {
    event.preventDefault();
    if (code.trim()) navigate('/verify/' + encodeURIComponent(code.trim()));
  };
  return <div className="min-h-screen bg-gray-50 px-4 py-12">
    <section className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Certiverxia / Students</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900">Verify and share your certificate</h1>
      <p className="mt-4 text-gray-600">Enter the certificate code provided by your institute. Open the verification result to share it on social media.</p>
      <form onSubmit={lookup} className="mt-6 space-y-4">
        <label htmlFor="student-certificate-code" className="block font-medium">Certificate code</label>
        <input id="student-certificate-code" required value={code} onChange={event => setCode(event.target.value)} className="w-full rounded-lg border border-gray-300 p-3" autoComplete="off" />
        <button className="w-full rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white">Find certificate</button>
      </form>
      <p className="mt-4 text-sm text-gray-500">To download a private certificate file, use the controlled share link supplied by your institute.</p>
    </section>
  </div>;
}
