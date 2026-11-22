import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/auth.js';
import { useExploration } from '../../context/exploration.js';
import { api } from '../../services/api.js';
import { useResource } from '../../hooks/useResource.js';
import {
  Button,
  Field,
  Check,
  Tabs,
  Notice,
  Heading,
  AsyncButton,
  JsonSection,
  Accordion,
  Panel,
  StatusBadge,
  MetaList,
  EmptyState,
  Pagination,
  LoadingState,
} from '../../components/ui/index.jsx';
import { useExitAction, useDirectionalValue } from '../../hooks/useMotion.js';

const shareLabels = {
  reflection: 'Refleksi',
  comparison: 'Matriks',
  plan: 'Rencana',
  discussion: 'Musyawarah',
};
export function ConsultationPanel() {
  const { user } = useAuth(),
    exploration = useExploration(),
    [params, setParams] = useSearchParams(),
    [tab, setTab] = useState(params.get('consultTab') || 'ajukan'),
    [form, setForm] = useState(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(`pilihanku.consult-draft.${user.id}`));
        return {
          teacherId: saved?.teacherId || '',
          nickname: saved?.nickname || '',
          topic: saved?.topic || 'Minat/jurusan',
          preference: saved?.preference || '',
          message: saved?.message || '',
          sections: Array.isArray(saved?.sections)
            ? saved.sections.filter((k) => k in shareLabels)
            : [],
          consent: false,
        };
      } catch {
        return {
          teacherId: '',
          nickname: '',
          topic: 'Minat/jurusan',
          preference: '',
          message: '',
          sections: [],
          consent: false,
        };
      }
    }),
    [destination, setDestination] = useState(null),
    [review, setReview] = useState(false),
    [page, setPage] = useState(1),
    [detail, setDetail] = useState(null),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [key, setKey] = useState(() => {
      try {
        return sessionStorage.getItem(`pilihanku.consult-key.${user.id}`) || crypto.randomUUID();
      } catch {
        return crypto.randomUUID();
      }
    }),
    [busy, setBusy] = useState(false),
    [panelExiting, triggerPanelExit] = useExitAction(),
    [subExiting, triggerSubExit, resetSubExit] = useExitAction();

  const tabDir = useDirectionalValue(tab, ['ajukan', 'permintaan']);
  const detailSequence = useRef(0),
    sending = useRef(false);
  const collection = useResource(`/consultations?page=${page}`);
  const items = collection.data?.items || [];
  const list = collection.reload;
  async function loadDetail(id, request = ++detailSequence.current) {
    if (request !== detailSequence.current) return;
    try {
      const row = await api(`/consultations/${id}`);
      if (request === detailSequence.current) setDetail(row);
    } catch (e) {
      if (request === detailSequence.current) setError(e.message);
    }
  }
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setReview(false);
  };
  useEffect(() => {
    try {
      sessionStorage.setItem(`pilihanku.consult-draft.${user.id}`, JSON.stringify(form));
      sessionStorage.setItem(`pilihanku.consult-key.${user.id}`, key);
    } catch {
      setError('Draf konsultasi tidak dapat disimpan di sesi perangkat.');
    }
  }, [form, key, user?.id]);
  const destinations = useCallback(async () => {
    try {
      setError('');
      const result = await api('/consultations/destinations', {
        method: 'POST',
        body: {},
      });
      setDestination(result);
      if (result.teachers.length === 1)
        setForm((p) => ({ ...p, teacherId: result.teachers[0].id }));
    } catch (e) {
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    if (user?.role === 'siswa') destinations();
  }, [user?.role, destinations]);
  async function send() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await exploration.persist();
      if (exploration.conflict || exploration.error)
        throw new Error('Data belum tersimpan. Periksa status simpan sebelum berbagi.');
      const result = await api('/consultations', {
        method: 'POST',
        headers: { 'Idempotency-Key': key },
        body: {
          ...form,
          classId: destination.classId,
          consent: form.consent,
        },
      });
      setSuccess(
        `Permintaan ${result.id} diterima server (${result.status}). Preferensi waktu belum menjadi jadwal.`
      );
      setReview(false);
      setTab('permintaan');
      setPage(1);
      setKey(crypto.randomUUID());
      setForm((p) => ({ ...p, message: '', sections: [], consent: false }));
      await list();
    } catch (e) {
      setError(`Belum terkirim. ${e.message}`);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }
  const changeTab = (t) => {
    detailSequence.current++;
    resetSubExit();
    setTab(t);
    setDetail(null);
    setReview(false);
    const next = new URLSearchParams(params);
    next.set('consultTab', t);
    setParams(next);
  };
  return (
    <Panel exiting={panelExiting} direction="up" className="surface stack">
      <div className="section-bar">
        <Button
          variant="plain"
          onClick={() =>
            triggerPanelExit(() => {
              const next = new URLSearchParams(params);
              next.delete('panel');
              setParams(next);
            })
          }
        >
          Kembali ke rencana
        </Button>
      </div>
      <Heading level={2} eyebrow="ADA RUANG UNTUK BERCERITA" title="Tanya Guru BK" />
      <Notice type="warning">
        Bukan chat atau layanan darurat (tidak dipantau 24 jam). Jika perlu bantuan segera, hubungi
        guru atau orang dewasa tepercaya secara langsung.
      </Notice>
      <Tabs
        value={tab}
        onChange={changeTab}
        items={[
          ['ajukan', 'Ajukan'],
          ['permintaan', 'Permintaanku'],
        ]}
      />
      <Notice type="error">{error || collection.error}</Notice>
      <Notice type="success">{success}</Notice>
      <div key={tab} className={`stack tab-panel-enter tab-${tabDir}`}>
        {tab === 'ajukan' ? (
          review ? (
            <Panel as="div" exiting={subExiting} direction="right" className="stack">
              <h2>Tinjau permintaan</h2>
              <MetaList
                items={[
                  [
                    'Penerima',
                    `${destination.teachers.find((t) => t.id === form.teacherId)?.display_name || '-'} · ${destination.schoolName}`,
                  ],
                  ['Layanan', `${destination.contact} · ${destination.hours}`],
                  ['Topik', form.topic],
                  ['Preferensi waktu', form.preference],
                  [
                    'Bagian dibagikan',
                    form.sections.map((k) => shareLabels[k]).join(', ') ||
                      'Tidak ada bagian eksplorasi',
                  ],
                ]}
              />
              <div className="message-box">
                <p className="preserve">{form.message}</p>
              </div>
              {form.sections.map((k) => (
                <Accordion key={k} summary={`Pratinjau ${shareLabels[k]}`}>
                  <JsonSection
                    value={
                      k === 'reflection'
                        ? { answers: exploration.data.answers, context: exploration.data.context }
                        : exploration.data[k]
                    }
                  />
                </Accordion>
              ))}
              <Check
                label="Saya menyetujui pengiriman data yang ditinjau ke penerima tersebut"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              />
              <p className="caption">
                Berbagi membuat salinan saat kirim. Bagian aktif dapat ditarik dari akses guru;
                salinan yang sudah diunduh tidak dapat ditarik.
              </p>
              <div className="action-row">
                <Button loading={busy} disabled={busy || !form.consent} onClick={send}>
                  {busy && <span className="spinner-dot" aria-hidden="true" />}
                  {busy ? 'Mengirim…' : 'Kirim permintaan'}
                </Button>
                <Button variant="outline" onClick={() => triggerSubExit(() => setReview(false))}>
                  Ubah permintaan
                </Button>
              </div>
            </Panel>
          ) : (
            <form
              className="stack tab-panel-enter"
              onSubmit={(e) => {
                e.preventDefault();
                if (!destination || !form.teacherId) {
                  setError('Pilih guru tujuan yang aktif.');
                  return;
                }
                setError('');
                resetSubExit();
                setReview(true);
              }}
            >
              {destination && (
                <>
                  <Notice>
                    {destination.schoolName} · {destination.contact} · {destination.hours}
                  </Notice>
                  <Field
                    as="select"
                    label="Guru tujuan"
                    required
                    value={form.teacherId}
                    onChange={(e) => set('teacherId', e.target.value)}
                  >
                    <option value="">Pilih guru</option>
                    {destination.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.display_name}
                      </option>
                    ))}
                  </Field>
                  {!destination.teachers.length && (
                    <Notice>Belum ada guru aktif. Cetak ringkasan untuk dibawa langsung.</Notice>
                  )}
                </>
              )}
              <div className="grid-two">
                <Field
                  label="Nama panggilan"
                  required
                  maxLength={50}
                  value={form.nickname}
                  onChange={(e) => set('nickname', e.target.value)}
                />
                <Field
                  as="select"
                  label="Topik"
                  value={form.topic}
                  onChange={(e) => set('topic', e.target.value)}
                >
                  {['Minat/jurusan', 'Kerja/pelatihan', 'Biaya', 'Diskusi keluarga', 'Lainnya'].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    )
                  )}
                </Field>
              </div>
              <Field
                label="Preferensi waktu (bukan janji temu)"
                required
                maxLength={200}
                value={form.preference}
                onChange={(e) => set('preference', e.target.value)}
              />
              <Field
                as="textarea"
                rows={4}
                label="Pesan singkat"
                required
                minLength={10}
                maxLength={1000}
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
              />
              <fieldset>
                <legend>Bagikan bagian pilihanmu (opsional)</legend>
                <div className="grid-two">
                  {Object.entries(shareLabels).map(([k, label]) => (
                    <Check
                      key={k}
                      label={label}
                      checked={form.sections.includes(k)}
                      onChange={(e) =>
                        set(
                          'sections',
                          e.target.checked
                            ? [...form.sections, k]
                            : form.sections.filter((s) => s !== k)
                        )
                      }
                    />
                  ))}
                </div>
              </fieldset>
              <div className="action-row">
                <Button type="submit" disabled={!destination}>
                  Tinjau permintaan
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set('panel', 'export');
                    setParams(next);
                  }}
                >
                  Cetak ringkasan
                </Button>
              </div>
            </form>
          )
        ) : (
          <>
            {detail ? (
              <Panel as="div" exiting={subExiting} direction="right" className="stack">
                <div className="section-bar">
                  <h2>{detail.topic}</h2>
                  <Button
                    variant="plain"
                    onClick={() => {
                      detailSequence.current++;
                      triggerSubExit(() => setDetail(null));
                    }}
                  >
                    Kembali ke daftar
                  </Button>
                </div>
                <MetaList
                  items={[
                    ['Status', <StatusBadge key="st" status={detail.status} />],
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
                  <h3>Bagian berbagi aktif</h3>
                  {Object.keys(detail.shares).length ? (
                    Object.keys(detail.shares).map((k) => (
                      <div className="row between" key={k}>
                        <strong>{shareLabels[k]}</strong>
                        <AsyncButton
                          variant="outline"
                          action={async () => {
                            const request = detailSequence.current;
                            await api(`/consultations/${detail.id}/shares/${k}`, {
                              method: 'DELETE',
                            });
                            await loadDetail(detail.id, request);
                          }}
                        >
                          Tarik bagian ini
                        </AsyncButton>
                      </div>
                    ))
                  ) : (
                    <p className="caption">Tidak ada bagian dibagikan.</p>
                  )}
                </div>
                <div className="action-row">
                  {!['Selesai', 'Dibatalkan'].includes(detail.status) && (
                    <AsyncButton
                      variant="outline"
                      action={async () => {
                        const request = detailSequence.current;
                        await api(`/consultations/${detail.id}/cancel`, {
                          method: 'POST',
                          body: {},
                        });
                        await loadDetail(detail.id, request);
                        await list();
                      }}
                    >
                      Batalkan permintaan
                    </AsyncButton>
                  )}
                  <AsyncButton
                    variant="danger"
                    action={async () => {
                      await api(`/consultations/${detail.id}`, { method: 'DELETE' });
                      setDetail(null);
                      await list();
                    }}
                  >
                    Hapus permintaan
                  </AsyncButton>
                </div>
              </Panel>
            ) : (
              <div className="stack tab-panel-enter">
                <div className="section-bar">
                  <h3>Daftar permintaanku</h3>
                  <Button variant="outline" onClick={list}>
                    Muat terbaru
                  </Button>
                </div>
                <Pagination
                  page={page}
                  total={collection.data?.total}
                  loading={collection.loading}
                  onChange={setPage}
                />
                {collection.loading ? (
                  <LoadingState label="Memuat permintaan…" />
                ) : items.length ? (
                  <div className="list-stack">
                    {items.map((item) => (
                      <button
                        className="list-item"
                        key={item.id}
                        onClick={() => {
                          resetSubExit();
                          loadDetail(item.id);
                        }}
                      >
                        <span className="list-item-main">
                          <strong>{item.topic}</strong>
                          <small>{new Date(item.created_at).toLocaleDateString('id-ID')}</small>
                        </span>
                        <StatusBadge status={item.status} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Belum ada permintaan"
                    description="Permintaan konsultasi yang kamu kirim akan tampil di sini."
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
