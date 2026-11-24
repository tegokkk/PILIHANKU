import { useState } from 'react';
import { useAuth } from '../context/auth.js';
import { useResource } from '../hooks/useResource.js';
import { useTab } from '../hooks/useTab.js';
import { api } from '../services/api.js';
import { categories, dimensions } from '../data/materials.js';
import {
  Heading,
  Tabs,
  Field,
  Check,
  Button,
  AsyncButton,
  Notice,
  Accordion,
  Panel,
  StatusBadge,
  MetaList,
  EmptyState,
  LoadingState,
  Pagination,
} from '../components/ui/index.jsx';
import { useDirectionalValue, useExitAction } from '../hooks/useMotion.js';

const previewLabels = {
  summary: 'Gambaran',
  activities: 'Kegiatan & contoh pekerjaan',
  subjects: 'Mapel pendukung',
  requirements: 'Syarat & cara masuk',
  duration: 'Lama tempuh',
  cost: 'Biaya',
  environment: 'Lingkungan kegiatan',
  reflection: 'Pertanyaan refleksi',
};

export default function ManagementPage() {
  const { user } = useAuth(),
    admin = user.role === 'superadmin';
  const allowedTabs = admin ? ['akun', 'kelas', 'layanan'] : ['bank', 'kelas'];
  const [tab, setTab] = useTab(admin ? 'akun' : 'bank', allowedTabs);
  const tabDir = useDirectionalValue(tab, allowedTabs);
  return (
    <>
      <Heading eyebrow={admin ? 'RUANG SUPERADMIN' : 'RUANG GURU BK'} title="Kelola Informasi">
        {admin
          ? 'Kelola akun BK, kelas, dan kesiapan layanan konsultasi.'
          : 'Perbarui bank informasi jalur dan kelas yang ditugaskan.'}
      </Heading>
      <Tabs
        value={tab}
        onChange={setTab}
        items={
          admin
            ? [
                ['akun', 'Akun BK & Siswa'],
                ['kelas', 'Kelas'],
                ['layanan', 'Layanan'],
              ]
            : [
                ['bank', 'Bank Informasi'],
                ['kelas', 'Kelas'],
              ]
        }
      />
      <div key={tab} className={`tab-panel-enter tab-${tabDir}`}>
        {tab === 'akun' ? (
          <Accounts />
        ) : tab === 'kelas' ? (
          <Classes admin={admin} />
        ) : tab === 'layanan' ? (
          <Service />
        ) : (
          <Bank />
        )}
      </div>
    </>
  );
}

function Accounts() {
  const [page, setPage] = useState(1),
    resource = useResource(`/admin/users?page=${page}`),
    [classesPage, setClassesPage] = useState(1),
    classes = useResource(`/classes?page=${classesPage}`),
    [selected, setSelected] = useState(null),
    [form, setForm] = useState({ username: '', displayName: '', password: '', classIds: [] }),
    [password, setPassword] = useState(''),
    [note, setNote] = useState(''),
    [classIds, setClassIds] = useState([]),
    [message, setMessage] = useState(''),
    [creating, setCreating] = useState(false),
    [asideExiting, triggerAsideExit, resetAsideExit] = useExitAction();
  const options = classes.data?.items || [];
  const set = (k, v) => setForm({ ...form, [k]: v });
  const hasAside = creating || Boolean(selected);
  return (
    <div className={`dashboard-layout ${hasAside ? 'has-detail' : ''}`}>
      <section className="surface stack">
        <div className="section-bar">
          <h2>Akun sekolah</h2>
          <Button
            onClick={() => {
              resetAsideExit();
              setCreating(true);
              setSelected(null);
            }}
          >
            Buat akun BK
          </Button>
        </div>
        <Notice type="error">{resource.error || classes.error}</Notice>
        <Notice type="success">{message}</Notice>
        {resource.loading ? (
          <LoadingState label="Memuat akun…" rows={3} />
        ) : resource.data?.items.length ? (
          <div className="list-stack">
            {resource.data.items.map((u) => (
              <button
                aria-pressed={!creating && selected?.id === u.id}
                className={`list-item ${!creating && selected?.id === u.id ? 'is-selected' : ''}`}
                key={u.id}
                onClick={() => {
                  resetAsideExit();
                  setSelected(u);
                  setClassIds(u.classIds);
                  setCreating(false);
                  setPassword('');
                  setNote('');
                }}
              >
                <span className="list-item-main">
                  <strong>{u.display_name}</strong>
                  <small>
                    {u.username_normalized} · {u.role}
                  </small>
                </span>
                <StatusBadge status={u.status} />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="Belum ada akun" description="Tambahkan akun BK untuk mulai." />
        )}
        <Pagination
          page={page}
          total={resource.data?.total}
          loading={resource.loading}
          onChange={(p) => {
            setPage(p);
            setSelected(null);
          }}
        />
      </section>
      {creating ? (
        <Panel
          as="aside"
          key="create-bk"
          exiting={asideExiting}
          direction="right"
          className="surface stack detail-aside"
        >
          <div className="section-bar">
            <h2>Buat akun BK</h2>
            <Button variant="plain" onClick={() => triggerAsideExit(() => setCreating(false))}>
              Batal
            </Button>
          </div>
          <p className="caption">
            Bagikan password awal lewat saluran aman. Guru wajib menggantinya saat masuk pertama.
          </p>
          <Field
            label="Username BK"
            minLength={3}
            maxLength={30}
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
          />
          <Field
            label="Nama tampilan BK"
            maxLength={50}
            value={form.displayName}
            onChange={(e) => set('displayName', e.target.value)}
          />
          <Field
            type="password"
            label="Password awal (12–128 karakter)"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
          />
          <fieldset>
            <legend>Penugasan kelas</legend>
            <Pagination
              page={classesPage}
              total={classes.data?.total}
              loading={classes.loading}
              onChange={setClassesPage}
            />
            {options.map((c) => (
              <Check
                key={c.id}
                label={`${c.label} · ${c.academic_year}`}
                checked={form.classIds.includes(c.id)}
                onChange={(e) =>
                  set(
                    'classIds',
                    e.target.checked
                      ? [...form.classIds, c.id]
                      : form.classIds.filter((id) => id !== c.id)
                  )
                }
              />
            ))}
          </fieldset>
          <AsyncButton
            action={async () => {
              await api('/admin/users/bk', { method: 'POST', body: form });
              setForm({ username: '', displayName: '', password: '', classIds: [] });
              setCreating(false);
              setMessage('Akun BK dibuat. Password awal wajib diganti.');
              await resource.reload();
            }}
          >
            Buat akun
          </AsyncButton>
        </Panel>
      ) : (
        selected && (
          <Panel
            as="aside"
            key={selected.id}
            exiting={asideExiting}
            direction="right"
            className="surface stack detail-aside"
          >
            <div className="section-bar">
              <h2>{selected.display_name}</h2>
              <Button variant="plain" onClick={() => triggerAsideExit(() => setSelected(null))}>
                Tutup
              </Button>
            </div>
            <MetaList
              items={[
                ['Username', selected.username_normalized],
                ['Peran', selected.role],
                ['Status', <StatusBadge key="st" status={selected.status} />],
              ]}
            />
            {['approved', 'suspended'].includes(selected.status) && (
              <AsyncButton
                variant={selected.status === 'approved' ? 'danger' : 'outline'}
                action={async () => {
                  await api(`/admin/users/${selected.id}/status`, {
                    method: 'PATCH',
                    body: { status: selected.status === 'approved' ? 'suspended' : 'approved' },
                  });
                  setSelected(null);
                  setMessage('Status akun diubah dan sesi lama dicabut.');
                  await resource.reload();
                }}
              >
                {selected.status === 'approved' ? 'Nonaktifkan akun' : 'Aktifkan kembali'}
              </AsyncButton>
            )}
            {selected.role === 'bk' && (
              <div className="stack-tight">
                <hr />
                <h3>Penugasan kelas</h3>
                <Pagination
                  page={classesPage}
                  total={classes.data?.total}
                  loading={classes.loading}
                  onChange={setClassesPage}
                />
                {options.map((c) => (
                  <Check
                    key={c.id}
                    label={`${c.label} · ${c.academic_year}`}
                    checked={classIds.includes(c.id)}
                    onChange={(e) =>
                      setClassIds(
                        e.target.checked
                          ? [...classIds, c.id]
                          : classIds.filter((id) => id !== c.id)
                      )
                    }
                  />
                ))}
                <AsyncButton
                  variant="outline"
                  action={async () => {
                    await api(`/admin/users/${selected.id}/assignments`, {
                      method: 'PUT',
                      body: { classIds },
                    });
                    setMessage('Penugasan disimpan; guru perlu masuk kembali.');
                    await resource.reload();
                  }}
                >
                  Simpan penugasan
                </AsyncButton>
              </div>
            )}
            <div className="stack-tight">
              <hr />
              <h3>Reset akses terverifikasi</h3>
              <p className="caption">
                Pastikan identitas telah diverifikasi sesuai prosedur sekolah.
              </p>
              <Field
                label="Catatan verifikasi (minimal 10 karakter)"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Field
                type="password"
                label="Password sementara baru (12–128 karakter)"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <AsyncButton
                variant="outline"
                action={async () => {
                  await api(`/admin/users/${selected.id}/reset`, {
                    method: 'POST',
                    body: { password, verificationNote: note },
                  });
                  setPassword('');
                  setNote('');
                  setMessage('Reset tersimpan. Sesi lama dicabut; password awal harus diganti.');
                }}
              >
                Reset akses
              </AsyncButton>
            </div>
          </Panel>
        )
      )}
    </div>
  );
}

function Classes({ admin }) {
  const [page, setPage] = useState(1),
    resource = useResource(`/classes?page=${page}`),
    [form, setForm] = useState({
      label: '',
      grade: 'XI',
      academicYear: '2026/2027',
      retentionEnd: '',
    }),
    [creating, setCreating] = useState(false),
    [createExiting, triggerCreateExit, resetCreateExit] = useExitAction();
  return (
    <section className="surface stack">
      <div className="section-bar">
        <h2>Kelas berwenang</h2>
        {admin && (
          <Button
            variant={creating ? 'plain' : 'outline'}
            onClick={() => {
              if (creating) triggerCreateExit(() => setCreating(false));
              else {
                resetCreateExit();
                setCreating(true);
              }
            }}
          >
            {creating ? 'Batal' : 'Tambah kelas'}
          </Button>
        )}
      </div>
      <Notice type="error">{resource.error}</Notice>
      <Pagination
        page={page}
        total={resource.data?.total}
        loading={resource.loading}
        onChange={setPage}
      />
      {creating && (
        <Panel as="div" exiting={createExiting} direction="up" className="sub-card stack">
          <h3>Kelas baru</h3>
          <div className="grid-two">
            <Field
              label="Label kelas"
              maxLength={100}
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
            <Field
              as="select"
              label="Tingkat"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            >
              <option>XI</option>
              <option>XII</option>
            </Field>
            <Field
              label="Tahun ajaran"
              maxLength={20}
              value={form.academicYear}
              onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
            />
            <Field
              type="date"
              label="Akhir retensi (UTC)"
              value={form.retentionEnd}
              onChange={(e) => setForm({ ...form, retentionEnd: e.target.value })}
            />
          </div>
          <div className="action-row">
            <AsyncButton
              action={async () => {
                await api('/classes', {
                  method: 'POST',
                  body: { ...form, retentionEnd: `${form.retentionEnd}T23:59:59.000Z` },
                });
                setCreating(false);
                await resource.reload();
              }}
            >
              Simpan kelas
            </AsyncButton>
          </div>
        </Panel>
      )}
      {resource.loading ? (
        <LoadingState label="Memuat kelas…" rows={2} />
      ) : resource.data?.items.length ? (
        resource.data.items.map((c) => (
          <article className="class-item" key={c.id}>
            <div className="class-item-info">
              <div className="row">
                <h3>
                  {c.label} · {c.academic_year}
                </h3>
                <StatusBadge status={c.active ? 'Aktif' : 'Tidak aktif'} />
              </div>
              <p className="caption">
                Akhir retensi: {new Date(c.retention_end_at).toLocaleDateString('id-ID')} · Data
                dihapus sesuai tenggat.
              </p>
            </div>
            <div className="action-row">
              {admin && (
                <AsyncButton
                  variant="outline"
                  action={() =>
                    api(`/classes/${c.id}`, { method: 'PATCH', body: { active: !c.active } })
                  }
                  onSuccess={resource.reload}
                >
                  {c.active ? 'Nonaktifkan kelas' : 'Aktifkan kelas'}
                </AsyncButton>
              )}
            </div>
          </article>
        ))
      ) : (
        <EmptyState
          title="Belum ada kelas"
          description="Tambahkan kelas untuk membuka pendaftaran siswa."
        />
      )}
    </section>
  );
}

function Service() {
  const resource = useResource('/classes/service'),
    [form, setForm] = useState(null),
    [message, setMessage] = useState('');
  const value = form || {
    contact: resource.data?.service_contact || '',
    hours: resource.data?.service_hours || '',
    timezone: resource.data?.timezone || 'Asia/Jakarta',
    enabled: resource.data?.service_enabled || false,
  };
  return (
    <section className="surface stack form-constrained">
      <h2>Kesiapan layanan konsultasi</h2>
      <p className="caption">
        Layanan konsultasi aktif setelah kontak dan jam layanan sekolah ditetapkan.
      </p>
      <Notice type="error">{resource.error}</Notice>
      {[
        ['contact', 'Kontak sekolah'],
        ['hours', 'Jam layanan'],
        ['timezone', 'Zona waktu IANA sekolah'],
      ].map(([k, label]) => (
        <Field
          key={k}
          label={label}
          maxLength={200}
          value={value[k]}
          onChange={(e) => setForm({ ...value, [k]: e.target.value })}
        />
      ))}
      <Check
        label="Aktifkan pengiriman konsultasi ke sekolah ini"
        checked={value.enabled}
        onChange={(e) => setForm({ ...value, enabled: e.target.checked })}
      />
      <div className="action-row">
        <AsyncButton
          action={async () => {
            await api('/classes/service', { method: 'PUT', body: value });
            setMessage('Konfigurasi layanan disimpan.');
            await resource.reload();
          }}
        >
          Simpan layanan
        </AsyncButton>
      </div>
      <Notice type="success">{message}</Notice>
    </section>
  );
}

const blankCard = () => ({
  title: '',
  category: 'Kuliah',
  status: 'draft',
  revision: 0,
  verifiedAt: null,
  data: {
    summary: '',
    interests: [],
    activities: '',
    subjects: '',
    requirements: '',
    duration: '',
    cost: '',
    environment: '',
    reflection: '',
    sources: [],
    officialSourceConfirmed: false,
  },
});

function Bank() {
  const [page, setPage] = useState(1),
    resource = useResource(`/teacher/cards?page=${page}`),
    [reportsPage, setReportsPage] = useState(1),
    reports = useResource(`/teacher/cards/reports?page=${reportsPage}`),
    [editor, setEditor] = useState(null),
    [id, setId] = useState(null),
    [archive, setArchive] = useState(false),
    [preview, setPreview] = useState(false),
    [message, setMessage] = useState(''),
    [editorExiting, triggerEditorExit, resetEditorExit] = useExitAction();
  const save = async (status) => {
    await api(id ? `/teacher/cards/${id}` : '/teacher/cards', {
      method: id ? 'PUT' : 'POST',
      body: {
        ...editor,
        status,
        data: { ...editor.data, sources: editor.data.sources.map((s) => s.trim()).filter(Boolean) },
      },
    });
    setEditor(null);
    setArchive(false);
    setMessage('Kartu tersimpan di server. Salinan lama pada pilihan siswa tetap dipertahankan.');
    await resource.reload();
  };
  return (
    <section className="surface stack">
      <Notice type="error">{resource.error}</Notice>
      <Notice type="success">{message}</Notice>
      {editor ? (
        <Panel
          as="div"
          key={archive ? 'archive' : preview ? 'preview' : id || 'new'}
          exiting={editorExiting}
          direction="right"
          className="stack"
        >
          <div className="section-bar">
            <h2>
              {archive
                ? 'Konfirmasi arsip'
                : preview
                  ? 'Pratinjau kartu'
                  : id
                    ? 'Edit kartu jalur'
                    : 'Kartu baru'}
            </h2>
            <Button
              variant="plain"
              onClick={() =>
                triggerEditorExit(() => {
                  setEditor(null);
                  setArchive(false);
                  setPreview(false);
                })
              }
            >
              Kembali ke daftar
            </Button>
          </div>
          {archive ? (
            <>
              <p>
                Kartu <strong>{editor.title}</strong> tidak akan tampil di katalog baru setelah
                diarsipkan. Salinan pada pilihan siswa tetap dipertahankan.
              </p>
              <div className="action-row">
                <AsyncButton variant="danger" action={() => save('archived')}>
                  Konfirmasi arsip
                </AsyncButton>
                <Button variant="outline" onClick={() => setArchive(false)}>
                  Batal
                </Button>
              </div>
            </>
          ) : preview ? (
            <>
              <div className="row">
                <h3>{editor.title || 'Tanpa judul'}</h3>
                <span className="badge">{editor.category}</span>
              </div>
              <MetaList
                items={[
                  ...Object.entries(editor.data)
                    .filter(
                      ([k]) => !['interests', 'sources', 'officialSourceConfirmed'].includes(k)
                    )
                    .map(([k, v]) => [previewLabels[k] || k, v || 'Belum tersedia']),
                  ['Sumber', editor.data.sources.join(', ') || 'Belum tersedia'],
                  ['Tanggal verifikasi', editor.verifiedAt || 'Belum diverifikasi'],
                ]}
              />
              <div className="action-row">
                <Button variant="outline" onClick={() => setPreview(false)}>
                  Kembali ke editor
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="grid-two">
                <Field
                  label="Judul"
                  maxLength={100}
                  value={editor.title}
                  onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                />
                <Field
                  as="select"
                  label="Kategori"
                  value={editor.category}
                  onChange={(e) => setEditor({ ...editor, category: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Field>
              </div>
              {[
                ['summary', 'Gambaran'],
                ['activities', 'Kegiatan dan contoh pekerjaan'],
                ['subjects', 'Mapel pendukung'],
                ['requirements', 'Syarat dan cara masuk'],
              ].map(([k, label]) => (
                <Field
                  key={k}
                  as="textarea"
                  label={label}
                  rows={3}
                  maxLength={k === 'subjects' ? 1000 : 2000}
                  value={editor.data[k]}
                  onChange={(e) =>
                    setEditor({ ...editor, data: { ...editor.data, [k]: e.target.value } })
                  }
                />
              ))}
              <div className="grid-two">
                <Field
                  as="textarea"
                  label="Lama tempuh (sertakan sumber)"
                  rows={3}
                  maxLength={500}
                  value={editor.data.duration}
                  onChange={(e) =>
                    setEditor({ ...editor, data: { ...editor.data, duration: e.target.value } })
                  }
                />
                <Field
                  as="textarea"
                  label="Biaya (satuan, periode, tahun, sumber)"
                  rows={3}
                  maxLength={1000}
                  value={editor.data.cost}
                  onChange={(e) =>
                    setEditor({ ...editor, data: { ...editor.data, cost: e.target.value } })
                  }
                />
                <Field
                  as="textarea"
                  label="Lingkungan kegiatan"
                  rows={3}
                  maxLength={1000}
                  value={editor.data.environment}
                  onChange={(e) =>
                    setEditor({ ...editor, data: { ...editor.data, environment: e.target.value } })
                  }
                />
                <Field
                  as="textarea"
                  label="Pertanyaan refleksi"
                  rows={3}
                  maxLength={500}
                  value={editor.data.reflection}
                  onChange={(e) =>
                    setEditor({ ...editor, data: { ...editor.data, reflection: e.target.value } })
                  }
                />
              </div>
              <fieldset>
                <legend>Penanda minat RIASEC</legend>
                <div className="grid-two">
                  {Object.entries(dimensions).map(([k, label]) => (
                    <Check
                      key={k}
                      label={`${k} · ${label}`}
                      checked={editor.data.interests.includes(k)}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          data: {
                            ...editor.data,
                            interests: e.target.checked
                              ? [...editor.data.interests, k]
                              : editor.data.interests.filter((v) => v !== k),
                          },
                        })
                      }
                    />
                  ))}
                </div>
              </fieldset>
              <div className="grid-two">
                <Field
                  as="textarea"
                  rows={3}
                  label="Sumber resmi HTTPS (satu per baris)"
                  value={editor.data.sources.join('\n')}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      data: { ...editor.data, sources: e.target.value.split('\n') },
                    })
                  }
                />
                <Field
                  type="date"
                  label="Tanggal verifikasi substansi"
                  value={editor.verifiedAt || ''}
                  onChange={(e) => setEditor({ ...editor, verifiedAt: e.target.value || null })}
                />
              </div>
              <Check
                label="Saya sudah memeriksa substansi dan memastikan sumber resmi mendukung isi kartu ini"
                checked={editor.data.officialSourceConfirmed}
                onChange={(e) =>
                  setEditor({
                    ...editor,
                    data: { ...editor.data, officialSourceConfirmed: e.target.checked },
                  })
                }
              />
              <div className="action-row">
                <AsyncButton action={() => save('published')}>Terbitkan</AsyncButton>
                <AsyncButton variant="outline" action={() => save('draft')}>
                  Simpan draf
                </AsyncButton>
                <Button variant="outline" onClick={() => setPreview(true)}>
                  Pratinjau
                </Button>
                {id && (
                  <Button variant="danger" onClick={() => setArchive(true)}>
                    Arsipkan
                  </Button>
                )}
              </div>
            </>
          )}
        </Panel>
      ) : (
        <div className="stack tab-panel-enter">
          <div className="section-bar">
            <h2>Bank Informasi</h2>
            <Pagination
              page={page}
              total={resource.data?.total}
              loading={resource.loading}
              onChange={setPage}
            />
            <Button
              onClick={() => {
                resetEditorExit();
                setEditor(blankCard());
                setId(null);
              }}
            >
              Tambah kartu
            </Button>
          </div>
          {reports.data?.items.length > 0 && (
            <Accordion summary={`Laporan sumber (${reports.data.total})`}>
              <Pagination
                page={reportsPage}
                total={reports.data.total}
                loading={reports.loading}
                onChange={setReportsPage}
              />
              {reports.data.items.map((r) => (
                <div className="class-item" key={r.id}>
                  <div className="class-item-info">
                    <strong>{r.title}</strong>
                    <p className="caption">
                      {r.issue === 'unavailable'
                        ? 'Tautan tidak tersedia'
                        : 'Informasi perlu diperbarui'}
                    </p>
                  </div>
                  <AsyncButton
                    variant="outline"
                    action={async () => {
                      await api(`/teacher/cards/reports/${r.id}/resolve`, {
                        method: 'POST',
                        body: {},
                      });
                      await reports.reload();
                    }}
                  >
                    Tandai ditangani
                  </AsyncButton>
                </div>
              ))}
            </Accordion>
          )}
          {resource.loading ? (
            <LoadingState label="Memuat kartu…" rows={3} />
          ) : resource.data?.items.length ? (
            <div className="list-stack">
              {resource.data.items.map((c) => (
                <button
                  className="list-item"
                  key={c.id}
                  onClick={() => {
                    resetEditorExit();
                    setId(c.id);
                    setEditor({
                      title: c.title,
                      category: c.category,
                      status: c.status,
                      revision: c.version,
                      verifiedAt: c.verified_at?.slice(0, 10) || null,
                      data: c.data,
                    });
                  }}
                >
                  <span className="list-item-main">
                    <strong>{c.title}</strong>
                    <small>
                      {c.category} · versi {c.version} · verifikasi {c.verified_at || 'belum'}
                    </small>
                  </span>
                  <StatusBadge status={c.status} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada kartu"
              description="Tambahkan kartu jalur; draf tidak tampil di katalog siswa."
            />
          )}
        </div>
      )}
    </section>
  );
}
