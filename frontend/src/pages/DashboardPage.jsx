import { useRef, useState } from 'react';
import { useAuth } from '../context/auth.js';
import { useResource } from '../hooks/useResource.js';
import { useTab } from '../hooks/useTab.js';
import { api } from '../services/api.js';
import {
  Heading,
  Tabs,
  Field,
  Button,
  Notice,
  AsyncButton,
  JsonSection,
  Accordion,
  Panel,
  LoadingState,
  StatusBadge,
  MetaList,
  EmptyState,
  Pagination,
} from '../components/ui/index.jsx';
import { useDirectionalValue, useExitAction } from '../hooks/useMotion.js';

const shareLabels = {
  reflection: 'Refleksi',
  comparison: 'Matriks',
  plan: 'Rencana',
  discussion: 'Musyawarah',
};

const activityLabels = {
  'registration.approved': 'Pendaftaran siswa disetujui',
  'registration.rejected': 'Pendaftaran siswa ditolak',
  'user.bk.created': 'Akun Guru BK dibuat',
  'user.status.updated': 'Status akun diubah',
  'user.assignments.updated': 'Penugasan kelas BK diperbarui',
  'user.access.reset': 'Reset akses akun terverifikasi',
  'class.created': 'Kelas baru ditambahkan',
  'class.code.rotated': 'Kode kelas dirotasi',
  'class.code.disabled': 'Kode kelas dinonaktifkan',
  'consultation.created': 'Permintaan konsultasi dikirim',
  'consultation.Ditinjau': 'Konsultasi ditinjau BK',
  'consultation.Dijadwalkan': 'Konsultasi dijadwalkan BK',
  'consultation.Selesai': 'Konsultasi ditandai selesai',
  'consultation.Dibatalkan': 'Konsultasi dibatalkan',
  'consultation.cancelled': 'Konsultasi dibatalkan pengirim',
  'consultation.share.withdrawn': 'Bagian berbagi ditarik siswa',
};

export default function DashboardPage() {
  const { user } = useAuth();
  return user.role === 'superadmin' ? <Approvals /> : <TeacherDashboard />;
}

function Approvals() {
  const [status, setStatus] = useState('pending'),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [reason, setReason] = useState(''),
    [message, setMessage] = useState(''),
    [detailExiting, triggerDetailExit, resetDetailExit] = useExitAction();
  const statusDir = useDirectionalValue(status, ['pending', 'approved', 'rejected', 'aktivitas']);
  const regStatus = status === 'aktivitas' ? 'pending' : status;
  const resource = useResource(`/admin/registrations?status=${regStatus}&page=${page}`);
  const activity = useResource('/admin/registrations/activity');
  const decide = async (action) => {
    const result = await api(`/admin/registrations/${selected.id}/${action}`, {
      method: 'POST',
      body: action === 'reject' ? { reason } : {},
    });
    setMessage(`Keputusan tersimpan di server: ${result.status}.`);
    setSelected(null);
    setReason('');
    await Promise.all([resource.reload(), activity.reload()]);
  };
  return (
    <>
      <Heading eyebrow="RUANG SUPERADMIN" title="Pendaftaran Siswa">
        Tinjau pengajuan akun siswa berdasarkan kelas tujuan. Refleksi privat siswa tidak dibuka di
        sini.
      </Heading>
      <Tabs
        value={status}
        onChange={(s) => {
          resetDetailExit();
          setStatus(s);
          setPage(1);
          setSelected(null);
        }}
        items={[
          ['pending', 'Menunggu'],
          ['approved', 'Disetujui'],
          ['rejected', 'Ditolak'],
          ['aktivitas', 'Riwayat Aktivitas'],
        ]}
      />
      <Notice type="error">{status === 'aktivitas' ? activity.error : resource.error}</Notice>
      <Notice type="success">{message}</Notice>
      {status === 'aktivitas' ? (
        <section key="aktivitas" className={`surface stack tab-panel-enter tab-${statusDir}`}>
          <div className="section-bar">
            <h2>Riwayat aktivitas & keputusan</h2>
            <Button variant="outline" onClick={activity.reload}>
              Muat terbaru
            </Button>
          </div>
          <Notice>
            Sesuai prinsip privasi PILIHANKU, superadmin hanya melihat metadata keputusan dan
            aktivitas layanan — bukan isi refleksi atau jawaban privat siswa.
          </Notice>
          {activity.loading ? (
            <LoadingState label="Memuat riwayat aktivitas…" rows={3} />
          ) : activity.data?.items.length ? (
            <div className="list-stack">
              {activity.data.items.map((ev) => (
                <div className="list-item" key={ev.id}>
                  <span className="list-item-main">
                    <strong>{activityLabels[ev.action] || ev.action}</strong>
                    <small>
                      Oleh {ev.actor_name} ({ev.actor_role}) ·{' '}
                      {new Date(ev.created_at).toLocaleString('id-ID')}
                    </small>
                  </span>
                  <span className="badge">{ev.actor_role}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada aktivitas"
              description="Riwayat keputusan pendaftaran dan aktivitas layanan akan tercatat di sini."
            />
          )}
        </section>
      ) : (
        <div
          key={status}
          className={`dashboard-layout ${selected ? 'has-detail' : ''} tab-panel-enter tab-${statusDir}`}
        >
          <section className="surface stack">
            <div className="section-bar">
              <h2>{status === 'pending' ? 'Antrean pendaftaran' : 'Riwayat keputusan'}</h2>
              <span className="badge">{resource.data?.total ?? '…'} pengajuan</span>
            </div>
            {resource.loading ? (
              <LoadingState label="Memuat pendaftaran…" rows={3} />
            ) : resource.data?.items.length ? (
              <div className="list-stack">
                {resource.data.items.map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={selected?.id === item.id}
                    className={`list-item ${selected?.id === item.id ? 'is-selected' : ''}`}
                    onClick={() => {
                      resetDetailExit();
                      setSelected(item);
                      setReason('');
                    }}
                  >
                    <span className="list-item-main">
                      <strong>{item.display_name}</strong>
                      <small>
                        {item.username_normalized} · {item.label}
                      </small>
                      <small>{new Date(item.submitted_at).toLocaleString('id-ID')}</small>
                    </span>
                    <StatusBadge status={item.status} />
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Belum ada pengajuan"
                description="Tidak ada pendaftaran siswa pada status ini."
              />
            )}
            <div className="pagination-bar">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Sebelumnya
              </Button>
              <span className="caption">Halaman {page}</span>
              <Button
                variant="outline"
                disabled={page * 20 >= (resource.data?.total || 0)}
                onClick={() => setPage(page + 1)}
              >
                Berikutnya
              </Button>
            </div>
          </section>
          {selected && (
            <Panel
              as="aside"
              key={selected.id}
              exiting={detailExiting}
              direction="right"
              className="surface stack detail-aside"
            >
              <div className="section-bar">
                <h2>Detail pengajuan</h2>
                <Button variant="plain" onClick={() => triggerDetailExit(() => setSelected(null))}>
                  Tutup
                </Button>
              </div>
              <MetaList
                items={[
                  ['Nama tampilan', selected.display_name],
                  ['Username', selected.username_normalized],
                  ['Kelas tujuan', `${selected.label} · ${selected.academic_year}`],
                  ['Status', <StatusBadge key="st" status={selected.status} />],
                ]}
              />
              <p className="caption">
                Persetujuan akun tidak menggantikan persetujuan siswa/wali sesuai tata kelola
                sekolah.
              </p>
              {selected.status === 'pending' ? (
                <div className="stack">
                  <AsyncButton action={() => decide('approve')}>Setujui pendaftaran</AsyncButton>
                  <hr />
                  <Field
                    label="Alasan penolakan singkat"
                    as="textarea"
                    rows={3}
                    minLength={3}
                    maxLength={200}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <AsyncButton
                    variant="danger"
                    disabled={reason.trim().length < 3}
                    action={() => decide('reject')}
                  >
                    Tolak pendaftaran
                  </AsyncButton>
                </div>
              ) : (
                <Notice>{selected.rejection_reason || 'Keputusan sudah ditetapkan.'}</Notice>
              )}
            </Panel>
          )}
        </div>
      )}
    </>
  );
}

function TeacherDashboard() {
  const [tab, setTab] = useTab('ringkasan', ['ringkasan', 'permintaan', 'riwayat']),
    [classesPage, setClassesPage] = useState(1),
    classes = useResource(`/classes?page=${classesPage}`),
    [page, setPage] = useState(1),
    [classId, setClassId] = useState(''),
    [detail, setDetail] = useState(null),
    [error, setError] = useState(''),
    [statusFilter, setStatusFilter] = useState(''),
    [sectionFilter, setSectionFilter] = useState(''),
    [status, setStatus] = useState('Ditinjau'),
    [schedule, setSchedule] = useState({ date: '', time: '', place: '' }),
    [detailExiting, triggerDetailExit, resetDetailExit] = useExitAction();
  const inboxQuery = new URLSearchParams({ page: String(page) });
  if (tab === 'permintaan' && statusFilter) inboxQuery.set('status', statusFilter);
  if (tab === 'riwayat') inboxQuery.set('section', sectionFilter || 'any');
  const inbox = useResource('/teacher/consultations?' + inboxQuery);
  const summaryResource = useResource(classId ? `/teacher/classes/${classId}/summary` : null);
  const summary = summaryResource.data;
  const detailSequence = useRef(0);
  const tabDir = useDirectionalValue(tab, ['ringkasan', 'permintaan', 'riwayat']);
  async function open(id) {
    const request = ++detailSequence.current;
    setDetail(null);
    try {
      resetDetailExit();
      const row = await api(`/teacher/consultations/${id}`);
      if (request !== detailSequence.current) return;
      setDetail(row);
      setStatus(
        {
          Baru: ['Ditinjau'],
          Ditinjau: ['Dijadwalkan'],
          Dijadwalkan: ['Ditinjau'],
          Selesai: [],
          Dibatalkan: [],
        }[row.status][0] || ''
      );
      setSchedule({
        date: row.schedule?.date || '',
        time: row.schedule?.time || '',
        place: row.schedule?.place || '',
      });
      setError('');
    } catch (e) {
      if (request === detailSequence.current) setError(e.message);
    }
  }
  const transitions = {
    Baru: ['Ditinjau', 'Dibatalkan'],
    Ditinjau: ['Dijadwalkan', 'Selesai', 'Dibatalkan'],
    Dijadwalkan: ['Ditinjau', 'Selesai', 'Dibatalkan'],
    Selesai: [],
    Dibatalkan: [],
  };
  const visibleInbox = (inbox.data?.items || []).filter(
    (x) => !statusFilter || x.status === statusFilter
  );
  const sharedHistory = (inbox.data?.items || []).filter(
    (x) =>
      (x.shared_sections?.length || 0) > 0 &&
      (!sectionFilter || x.shared_sections.includes(sectionFilter))
  );
  return (
    <>
      <Heading eyebrow="RUANG GURU BK" title="Dampingi langkah mereka">
        Pantau ringkasan kelas secara anonim, tindak lanjuti konsultasi, dan lihat jawaban yang
        dibagikan siswa.
      </Heading>
      <Tabs
        value={tab}
        onChange={(v) => {
          resetDetailExit();
          setTab(v);
          detailSequence.current++;
          setPage(1);
          setDetail(null);
        }}
        items={[
          ['ringkasan', 'Ringkasan Kelas'],
          ['permintaan', 'Permintaan'],
          ['riwayat', 'Riwayat Jawaban'],
        ]}
      />
      <Notice type="error">{error || classes.error || inbox.error || summaryResource.error}</Notice>
      <div key={tab} className={`tab-panel-enter tab-${tabDir}`}>
        {tab === 'ringkasan' ? (
          <section className="surface stack">
            <Pagination
              page={classesPage}
              total={classes.data?.total}
              loading={classes.loading}
              onChange={setClassesPage}
            />
            <div className="filter-control">
              <Field
                as="select"
                label="Kelas dan tahun ajaran berwenang"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                }}
              >
                <option value="">Pilih kelas</option>
                {classes.data?.items.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.label} · {c.academic_year}
                  </option>
                ))}
              </Field>
            </div>
            {summary?.suppressed ? (
              <Notice>Data belum cukup untuk ditampilkan secara aman.</Notice>
            ) : summary ? (
              <div className="stack tab-panel-enter">
                <div className="stats-grid">
                  {[
                    ['Kontributor unik', summary.contributors],
                    ['Memulai eksplorasi', summary.started],
                    ['Memiliki ≥3 langkah', summary.plans],
                  ].map(([label, count], idx) => (
                    <div className="stat" key={label} style={{ '--stagger': idx }}>
                      <span>{label}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
                <div className="stack-tight">
                  <h2>Kategori yang dijelajahi</h2>
                  <p className="caption">Satu siswa dapat menjelajahi lebih dari satu kategori.</p>
                  {Object.entries(summary.categories).map(([name, count]) => (
                    <div className="aggregate-bar" key={name}>
                      <span>{name}</span>
                      <div className="progress-wrapper compact">
                        <progress aria-label={name} value={count} max={summary.contributors} />
                        <div className="progress-track" aria-hidden="true">
                          <div
                            className="progress-fill"
                            style={{
                              transform: `scaleX(${summary.contributors ? count / summary.contributors : 0})`,
                            }}
                          />
                        </div>
                      </div>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
                <div className="stack-tight">
                  <h2>Topik kebutuhan yang dikirim</h2>
                  <p className="caption">
                    Jumlah siswa unik per topik dari permintaan aktif yang menyetujui agregat.
                  </p>
                  <div className="meta-list">
                    {Object.entries(summary.topics || {}).map(([name, count]) => (
                      <div className="meta-row" key={name}>
                        <dt>{name}</dt>
                        <dd>
                          <strong>{count}</strong>
                        </dd>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Pilih kelas terlebih dahulu"
                description="Agregat kelas akan tampil jika memenuhi ambang privasi server."
              />
            )}
            <p className="caption">
              Hanya siswa yang menyetujui kontribusi yang dihitung; kelompok kecil disembunyikan
              server.
            </p>
          </section>
        ) : tab === 'riwayat' ? (
          <div className={`dashboard-layout ${detail ? 'has-detail' : ''}`}>
            <section className="surface stack">
              <div className="section-bar">
                <h2>Riwayat jawaban dibagikan siswa</h2>
                <Button variant="outline" onClick={inbox.reload}>
                  Muat terbaru
                </Button>
              </div>
              <Pagination
                page={page}
                total={inbox.data?.total}
                loading={inbox.loading}
                onChange={(p) => {
                  detailSequence.current++;
                  setPage(p);
                  setDetail(null);
                }}
              />
              <p className="caption">
                Hanya menampilkan salinan jawaban yang secara eksplisit dibagikan siswa melalui
                permintaan konsultasi.
              </p>
              <div className="filter-control">
                <Field
                  as="select"
                  label="Filter bagian dibagikan"
                  value={sectionFilter}
                  onChange={(e) => {
                    detailSequence.current++;
                    setSectionFilter(e.target.value);
                    setPage(1);
                    setDetail(null);
                  }}
                >
                  <option value="">Semua bagian</option>
                  {Object.entries(shareLabels).map(([k, label]) => (
                    <option value={k} key={k}>
                      {label}
                    </option>
                  ))}
                </Field>
              </div>
              {inbox.loading ? (
                <LoadingState label="Memuat riwayat jawaban…" rows={3} />
              ) : sharedHistory.length ? (
                <div className="list-stack">
                  {sharedHistory.map((item) => (
                    <button
                      aria-pressed={detail?.id === item.id}
                      className={`list-item ${detail?.id === item.id ? 'is-selected' : ''}`}
                      key={item.id}
                      onClick={() => open(item.id)}
                    >
                      <span className="list-item-main">
                        <strong>
                          {item.nickname}
                          {item.class_label ? ` · ${item.class_label}` : ''}
                        </strong>
                        <small>
                          {item.topic} · {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </small>
                        <div className="row" style={{ marginTop: 6 }}>
                          {item.shared_sections.map((k) => (
                            <span className="chip" key={k}>
                              {shareLabels[k] || k}
                            </span>
                          ))}
                        </div>
                      </span>
                      <StatusBadge status={item.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Belum ada jawaban dibagikan"
                  description="Salinan refleksi, matriks, rencana, atau musyawarah yang dibagikan siswa akan tampil di sini."
                />
              )}
            </section>
            {detail && (
              <Panel
                as="aside"
                key={detail.id}
                exiting={detailExiting}
                direction="right"
                className="surface stack detail-aside"
              >
                <div className="section-bar">
                  <h2>Jawaban {detail.nickname}</h2>
                  <Button
                    variant="plain"
                    onClick={() => {
                      detailSequence.current++;
                      triggerDetailExit(() => setDetail(null));
                    }}
                  >
                    Tutup
                  </Button>
                </div>
                <MetaList
                  items={[
                    ['Topik', detail.topic],
                    ['Tanggal kirim', new Date(detail.created_at).toLocaleString('id-ID')],
                    ['Status', <StatusBadge key="st" status={detail.status} />],
                  ]}
                />
                <div className="stack-tight">
                  {Object.entries(shareLabels).map(([k, label]) => (
                    <Accordion
                      key={k}
                      defaultOpen={k in detail.shares}
                      summary={`${label} · ${k in detail.shares ? 'Dibagikan' : 'Tidak dibagikan'}`}
                    >
                      {k in detail.shares ? (
                        <JsonSection value={detail.shares[k]} />
                      ) : (
                        <p className="caption">Tidak dibagikan oleh siswa.</p>
                      )}
                    </Accordion>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        ) : (
          <div className={`dashboard-layout ${detail ? 'has-detail' : ''}`}>
            <section className="surface stack">
              <div className="section-bar">
                <h2>Permintaan konsultasi</h2>
                <Button variant="outline" onClick={inbox.reload}>
                  Muat terbaru
                </Button>
              </div>
              <Pagination
                page={page}
                total={inbox.data?.total}
                loading={inbox.loading}
                onChange={(p) => {
                  detailSequence.current++;
                  setPage(p);
                  setDetail(null);
                }}
              />
              <div className="filter-control">
                <Field
                  as="select"
                  label="Filter status"
                  value={statusFilter}
                  onChange={(e) => {
                    detailSequence.current++;
                    setStatusFilter(e.target.value);
                    setPage(1);
                    setDetail(null);
                  }}
                >
                  <option value="">Semua status</option>
                  {Object.keys(transitions).map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Field>
              </div>
              {inbox.loading ? (
                <LoadingState label="Memuat permintaan…" rows={3} />
              ) : visibleInbox.length ? (
                <div className="list-stack">
                  {visibleInbox.map((item) => (
                    <button
                      aria-pressed={detail?.id === item.id}
                      className={`list-item ${detail?.id === item.id ? 'is-selected' : ''}`}
                      key={item.id}
                      onClick={() => open(item.id)}
                    >
                      <span className="list-item-main">
                        <strong>{item.nickname}</strong>
                        <small>
                          {item.topic} · {new Date(item.created_at).toLocaleDateString('id-ID')}
                        </small>
                        <small>Preferensi: {item.preference}</small>
                      </span>
                      <StatusBadge status={item.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Belum ada permintaan"
                  description="Tidak ada permintaan konsultasi pada filter ini."
                />
              )}
            </section>
            {detail && (
              <Panel
                as="aside"
                key={detail.id}
                exiting={detailExiting}
                direction="right"
                className="surface stack detail-aside"
              >
                <div className="section-bar">
                  <h2>{detail.nickname}</h2>
                  <Button
                    variant="plain"
                    onClick={() => {
                      detailSequence.current++;
                      triggerDetailExit(() => setDetail(null));
                    }}
                  >
                    Tutup
                  </Button>
                </div>
                <MetaList
                  items={[
                    ['Topik', detail.topic],
                    ['Status', <StatusBadge key="st" status={detail.status} />],
                    ['Preferensi', `${detail.preference} (bukan jadwal pasti)`],
                    detail.schedule
                      ? [
                          'Jadwal',
                          `${detail.schedule.date} ${detail.schedule.time} (${detail.schedule.timezone}) · ${detail.schedule.place}`,
                        ]
                      : null,
                  ].filter(Boolean)}
                />
                <div className="message-box">
                  <p className="preserve">{detail.message}</p>
                </div>
                <div className="stack-tight">
                  {Object.entries(shareLabels).map(([k, label]) => (
                    <Accordion
                      key={k}
                      summary={`${label} · ${k in detail.shares ? 'Dibagikan' : 'Tidak dibagikan'}`}
                    >
                      {k in detail.shares ? (
                        <JsonSection value={detail.shares[k]} />
                      ) : (
                        <p className="caption">Tidak dibagikan</p>
                      )}
                    </Accordion>
                  ))}
                </div>
                {transitions[detail.status].length > 0 && (
                  <div className="stack">
                    <hr />
                    <Field
                      as="select"
                      label="Tindak lanjut"
                      value={
                        transitions[detail.status].includes(status)
                          ? status
                          : transitions[detail.status][0]
                      }
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {transitions[detail.status].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </Field>
                    {status === 'Dijadwalkan' && (
                      <div className="stack tab-panel-enter">
                        <div className="grid-two">
                          <Field
                            type="date"
                            label="Tanggal jadwal"
                            value={schedule.date}
                            onChange={(e) => setSchedule({ ...schedule, date: e.target.value })}
                          />
                          <Field
                            type="time"
                            label="Jam (zona sekolah)"
                            value={schedule.time}
                            onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                          />
                        </div>
                        <Field
                          label="Tempat / metode tatap muka"
                          maxLength={200}
                          value={schedule.place}
                          onChange={(e) => setSchedule({ ...schedule, place: e.target.value })}
                        />
                      </div>
                    )}
                    <AsyncButton
                      action={async () => {
                        const next = transitions[detail.status].includes(status)
                          ? status
                          : transitions[detail.status][0];
                        await api(`/teacher/consultations/${detail.id}`, {
                          method: 'PATCH',
                          body: {
                            status: next,
                            revision: detail.revision,
                            ...(next === 'Dijadwalkan' ? { schedule } : {}),
                          },
                        });
                        await open(detail.id);
                        await inbox.reload();
                      }}
                    >
                      Simpan tindak lanjut
                    </AsyncButton>
                  </div>
                )}
              </Panel>
            )}
          </div>
        )}
      </div>
    </>
  );
}
