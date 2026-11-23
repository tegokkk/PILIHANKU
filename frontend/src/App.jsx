import { lazy, Suspense, Component } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { useAuth } from './context/auth.js';
import { ExplorationProvider } from './context/ExplorationContext.jsx';
import { Shell } from './components/navigation/Shell.jsx';
import { PrivacyPanel } from './features/privacy/PrivacyPanel.jsx';
import { Notice, LoadingState } from './components/ui/index.jsx';
const Home = lazy(() => import('./pages/HomePage.jsx')),
  Start = lazy(() => import('./pages/StartPage.jsx')),
  Self = lazy(() => import('./pages/SelfDiscoveryPage.jsx')),
  Paths = lazy(() => import('./pages/PathwaysPage.jsx')),
  Comparison = lazy(() => import('./pages/ComparisonPage.jsx')),
  Plan = lazy(() => import('./pages/ActionPlanPage.jsx')),
  Dashboard = lazy(() => import('./pages/DashboardPage.jsx')),
  Management = lazy(() => import('./pages/ManagementPage.jsx'));
function ManagerGuard({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate replace to="/mulai?tab=masuk" />;
  if (!['superadmin', 'bk'].includes(user.role))
    return (
      <Notice type="error">
        Akses pengelola tidak diizinkan. <Link to="/kenali-diriku">Kembali ke eksplorasimu</Link>
      </Notice>
    );
  return children;
}
class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="page-content">
        <h1>Tampilan belum dapat dimuat</h1>
        <p>Draf yang sudah tersimpan tetap tersedia. Muat ulang untuk mencoba kembali.</p>
        <a href="/" className="button">
          Muat ulang
        </a>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const { user, loading, checking, error } = useAuth(),
    location = useLocation();
  if (loading)
    return (
      <main className="page-content">
        <LoadingState label="Menyiapkan ruangmu…" />
      </main>
    );
  if (!user && location.pathname === '/') {
    const panel = new URLSearchParams(location.search).get('panel');
    if (panel && panel !== 'privacy') return <Navigate replace to="/mulai?tab=masuk" />;
    return (
      <ErrorBoundary>
        <Shell>
          <Suspense fallback={<LoadingState label="Memuat beranda…" />}>
            <Home />
          </Suspense>
        </Shell>
      </ErrorBoundary>
    );
  }
  if (!user) {
    if (location.pathname !== '/mulai') return <Navigate replace to="/mulai?tab=masuk" />;
    const params = new URLSearchParams(location.search);
    const privacy = params.get('panel') === 'privacy';
    if (
      (params.has('panel') && !privacy) ||
      (params.has('tab') && !['masuk', 'daftar', 'status'].includes(params.get('tab')))
    )
      return <Navigate replace to="/mulai?tab=masuk" />;
    return (
      <main className={`page-content ${privacy ? 'privacy-shell' : 'auth-split-shell'}`}>
        {privacy && (
          <div className="auth-header">
            <Link className="brand navbar-brand" to="/" aria-label="PILIHANKU Beranda">
              <span className="navbar-brand-mark" aria-hidden="true">
                <Sprout size={18} strokeWidth={2.2} />
              </span>
              <span>PILIHANKU</span>
            </Link>
          </div>
        )}
        <Notice type="warning">
          {error ? 'Sesi belum dapat diverifikasi. Periksa koneksi dan masuk kembali.' : ''}
        </Notice>
        <Suspense fallback={<LoadingState label="Memuat halaman Masuk…" />}>
          {privacy ? <PrivacyPanel type="privacy" /> : <Start />}
        </Suspense>
        <div className="auth-footer">
          <Link to={privacy ? '/mulai?tab=masuk' : '/mulai?panel=privacy'}>
            {privacy ? 'Kembali ke Masuk' : 'Informasi privasi'}
          </Link>
        </div>
      </main>
    );
  }
  if (location.pathname === '/mulai' && !location.search.includes('panel='))
    return <Navigate replace to={user.role === 'siswa' ? '/kenali-diriku' : '/guru'} />;
  if (
    user.role !== 'siswa' &&
    ['/', '/kenali-diriku', '/peta-jalur', '/timbang-pilihan', '/rencana-langkahku'].includes(
      location.pathname
    )
  )
    return <Navigate replace to="/guru" />;
  if (
    user.mustChangePassword &&
    (location.pathname !== '/mulai' ||
      new URLSearchParams(location.search).get('panel') !== 'settings')
  )
    return <Navigate replace to="/mulai?panel=settings" />;
  return (
    <>
      {checking && (
        <main className="page-content">
          <LoadingState label="Memeriksa sesi…" />
        </main>
      )}
      <div hidden={checking} inert={checking}>
        <ErrorBoundary>
          <ExplorationProvider key={user.id} user={user}>
            <Shell>
              <Notice type="warning">{error}</Notice>
              <Suspense fallback={<LoadingState label="Memuat halaman…" />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/mulai" element={<Start />} />
                  <Route path="/kenali-diriku" element={<Self />} />
                  <Route path="/peta-jalur" element={<Paths />} />
                  <Route path="/timbang-pilihan" element={<Comparison />} />
                  <Route path="/rencana-langkahku" element={<Plan />} />
                  <Route
                    path="/guru"
                    element={
                      <ManagerGuard>
                        <Dashboard />
                      </ManagerGuard>
                    }
                  />
                  <Route
                    path="/guru/kelola"
                    element={
                      <ManagerGuard>
                        <Management />
                      </ManagerGuard>
                    }
                  />
                  <Route path="*" element={<Navigate replace to="/" />} />
                </Routes>
              </Suspense>
            </Shell>
          </ExplorationProvider>
        </ErrorBoundary>
      </div>
    </>
  );
}
