import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadPlan } from '../src/exports/plan-pdf.js';
import { emptyExploration } from '../src/utils/calculations.js';
import { api, clearCsrf, clearPrivateRequests } from '../src/services/api.js';
const response = (data, status = 200) =>
  new Response(JSON.stringify(status === 200 ? { data } : { error: data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
test('private responses cannot return after logout, including during JSON parsing and CSRF preparation', async () => {
  const original = globalThis.fetch;
  globalThis.window = new EventTarget();
  try {
    let release;
    globalThis.fetch = async () => ({
      ok: true,
      headers: new Headers(),
      json: () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    });
    const pending = api('/me/exploration');
    await new Promise((resolve) => setImmediate(resolve));
    clearPrivateRequests();
    release({ data: { private: 'old account' } });
    await assert.rejects(pending, (e) => e.code === 'SESSION_REQUIRED');
    clearCsrf();
    globalThis.fetch = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const mutation = api('/me/exploration', { method: 'PUT', body: { private: 'old account' } });
    clearPrivateRequests();
    release(response({ token: 'synthetic-csrf' }));
    await assert.rejects(mutation, (e) => e.code === 'SESSION_REQUIRED');
  } finally {
    globalThis.fetch = original;
    delete globalThis.window;
    clearCsrf();
  }
});
test('401 ends a session, 403 preserves it and every private fetch bypasses cache', async () => {
  const original = globalThis.fetch;
  globalThis.window = new EventTarget();
  let ended = 0;
  window.addEventListener('pilihanku:session-ended', () => ended++);
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.cache, 'no-store');
      return response({ code: 'SESSION_REQUIRED', message: 'Masuk dahulu' }, 401);
    };
    await assert.rejects(api('/cards'), (e) => e.status === 401);
    assert.equal(ended, 1);
    globalThis.fetch = async () => response({ code: 'FORBIDDEN', message: 'Role berbeda' }, 403);
    await assert.rejects(api('/admin/users'), (e) => e.status === 403);
    assert.equal(ended, 1);
  } finally {
    globalThis.fetch = original;
    delete globalThis.window;
  }
});

test('PDF downloads including blank worksheets require a current approved student session', async () => {
  const original = globalThis.fetch;
  globalThis.window = new EventTarget();
  try {
    for (const user of [
      null,
      { role: 'bk', expiresAt: Date.now() + 60000 },
      { role: 'siswa', expiresAt: Date.now() - 1 },
      { role: 'siswa', mustChangePassword: true, expiresAt: Date.now() + 60000 },
    ]) {
      globalThis.fetch = async () => response(user);
      await assert.rejects(downloadPlan(emptyExploration(), { blank: true }), /approved/);
    }
  } finally {
    globalThis.fetch = original;
    delete globalThis.window;
  }
});

test('concurrent mutations share one uncached CSRF preparation and preserve caller cancellation', async () => {
  const original = globalThis.fetch;
  globalThis.window = new EventTarget();
  clearCsrf();
  let preparations = 0,
    release;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(options.cache, 'no-store');
      if (url === '/api/auth/csrf') {
        preparations++;
        return new Promise((resolve) => {
          release = () => resolve(response({ token: 'synthetic-csrf' }));
        });
      }
      assert.equal(options.headers['X-CSRF-Token'], 'synthetic-csrf');
      return response({ saved: true });
    };
    const first = api('/me/exploration', { method: 'PUT', body: {} });
    const second = api('/consultations', { method: 'POST', body: {} });
    assert.equal(preparations, 1);
    release();
    assert.deepEqual(await Promise.all([first, second]), [{ saved: true }, { saved: true }]);
    const controller = new AbortController();
    globalThis.fetch = (url, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), {
          once: true,
        });
      });
    const pending = api('/cards', { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, (e) => e.code === 'CANCELLED');
  } finally {
    globalThis.fetch = original;
    delete globalThis.window;
    clearCsrf();
  }
});

test('non-JSON gateway failures are readable and stale CSRF preparation cannot restore a token', async () => {
  const original = globalThis.fetch;
  globalThis.window = new EventTarget();
  clearCsrf();
  try {
    globalThis.fetch = async () => new Response('<html>Gateway timeout</html>', { status: 502 });
    await assert.rejects(api('/cards'), (e) => e.code === 'INVALID_RESPONSE' && e.status === 502);
    let release;
    globalThis.fetch = async () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const stale = api('/classes', { method: 'POST', body: {} });
    clearCsrf();
    release(response({ token: 'old-synthetic-token' }));
    await assert.rejects(stale, (e) => e.code === 'SESSION_REQUIRED');
  } finally {
    globalThis.fetch = original;
    delete globalThis.window;
    clearCsrf();
  }
});
