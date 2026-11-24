import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GraduationCap, Wrench, BriefcaseBusiness, Lightbulb } from 'lucide-react';
import { useExploration } from '../context/exploration.js';
import { api } from '../services/api.js';
import { useTab } from '../hooks/useTab.js';
import { categories, dimensions, scenarios } from '../data/materials.js';
import {
  Heading,
  Tabs,
  Field,
  Button,
  Check,
  Notice,
  AsyncButton,
  Accordion,
  Panel,
  LoadingState,
} from '../components/ui/index.jsx';
import {
  useDirectionalValue,
  useExitAction,
  useFlashOnUpdate,
  useScrollReveal,
} from '../hooks/useMotion.js';

export default function PathwaysPage() {
  const { data, update } = useExploration(),
    [tab, setTab] = useTab('jelajah', ['jelajah', 'simulasi']),
    [params, setParams] = useSearchParams(),
    [cards, setCards] = useState([]),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [loading, setLoading] = useState(true),
    [total, setTotal] = useState(0),
    [scenario, setScenario] = useState(null),
    [history, setHistory] = useState(['start']),
    [optionName, setOptionName] = useState(''),
    [detailExiting, triggerDetailExit, resetDetailExit] = useExitAction(),
    [simExiting, triggerSimExit, resetSimExit] = useExitAction();
  const search = params.get('q') || '',
    interests = params.get('minat')?.split(',') || [],
    page = Math.max(1, Number(params.get('page')) || 1),
    interestKey = interests.join(','),
    category = params.get('kategori') || '',
    detail = cards.find((c) => c.id === params.get('detail')),
    icons = [GraduationCap, Wrench, BriefcaseBusiness, Lightbulb];
  const tabDir = useDirectionalValue(tab, ['jelajah', 'simulasi']);
  const simDir = useDirectionalValue(history.length);
  const selected = data.comparison.options;
  const trayFlash = useFlashOnUpdate(selected.length);
  const revealRef = useScrollReveal(
    `${tab}-${page}-${category}-${search}-${interestKey}-${cards.length}`
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = new URLSearchParams({ page: String(page), q: search });
    if (category) query.set('category', category);
    if (interestKey) query.set('interests', interestKey);
    const timeout = setTimeout(
      () =>
        api('/cards?' + query, { signal: controller.signal })
          .then((r) => {
            setCards(r.items);
            setTotal(r.total);
            setError('');
          })
          .catch((e) => {
            if (!controller.signal.aborted) {
              setError(e.message);
              setCards([]);
              setTotal(0);
            }
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          }),
      200
    );
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [page, category, search, interestKey]);
  const choose = (card) => {
    setError('');
    if (data.comparison.options.some((o) => o.id === card.id)) {
      update((d) => ({
        ...d,
        comparison: {
          ...d.comparison,
          options: d.comparison.options.filter((o) => o.id !== card.id),
        },
      }));
      return;
    }
    if (data.comparison.options.length >= 3) {
      setError('Maksimal tiga opsi. Hapus satu opsi sebelum menambah yang lain.');
      return;
    }
    if (
      data.comparison.options.some(
        (o) => o.title.trim().toLowerCase() === card.title.trim().toLowerCase()
      )
    ) {
      setError('Opsi dengan nama tersebut sudah dipilih. Hapus opsi lama sebelum menggantinya.');
      return;
    }
    update((d) => ({
      ...d,
      explored: card.category ? [...new Set([...d.explored, card.category])] : d.explored,
      comparison: {
        ...d.comparison,
        options: [
          ...d.comparison.options,
          {
            id: card.id,
            title: card.title,
            category: card.category,
            version: card.version,
            sourceId: card.id,
            snapshot: {
              summary: card.data.summary,
              sources: card.data.sources,
              verified_at: card.verified_at,
            },
            reason: '',
          },
        ],
      },
    }));
  };
  const filtered = cards;
  const showDetail = (c) => {
    resetDetailExit();
    const next = new URLSearchParams(params);
    if (c) next.set('detail', c.id);
    else next.delete('detail');
    setParams(next);
  };
  return (
    <div ref={revealRef}>
      <Heading eyebrow="LANGKAH 02 · LIHAT KEMUNGKINANNYA" title="Peta Jalur">
        Banyak jalan untuk tumbuh. Jelajahi setiap jalur dengan rasa ingin tahu.
      </Heading>
      <Tabs
        value={tab}
        onChange={(v) => {
          showDetail(null);
          setTab(v);
        }}
        items={[
          ['jelajah', 'Jelajahi Jalur'],
          ['simulasi', 'Simulasi'],
        ]}
      />
      <Notice type="error">{error}</Notice>
      <Notice type="success">{message}</Notice>
      <div key={tab} className={`tab-panel-enter tab-${tabDir}`}>
        {tab === 'jelajah' ? (
          <>
            {detail ? (
              <Panel
                key={detail.id}
                exiting={detailExiting}
                direction="right"
                className="surface stack"
              >
                <Button variant="plain" onClick={() => triggerDetailExit(() => showDetail(null))}>
                  Kembali ke daftar jalur
                </Button>
                <span className="badge">
                  {detail.data.example ? 'Data contoh · belum diverifikasi' : detail.category}
                </span>
                <h2>{detail.title}</h2>
                {[
                  ['Gambaran', 'summary'],
                  ['Syarat dan cara masuk', 'requirements'],
                  ['Mapel pendukung', 'subjects'],
                  ['Lama tempuh', 'duration'],
                  ['Biaya', 'cost'],
                  ['Kegiatan', 'activities'],
                  ['Lingkungan', 'environment'],
                  ['Pertanyaan refleksi', 'reflection'],
                ].map(([label, key]) => (
                  <div key={key}>
                    <h3>{label}</h3>
                    <p>{detail.data[key] || 'Belum tersedia — periksa sumber resmi.'}</p>
                  </div>
                ))}
                <p>
                  Sumber:{' '}
                  {detail.data.sources.length
                    ? detail.data.sources.map((s) => (
                        <a href={s} target="_blank" rel="noopener noreferrer" key={s}>
                          {s}
                        </a>
                      ))
                    : 'Belum tersedia'}
                </p>
                {!detail.data.example && (
                  <div className="row">
                    <AsyncButton
                      variant="outline"
                      action={async () => {
                        await api(`/cards/${detail.id}/report-source`, {
                          method: 'POST',
                          body: { issue: 'unavailable' },
                        });
                        setMessage('Laporan sumber dicatat untuk guru pengelola.');
                      }}
                    >
                      Laporkan tautan tidak tersedia
                    </AsyncButton>
                    <AsyncButton
                      variant="outline"
                      action={async () => {
                        await api(`/cards/${detail.id}/report-source`, {
                          method: 'POST',
                          body: { issue: 'outdated' },
                        });
                        setMessage('Laporan informasi lama dicatat untuk guru pengelola.');
                      }}
                    >
                      Laporkan informasi lama
                    </AsyncButton>
                  </div>
                )}
                <p>
                  Versi {detail.version} · Diverifikasi:{' '}
                  {detail.verified_at || 'Belum diverifikasi'}
                </p>
                {detail.verified_at &&
                  Date.now() - new Date(detail.verified_at) > 180 * 86400000 && (
                    <Notice type="warning">
                      Informasi sudah lebih dari satu semester. Periksa ulang sumber resmi.
                    </Notice>
                  )}
                <Button onClick={() => choose(detail)}>
                  {selected.some((o) => o.id === detail.id)
                    ? 'Hapus dari perbandingan'
                    : 'Tambahkan ke perbandingan'}
                </Button>
              </Panel>
            ) : (
              <>
                <div className="category-grid compact">
                  {categories.map((name, i) => {
                    const Icon = icons[i];
                    return (
                      <button
                        aria-pressed={category === name}
                        className={`category-card cat-${i}`}
                        key={name}
                        onClick={() => {
                          const next = new URLSearchParams(params);
                          next.delete('page');
                          if (category === name) next.delete('kategori');
                          else next.set('kategori', name);
                          setParams(next);
                        }}
                      >
                        <Icon />
                        <strong>{name}</strong>
                      </button>
                    );
                  })}
                </div>
                <div className="surface filters">
                  <Field
                    label="Cari jalur, mapel, atau kegiatan"
                    placeholder="Apa yang ingin kamu jelajahi?"
                    type="search"
                    value={search}
                    onChange={(e) => {
                      const next = new URLSearchParams(params);
                      next.set('q', e.target.value);
                      next.delete('page');
                      setParams(next, { replace: true });
                    }}
                  />
                  <Accordion summary="Filter minat (opsional, tidak aktif otomatis)">
                    <div className="row">
                      {Object.entries(dimensions).map(([key, name]) => (
                        <Check
                          label={`${key} · ${name}`}
                          key={key}
                          checked={interests.includes(key)}
                          onChange={(e) => {
                            const chosen = e.target.checked
                              ? [...interests, key]
                              : interests.filter((x) => x !== key);
                            const next = new URLSearchParams(params);
                            next.delete('page');
                            if (chosen.length) next.set('minat', chosen.join(','));
                            else next.delete('minat');
                            setParams(next);
                          }}
                        />
                      ))}
                    </div>
                    <p>
                      Beberapa minat menggunakan OR, lalu digabung dengan kategori dan pencarian.
                    </p>
                  </Accordion>
                  {(category || search || interests.length > 0) && (
                    <Button
                      variant="plain"
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.delete('kategori');
                        next.delete('q');
                        next.delete('minat');
                        next.delete('page');
                        setParams(next);
                      }}
                    >
                      Hapus semua filter
                    </Button>
                  )}
                </div>
                {loading ? (
                  <LoadingState label="Memuat katalog…" cards={3} />
                ) : !filtered.length ? (
                  <Notice>
                    Tidak ada jalur untuk filter ini. Hapus filter atau tambahkan opsi pribadi.
                  </Notice>
                ) : (
                  <div className="cards-grid">
                    {filtered.map((card, i) => {
                      const isChosen = selected.some((o) => o.id === card.id);
                      return (
                        <article
                          className={`path-card ${isChosen ? 'is-selected' : ''}`}
                          key={card.id}
                          data-reveal
                          style={{ '--stagger': i % 6 }}
                        >
                          <div className={`path-art cat-${categories.indexOf(card.category)}`}>
                            {(() => {
                              const Icon = icons[categories.indexOf(card.category)];
                              return <Icon size={52} />;
                            })()}
                          </div>
                          <div className="path-body">
                            <span className="badge">
                              {card.data.example
                                ? 'Data contoh · belum diverifikasi'
                                : card.category}
                            </span>
                            <h2>{card.title}</h2>
                            <p>{card.data.summary}</p>
                            <div className="row">
                              {card.data.interests.map((interest) => (
                                <span key={interest} className="chip">
                                  {interest}
                                </span>
                              ))}
                            </div>
                            <p className="muted">
                              {card.verified_at
                                ? `Verifikasi ${card.verified_at}`
                                : 'Sumber/waktu/biaya belum diverifikasi'}
                            </p>
                            <div className="row">
                              <Button variant="outline" onClick={() => showDetail(card)}>
                                Lihat detail
                              </Button>
                              <Button onClick={() => choose(card)}>
                                {isChosen ? 'Hapus opsi' : 'Bandingkan'}
                              </Button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
                <div className="row between">
                  <p>
                    {total} hasil · halaman {page}
                  </p>
                  <div className="row">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set('page', String(page - 1));
                        setParams(next);
                      }}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      disabled={page * 24 >= total}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set('page', String(page + 1));
                        setParams(next);
                      }}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
                <section className="surface">
                  <h2>Jalur yang belum ada di katalog?</h2>
                  <p>
                    Tambahkan opsi pribadi. Informasinya belum diverifikasi dan tidak diterbitkan.
                  </p>
                  <div className="row">
                    <Field
                      label="Nama opsi pribadi"
                      maxLength={100}
                      value={optionName}
                      onChange={(e) => setOptionName(e.target.value)}
                    />
                    <Button
                      disabled={!optionName.trim()}
                      onClick={() => {
                        if (selected.length >= 3) {
                          setError('Maksimal tiga opsi.');
                          return;
                        }
                        if (
                          selected.some(
                            (o) => o.title.toLowerCase() === optionName.trim().toLowerCase()
                          )
                        ) {
                          setError('Opsi tersebut sudah dipilih.');
                          return;
                        }
                        update((d) => ({
                          ...d,
                          comparison: {
                            ...d.comparison,
                            options: [
                              ...d.comparison.options,
                              {
                                id: crypto.randomUUID(),
                                title: optionName.trim(),
                                personal: true,
                                reason: '',
                              },
                            ],
                          },
                        }));
                        setOptionName('');
                      }}
                    >
                      Tambah opsi pribadi
                    </Button>
                  </div>
                </section>
              </>
            )}
            <div className={`comparison-tray ${trayFlash ? 'is-updated' : ''}`}>
              <div>
                <strong>{selected.length} dari 3 opsi dipilih</strong>
                <div className="row">
                  {selected.map((o) => (
                    <button
                      key={o.id}
                      className="chip chip-interactive"
                      onClick={() =>
                        update((d) => ({
                          ...d,
                          comparison: {
                            ...d.comparison,
                            options: d.comparison.options.filter((x) => x.id !== o.id),
                          },
                        }))
                      }
                      aria-label={`Hapus ${o.title}`}
                    >
                      {o.title} ×
                    </button>
                  ))}
                </div>
              </div>
              <Link className="button" to="/timbang-pilihan">
                Timbang pilihan
              </Link>
            </div>
          </>
        ) : (
          <section className="surface">
            {!scenario ? (
              <div className="tab-panel-enter">
                <h2>Bagaimana jika…?</h2>
                <p>
                  Lima cerita untuk berlatih memikirkan alternatif. Draf materi, belum ditelaah
                  ahli.
                </p>
                <div className="scenario-list">
                  {scenarios.map((s, i) => (
                    <button
                      key={s.id}
                      style={{ '--stagger': i }}
                      onClick={() => {
                        resetSimExit();
                        setScenario(s);
                        setHistory([s.start]);
                      }}
                    >
                      <span>{s.title}</span>
                      <span className="small-label">Mulai simulasi</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <Panel as="div" exiting={simExiting} direction="right" className="stack">
                <div className="row between">
                  <span className="badge">{scenario.label}</span>
                  <Button variant="plain" onClick={() => triggerSimExit(() => setScenario(null))}>
                    Keluar simulasi
                  </Button>
                </div>
                <h2>{scenario.title}</h2>
                <div key={history.at(-1)} className={`stack sim-node-enter sim-${simDir}`}>
                  <p className="intro">{scenario.nodes[history.at(-1)].text}</p>
                  {scenario.nodes[history.at(-1)].choices?.map((c) => (
                    <Button
                      key={c.text}
                      variant="outline"
                      onClick={() => setHistory([...history, c.next])}
                    >
                      {c.text}
                    </Button>
                  ))}
                  {!scenario.nodes[history.at(-1)].choices && (
                    <>
                      <Notice>{scenario.nodes[history.at(-1)].alternative}</Notice>
                      <Field
                        as="textarea"
                        rows={4}
                        label={scenario.nodes[history.at(-1)].reflection}
                        maxLength={500}
                        value={data.simulations[scenario.id] || ''}
                        onChange={(e) =>
                          update((d) => ({
                            ...d,
                            simulations: { ...d.simulations, [scenario.id]: e.target.value },
                          }))
                        }
                      />
                      <p>Refleksi tidak mengubah pilihan atau rencana secara otomatis.</p>
                      <Button onClick={() => setHistory([scenario.start])}>Ulangi simulasi</Button>
                    </>
                  )}
                </div>
                {history.length > 1 && (
                  <Button variant="plain" onClick={() => setHistory(history.slice(0, -1))}>
                    Kembali satu langkah
                  </Button>
                )}
              </Panel>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
