import { afterEach, expect, it, vi } from 'vitest';
import api from '../src/services/api';

const adapter = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = adapter; localStorage.clear(); });
const response = config => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config });

it('uses cookie credentials and one base URL without stale bearer headers', async () => {
  localStorage.setItem('token', 'old-browser-token');
  api.defaults.adapter = vi.fn(async config => {
    expect(config.withCredentials).toBe(true);
    expect(config.timeout).toBe(30000);
    expect(config.headers.get('X-Client-Type')).toBe('browser');
    expect(config.headers.has('Authorization')).toBe(false);
    expect(api.getUri(config)).toBe('/api/courses');
    return response(config);
  });
  await api.get('/api/courses', { headers: { Authorization: 'Bearer stale' } });
});

it.each(['https://attacker.example/private', '//attacker.example/private'])('rejects credentials to an arbitrary server: %s', async url => {
  api.defaults.adapter = vi.fn();
  await expect(api.get(url)).rejects.toThrow('configured server');
  expect(api.defaults.adapter).not.toHaveBeenCalled();
});

it('retries only explicitly opted-in reads, at most once', async () => {
  api.defaults.adapter = vi.fn(async config => { throw Object.assign(new Error('unavailable'), { config, response: { status: 503 } }); });
  await expect(api.get('/courses', { retry: true })).rejects.toThrow('unavailable');
  expect(api.defaults.adapter).toHaveBeenCalledTimes(2);
  api.defaults.adapter.mockClear();
  await expect(api.post('/certificates', {}, { retry: true })).rejects.toThrow('unavailable');
  expect(api.defaults.adapter).toHaveBeenCalledTimes(1);
});

it('expires the verified session on protected 401s but preserves login errors', async () => {
  const expired = vi.fn();
  window.addEventListener('session-expired', expired);
  api.defaults.adapter = async config => { throw Object.assign(new Error('unauthorized'), { config, response: { status: 401, data: { message: 'Session expired' } } }); };
  try {
    await expect(api.post('/auth/login', {})).rejects.toMatchObject({ userMessage: 'Session expired' });
    expect(expired).not.toHaveBeenCalled();
    localStorage.setItem('user', '{}');
    await expect(api.get('/courses')).rejects.toThrow();
    expect(expired).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('user')).toBeNull();
  } finally { window.removeEventListener('session-expired', expired); }
});
