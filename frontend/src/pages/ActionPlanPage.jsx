import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useExploration } from '../context/exploration.js';
import { Heading, Field, Check, Button, Notice } from '../components/ui/index.jsx';
import { ExportPanel } from '../features/action-plan/ExportPanel.jsx';
import { ConsultationPanel } from '../features/consultations/ConsultationPanel.jsx';
import { prefersReducedMotion, useFlashOnUpdate } from '../hooks/useMotion.js';

export default function ActionPlanPage() {
  const { data, update } = useExploration(),
    [params, setParams] = useSearchParams(),
    [title, setTitle] = useState(''),
    [due, setDue] = useState(''),
    [removingId, setRemovingId] = useState(null);
  const removeTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(removeTimerRef.current), []);

  const plan = data.plan;
  const doneCount = plan.tasks.filter((t) => t.done).length;
  const countFlash = useFlashOnUpdate(`${doneCount}/${plan.tasks.length}`);

  const patch = (values) => update((d) => ({ ...d, plan: { ...d.plan, ...values } }));
  const open = (panel) => {
    const next = new URLSearchParams(params);
    next.set('panel', panel);
    setParams(next);
  };
  const removeTask = (id) => {
    clearTimeout(removeTimerRef.current);
    if (prefersReducedMotion()) {
      patch({ tasks: plan.tasks.filter((t) => t.id !== id) });
      return;
    }
    setRemovingId(id);
    removeTimerRef.current = setTimeout(() => {
      setRemovingId(null);
      update((d) => ({
        ...d,
        plan: { ...d.plan, tasks: d.plan.tasks.filter((t) => t.id !== id) },
      }));
    }, 160);
  };

  return (
    <>
      <Heading eyebrow="LANGKAH 04 · MULAI DARI LANGKAH KECIL" title="Rencana Langkahku">
        Tidak harus sempurna. Buat rencana yang bisa ditinjau dan diubah.
      </Heading>
      {params.get('panel') === 'export' ? (
        <ExportPanel />
      ) : params.get('panel') === 'konsultasi' ? (
        <ConsultationPanel />
      ) : (
        <div className="plan-layout tab-panel-enter">
          <section className="surface stack">
            <h2>Arahmu untuk saat ini</h2>
            <Field
              as="select"
              label="Status pilihan"
              value={plan.status}
              onChange={(e) => patch({ status: e.target.value })}
            >
              <option value="exploring">Aku masih menjelajah</option>
              <option value="chosen">Aku memiliki pilihan sementara</option>
            </Field>
            {plan.status === 'chosen' && (
              <Field
                label="Pilihan utama (ditetapkan sendiri)"
                maxLength={100}
                list="option-titles"
                value={plan.main}
                onChange={(e) => patch({ main: e.target.value })}
              />
            )}
            {plan.status === 'chosen' && !plan.main.trim() && (
              <Notice type="warning">
                Isi pilihan utama saat sudah siap. Drafmu tetap disimpan selama belum lengkap.
              </Notice>
            )}
            <Field
              label="Pilihan cadangan (boleh belum ditentukan)"
              list="option-titles"
              maxLength={100}
              value={plan.backup}
              onChange={(e) => patch({ backup: e.target.value })}
            />
            <datalist id="option-titles">
              {data.comparison.options.map((o) => (
                <option value={o.title} key={o.id} />
              ))}
            </datalist>
            {plan.main && plan.main === plan.backup && (
              <Notice type="error">Pilihan utama dan cadangan harus berbeda.</Notice>
            )}
            <hr />
            <div className="row between">
              <h2>Langkah tindakan</h2>
              <span className={`badge ${countFlash ? 'is-updated' : ''}`}>
                {doneCount}/{plan.tasks.length} selesai
              </span>
            </div>
            <p>
              Tiga langkah membantu memperjelas rencana. Draf dengan kurang dari tiga tetap boleh
              disimpan dan diunduh.
            </p>
            {plan.tasks.map((task) => {
              const isRemoving = removingId === task.id;
              return (
                <div
                  className={`task ${task.done ? 'is-done' : ''} ${isRemoving ? 'is-removing' : ''}`}
                  key={task.id}
                  inert={isRemoving}
                  aria-hidden={isRemoving ? 'true' : undefined}
                >
                  <Check
                    label="Selesai"
                    checked={task.done}
                    onChange={(e) =>
                      patch({
                        tasks: plan.tasks.map((t) =>
                          t.id === task.id ? { ...t, done: e.target.checked } : t
                        ),
                      })
                    }
                  />
                  <Field
                    label="Judul langkah"
                    maxLength={200}
                    value={task.title}
                    onChange={(e) =>
                      patch({
                        tasks: plan.tasks.map((t) =>
                          t.id === task.id ? { ...t, title: e.target.value } : t
                        ),
                      })
                    }
                  />
                  <Field
                    label="Tenggat"
                    type="date"
                    value={task.due}
                    onChange={(e) =>
                      patch({
                        tasks: plan.tasks.map((t) =>
                          t.id === task.id ? { ...t, due: e.target.value } : t
                        ),
                      })
                    }
                  />
                  <Button variant="plain" onClick={() => removeTask(task.id)}>
                    Hapus langkah
                  </Button>
                </div>
              );
            })}
            <form
              className="task-add stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim() && plan.tasks.length < 20) {
                  patch({
                    tasks: [
                      ...plan.tasks,
                      { id: crypto.randomUUID(), title: title.trim(), due, done: false },
                    ],
                  });
                  setTitle('');
                  setDue('');
                }
              }}
            >
              <Field
                label="Langkah baru"
                maxLength={200}
                value={title}
                required
                placeholder="Misalnya: cari informasi persyaratan resmi"
                onChange={(e) => setTitle(e.target.value)}
              />
              <Field
                label="Tenggat langkah baru (opsional)"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
              <div className="action-row">
                <Button type="submit" variant="outline" disabled={plan.tasks.length >= 20}>
                  Tambah langkah
                </Button>
              </div>
            </form>
            <Field
              as="textarea"
              rows={3}
              maxLength={500}
              label="Dukungan yang dibutuhkan (opsional)"
              value={plan.support}
              onChange={(e) => patch({ support: e.target.value })}
            />
            <Field
              as="textarea"
              rows={3}
              maxLength={500}
              label="Hambatan dan cara menghadapinya (opsional)"
              value={plan.barriers}
              onChange={(e) => patch({ barriers: e.target.value })}
            />
          </section>
          <aside className="surface stack">
            <p className="eyebrow">BAWA RENCANAMU MELANGKAH</p>
            <h2>
              Simpan, diskusikan,
              <br />
              tinjau kembali.
            </h2>
            <p>
              Pilih bagian yang ingin kamu unduh. Kamu juga bisa meminta pendampingan sebelum
              rencana lengkap.
            </p>
            <Button onClick={() => open('export')}>Unduh ringkasan</Button>
            <Button variant="outline" onClick={() => open('konsultasi')}>
              Tanya Guru BK
            </Button>
            <Notice>Refleksi, matriks, rencana, dan musyawarah tidak dibagikan otomatis.</Notice>
          </aside>
        </div>
      )}
    </>
  );
}
