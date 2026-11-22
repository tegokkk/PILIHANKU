import { useEffect, useRef, useState, useCallback } from 'react';

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export function useExitAction(duration = 160) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, []);

  const triggerExit = useCallback(
    (callback) => {
      clearTimeout(timerRef.current);
      if (prefersReducedMotion() || duration <= 0) {
        setExiting(false);
        callback?.();
        return;
      }
      setExiting(true);
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) setExiting(false);
        callback?.();
      }, duration);
    },
    [duration]
  );

  const resetExit = useCallback(() => {
    clearTimeout(timerRef.current);
    setExiting(false);
  }, []);

  return [exiting, triggerExit, resetExit];
}

export function useDirectionalValue(value, order = []) {
  const prevRef = useRef(value);
  const dirRef = useRef('forward');
  if (prevRef.current !== value) {
    if (order.length) {
      const prevIdx = order.indexOf(prevRef.current);
      const nextIdx = order.indexOf(value);
      dirRef.current = nextIdx >= prevIdx ? 'forward' : 'backward';
    } else if (typeof value === 'number' && typeof prevRef.current === 'number') {
      dirRef.current = value >= prevRef.current ? 'forward' : 'backward';
    } else {
      dirRef.current = 'forward';
    }
    prevRef.current = value;
  }
  return dirRef.current;
}

export function useFlashOnUpdate(value, duration = 260) {
  const prevRef = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;
    if (prefersReducedMotion()) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), duration);
    return () => clearTimeout(t);
  }, [value, duration]);
  return flash;
}

export function useScrollReveal(depKey) {
  const containerRef = useRef(null);
  useEffect(() => {
    const root = containerRef.current;
    if (!root || prefersReducedMotion()) return;
    const targets = Array.from(root.querySelectorAll('[data-reveal]'));
    if (!targets.length) return;
    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.setAttribute('data-reveal-state', 'visible'));
      return;
    }
    const vh = window.innerHeight || 800;
    const belowFold = [];
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh * 0.94) {
        el.setAttribute('data-reveal-state', 'visible');
      } else {
        el.setAttribute('data-reveal-state', 'pending');
        belowFold.push(el);
      }
    });
    if (!belowFold.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal-state', 'visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );
    belowFold.forEach((el) => observer.observe(el));
    const fallbackTimer = setTimeout(() => {
      belowFold.forEach((el) => {
        if (el.getAttribute('data-reveal-state') === 'pending') {
          el.setAttribute('data-reveal-state', 'visible');
        }
      });
    }, 2500);
    return () => {
      clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, [depKey]);
  return containerRef;
}
