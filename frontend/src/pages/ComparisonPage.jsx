import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useExploration } from '../context/exploration.js';
import { useTab } from '../hooks/useTab.js';
import { matrix } from '../utils/calculations.js';
import { Heading, Tabs, Field, Button, Notice } from '../components/ui/index.jsx';
import { useDirectionalValue, useFlashOnUpdate } from '../hooks/useMotion.js';

const discussionFields = [
  ['choice', 'Pilihan yang ingin dibicarakan'],
  ['reason', 'Alasanmu'],
  ['agreed', 'Hal yang sudah disepakati'],
  ['different', 'Perbedaan pandangan'],
  ['information', 'Informasi yang masih dicari'],
  ['support', 'Dukungan yang diharapkan'],
  ['next', 'Langkah diskusi berikutnya'],
  ['reflection', 'Refleksi ikhtiar / istikharah (opsional)'],
];
export default function ComparisonPage() {
  const { data, update, sourceNotices } = useExploration(),
    [tab, setTab] = useTab('perbandingan', ['perbandingan', 'musyawarah']),
    [mobileOption, setMobileOption] = useState(0);
  const { options, criteria } = data.comparison,
    result = matrix(data.comparison);
  const tabDir = useDirectionalValue(tab, ['perbandingan', 'musyawarah']);
  const totalKey = result.complete ? result.totals.map((t) => `${t.id}:${t.total}`).join('|') : '';
  const totalFlashing = useFlashOnUpdate(totalKey);

  function criterion(id, patch) {
    update((d) => ({
      ...d,
      comparison: {
        ...d.comparison,
        criteria: d.comparison.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    }));
  }
  return (
    <>
      <Heading eyebrow="LANGKAH 03 · RUANG UNTUK MENIMBANG" title="Timbang Pilihan">
        Angka membantu melihat pertimbanganmu. Pilihan akhir tetap milikmu.
      </Heading>
      {sourceNotices
        .filter((n) => data.comparison.options.some((o) => o.id === n.optionId))
        .map((n) => (
          <Notice key={n.optionId} type="warning">
            {n.message}
          </Notice>
        ))}
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['perbandingan', 'Perbandingan'],
          ['musyawarah', 'Musyawarah'],
        ]}
      />
      <div key={tab} className={`tab-panel-enter tab-${tabDir}`}>
        {tab === 'musyawarah' ? (
          <section className="surface stack">
            <h2>Diskusi yang saling mendengarkan.</h2>
            <p>
              Opsional dan privat. Tidak memerlukan tanda tangan atau identitas orang tua, serta
              tidak dibagikan otomatis.
            </p>
            {discussionFields.map(([key, label]) => (
              <Field
                key={key}
                as="textarea"
                rows={3}
                maxLength={500}
                label={label}
                value={data.discussion[key] || ''}
                onChange={(e) =>
                  update((d) => ({ ...d, discussion: { ...d.discussion, [key]: e.target.value } }))
                }
              />
            ))}
            <Link
              className="button outline"
              to="/rencana-langkahku?panel=export&section=discussion"
            >
              Cetak musyawarah
            </Link>
          </section>
        ) : options.length < 2 ? (
          <section className="surface">
            <h2>Mulai dengan dua pilihan.</h2>
            <p>Pilih 2–3 opsi dari katalog atau tulis opsi pribadi untuk membandingkannya.</p>
            <Link className="button" to="/peta-jalur">
              Pilih jalur
            </Link>
          </section>
        ) : (
          <>
            <div className="surface">
              <Notice>
                Bobot 1–3 berlaku sama untuk seluruh opsi. Nilai 1–4 berarti kurang sesuai hingga
                sangat sesuai. Belum tahu dibiarkan kosong.
              </Notice>
              <div className="mobile-option-tabs">
                <Tabs
                  value={String(Math.min(mobileOption, options.length - 1))}
                  onChange={(v) => setMobileOption(Number(v))}
                  items={options.map((o, i) => [String(i), o.title])}
                />
              </div>
              <div className="table-scroll">
                <div className="matrix-grid" style={{ '--options': options.length }}>
                  <div className="matrix-head">Kriteria positif & bobot</div>
                  {options.map((o, i) => (
                    <div
                      key={o.id}
                      className={`matrix-head option-column ${mobileOption === i ? 'mobile-active' : ''}`}
                    >
                      <h3>{o.title}</h3>
                      <span className="small-label">
                        {o.personal
                          ? 'Ditulis olehmu · belum diverifikasi'
                          : `Salinan versi ${o.version} · ${o.snapshot?.verified_at || 'belum diverifikasi'}`}
                      </span>
                    </div>
                  ))}
                  {criteria.map((c) => (
                    <div className="matrix-row" key={c.id}>
                      <div className={`matrix-criterion ${c.weight ? 'is-weighted' : ''}`}>
                        <Field
                          label="Kriteria"
                          maxLength={100}
                          value={c.name}
                          onChange={(e) => criterion(c.id, { name: e.target.value })}
                        />
                        <Field
                          as="select"
                          label={`Bobot ${c.name}`}
                          value={c.weight || ''}
                          onChange={(e) =>
                            criterion(c.id, {
                              weight: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                        >
                          <option value="">Belum ditentukan</option>
                          {[1, 2, 3].map((v) => (
                            <option key={v} value={v}>
                              {v} · {['Rendah', 'Sedang', 'Tinggi'][v - 1]}
                            </option>
                          ))}
                        </Field>
                        {criteria.length > 3 && (
                          <Button
                            variant="plain"
                            onClick={() =>
                              update((d) => ({
                                ...d,
                                comparison: {
                                  ...d.comparison,
                                  criteria: d.comparison.criteria.filter((x) => x.id !== c.id),
                                },
                              }))
                            }
                          >
                            Hapus kriteria
                          </Button>
                        )}
                      </div>
                      {options.map((o, i) => (
                        <div
                          key={o.id}
                          className={`matrix-cell option-column ${mobileOption === i ? 'mobile-active' : ''} ${c.ratings[o.id] ? 'is-rated' : ''}`}
                        >
                          <Field
                            as="select"
                            label={`${c.name} · ${o.title}`}
                            value={c.ratings[o.id] || ''}
                            onChange={(e) => {
                              const ratings = { ...c.ratings };
                              if (e.target.value) ratings[o.id] = Number(e.target.value);
                              else delete ratings[o.id];
                              criterion(c.id, { ratings });
                            }}
                          >
                            <option value="">Belum tahu</option>
                            {[1, 2, 3, 4].map((v) => (
                              <option value={v} key={v}>
                                {v} ·{' '}
                                {
                                  ['Kurang sesuai', 'Cukup sesuai', 'Sesuai', 'Sangat sesuai'][
                                    v - 1
                                  ]
                                }
                              </option>
                            ))}
                          </Field>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {criteria.length < 5 && (
                <Button
                  variant="outline"
                  onClick={() =>
                    update((d) => ({
                      ...d,
                      comparison: {
                        ...d.comparison,
                        criteria: [
                          ...d.comparison.criteria,
                          {
                            id: crypto.randomUUID(),
                            name: 'Kriteria baru',
                            weight: null,
                            ratings: {},
                          },
                        ],
                      },
                    }))
                  }
                >
                  Tambah kriteria
                </Button>
              )}
              <div
                className={`totals ${result.complete ? 'is-complete' : ''} ${totalFlashing ? 'is-updated' : ''}`}
              >
                <h2>Ringkasan pertimbangan</h2>
                {result.complete ? (
                  <div className="totals-enter">
                    {result.totals.map((t) => (
                      <div className="row between total-row" key={t.id}>
                        <strong>{options.find((o) => o.id === t.id).title}</strong>
                        <span className="total-number">{t.total}</span>
                      </div>
                    ))}
                    {new Set(result.totals.map((t) => t.total)).size < result.totals.length && (
                      <p>Ada total seri: pertimbangan sama kuat berdasarkan input saat ini.</p>
                    )}
                    <p>Total tidak menetapkan pemenang atau pilihan utama.</p>
                  </div>
                ) : (
                  <Notice type="warning">
                    Belum lengkap. Total final seluruh opsi ditahan sampai semua bobot dan penilaian
                    diisi.
                  </Notice>
                )}
              </div>
            </div>
            <section className="surface stack">
              <h2>Alasan dan sumber pertimbangan</h2>
              {options.map((o) => (
                <div key={o.id}>
                  <Field
                    as="textarea"
                    maxLength={500}
                    rows={3}
                    label={`${o.title} (opsional)`}
                    value={o.reason || ''}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        comparison: {
                          ...d.comparison,
                          options: d.comparison.options.map((x) =>
                            x.id === o.id ? { ...x, reason: e.target.value } : x
                          ),
                        },
                      }))
                    }
                  />
                  {o.snapshot && (
                    <p className="muted">
                      Salinan versi {o.version}: {o.snapshot.summary}. Kartu bisa berubah; salinan
                      ini dipertahankan. Periksa sumber terbaru sebelum keputusan.
                    </p>
                  )}
                </div>
              ))}
              <div className="action-row">
                <Link className="button" to="/rencana-langkahku">
                  Susun langkahku
                </Link>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
