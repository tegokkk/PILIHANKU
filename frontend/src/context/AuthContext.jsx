import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { api, clearCsrf, clearPrivateRequests } from '../services/api.js';
import { AuthContext as Context } from './auth.js';
const logoutFlag = (value) => {
  try {
    if (value === undefined) return sessionStorage.getItem('pilihanku.logout-pending') === '1';
    if (value) sessionStorage.setItem('pilihanku.logout-pending', '1');
    else sessionStorage.removeItem('pilihanku.logout-pending');
  } catch {
    /* The in-memory flag still locks this tab. */
  }
};
function clearPrivateStorage() {
  try {
    for (const key of Object.keys(sessionStorage))
      if (key.startsWith('pilihanku.consult-') || key === 'pilihanku.guest-token')
        sessionStorage.removeItem(key);
  } catch {
    /* Storage can be disabled. */
  }
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [checking, setChecking] = useState(false),
    [error, setError] = useState('');
  const sequence = useRef(0),
    deadlineTimer = useRef(),
    channel = useRef(),
    transitioning = useRef(false),
    pendingLogout = useRef(logoutFlag());
  const lock = useCallback(() => {
    sequence.current++;
    clearTimeout(deadlineTimer.current);
    clearPrivateRequests();
    clearPrivateStorage();
    clearCsrf();
    setUser(null);
    setChecking(false);
    setLoading(false);
  }, []);
  const deadline = useCallback(
    (at) => {
      clearTimeout(deadlineTimer.current);
      deadlineTimer.current = setTimeout(lock, Math.max(0, at - Date.now()));
    },
    [lock]
  );
  const refresh = useCallback(
    async (force = false) => {
      if (transitioning.current && !force) return;
      const request = ++sequence.current;
      try {
        if (pendingLogout.current || logoutFlag()) {
          await api('/auth/logout', { method: 'POST', body: {} });
          pendingLogout.current = false;
          logoutFlag(false);
        }
        const next = await api('/auth/me');
        if (request !== sequence.current) return;
        if (next) {
          setUser(next);
          deadline(next.expiresAt);
        } else lock();
        setError('');
        return next;
      } catch (e) {
        if (request !== sequence.current) return;
        lock();
        setError(e.message);
      } finally {
        if (request === sequence.current) {
          setLoading(false);
          setChecking(false);
        }
      }
    },
    [deadline, lock]
  );
  useEffect(() => {
    refresh();
    const ended = () => lock();
    const renewed = (event) => deadline(event.detail);
    const check = () => {
      if (!document.hidden && !transitioning.current) {
        setChecking(true);
        refresh();
      }
    };
    const visibility = () => {
      if (document.hidden) {
        flushSync(() => setChecking(true));
      } else check();
    };
    const pagehide = () => {
      flushSync(() => setChecking(true));
    };
    window.addEventListener('pilihanku:session-ended', ended);
    window.addEventListener('pilihanku:session-deadline', renewed);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    window.addEventListener('pagehide', pagehide);
    document.addEventListener('visibilitychange', visibility);
    const poll = setInterval(() => {
      if (!document.hidden) refresh();
    }, 30000);
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('pilihanku-auth');
      channel.current.onmessage = ({ data }) => {
        if (data?.type === 'session-changed') {
          pendingLogout.current = false;
          logoutFlag(false);
          lock();
          refresh();
          return;
        }
        pendingLogout.current = data?.pending !== false;
        logoutFlag(pendingLogout.current);
        lock();
      };
    }
    const invalidate = () => {
      sequence.current++;
    };
    return () => {
      invalidate();
      clearInterval(poll);
      clearTimeout(deadlineTimer.current);
      window.removeEventListener('pilihanku:session-ended', ended);
      window.removeEventListener('pilihanku:session-deadline', renewed);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
      window.removeEventListener('pagehide', pagehide);
      document.removeEventListener('visibilitychange', visibility);
      channel.current?.close();
    };
  }, [refresh, lock, deadline]);
  async function login(username, password) {
    transitioning.current = true;
    clearPrivateRequests();
    clearPrivateStorage();
    const request = ++sequence.current;
    try {
      if (pendingLogout.current || logoutFlag()) {
        await api('/auth/logout', { method: 'POST', body: {} });
        pendingLogout.current = false;
        logoutFlag(false);
      }
      await api('/auth/login', { method: 'POST', body: { username, password } });
      if (request !== sequence.current) throw new Error('Sesi berubah. Silakan masuk kembali.');
      const next = await refresh(true);
      if (!next) throw new Error('Sesi belum dapat diverifikasi. Silakan masuk kembali.');
      channel.current?.postMessage({ type: 'session-changed' });
      return next;
    } finally {
      transitioning.current = false;
    }
  }
  async function logout() {
    transitioning.current = true;
    sequence.current++;
    pendingLogout.current = true;
    logoutFlag(true);
    channel.current?.postMessage({ type: 'logout', pending: true });
    setUser(null);
    setLoading(true);
    clearPrivateRequests();
    clearPrivateStorage();
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
      pendingLogout.current = false;
      logoutFlag(false);
    } catch {
      setError(
        'Keluar belum dapat dikonfirmasi server. Akses dikunci dan pencabutan akan dicoba kembali saat tersambung.'
      );
    } finally {
      lock();
      transitioning.current = false;
      channel.current?.postMessage({ type: 'logout', pending: pendingLogout.current });
    }
  }
  return (
    <Context.Provider value={{ user, loading, checking, error, login, logout, refresh }}>
      {children}
    </Context.Provider>
  );
}
