import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowUpRightIcon, CheckCircleIcon, ShieldCheckIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import './Subscriptions.css';

const money = value => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value / 100);
const date = value => value ? new Date(value).toLocaleDateString() : 'Not activated';
const message = error => error.response?.data?.message || 'Unable to complete the request. Please retry.';
const button = 'saas-button';
const input = 'saas-input';

function PageHeading({ eyebrow, title, description }) {
  return <header className="saas-heading"><div className="saas-eyebrow"><ShieldCheckIcon aria-hidden="true" />{eyebrow}</div><h1>{title}</h1><p>{description}</p></header>;
}
function Metric({ label, value, detail }) {
  return <div className="saas-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function PlanCards({ plans, select, disabled }) {
  return <div className="saas-plans">{plans.map(plan => <article key={plan._id} className={`saas-plan ${plan.recommended ? 'saas-plan-featured' : ''}`}>
    <div className="saas-plan-top"><Squares2X2Icon aria-hidden="true" />{plan.recommended && <span className="saas-badge">Most popular</span>}</div><h2>{plan.name}</h2>
    <p className="saas-plan-caption">An annual home for your institute's achievements.</p>
    <p className="saas-price">{money(plan.priceMinor)} <span>/ year</span></p>
    <ul className="saas-features"><li><CheckCircleIcon aria-hidden="true" />{plan.limits.certificates} certificate credits</li><li><CheckCircleIcon aria-hidden="true" />{plan.limits.teachers} teachers</li><li><CheckCircleIcon aria-hidden="true" />{plan.limits.templates} templates</li>
      <li>Bulk issuance: {plan.features?.bulkCertificateIssue ? 'Included' : 'Not included'}</li><li>Secure sharing: {plan.features?.secureSharing ? 'Included' : 'Not included'}</li></ul>
    {select ? <button className={button} disabled={disabled} onClick={() => select(plan._id)}>Request {plan.name}<ArrowUpRightIcon aria-hidden="true" /></button> : <Link className={button} to="/institute/subscription">Choose package<ArrowUpRightIcon aria-hidden="true" /></Link>}
  </article>)}</div>;
}
export function Pricing() {
  const [plans, setPlans] = useState(null), [error, setError] = useState('');
  useEffect(() => { api.get('/subscriptions/plans').then(res => setPlans(res.data.data)).catch(error => setError(message(error))); }, []);
  return <section className="saas-shell saas-pricing space-y-6"><PageHeading eyebrow="Certiverxia / PLANS" title="Big achievements. Simple plans." description="Give every achievement a credential people can trust. Choose the annual package that fits your institute." /><div className="saas-term"><span className="saas-dot" /> Annual packages · 12 months of access</div>
    <p>Choose a package after institute verification. Activation follows manual bank-payment review.</p>{error && <p role="alert">{error}</p>}
    {plans ? <PlanCards plans={plans} /> : !error && <p>Loading packages…</p>}{plans?.length === 0 && <p>Packages are not available yet.</p>}
    <div className="saas-section-title"><span>GOOD TO KNOW</span><h2>How subscriptions work</h2></div><p>Plans last 12 months from activation. Unused credits expire with the term. No trial or automatic renewal.</p>
    <p>Expiry stops new issuance. Existing verification and revocation remain available. Contact the administrator for payment instructions and applicable billing terms before transferring funds.</p>
  </section>;
}
export function InstituteSubscription() {
  const [data, setData] = useState(null), [plans, setPlans] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const keys = useRef({});
  async function refresh() { const [mine, catalogue] = await Promise.all([api.get('/subscriptions/mine'), api.get('/subscriptions/plans')]); setData(mine.data.data); setPlans(catalogue.data.data); }
  useEffect(() => { refresh().catch(error => setError(message(error))); }, []);
  async function select(planId) {
    setBusy(true); setError(''); keys.current[planId] ||= crypto.randomUUID();
    try { await api.post('/subscriptions/requests', { planId }, { headers: { 'Idempotency-Key': keys.current[planId] } }); await refresh(); delete keys.current[planId]; }
    catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  const current = data?.subscriptions[0], percent = current?.allocated ? Math.floor(100 * current.consumed / current.allocated) : 0;
  const days = current?.endsAt ? Math.ceil((new Date(current.endsAt) - new Date()) / 86400000) : null;
  const outstanding = data?.subscriptions.some(sub => ['pending', 'active', 'suspended'].includes(sub.effectiveStatus));
  function download(payment) {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ record: 'Manual payment acknowledgement', ...payment }, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `payment-${payment._id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="saas-shell space-y-6"><PageHeading eyebrow="YOUR INSTITUTE / MEMBERSHIP" title="Subscription and usage" description="Your plan, your allowance, and your next milestone. Everything in one place." />{error && <p role="alert" className="text-red-700">{error}</p>}
    {data && <div className="saas-metrics"><Metric label="Available credits" value={current?.remaining ?? 0} detail="Ready for your next achievement" /><Metric label="Certificates issued" value={current?.consumed ?? 0} detail={`${current?.reserved ?? 0} currently processing`} /><Metric label="Teachers" value={`${data.teachers} / ${current?.snapshot.limits.teachers ?? '—'}`} detail="Institute teaching team" /><Metric label="Templates" value={`${data.templates} / ${current?.snapshot.limits.templates ?? '—'}`} detail="Your certificate designs" /></div>}
    {!data && !error && <p>Loading subscription…</p>}{current && <article className="saas-current-plan space-y-2"><span className="saas-eyebrow">CURRENT PLAN</span><h2 className="text-xl">{current.snapshot.name}</h2><div className="saas-progress" role="progressbar" aria-label="Certificate allowance used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, percent)}><span style={{ width: `${Math.min(100, percent)}%` }} /></div>
      <p>Status: {current.effectiveStatus}</p><p>{current.consumed} / {current.allocated} certificates issued · {current.reserved} processing · {current.remaining} available</p>
      <p>Starts: {date(current.startsAt)} · Expires: {date(current.endsAt)}</p><p>Teachers: {data.teachers}/{current.snapshot.limits.teachers} · Templates: {data.templates}/{current.snapshot.limits.templates}</p>
      {percent >= 75 && <p role="status">{percent >= 100 ? 'Certificate allowance exhausted.' : `${percent >= 90 ? '90%' : '75%'} usage threshold reached.`}</p>}
      {days !== null && days <= 30 && <p role="status">{days <= 0 ? 'Subscription expired. Request renewal to continue issuing.' : `${days <= 7 ? 'Renew soon: ' : ''}${days} days until expiry.`}</p>}
      {current.effectiveStatus === 'pending' && <p>Request saved. Contact the administrator for bank-payment instructions. Activation follows payment verification.</p>}
    </article>}
    <h2 className="text-xl">Packages and renewal</h2>{outstanding && <p>Contact the administrator about an existing pending, active or suspended subscription. A new request is available after expiry.</p>}
    <PlanCards plans={plans} select={select} disabled={busy || outstanding || !data} />
    <h2 className="text-xl">Payment history</h2>{data?.payments.length === 0 && <p>No recorded payments.</p>}
    {data?.payments.map(payment => <div key={payment._id} className="flex flex-wrap gap-4 border-b py-3"><span>{date(payment.paidAt)} · {money(payment.amountMinor)} · {payment.reference}</span><button className="text-blue-700 underline" onClick={() => download(payment)}>Download payment record</button></div>)}
    <h2 className="text-xl">Recent credit activity</h2><ul>{data?.usage.map(entry => <li key={entry._id}>{date(entry.createdAt)} · {entry.event.replaceAll('_', ' ')} · {entry.units}</li>)}</ul>
  </section>;
}
function PlanEditor({ plan, save, busy }) {
  const [value, setValue] = useState(() => plan || { name: '', priceMinor: 0, limits: { certificates: 100, teachers: 2, templates: 2 }, features: { bulkCertificateIssue: true, secureSharing: true }, active: false, recommended: false, displayOrder: 0 });
  const change = (key, content) => setValue(previous => ({ ...previous, [key]: content }));
  return <form className="grid gap-3 rounded border p-4 md:grid-cols-2" onSubmit={event => { event.preventDefault(); save(value); }}>
    <label>Plan name<input required maxLength={100} className={input} value={value.name} onChange={event => change('name', event.target.value)} /></label>
    <label>Annual price (LKR)<input type="number" min="0" step="0.01" required className={input} value={value.priceMinor / 100} onChange={event => change('priceMinor', Math.round(Number(event.target.value) * 100))} /></label>
    {['certificates', 'teachers', 'templates'].map(kind => <label key={kind}>{kind}<input type="number" min={kind === 'certificates' ? 1 : 0} step="1" required className={input} value={value.limits[kind]} onChange={event => change('limits', { ...value.limits, [kind]: Number(event.target.value) })} /></label>)}
    <label>Display order<input type="number" step="1" className={input} value={value.displayOrder} onChange={event => change('displayOrder', Number(event.target.value))} /></label>
    {['active', 'recommended'].map(key => <label key={key}><input type="checkbox" checked={value[key]} onChange={event => change(key, event.target.checked)} /> {key}</label>)}
    {['bulkCertificateIssue', 'secureSharing'].map(key => <label key={key}><input type="checkbox" checked={value.features[key]} onChange={event => change('features', { ...value.features, [key]: event.target.checked })} /> {key === 'bulkCertificateIssue' ? 'Bulk certificate issuance' : 'Secure sharing'}</label>)}
    <button className={button} disabled={busy}>Save plan</button>
  </form>;
}
function SubscriptionActions({ sub, act, busy }) {
  const [reference, setReference] = useState(''), [amount, setAmount] = useState(''), [reason, setReason] = useState('');
  const expired = sub.endsAt && new Date(sub.endsAt) <= new Date();
  return <div className="space-y-3">{sub.status === 'pending' && <form className="space-y-2" onSubmit={event => { event.preventDefault(); act(`/subscriptions/admin/subscriptions/${sub._id}/activate`, { reference, amountMinor: Math.round(Number(amount) * 100) }); }}>
    <label>Bank reference<input required minLength={3} maxLength={100} className={input} value={reference} onChange={event => setReference(event.target.value)} /></label>
    <label>Amount received (LKR)<input required type="number" min="0" step="0.01" className={input} value={amount} onChange={event => setAmount(event.target.value)} /></label>
    <label className="block"><input type="checkbox" required /> I verified this bank payment.</label><button className={button} disabled={busy}>Record payment and activate</button>
  </form>}{['pending', 'active', 'suspended'].includes(sub.status) && <form className="flex gap-2" onSubmit={event => { event.preventDefault(); act(`/subscriptions/admin/subscriptions/${sub._id}/status`, { status: sub.status === 'pending' ? 'cancelled' : expired ? 'expired' : sub.status === 'active' ? 'suspended' : 'active', reason }); }}>
    <input aria-label="Reason for status change" placeholder="Reason for status change" required minLength={3} maxLength={500} className={input} value={reason} onChange={event => setReason(event.target.value)} />
    <button className={button} disabled={busy}>{sub.status === 'pending' ? 'Cancel request' : expired ? 'Close expired term' : sub.status === 'active' ? 'Suspend' : 'Resume'}</button>
  </form>}</div>;
}
export function AdminSubscriptions() {
  const [plans, setPlans] = useState([]), [subscriptions, setSubscriptions] = useState([]), [events, setEvents] = useState([]), [editing, setEditing] = useState(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  async function refresh() {
    const responses = await Promise.all(['/admin/plans', '/admin/subscriptions', '/admin/events'].map(path => api.get(`/subscriptions${path}`)));
    setPlans(responses[0].data.data); setSubscriptions(responses[1].data.data); setEvents(responses[2].data.data); setLoaded(true);
  }
  useEffect(() => { refresh().catch(error => setError(message(error))); }, []);
  async function act(url, body, method = 'post') {
    setBusy(true); setError('');
    try { await api[method](url, body); await refresh(); setEditing(null); } catch (error) { setError(message(error)); } finally { setBusy(false); }
  }
  const save = value => act(`/subscriptions/admin/plans${value._id ? `/${value._id}` : ''}`, Object.fromEntries(['name', 'priceMinor', 'limits', 'features', 'active', 'recommended', 'displayOrder'].map(key => [key, value[key]])), value._id ? 'put' : 'post');
  return <section className="saas-shell saas-admin space-y-6"><PageHeading eyebrow="ADMIN WORKSPACE / SUBSCRIPTIONS" title="Plans and manual subscriptions" description="Shape your packages, review payments, and keep every institute moving forward." />{error && <p role="alert" className="text-red-700">{error}</p>}{!loaded && !error && <p>Loading subscriptions…</p>}
    {loaded && <div className="saas-metrics"><Metric label="Published plans" value={plans.filter(plan => plan.active).length} detail="Available in your catalogue" /><Metric label="Pending review" value={subscriptions.filter(sub => sub.status === 'pending').length} detail="Awaiting payment verification" /><Metric label="Active subscriptions" value={subscriptions.filter(sub => sub.status === 'active' && new Date(sub.endsAt) > new Date()).length} detail="Within the latest 200 records" /><Metric label="Suspended" value={subscriptions.filter(sub => sub.status === 'suspended').length} detail="Accounts requiring your attention" /></div>}
    {loaded && !plans.length && <button className={button} disabled={busy} onClick={() => act('/subscriptions/admin/plans/bootstrap', {})}>Create the three draft packages</button>}
    <div className="flex flex-wrap gap-3">{plans.map(plan => <button className="rounded border p-3" key={plan._id} onClick={() => setEditing(plan)}>{plan.name} · {money(plan.priceMinor)} · {plan.active ? 'Active' : 'Hidden'}</button>)}<button className={button} onClick={() => setEditing({})}>New plan</button></div>
    {editing && <PlanEditor key={editing._id || 'new'} plan={editing._id ? editing : null} save={save} busy={busy} />}<p>Plan edits affect future requests. Purchased prices and limits remain unchanged.</p>
    <h2 className="text-xl">Subscriptions (latest 200)</h2>{subscriptions.map(sub => <article key={sub._id} className="space-y-3 rounded border bg-white p-5"><h3 className="font-semibold">{sub.instituteId?.instituteName || sub.instituteId?._id || 'Institute unavailable'} · {sub.snapshot.name}</h3>
      <p>{sub.status === 'active' && new Date(sub.endsAt) <= new Date() ? 'expired' : sub.status} · {money(sub.snapshot.priceMinor)} · {sub.consumed}/{sub.allocated} consumed · {sub.reserved} reserved · Expires {date(sub.endsAt)}</p><SubscriptionActions sub={sub} act={act} busy={busy} />
    </article>)}<h2 className="text-xl">Recent audit events</h2><ul>{events.map(event => <li key={event._id}>{date(event.createdAt)} · {event.event.replaceAll('_', ' ')}</li>)}</ul>
  </section>;
}
