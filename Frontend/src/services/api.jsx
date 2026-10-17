import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({ baseURL, timeout: 30000, withCredentials: true, headers: { 'X-Client-Type': 'browser' } });

api.interceptors.request.use(config => {
  const base = new URL(baseURL, window.location.origin);
  const raw = config.url || '';
  if (/^(https?:)?\/\//i.test(raw)) {
    const target = new URL(raw, window.location.origin);
    if (target.origin !== base.origin) throw new Error('API requests must use the configured server.');
    config.url = target.href;
  } else if (raw === base.pathname || raw.startsWith(base.pathname.replace(/\/$/, '') + '/')) {
    config.url = raw.slice(base.pathname.replace(/\/$/, '').length) || '/';
  }
  // Never let stale browser storage or a component add a bearer credential.
  config.headers.delete('Authorization');
  if (config.data instanceof FormData) config.headers.delete('Content-Type');
  return config;
});

api.interceptors.response.use(response => response, async error => {
  const config = error.config;
  // Retry only explicitly opted-in reads, once. Never replay a mutation.
  if (config?.retry === true && !config._retried && ['get', 'head'].includes(config.method) &&
      !axios.isCancel(error) && (!error.response || [502, 503, 504].includes(error.response.status))) {
    config._retried = true;
    return api(config);
  }
  error.userMessage = error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'The request timed out. Please try again.' : 'Unable to complete the request.');
  const path = (config?.url || '').split('?')[0];
  const authRequest = /\/auth\/(login|2fa\/verify|me|logout)$/.test(path) || /\/teachers\/login$/.test(path);
  if (error.response?.status === 401 && !authRequest) {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('session-expired'));
  }
  return Promise.reject(error);
});

export default api;
