import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useExploration } from '../../context/exploration.js';
import { exportSections, downloadPlan } from '../../exports/plan-pdf.js';
import { Button, Check, AsyncButton, Heading, Panel } from '../../components/ui/index.jsx';
import { useExitAction } from '../../hooks/useMotion.js';

export function ExportPanel() {
  const { data } = useExploration(),
    [params, setParams] = useSearchParams(),
    [exiting, triggerExit] = useExitAction(),
    [scope, setScope] = useState({
      plan: !params.has('blank') && params.get('section') !== 'discussion',
      reflection: false,
      comparison: false,
      discussion: params.get('section') === 'discussion',
      support: false,
      blank: params.has('blank'),
    });
  const sections = exportSections(data, scope);
  return (
    <Panel exiting={exiting} direction="up" className="surface stack export-panel">
      <div className="no-print">
        <Button
          variant="plain"
          onClick={() =>
            triggerExit(() => {
              const next = new URLSearchParams(params);
              next.delete('panel');
              setParams(next);
            })
          }
        >
          Kembali ke rencana
        </Button>
        <Heading level={2} eyebrow="SIMPAN UNTUK DIRIMU" title="Unduh ringkasan" />
        <p>
          Pilih cakupan dan tinjau sebelum mengunduh. Data diproses di perangkat; tidak ada
          password, token, atau rahasia akses dalam berkas.
        </p>
        <div className="grid-two">
          {[
            ['plan', 'Rencana dan tugas'],
            ['reflection', 'Ringkasan minat & nilai'],
            ['comparison', 'Matriks'],
            ['discussion', 'Musyawarah'],
            ['support', 'Dukungan & hambatan'],
            ['blank', 'Lembar kerja kosong'],
          ].map(([k, label]) => (
            <Check
              key={k}
              label={label}
              checked={scope[k]}
              onChange={(e) => setScope({ ...scope, [k]: e.target.checked })}
            />
          ))}
        </div>
      </div>
      <div className="print-document">
        <h2>PILIHANKU — Pratinjau</h2>
        <p>Bahan refleksi dan diskusi. Keputusan tetap milikmu.</p>
        {sections.map((s) => (
          <section key={s.title} className="preview-section-enter">
            <h3>{s.title}</h3>
            <p className="preserve">{s.text}</p>
            {s.rows?.length > 0 && (
              <div className="table-scroll">
                <table>
                  {s.head && (
                    <thead>
                      <tr>
                        {s.head.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {s.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="preserve">{s.after}</p>
          </section>
        ))}
      </div>
      <div className="row no-print">
        <AsyncButton disabled={!sections.length} action={() => downloadPlan(data, scope)}>
          Unduh PDF
        </AsyncButton>
        <Button variant="outline" disabled={!sections.length} onClick={() => window.print()}>
          Cetak / Simpan sebagai PDF
        </Button>
      </div>
    </Panel>
  );
}
