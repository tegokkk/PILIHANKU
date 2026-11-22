import { questions, dimensions } from '../data/materials.js';
export function riasec(answers) {
  const missing = questions.filter(
    (q) => !Number.isInteger(answers[q.id]) || answers[q.id] < 1 || answers[q.id] > 4
  ).length;
  if (missing) return { complete: false, missing };
  const scores = Object.fromEntries(
    Object.keys(dimensions).map((d) => [
      d,
      questions.filter((q) => q.dimension === d).reduce((n, q) => n + answers[q.id], 0),
    ])
  );
  const ordered = Object.values(scores).sort((a, b) => b - a),
    equal = ordered[0] === ordered[5];
  return {
    complete: true,
    scores,
    equal,
    leading: equal ? [] : Object.keys(scores).filter((d) => scores[d] >= ordered[1]),
    note: equal
      ? 'Minat belum terlihat berbeda dari jawaban saat ini.'
      : 'Kecenderungan dapat berubah; gunakan sebagai bahan diskusi, bukan diagnosis atau rekomendasi jurusan.',
  };
}
export function matrix(comparison) {
  const { options = [], criteria = [] } = comparison;
  const complete =
    options.length >= 2 &&
    options.length <= 3 &&
    criteria.length >= 3 &&
    criteria.length <= 5 &&
    criteria.every(
      (c) =>
        Number.isInteger(c.weight) &&
        c.weight >= 1 &&
        c.weight <= 3 &&
        options.every(
          (o) => Number.isInteger(c.ratings?.[o.id]) && c.ratings[o.id] >= 1 && c.ratings[o.id] <= 4
        )
    );
  return {
    complete,
    totals: complete
      ? options.map((o) => ({
          id: o.id,
          total: criteria.reduce((s, c) => s + c.weight * c.ratings[o.id], 0),
        }))
      : null,
  };
}
export function emptyExploration() {
  return {
    answers: {},
    context: {
      values: [],
      reviewed: false,
      strengths: '',
      subjects: '',
      support: '',
      barriers: '',
    },
    comparison: {
      options: [],
      criteria: ['Sesuai minat', 'Biaya terjangkau', 'Dukungan'].map((name, i) => ({
        id: `c${i}`,
        name,
        weight: null,
        ratings: {},
      })),
    },
    discussion: {},
    plan: { status: 'exploring', main: '', backup: '', tasks: [], support: '', barriers: '' },
    simulations: {},
    explored: [],
  };
}
