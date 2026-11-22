import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth.js';
import { useExploration } from '../../context/exploration.js';
import {
  Button,
  Field,
  Check,
  Heading,
  Notice,
  AsyncButton,
  Panel,
  Accordion,
  MetaList,
} from '../../components/ui/index.jsx';
import { api, clearCsrf } from '../../services/api.js';
import { useExitAction } from '../../hooks/useMotion.js';

export function PrivacyPanel({ type }) {
  const { user, refresh } = useAuth(),
    e = useExploration(),
    [params, setParams] = useSearchParams(),
    navigate = useNavigate(),
    [confirm, setConfirm] = useState(false),
    [form, setForm] = useState({ current: '', password: '', confirmation: '' }),
    [message, setMessage] = useState(''),
    [exiting, triggerExit] = useExitAction();

  const close = () => {
    triggerExit(() => {
      const next = new URLSearchParams(params);
      next.delete('panel');
      setParams(next);
    });
  };

  const retentionLabel = user?.class?.retention_end_at
    ? new Date(user.class.retention_end_at).toLocaleDateString('id-ID')
    : 'Ditetapkan sekolah';

  return (
    <Panel key={type} exiting={exiting} direction="up" className="surface narrow stack">
      <div className="section-bar">
        <Button variant="plain" onClick={close}>
          Kembali ke halaman
        </Button>
      </div>
      <Heading
        eyebrow="KENDALI DATAMU"
        title={type === 'privacy' ? 'Privasi' : 'Pengaturan Data'}
      />
      <MetaList
        items={[
          [
            'Penggunaan data',
            'Jawaban dipakai untuk refleksi pribadi. Guru hanya melihat bagian yang kamu pilih saat konsultasi.',
          ],
          [
            'Agregat kelas',
            'Persetujuan agregat terpisah dari berbagi konsultasi; kelompok kecil disembunyikan server.',
          ],
          ['Akhir retensi', retentionLabel],
        ]}
      />
      <Accordion summary="Detail retensi & tata kelola">
        <p className="caption">
          Superadmin meninjau metadata akun tanpa akses rutin ke refleksi privat. Mode Tamu
          dinonaktifkan dan draf lama tidak diunggah ke akun. Cadangan produksi maksimal 30 hari
          dikelola operator; audit operasional maksimal 90 hari. Kontak dan jam layanan berasal dari
          sekolah tujuan.
        </p>
      </Accordion>
      {user && type === 'settings' && (
        <>
          <hr />
          <div className="stack-tight">
            <h2>Lokasi penyimpanan</h2>
            <p className="caption">
              {e.account ? 'Akun kelas di server' : 'Akun pengelola di server'}
            </p>
            {e.account && (
              <Check
                label="Saya mengizinkan kontribusi agregat anonim kelas"
                checked={e.aggregateConsent}
                onChange={(ev) => e.contribute(ev.target.checked)}
              />
            )}
          </div>
          <hr />
          <div className="stack-tight">
            <h2>Ganti password</h2>
            <p className="caption">
              Password awal/reset wajib diganti. Sesi lama akan dicabut setelah berhasil.
            </p>
            {[
              ['current', 'Password saat ini'],
              ['password', 'Password baru (12–128 karakter)'],
              ['confirmation', 'Konfirmasi password baru'],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                type="password"
                autoComplete={key === 'current' ? 'current-password' : 'new-password'}
                value={form[key]}
                onChange={(ev) => setForm({ ...form, [key]: ev.target.value })}
              />
            ))}
            <div className="action-row">
              <AsyncButton
                action={async () => {
                  await api('/auth/password', { method: 'POST', body: form });
                  clearCsrf();
                  setForm({ current: '', password: '', confirmation: '' });
                  setMessage('Password berhasil diganti. Silakan masuk kembali.');
                  await refresh();
                }}
              >
                Ganti password
              </AsyncButton>
            </div>
          </div>
          {user.role === 'siswa' && (
            <>
              <hr />
              <div className="stack-tight">
                <h2>Hapus data</h2>
                <p className="caption">
                  Menghapus akun siswa, refleksi, matriks, rencana, permintaan, salinan berbagi
                  aktif, dan sesi tanpa izin guru. Salinan yang sudah diunduh penerima tidak dapat
                  ditarik sistem.
                </p>
                <Check
                  label="Saya sudah meninjau cakupan dan ingin menghapus akun permanen"
                  checked={confirm}
                  onChange={(ev) => setConfirm(ev.target.checked)}
                />
                <div className="action-row">
                  <AsyncButton
                    variant="danger"
                    disabled={!confirm}
                    action={async () => {
                      await e.erase();
                      if (e.account) {
                        clearCsrf();
                        await refresh();
                      }
                      try {
                        sessionStorage.removeItem('pilihanku.mode');
                      } catch {
                        /* Optional legacy preference. */
                      }
                      navigate('/mulai');
                    }}
                  >
                    Hapus akun dan data
                  </AsyncButton>
                </div>
              </div>
            </>
          )}
        </>
      )}
      <Notice type="success">{message}</Notice>
    </Panel>
  );
}
