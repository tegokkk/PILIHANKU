import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Sprout,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
} from 'lucide-react';
import { useAuth } from '../context/auth.js';
import { useTab } from '../hooks/useTab.js';
import {
  Button,
  Field,
  Check,
  Tabs,
  Notice,
  AsyncButton,
  Accordion,
} from '../components/ui/index.jsx';
import { api } from '../services/api.js';
import { useDirectionalValue } from '../hooks/useMotion.js';

const PORTALS = {
  siswa: {
    id: 'siswa',
    label: 'Siswa',
    icon: GraduationCap,
    formTitle: 'Masuk Siswa',
    reversed: false,
    theme: 'portal-siswa',
  },
  bk: {
    id: 'bk',
    label: 'Guru BK',
    icon: HeartHandshake,
    formTitle: 'Masuk Guru BK',
    reversed: true,
    theme: 'portal-bk',
  },
  superadmin: {
    id: 'superadmin',
    label: 'Superadmin',
    icon: ShieldCheck,
    formTitle: 'Masuk Superadmin',
    reversed: false,
    theme: 'portal-admin',
  },
};

const PORTAL_ORDER = ['siswa', 'bk', 'superadmin'];

export default function StartPage() {
  const [tab, setTab] = useTab('masuk', ['masuk', 'daftar', 'status']),
    [portalKey, setPortalKey] = useState('siswa'),
    { login, user } = useAuth(),
    navigate = useNavigate(),
    [form, setForm] = useState({
      username: '',
      displayName: '',
      password: '',
      confirmation: '',
      classCode: '',
      consent: false,
    }),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [classContext, setClassContext] = useState(null),
    [busy, setBusy] = useState(false);

  const portal = PORTALS[portalKey];
  const submitting = useRef(false);
  const portalDir = useDirectionalValue(portalKey, PORTAL_ORDER);
  const tabDir = useDirectionalValue(tab, ['masuk', 'daftar', 'status']);
  const set = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const classValid = classContext?.code === form.classCode;
  const activeTab = portalKey === 'siswa' ? tab : 'masuk';

  const switchPortal = (nextPortal) => {
    setPortalKey(nextPortal);
    setError('');
    setMessage('');
    if (nextPortal !== 'siswa' && tab !== 'masuk') {
      setTab('masuk');
    }
  };

  async function submit(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (activeTab === 'masuk') {
        const u = await login(form.username, form.password);
        set('password', '');
        navigate(
          u.mustChangePassword
            ? '/mulai?panel=settings'
            : ['bk', 'superadmin'].includes(u.role)
              ? '/guru'
              : '/kenali-diriku'
        );
      } else if (activeTab === 'daftar') {
        const r = await api('/auth/register', { method: 'POST', body: form });
        setMessage(r.message);
        setForm((p) => ({ ...p, password: '', confirmation: '' }));
      } else if (activeTab === 'status') {
        const r = await api('/auth/status', {
          method: 'POST',
          body: { username: form.username, password: form.password },
        });
        setMessage(
          `Status: ${r.status}${r.registration?.rejection_reason ? ` · ${r.registration.rejection_reason}` : ''}`
        );
      }
    } catch (e) {
      setError(e.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <h1 className="sr-only">Masuk ke PILIHANKU</h1>
      <div className="auth-portal-bar" role="tablist" aria-label="Pilih menu masuk">
        {PORTAL_ORDER.map((key) => {
          const item = PORTALS[key];
          const Icon = item.icon;
          const active = portalKey === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={busy}
              className={`auth-portal-btn ${active ? 'is-active' : ''}`}
              onClick={() => switchPortal(key)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="auth-flip-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={portalKey}
            className={`auth-split-card ${portal.theme} ${portal.reversed ? 'is-reversed' : ''}`}
            initial={{ opacity: 0, rotateY: portalDir === 'forward' ? -14 : 14, scale: 0.98 }}
            animate={{ opacity: 1, rotateY: 0, scale: 1 }}
            exit={{ opacity: 0, rotateY: portalDir === 'forward' ? 14 : -14, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="auth-split-brand">
              <Link className="auth-brand-center" to="/" aria-label="PILIHANKU Beranda">
                <span className="auth-brand-icon" aria-hidden="true">
                  <Sprout size={26} strokeWidth={2.2} />
                </span>
                <span className="auth-brand-wordmark">PILIHANKU</span>
              </Link>
            </div>

            <div className="auth-split-form">
              {portalKey === 'siswa' && (
                <Tabs
                  value={activeTab === 'status' ? 'masuk' : activeTab}
                  onChange={(v) => {
                    setTab(v);
                    setMessage('');
                    setError('');
                  }}
                  items={[
                    ['masuk', 'Masuk'],
                    ['daftar', 'Daftar'],
                  ]}
                />
              )}
              <div key={activeTab} className={`tab-panel-enter tab-${tabDir}`}>
                <form onSubmit={submit} className="stack">
                  <div className="auth-form-title">
                    <h2>
                      {activeTab === 'daftar'
                        ? 'Daftar Siswa'
                        : activeTab === 'status'
                          ? 'Cek Status Akun'
                          : portal.formTitle}
                    </h2>
                  </div>
                  {activeTab === 'daftar' && (
                    <Notice>Akun siswa menunggu persetujuan superadmin.</Notice>
                  )}
                  <Field
                    label="Username"
                    required
                    minLength={3}
                    maxLength={30}
                    autoComplete="username"
                    placeholder="Username"
                    value={form.username}
                    onChange={(e) => set('username', e.target.value)}
                  />
                  {activeTab === 'daftar' && (
                    <Field
                      label="Nama panggilan"
                      required
                      maxLength={50}
                      autoComplete="nickname"
                      placeholder="Nama tampilan"
                      value={form.displayName}
                      onChange={(e) => set('displayName', e.target.value)}
                    />
                  )}
                  <Field
                    label={activeTab === 'daftar' ? 'Password (min. 12 karakter)' : 'Password'}
                    type="password"
                    required
                    minLength={activeTab === 'daftar' ? 12 : 1}
                    maxLength={128}
                    autoComplete={activeTab === 'daftar' ? 'new-password' : 'current-password'}
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                  />
                  {activeTab === 'daftar' && (
                    <>
                      <Field
                        label="Konfirmasi password"
                        type="password"
                        required
                        minLength={12}
                        maxLength={128}
                        autoComplete="new-password"
                        placeholder="Ulangi password"
                        value={form.confirmation}
                        onChange={(e) => set('confirmation', e.target.value)}
                      />
                      <div className="inline-check-group">
                        <Field
                          label="Kode kelas"
                          required
                          minLength={8}
                          maxLength={100}
                          placeholder="Kode dari sekolah"
                          value={form.classCode}
                          onChange={(e) => {
                            set('classCode', e.target.value);
                            set('consent', false);
                            setClassContext(null);
                          }}
                        />
                        <AsyncButton
                          type="button"
                          variant="outline"
                          disabled={form.classCode.length < 8}
                          action={async () =>
                            setClassContext({
                              ...(await api('/auth/class-context', {
                                method: 'POST',
                                body: { classCode: form.classCode },
                              })),
                              code: form.classCode,
                            })
                          }
                        >
                          Periksa kelas
                        </AsyncButton>
                      </div>
                      {classValid && (
                        <Notice type="success">
                          {classContext.label} ({classContext.academic_year}) · Retensi s.d.{' '}
                          {new Date(classContext.retention_end_at).toLocaleDateString('id-ID', {
                            timeZone: classContext.timezone,
                          })}
                        </Notice>
                      )}
                      <Check
                        label="Saya menyetujui penyimpanan data pendaftaran akun kelas"
                        required
                        disabled={!classValid}
                        checked={form.consent}
                        onChange={(e) => set('consent', e.target.checked)}
                      />
                      <Accordion summary="Info retensi & hapus data">
                        <p className="caption">
                          Data eksplorasi tersimpan setelah akun disetujui. Pengajuan belum aktif
                          disimpan maks. {classContext?.pendingRetentionDays || 90} hari atau akhir
                          retensi kelas.
                        </p>
                      </Accordion>
                    </>
                  )}
                  <Notice type="error">{error}</Notice>
                  <Notice type="success">{message}</Notice>
                  <div className="auth-btn-row">
                    <Button
                      loading={busy}
                      disabled={busy || (activeTab === 'daftar' && !classValid)}
                      variant=""
                      type="submit"
                    >
                      {busy && <span className="spinner-dot" aria-hidden="true" />}
                      <span>
                        {busy
                          ? 'Memproses…'
                          : activeTab === 'daftar'
                            ? 'Daftar'
                            : activeTab === 'status'
                              ? 'Periksa'
                              : 'Masuk'}
                      </span>
                      {!busy && <ArrowUpRight size={15} aria-hidden="true" />}
                    </Button>
                    <Link className="button outline" to="/">
                      <ArrowLeft size={14} aria-hidden="true" />
                      Beranda
                    </Link>
                  </div>
                  <div className="auth-subactions">
                    {portalKey === 'siswa' ? (
                      activeTab === 'status' ? (
                        <Button
                          type="button"
                          variant="plain"
                          onClick={() => {
                            setTab('masuk');
                            setMessage('');
                            setError('');
                          }}
                        >
                          Kembali ke Masuk
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="plain"
                          onClick={() => {
                            setTab('status');
                            setMessage('');
                            setError('');
                          }}
                        >
                          Cek status pendaftaran
                        </Button>
                      )
                    ) : null}
                    {user && <Link to="/mulai?panel=settings">Pengaturan</Link>}
                  </div>
                </form>
              </div>
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
