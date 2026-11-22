import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../services/api.js';
import { emptyExploration } from '../utils/calculations.js';
import { instrumentVersion } from '../data/materials.js';
import { ExplorationContext as Context } from './exploration.js';
export function ExplorationProvider({ user, children }) {
  const [data, setData] = useState(emptyExploration),
    [ready, setReady] = useState(false),
    [loadFailed, setLoadFailed] = useState(false),
    [status, setStatus] = useState('Memuat…'),
    [error, setError] = useState(''),
    [conflict, setConflict] = useState(false),
    [aggregateConsent, setAggregate] = useState(false),
    [sourceNotices, setSourceNotices] = useState([]);
  const account = user?.role === 'siswa' && !user.mustChangePassword;
  const revision = useRef(0),
    timer = useRef(),
    inflight = useRef(null),
    dirty = useRef(false),
    current = useRef(data),
    consent = useRef(false),
    mounted = useRef(true),
    blocked = useRef(false),
    saveRef = useRef(null);
  const loadSequence = useRef(0);
  const invalidateLoad = useCallback(() => {
    loadSequence.current++;
  }, []);
  const load = useCallback(async () => {
    const request = ++loadSequence.current;
    clearTimeout(timer.current);
    blocked.current = true;
    setReady(false);
    setLoadFailed(false);
    try {
      if (inflight.current) await inflight.current.catch(() => {});
      if (account) {
        const r = await api('/me/exploration');
        if (!mounted.current || request !== loadSequence.current) return;
        revision.current = r.revision;
        setSourceNotices(r.sourceNotices || []);
        current.current = r.data;
        setData(r.data);
        setAggregate(r.aggregateConsent);
        consent.current = r.aggregateConsent;
        setStatus('Tersimpan di akun kelas');
      } else {
        setStatus('Akun pengelola');
      }
      dirty.current = false;
      blocked.current = false;
      setConflict(false);
      setError('');
    } catch (e) {
      if (!mounted.current || request !== loadSequence.current) return;
      setError(e.message);
      setLoadFailed(true);
      setStatus('Gagal memuat; muat ulang sebelum mengedit');
      blocked.current = account;
    } finally {
      if (mounted.current && request === loadSequence.current) setReady(true);
    }
  }, [account]);
  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
      invalidateLoad();
      clearTimeout(timer.current);
      blocked.current = true;
      dirty.current = false;
      current.current = emptyExploration();
      consent.current = false;
    };
  }, [load, invalidateLoad]);
  const persist = useCallback(async () => {
    clearTimeout(timer.current);
    if (!mounted.current || !account) return;
    if (inflight.current) {
      await inflight.current;
      if (dirty.current) return saveRef.current();
      return;
    }
    if (blocked.current)
      throw new Error(
        'Data belum dapat disimpan. Muat versi terbaru atau tinjau konflik terlebih dahulu.'
      );
    if (!dirty.current) return;
    const snapshot = current.current,
      aggregate = consent.current;
    dirty.current = false;
    setStatus('Sedang menyimpan…');
    const saving = (async () => {
      try {
        if (account) {
          const result = await api('/me/exploration', {
            method: 'PUT',
            body: {
              revision: revision.current,
              instrumentVersion,
              aggregateConsent: aggregate,
              data: snapshot,
            },
          });
          revision.current = result.revision;
        }
        if (mounted.current) {
          setStatus(
            dirty.current ? 'Perubahan terbaru belum tersimpan' : 'Tersimpan di akun kelas'
          );
          setError('');
        }
      } catch (e) {
        dirty.current = true;
        if (e.code === 'REVISION_CONFLICT') {
          blocked.current = true;
          setConflict(true);
        }
        if (mounted.current) {
          setError(e.message);
          setStatus('Belum tersimpan');
        }
        throw e;
      }
    })();
    inflight.current = saving;
    try {
      await saving;
    } finally {
      inflight.current = null;
    }
    if (dirty.current && !blocked.current) return saveRef.current();
  }, [account]);
  saveRef.current = persist;
  const schedule = () => {
    setStatus('Perubahan belum tersimpan');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => saveRef.current().catch(() => {}), 600);
  };
  function update(updater) {
    if (!account || !mounted.current || blocked.current) return;
    const next = typeof updater === 'function' ? updater(current.current) : updater;
    current.current = next;
    setData(next);
    dirty.current = true;
    schedule();
  }
  function contribute(value) {
    if (!account || !mounted.current || blocked.current) return;
    setAggregate(value);
    consent.current = value;
    dirty.current = true;
    schedule();
  }
  useEffect(() => {
    const warn = (e) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  async function erase() {
    clearTimeout(timer.current);
    const wasBlocked = blocked.current;
    blocked.current = true;
    try {
      if (inflight.current) await inflight.current.catch(() => {});
      if (account) await api('/me/data', { method: 'DELETE' });
    } catch (e) {
      blocked.current = wasBlocked;
      throw e;
    }
    dirty.current = false;
    current.current = emptyExploration();
    setData(current.current);
    setStatus('Data telah dihapus');
  }
  return (
    <Context.Provider
      value={{
        data,
        update,
        ready,
        loadFailed,
        status,
        error,
        conflict,
        sourceNotices,
        persist,
        reload: load,
        erase,
        account,
        aggregateConsent,
        contribute,
      }}
    >
      {children}
    </Context.Provider>
  );
}
