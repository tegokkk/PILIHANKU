import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
export function useResource(path) {
  const [state, setState] = useState({ path, data: null, error: '', loading: true });
  const sequence = useRef(0),
    currentPath = useRef(path),
    controller = useRef();
  const invalidate = useCallback(() => {
    sequence.current++;
    controller.current?.abort();
  }, []);
  currentPath.current = path;
  const reload = useCallback(async () => {
    if (currentPath.current !== path) return;
    if (!path) {
      setState({ path, data: null, error: '', loading: false });
      return;
    }
    const request = ++sequence.current;
    controller.current?.abort();
    const pending = new AbortController();
    controller.current = pending;
    setState((s) => ({ path, data: s.path === path ? s.data : null, error: '', loading: true }));
    try {
      const data = await api(path, { signal: pending.signal });
      if (request === sequence.current && currentPath.current === path)
        setState({ path, data, error: '', loading: false });
    } catch (e) {
      if (request === sequence.current && currentPath.current === path)
        setState({ path, data: null, error: e.message, loading: false });
    }
  }, [path]);
  useEffect(() => {
    reload();
    return invalidate;
  }, [reload, invalidate]);
  return { ...(state.path === path ? state : { data: null, error: '', loading: true }), reload };
}
