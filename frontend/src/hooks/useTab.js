import { useSearchParams } from 'react-router-dom';
export function useTab(defaultTab, allowed) {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab = allowed?.includes(raw) ? raw : defaultTab;
  const select = (value) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    next.delete('panel');
    setParams(next);
  };
  return [tab, select];
}
