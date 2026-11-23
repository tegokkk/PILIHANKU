import { useId, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { riasec, matrix } from '../../utils/calculations.js';
import { dimensions, questions } from '../../data/materials.js';
import { prefersReducedMotion } from '../../hooks/useMotion.js';

export function Button({ children, variant = '', className = '', loading = false, ...props }) {
  return (
    <button
      aria-busy={loading || undefined}
      className={`button ${variant} ${loading ? 'is-loading' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, as = 'input', error, className = '', ...props }) {
  const id = useId(),
    Tag = as;
  const hasValue = props.value !== undefined && props.value !== '' && props.value !== null;
  return (
    <div
      className={`field ${error ? 'has-error' : ''} ${hasValue ? 'is-filled' : ''} ${className}`.trim()}
    >
      <label htmlFor={id}>{label}</label>
      <Tag
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
        onInput={['date', 'time'].includes(props.type) ? props.onChange : undefined}
      />
      {error && (
        <span id={`${id}-error`} className="error field-error-msg" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function Check({ label, className = '', ...props }) {
  return (
    <label
      className={`check ${props.checked ? 'is-checked' : ''} ${props.disabled ? 'is-disabled' : ''} ${className}`.trim()}
    >
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Tabs({ items, value, onChange }) {
  const refs = useRef([]);
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState(null);

  const measure = useCallback(() => {
    const activeIndex = items.findIndex(([id]) => id === value);
    const btn = refs.current[activeIndex];
    if (!btn) {
      setIndicator(null);
      return;
    }
    setIndicator({
      x: btn.offsetLeft,
      y: btn.offsetTop,
      w: btn.offsetWidth,
      h: btn.offsetHeight,
    });
  }, [items, value]);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined' || !listRef.current) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(listRef.current);
    refs.current.forEach((el) => {
      if (el) ro.observe(el);
    });
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={listRef}
      className={`tabs ${indicator ? 'has-indicator' : ''}`}
      role="tablist"
      aria-label="Navigasi bagian"
    >
      {indicator && (
        <span
          className="tab-indicator"
          aria-hidden="true"
          style={{
            width: `${indicator.w}px`,
            height: `${indicator.h}px`,
            transform: `translate3d(${indicator.x}px, ${indicator.y}px, 0)`,
          }}
        />
      )}
      {items.map(([id, label], i) => (
        <button
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          tabIndex={value === id ? 0 : -1}
          aria-selected={value === id}
          key={id}
          onClick={() => onChange(id)}
          onKeyDown={(e) => {
            let target;
            if (e.key === 'ArrowRight') target = (i + 1) % items.length;
            else if (e.key === 'ArrowLeft') target = (i - 1 + items.length) % items.length;
            else if (e.key === 'Home') target = 0;
            else if (e.key === 'End') target = items.length - 1;
            if (target !== undefined) {
              e.preventDefault();
              onChange(items[target][0]);
              refs.current[target]?.focus();
            }
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function Notice({ children, type = 'info' }) {
  return children ? (
    <div className={`notice ${type} notice-enter`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  ) : null;
}

export function Heading({ eyebrow, title, children, level = 1 }) {
  const Tag = `h${level}`;
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <Tag>{title}</Tag>
      {children && <p className="intro">{children}</p>}
    </div>
  );
}

export function AsyncButton({ action, children, variant = '', onSuccess, ...props }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [state, setState] = useState('');
  const timerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <>
      <Button
        {...props}
        variant={variant}
        loading={busy}
        className={`${props.className || ''} ${state ? `is-${state}` : ''}`.trim()}
        disabled={busy || props.disabled}
        onClick={async () => {
          if (busyRef.current) return;
          busyRef.current = true;
          clearTimeout(timerRef.current);
          setBusy(true);
          setError('');
          setState('');
          try {
            const r = await action();
            setState('success');
            timerRef.current = setTimeout(() => setState(''), 400);
            await onSuccess?.(r);
          } catch (e) {
            setState('error');
            timerRef.current = setTimeout(() => setState(''), 400);
            setError(e.message);
          } finally {
            busyRef.current = false;
            setBusy(false);
          }
        }}
      >
        {busy && <span className="spinner-dot" aria-hidden="true" />}
        {busy ? 'Memproses…' : children}
      </Button>
      <Notice type="error">{error}</Notice>
    </>
  );
}

export function Accordion({ summary, children, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleToggle = (e) => {
    e.preventDefault();
    clearTimeout(timerRef.current);
    if (!open) {
      setClosing(false);
      setOpen(true);
      return;
    }
    if (prefersReducedMotion()) {
      setClosing(false);
      setOpen(false);
      return;
    }
    setClosing(true);
    timerRef.current = setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, 170);
  };

  return (
    <details
      open={open}
      className={`accordion ${open && !closing ? 'is-open' : ''} ${closing ? 'is-closing' : ''} ${className}`.trim()}
    >
      <summary onClick={handleToggle} aria-expanded={open && !closing}>
        <span>{summary}</span>
        <ChevronDown className="accordion-icon" size={18} aria-hidden="true" />
      </summary>
      <div
        className="accordion-grid"
        inert={closing || !open}
        aria-hidden={closing || !open ? 'true' : undefined}
      >
        <div className="accordion-inner">{children}</div>
      </div>
    </details>
  );
}

export function Panel({
  as = 'section',
  exiting = false,
  direction = 'up',
  className = '',
  children,
  ...props
}) {
  const Tag = as;
  return (
    <Tag
      className={`motion-panel panel-${direction} ${exiting ? 'is-exiting' : ''} ${className}`.trim()}
      inert={exiting}
      aria-hidden={exiting ? 'true' : undefined}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function LoadingState({ label = 'Memuat…', rows = 2, cards = 0 }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <p className="loading-label">
        <span className="spinner-dot" aria-hidden="true" />
        <span>{label}</span>
      </p>
      {cards > 0 ? (
        <div className="cards-grid" aria-hidden="true">
          {Array.from({ length: cards }, (_, i) => (
            <div className="skeleton-card" key={i} />
          ))}
        </div>
      ) : (
        <div className="skeleton-stack" aria-hidden="true">
          {Array.from({ length: rows }, (_, i) => (
            <div className="skeleton-bar" key={i} />
          ))}
        </div>
      )}
    </div>
  );
}

const statusConfig = {
  pending: { tone: 'warning', label: 'Menunggu' },
  approved: { tone: 'success', label: 'Disetujui' },
  rejected: { tone: 'danger', label: 'Ditolak' },
  suspended: { tone: 'danger', label: 'Dinonaktifkan' },
  draft: { tone: 'warning', label: 'Draf' },
  published: { tone: 'success', label: 'Terbit' },
  archived: { tone: 'neutral', label: 'Diarsipkan' },
  Baru: { tone: 'info', label: 'Baru' },
  Ditinjau: { tone: 'warning', label: 'Ditinjau' },
  Dijadwalkan: { tone: 'info', label: 'Dijadwalkan' },
  Selesai: { tone: 'success', label: 'Selesai' },
  Dibatalkan: { tone: 'neutral', label: 'Dibatalkan' },
  Aktif: { tone: 'success', label: 'Aktif' },
  'Tidak aktif': { tone: 'neutral', label: 'Tidak aktif' },
};

export function StatusBadge({ status, label }) {
  const cfg = statusConfig[status] || { tone: 'neutral', label: status };
  return (
    <span className={`badge status-badge status-${cfg.tone}`}>
      <span className="status-dot" aria-hidden="true" />
      <span>{label || cfg.label}</span>
    </span>
  );
}

export function MetaList({ items = [] }) {
  const rows = items.filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (!rows.length) return null;
  return (
    <dl className="meta-list">
      {rows.map(([label, value]) => (
        <div className="meta-row" key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      {title && <h3>{title}</h3>}
      {description && <p className="muted">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

export function Pagination({ page, total = 0, pageSize = 20, loading = false, onChange }) {
  if (total <= pageSize && page === 1) return null;
  return (
    <nav className="pagination-bar" aria-label="Halaman daftar">
      <Button variant="outline" disabled={loading || page <= 1} onClick={() => onChange(page - 1)}>
        Sebelumnya
      </Button>
      <span className="caption" aria-live="polite">
        Halaman {page} · {total} data
      </span>
      <Button
        variant="outline"
        disabled={loading || page * pageSize >= total}
        onClick={() => onChange(page + 1)}
      >
        Berikutnya
      </Button>
    </nav>
  );
}

const names = {
  answers: 'Jawaban minat',
  context: 'Nilai & kondisi',
  values: 'Nilai pribadi',
  reviewed: 'Bagian opsional ditinjau',
  strengths: 'Kekuatan',
  subjects: 'Mapel',
  support: 'Dukungan',
  barriers: 'Hambatan',
  comparison: 'Perbandingan',
  discussion: 'Musyawarah',
  plan: 'Rencana',
  tasks: 'Langkah tindakan',
  title: 'Judul',
  due: 'Tenggat',
  done: 'Selesai',
  status: 'Status',
  main: 'Utama',
  backup: 'Cadangan',
  choice: 'Pilihan',
  reason: 'Alasan',
  agreed: 'Kesepakatan',
  different: 'Perbedaan pandangan',
  information: 'Informasi yang dicari',
  next: 'Langkah berikutnya',
  reflection: 'Refleksi',
  explored: 'Kategori yang dijelajahi',
  simulations: 'Refleksi simulasi',
  summary: 'Gambaran',
  sources: 'Sumber',
  verified_at: 'Tanggal verifikasi',
  version: 'Versi informasi',
  snapshot: 'Salinan informasi',
  personal: 'Opsi pribadi',
  category: 'Kategori',
};
export function JsonSection({ value }) {
  if (value == null) return <p>Tidak dibagikan</p>;
  if (Array.isArray(value))
    return value.length ? (
      <ul>
        {value.map((v, i) => (
          <li key={i}>
            <JsonSection value={v} />
          </li>
        ))}
      </ul>
    ) : (
      <span>Belum diisi</span>
    );
  if (typeof value === 'object') {
    if (value.options && value.criteria) {
      const result = matrix(value);
      return (
        <>
          <p>
            {result.complete
              ? 'Total adalah bahan pertimbangan, bukan penentu pemenang.'
              : 'Matriks belum lengkap.'}
          </p>
          {value.options.map((o) => (
            <div key={o.id}>
              <strong>{o.title}</strong>
              {value.criteria.map((c) => (
                <p key={c.id}>
                  {c.name}: bobot {c.weight ?? 'belum tahu'}, penilaian{' '}
                  {c.ratings[o.id] ?? 'belum tahu'}
                </p>
              ))}
              {result.complete && <p>Total: {result.totals.find((t) => t.id === o.id).total}</p>}
            </div>
          ))}
        </>
      );
    }
    if (value.answers && value.context) {
      const result = riasec(value.answers);
      const scaleLabels = ['', 'Sangat tidak suka', 'Kurang suka', 'Suka', 'Sangat suka'];
      const answeredItems = questions.filter((q) => value.answers[q.id] != null);
      return (
        <div className="stack-tight">
          <p>
            {result.complete
              ? Object.entries(result.scores)
                  .map(([k, v]) => `${dimensions[k]}: ${v}`)
                  .join(' · ')
              : `Refleksi minat belum lengkap (${answeredItems.length}/24 dijawab).`}
          </p>
          {answeredItems.length > 0 && (
            <Accordion summary={`Rincian jawaban refleksi (${answeredItems.length} butir)`}>
              <dl className="meta-list">
                {answeredItems.map((q) => (
                  <div className="meta-row" key={q.id}>
                    <dt>
                      {q.id} ({q.dimension})
                    </dt>
                    <dd>
                      <div>{q.text}</div>
                      <small className="muted">
                        Jawaban: {value.answers[q.id]} — {scaleLabels[value.answers[q.id]] || '-'}
                      </small>
                    </dd>
                  </div>
                ))}
              </dl>
            </Accordion>
          )}
          <JsonSection value={value.context} />
        </div>
      );
    }
    return (
      <dl className="summary">
        {Object.entries(value)
          .filter(([k]) => !['id', 'sourceId', 'instrumentVersion', 'ratings'].includes(k))
          .map(([k, v]) => (
            <div key={k}>
              <dt>{names[k] || k}</dt>
              <dd>
                <JsonSection value={v} />
              </dd>
            </div>
          ))}
      </dl>
    );
  }
  return (
    <span>
      {value === 'exploring'
        ? 'Masih menjelajah'
        : value === 'chosen'
          ? 'Pilihan sementara'
          : typeof value === 'boolean'
            ? value
              ? 'Ya'
              : 'Tidak'
            : String(value) || 'Belum diisi'}
    </span>
  );
}
