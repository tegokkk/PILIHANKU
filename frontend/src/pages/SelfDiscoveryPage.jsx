import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useExploration } from '../context/exploration.js';
import { useTab } from '../hooks/useTab.js';
import { questions, values, dimensions } from '../data/materials.js';
import { riasec } from '../utils/calculations.js';
import {
  Heading,
  Tabs,
  Button,
  Field,
  Check,
  Notice,
  LoadingState,
} from '../components/ui/index.jsx';
import { useDirectionalValue } from '../hooks/useMotion.js';

export default function SelfDiscoveryPage() {
  const { data, update, ready } = useExploration(),
    [tab, setTab] = useTab('minat', ['minat', 'kondisi', 'ringkasan']),
    [index, setIndex] = useState(0);
  const tabDir = useDirectionalValue(tab, ['minat', 'kondisi', 'ringkasan']);
  const qDir = useDirectionalValue(index);
  const q = questions[index],
    result = riasec(data.answers),
    answeredCount = Object.keys(data.answers).length;
  const context = (key, value) =>
    update((d) => ({ ...d, context: { ...d.context, [key]: value } }));
  return (
    <>
      <Heading eyebrow="LANGKAH 01 · TEMUKAN HAL YANG BERARTI" title="Kenali Diriku">
        Mulai dari rasa suka, nilai, dan keadaanmu hari ini. Tidak ada jawaban benar atau salah.
      </Heading>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['minat', 'Minat'],
          ['kondisi', 'Nilai & Kondisi'],
          ['ringkasan', 'Ringkasan'],
        ]}
      />
      <Notice type="warning">
        Draf materi refleksi — belum ditelaah ahli. Bukan tes psikologis baku atau penentu jurusan.
      </Notice>
      {!ready ? (
        <LoadingState label="Memuat draf…" />
      ) : (
        <section className="surface question-area">
          <div key={tab} className={`tab-panel-enter tab-${tabDir}`}>
            {tab === 'minat' ? (
              <>
                <div className="row between">
                  <span className="eyebrow">PERNYATAAN {index + 1} DARI 24</span>
                  <span>{answeredCount} sudah dijawab</span>
                </div>
                <div className="progress-wrapper">
                  <progress value={answeredCount} max="24" aria-label="Progres jawaban" />
                  <div className="progress-track" aria-hidden="true">
                    <div
                      className="progress-fill"
                      style={{ transform: `scaleX(${answeredCount / 24})` }}
                    />
                  </div>
                </div>
                <div key={q.id} className={`question-step-enter question-${qDir}`}>
                  <h2>{q.text}</h2>
                  <p>Seberapa kamu menyukai kegiatan ini?</p>
                  <fieldset className="answer-grid">
                    <legend className="sr-only">Pilihan jawaban</legend>
                    {['Sangat tidak suka', 'Kurang suka', 'Suka', 'Sangat suka'].map((label, i) => (
                      <label
                        key={label}
                        className={`radio-card ${data.answers[q.id] === i + 1 ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={i + 1}
                          checked={data.answers[q.id] === i + 1}
                          onChange={() =>
                            update((d) => ({ ...d, answers: { ...d.answers, [q.id]: i + 1 } }))
                          }
                        />
                        <span>
                          <strong>{label}</strong>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </div>
                <div className="row between">
                  <Button variant="outline" disabled={!index} onClick={() => setIndex(index - 1)}>
                    Kembali
                  </Button>
                  <Button onClick={() => (index < 23 ? setIndex(index + 1) : setTab('kondisi'))}>
                    {index < 23 ? 'Berikutnya' : 'Tinjau nilai & kondisi'}
                  </Button>
                </div>
                <div className="question-dots" role="group" aria-label="Pilih pernyataan">
                  {questions.map((item, i) => (
                    <button
                      key={item.id}
                      aria-label={`Pernyataan ${i + 1}${data.answers[item.id] ? ' sudah dijawab' : ''}`}
                      aria-current={i === index ? 'step' : undefined}
                      className={data.answers[item.id] ? 'answered' : ''}
                      onClick={() => setIndex(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </>
            ) : tab === 'kondisi' ? (
              <div className="stack">
                <h2>Hal penting dan keadaanmu</h2>
                <p>Opsional. Pilih 3–5 nilai jika ingin mengisinya; bagian ini boleh dilewati.</p>
                <div className="grid-two">
                  {values.map((value) => (
                    <Check
                      label={value}
                      key={value}
                      checked={data.context.values.includes(value)}
                      disabled={
                        !data.context.values.includes(value) && data.context.values.length >= 5
                      }
                      onChange={(e) =>
                        context(
                          'values',
                          e.target.checked
                            ? [...data.context.values, value]
                            : data.context.values.filter((v) => v !== value)
                        )
                      }
                    />
                  ))}
                </div>
                {data.context.values.length > 0 && data.context.values.length < 3 && (
                  <Notice type="warning">
                    Pilih setidaknya tiga nilai atau kosongkan jika ingin melewati.
                  </Notice>
                )}
                {[
                  ['strengths', 'Kekuatan yang kamu sadari'],
                  ['subjects', 'Mapel pilihan'],
                  ['support', 'Dukungan yang tersedia'],
                  ['barriers', 'Hambatan atau kondisi saat ini'],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    as="textarea"
                    label={`${label} (opsional)`}
                    maxLength={500}
                    rows={3}
                    value={data.context[key]}
                    onChange={(e) => context(key, e.target.value)}
                  />
                ))}
                <Check
                  label="Saya sudah meninjau bagian opsional ini (boleh dikosongkan)"
                  checked={data.context.reviewed}
                  onChange={(e) => context('reviewed', e.target.checked)}
                />
                <Button onClick={() => setTab('ringkasan')}>Lihat ringkasan</Button>
              </div>
            ) : (
              <>
                <h2>Gambaran minatmu saat ini</h2>
                {result.complete ? (
                  <>
                    <p>
                      {result.equal
                        ? 'Keenam minat belum terlihat berbeda dari jawaban saat ini.'
                        : `${result.leading.map((d) => dimensions[d]).join(', ')} tampak menonjol; semua dimensi yang seri di batas dua tertinggi disertakan.`}
                    </p>
                    <div className="score-bars">
                      {Object.entries(result.scores).map(([code, score], idx) => (
                        <div key={code} style={{ '--stagger': idx }}>
                          <span>
                            {code} · {dimensions[code]}
                          </span>
                          <div className="score-meter-wrap">
                            <meter
                              min="4"
                              max="16"
                              value={score}
                              aria-label={`${dimensions[code]} skor ${score} dari rentang 4 sampai 16`}
                            />
                            <div className="score-bar-track" aria-hidden="true">
                              <div
                                className="score-bar-fill"
                                style={{
                                  '--score-scale': Math.max(0.08, (score - 4) / 12),
                                  '--stagger': idx,
                                }}
                              />
                            </div>
                          </div>
                          <strong>{score}</strong>
                        </div>
                      ))}
                    </div>
                    <Notice>
                      {result.note} Rentang tiap dimensi 4–16; bukan persentase kecocokan.
                    </Notice>
                  </>
                ) : (
                  <Notice>
                    {result.missing} pernyataan belum dijawab. Ringkasan final belum dihitung.
                  </Notice>
                )}
                <Link className="button" to="/peta-jalur">
                  Jelajahi Peta Jalur
                </Link>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}
