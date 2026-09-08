import { useEffect, useState } from 'react';
import axios from 'axios';

export default function TwoFactorSettings({ API_URL }) {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [password, setPassword] = useState('');
  const [challenge, setChallenge] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  useEffect(() => {
    let active = true;
    axios.get(`${API_URL}/auth/me`, { headers: headers() }).then(({ data }) => {
      if (active) { setEnabled(Boolean(data.data.twoFactorEnabled)); setEmail(data.data.email); setLoaded(true); }
    }).catch(() => { if (active) setMessage('Could not load 2FA settings. Reload this page to try again.'); });
    return () => { active = false; };
  }, [API_URL]);

  const submit = async e => {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (challenge) {
        const { data } = await axios.post(`${API_URL}/auth/2fa/verify`, { challengeToken: challenge, otp });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setEnabled(true); setChallenge(''); setOtp(''); setMessage('Two-factor authentication enabled. Future sign-ins require an email code.');
      } else {
        const { data } = await axios.put(`${API_URL}/auth/2fa/settings`, { enabled: !enabled, password }, { headers: headers() });
        setPassword('');
        if (data.requiresTwoFactor) { setChallenge(data.challengeToken); setMessage(data.message); }
        else { setEnabled(false); setMessage(data.message); }
      }
    } catch (error) { setMessage(error.response?.data?.message || 'Could not update two-factor authentication.'); }
    finally { setBusy(false); }
  };
  return <section className="border rounded-xl p-5 mb-6 max-w-lg space-y-3">
    <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
    <p className="text-sm text-gray-600">Protect your account with a code sent to {email || 'your registered email'} at sign-in.</p>
    <p className="text-sm font-medium">{loaded ? `Status: ${enabled ? 'Enabled' : 'Disabled'}` : 'Loading settings…'}</p>
    {message && <p role="status" className="text-sm">{message}</p>}
    {loaded && <form onSubmit={submit} className="space-y-3">
      {challenge ? <label className="block text-sm">Email verification code<input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} className="block border rounded p-2 w-full mt-1" /></label>
        : <label className="block text-sm">Current password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="block border rounded p-2 w-full mt-1" /></label>}
      <button disabled={busy} className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50">{busy ? 'Please wait…' : challenge ? 'Verify and Enable 2FA' : enabled ? 'Disable 2FA' : 'Enable 2FA'}</button>
      {challenge && <button type="button" disabled={busy} onClick={() => { setChallenge(''); setOtp(''); setMessage('You can request a new code after the configured resend cooldown.'); }} className="ml-3 text-blue-600">Start again</button>}
    </form>}
  </section>;
}
