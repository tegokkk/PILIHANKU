import { Link, NavLink, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sprout,
  House,
  Map,
  NotebookPen,
  MessageCircle,
  LayoutDashboard,
  Settings,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/auth.js';
import { useExploration } from '../../context/exploration.js';
import { Button, Notice, AsyncButton, LoadingState } from '../ui/index.jsx';
import { Navbar1 } from '../ui/navbar-1.jsx';
import { PrivacyPanel } from '../../features/privacy/PrivacyPanel.jsx';
import { useEffect, useRef, useState } from 'react';
import { steps } from './steps.js';
import { matrix, emptyExploration } from '../../utils/calculations.js';
import { useDirectionalValue } from '../../hooks/useMotion.js';

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="PILIHANKU Beranda">
      <Sprout aria-hidden="true" />
      <span>PILIHANKU</span>
    </Link>
  );
}

const routeOrder = [
  '/',
  '/mulai',
  '/kenali-diriku',
  '/peta-jalur',
  '/timbang-pilihan',
  '/rencana-langkahku',
  '/guru',
  '/guru/kelola',
];

const publicExploration = { data: emptyExploration() };

export function Shell({ children }) {
  const { user, logout } = useAuth(),
    exploration = useExploration() || publicExploration,
    navigate = useNavigate(),
    location = useLocation(),
    [params, setParams] = useSearchParams(),
    [error, setError] = useState(''),
    [online, setOnline] = useState(navigator.onLine);
  const manager = user && ['superadmin', 'bk'].includes(user.role);
  const landing = location.pathname === '/';
  const panelType = params.get('panel');
  const globalPanel = ['privacy', 'settings'].includes(panelType);
  const isConsultPanel = location.pathname === '/rencana-langkahku' && panelType === 'konsultasi';
  const routeDir = useDirectionalValue(location.pathname, routeOrder);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      if (!location.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }
  }, [location.pathname, location.hash]);

  const open = (panel) => {
    if (!user && panel !== 'privacy') {
      navigate('/mulai?tab=masuk');
      return;
    }
    const next = new URLSearchParams(params);
    next.set('panel', panel);
    setParams(next);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      setError(e.message);
    }
  };

  const data = exploration.data;
  const doneSteps = [
    Object.keys(data.answers).length === 24 &&
      data.context.reviewed &&
      (data.context.values.length === 0 || data.context.values.length >= 3),
    data.comparison.options.length >= 2,
    matrix(data.comparison).complete,
    data.plan.tasks.length >= 3 && (data.plan.status === 'exploring' || data.plan.main),
  ];

  const isSaving = exploration.status?.includes('Sedang menyimpan');
  const isDirty = exploration.status?.includes('belum tersimpan');
  const isSaved = exploration.status?.includes('Tersimpan');

  return (
    <div className={`${landing ? 'landing-shell' : ''} ${manager ? 'manager-shell' : ''}`}>
      <a className="skip-link" href="#main">
        Lewati ke isi
      </a>
      <Navbar1
        manager={manager}
        user={user}
        isConsultPanel={isConsultPanel}
        settingsActive={panelType === 'settings'}
        onOpenSettings={() => open('settings')}
        onLogout={handleLogout}
      />
      {!landing && !manager && (
        <nav className="stepper" aria-label="Empat langkah eksplorasi">
          {steps.map(([to, label], i) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${isActive ? 'active' : ''} ${doneSteps[i] ? 'completed' : ''}`.trim()
              }
            >
              <span aria-hidden="true">
                {doneSteps[i] ? <Check size={15} strokeWidth={2.75} /> : i + 1}
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
      )}
      <main
        id="main"
        className={`${landing ? 'landing-content' : 'page-content'} ${location.pathname === '/mulai' ? 'focused' : ''}`}
      >
        <Notice type="error">{error}</Notice>
        {!online && (
          <Notice type="warning">
            Kamu sedang luring. Verifikasi sesi dan penggunaan fitur membutuhkan koneksi ke server.
          </Notice>
        )}
        <div
          key={location.pathname}
          className={`page-transition page-${routeDir}`}
          hidden={globalPanel}
          inert={globalPanel}
        >
          {exploration.account && !exploration.ready ? (
            <LoadingState label="Memuat data akun…" />
          ) : exploration.loadFailed ? (
            <section className="surface stack">
              <Notice type="error">{exploration.error}</Notice>
              <AsyncButton action={exploration.reload}>Muat ulang data akun</AsyncButton>
            </section>
          ) : (
            children
          )}
        </div>
        {globalPanel && <PrivacyPanel type={panelType} />}
        {!landing && !manager && !exploration.loadFailed && location.pathname !== '/mulai' && (
          <div
            className={`save-status ${isSaving ? 'is-saving' : isDirty ? 'is-dirty' : isSaved ? 'is-saved' : ''}`}
            aria-live="polite"
          >
            <span className="save-status-row">
              <span className="save-indicator-dot" aria-hidden="true" />
              <span>{exploration.status}</span>
            </span>
            {exploration.error && <Notice type="error">{exploration.error}</Notice>}
            {exploration.conflict ? (
              <AsyncButton variant="outline" action={exploration.reload}>
                Muat versi terbaru (ganti draf ini)
              </AsyncButton>
            ) : (
              exploration.error && (
                <AsyncButton variant="outline" action={exploration.persist}>
                  Coba simpan lagi
                </AsyncButton>
              )
            )}
          </div>
        )}
      </main>
      <footer className="site-footer">
        <Brand />
        <p>Kenali dirimu. Jelajahi pilihanmu.</p>
        <div className="row">
          <button onClick={() => open('privacy')}>Privasi</button>
          <button onClick={() => open('settings')}>Pengaturan Data</button>
          <Link to="/rencana-langkahku?panel=export&blank=1">Lembar kerja kosong</Link>
          {!manager && <Link to="/guru">Ruang Pengelola</Link>}
        </div>
        <small>Bahan refleksi dan diskusi. Keputusan tetap milikmu.</small>
      </footer>
      {!manager && (
        <nav className="bottom-nav" aria-label="Navigasi ponsel">
          <NavLink to="/" end>
            <House />
            Beranda
          </NavLink>
          <NavLink to="/peta-jalur">
            <Map />
            Jalur
          </NavLink>
          <NavLink
            to="/rencana-langkahku"
            className={({ isActive }) => (isActive && !isConsultPanel ? 'active' : '')}
          >
            <NotebookPen />
            Rencana
          </NavLink>
          <Link
            to="/rencana-langkahku?panel=konsultasi"
            className={isConsultPanel ? 'active' : ''}
            aria-current={isConsultPanel ? 'page' : undefined}
          >
            <MessageCircle />
            Tanya BK
          </Link>
        </nav>
      )}
      {manager && (
        <aside className="manager-sidebar">
          <p className="eyebrow">{user.role === 'superadmin' ? 'SUPERADMIN' : 'RUANG GURU BK'}</p>
          <NavLink to="/guru" end>
            <LayoutDashboard />
            Dashboard
          </NavLink>
          <NavLink to="/guru/kelola">
            <Settings />
            Kelola Informasi
          </NavLink>
          <p>Privasi siswa berada di setiap langkah.</p>
        </aside>
      )}
    </div>
  );
}
