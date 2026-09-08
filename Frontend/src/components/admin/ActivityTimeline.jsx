import { useEffect, useState } from 'react';
import api from '../../services/api';

const actions = {
  APPROVE_INSTITUTE: ['Institute approved', 'bg-green-100 text-green-700', '✓'],
  REJECT_INSTITUTE: ['Institute rejected', 'bg-red-100 text-red-700', '×'],
  SUSPEND_INSTITUTE: ['Institute suspended', 'bg-orange-100 text-orange-700', '!'],
  ACTIVATE_INSTITUTE: ['Institute activated', 'bg-green-100 text-green-700', '✓'],
  ACTIVATE_USER: ['User activated', 'bg-green-100 text-green-700', '✓'],
  SUSPEND_USER: ['User suspended', 'bg-orange-100 text-orange-700', '!'],
  RESET_USER_PASSWORD: ['User password reset', 'bg-blue-100 text-blue-700', '↻'],
  REVOKE_CERTIFICATE: ['Certificate revoked', 'bg-red-100 text-red-700', '×'],
  UPDATE_SETTINGS: ['System settings updated', 'bg-purple-100 text-purple-700', '⚙'],
  RESET_SETTINGS: ['System settings reset', 'bg-purple-100 text-purple-700', '↻'],
  TEST_EMAIL: ['Test email sent', 'bg-blue-100 text-blue-700', '✉'],
  UNAUTHORIZED_ACCESS_ATTEMPT: ['Unauthorized access attempt', 'bg-red-100 text-red-700', '!']
};

const describe = (details = {}) => {
  if (!details) return '';
  for (const key of ['instituteName', 'targetUserEmail', 'certificateCode', 'testEmailSentTo']) {
    if (typeof details[key] === 'string') return details[key];
  }
  if (Array.isArray(details.settingsUpdated)) {
    return details.settingsUpdated.filter(value => ['general', 'security', 'email', 'verification', 'certificate'].includes(value))
      .map(value => value.charAt(0).toUpperCase() + value.slice(1)).join(', ');
  }
  return '';
};

export default function ActivityTimeline({ onViewAll }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchActivities = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/admin/activities', { params: { page: 1, limit: 8 }, signal: controller.signal });
        if (!data.success || !Array.isArray(data.data)) throw new Error('Invalid activity response');
        if (!controller.signal.aborted) setActivities(data.data);
      } catch {
        if (!controller.signal.aborted) setError('Unable to load recent activity. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchActivities();
    return () => controller.abort();
  }, [revision]);

  return (
    <section aria-labelledby="activity-timeline-heading" className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h3 id="activity-timeline-heading" className="text-lg font-semibold text-gray-900">Recent Activity Timeline</h3>
          <p className="text-sm text-gray-500 mt-1">Latest recorded system activity, newest first.</p>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <button type="button" disabled={loading} onClick={() => setRevision(value => value + 1)} className="text-purple-600 hover:text-purple-800 disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button>
          {onViewAll && <button type="button" onClick={onViewAll} className="text-purple-600 hover:text-purple-800">View all activity →</button>}
        </div>
      </div>
      {loading ? <p role="status" className="text-gray-500 py-8 text-center">Loading recent activity…</p>
        : error ? <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error} <button type="button" onClick={() => setRevision(value => value + 1)} className="font-medium underline">Retry</button></div>
          : activities.length === 0 ? <p className="text-gray-500 text-center py-8">No activity recorded yet. New system actions will appear here.</p>
            : <ol className="space-y-0">
              {activities.map((activity, index) => {
                const [label, color, icon] = actions[activity.action] || [String(activity.action || 'System activity').replace(/_/g, ' ').toLowerCase(), 'bg-gray-100 text-gray-600', '•'];
                const date = new Date(activity.timestamp);
                const validDate = Number.isFinite(date.getTime());
                const detail = describe(activity.details);
                return <li key={activity._id} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < activities.length - 1 && <span aria-hidden="true" className="absolute left-4 top-8 bottom-0 w-px bg-gray-200" />}
                  <span aria-hidden="true" className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${color}`}>{icon}</span>
                  <div className="min-w-0 flex-1 sm:flex sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      {detail && <p className="mt-1 text-sm text-gray-600 break-words">{detail}</p>}
                      <p className="mt-1 text-xs text-gray-500 break-words">By {activity.user?.email || activity.userEmail || 'System'}</p>
                    </div>
                    <time dateTime={validDate ? date.toISOString() : undefined} className="mt-1 block shrink-0 text-xs text-gray-500 sm:mt-0">{validDate ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Time unavailable'}</time>
                  </div>
                </li>;
              })}
            </ol>}
    </section>
  );
}
