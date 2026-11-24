import { api, privateCheckpoint } from '../services/api.js';
import { riasec, matrix } from '../utils/calculations.js';
import { dimensions } from '../data/materials.js';
import { discussionLabels } from '../data/discussion.js';
export function exportSections(data, scope) {
  const sections = [];
  if (scope.reflection) {
    const result = riasec(data.answers);
    sections.push({
      title: 'Kenali Diriku',
      text: result.complete
        ? Object.entries(result.scores)
            .map(([k, v]) => `${dimensions[k]}: ${v}`)
            .join(' | ')
        : 'Refleksi belum lengkap',
      rows: [
        ['Nilai', data.context.values.join(', ')],
        ['Kekuatan', data.context.strengths],
        ['Mapel', data.context.subjects],
      ],
    });
  }
  if (scope.comparison) {
    const result = matrix(data.comparison);
    sections.push({
      title: 'Timbang Pilihan',
      text: result.complete
        ? 'Total tidak memilihkan pemenang.'
        : 'Matriks belum lengkap. Total final ditahan.',
      head: ['Kriteria', 'Bobot', ...data.comparison.options.map((o) => o.title)],
      rows: data.comparison.criteria.map((c) => [
        c.name,
        c.weight || 'Belum tahu',
        ...data.comparison.options.map((o) => c.ratings[o.id] || 'Belum tahu'),
      ]),
      after: result.complete
        ? result.totals
            .map((t) => `${data.comparison.options.find((o) => o.id === t.id).title}: ${t.total}`)
            .join('; ')
        : '',
    });
  }
  if (scope.plan)
    sections.push({
      title: 'Rencana Langkahku',
      text: `${data.plan.status === 'exploring' ? 'Aku masih menjelajah' : `Pilihan utama: ${data.plan.main || 'Belum ditentukan'}`}\nCadangan: ${data.plan.backup || 'Belum ditentukan'}\n${data.plan.tasks.length < 3 ? 'Draf — kurang dari tiga langkah.' : data.plan.tasks.some((t) => !t.title.trim()) || (data.plan.status === 'chosen' && !data.plan.main.trim()) ? 'Draf — rencana belum lengkap.' : ''}`,
      head: ['Langkah', 'Tenggat', 'Status'],
      rows: data.plan.tasks.map((t) => [
        t.title || 'Belum diisi',
        t.due || 'Belum ditentukan',
        t.done ? 'Selesai' : 'Belum',
      ]),
      after: data.comparison.options
        .map(
          (o) =>
            `${o.title}: salinan versi ${o.version || 'pribadi'}, verifikasi ${o.snapshot?.verified_at || 'belum diverifikasi'}`
        )
        .join('\n'),
    });
  if (scope.support)
    sections.push({
      title: 'Dukungan & hambatan',
      rows: [
        ['Dukungan', data.plan.support],
        ['Hambatan', data.plan.barriers],
        ['Dukungan refleksi', data.context.support],
        ['Kondisi refleksi', data.context.barriers],
      ],
    });
  if (scope.discussion)
    sections.push({
      title: 'Musyawarah (opsional)',
      rows: Object.entries(data.discussion).map(([k, v]) => [discussionLabels[k] || k, v]),
    });
  if (scope.blank)
    sections.push({
      title: 'Lembar kerja kosong',
      text: 'Kenali Diriku: minat, nilai, kekuatan, dukungan\n\n________________________________________\n\nPeta Jalur: opsi dan informasi yang ingin dicari\n\n________________________________________\n\nTimbang Pilihan: kriteria, bobot 1–3, penilaian 1–4\n\n________________________________________\n\nRencana Langkahku: tiga langkah, tenggat, dukungan\n\n________________________________________\n\nMusyawarah (opsional): kesepakatan dan pertanyaan\n\n________________________________________',
    });
  return sections;
}
export async function downloadPlan(data, scope, save = true) {
  const checkpoint = privateCheckpoint();
  if (save) {
    const user = await api('/auth/me');
    checkpoint();
    if (!user || user.role !== 'siswa' || user.mustChangePassword || user.expiresAt <= Date.now())
      throw new Error('Masuk sebagai siswa dengan akun approved untuk mengekspor.');
  }
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  if (save) checkpoint();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 20;
  const line = (text, size = 11) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text || ''), 178);
    for (const item of lines) {
      if (y > 277) {
        doc.addPage();
        y = 20;
      }
      doc.text(item, 16, y);
      y += size * 0.45 + 1;
    }
  };
  line('PILIHANKU — Ringkasan refleksi', 18);
  line(`Dibuat ${new Date().toLocaleDateString('id-ID')}`);
  line('Bahan refleksi dan diskusi. Bukan diagnosis atau rekomendasi jurusan.');
  for (const section of exportSections(data, scope)) {
    y += 5;
    line(section.title, 15);
    if (section.text) line(section.text);
    if (section.rows?.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: 16, right: 16, top: 18, bottom: 18 },
        head: section.head ? [section.head] : undefined,
        body: section.rows,
        styles: { fontSize: 10, overflow: 'linebreak', cellPadding: 3 },
        headStyles: { fillColor: [15, 91, 91] },
        theme: 'grid',
        rowPageBreak: 'avoid',
      });
      y = doc.lastAutoTable.finalY + 7;
    }
    if (section.after) line(section.after);
  }
  const name = `PILIHANKU-Rencana-${new Date().toLocaleDateString('en-CA')}.pdf`;
  if (save) checkpoint();
  if (save) doc.save(name);
  return doc;
}
