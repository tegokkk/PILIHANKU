import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { questions, scenarios } from '../src/data/materials.js';
import {
  questions as serverQuestions,
  scenarios as serverScenarios,
} from '../../backend/src/modules/content/materials.js';
import { riasec, matrix, emptyExploration } from '../src/utils/calculations.js';
import { exportSections, downloadPlan } from '../src/exports/plan-pdf.js';
import { expired } from '../src/storage/guest-storage.js';
import { loadGuest, saveGuest } from '../src/storage/guest-storage.js';
import { guestMode, chooseGuestMode } from '../src/storage/preferences.js';
import { prefersReducedMotion } from '../src/hooks/useMotion.js';
test('versioned offline materials match server and all 24 items cover six equal dimensions', () => {
  assert.deepEqual(questions, serverQuestions);
  assert.deepEqual(scenarios, serverScenarios);
  assert.equal(questions.length, 24);
  for (const d of ['R', 'I', 'A', 'S', 'E', 'C'])
    assert.equal(questions.filter((q) => q.dimension === d).length, 4);
});
test('local RIASEC complete/ties and matrix all-or-nothing manual totals', () => {
  const a = Object.fromEntries(questions.map((q) => [q.id, 4]));
  assert.equal(riasec(a).equal, true);
  assert.deepEqual(Object.values(riasec(a).scores), Array(6).fill(16));
  a.R1 = undefined;
  assert.equal(riasec(a).complete, false);
  const c = {
    options: [{ id: 'a' }, { id: 'b' }],
    criteria: [
      { weight: 3, ratings: { a: 4, b: 3 } },
      { weight: 3, ratings: { a: 2, b: 4 } },
      { weight: 2, ratings: { a: 4, b: 3 } },
    ],
  };
  assert.deepEqual(
    matrix(c).totals.map((t) => t.total),
    [26, 27]
  );
  c.criteria[1].weight = null;
  assert.equal(matrix(c).totals, null);
});
test('guest expiry uses first save fixed timestamp; old formats expire', () => {
  const first = 1000,
    expiresAt = first + 30 * 86400000;
  assert.equal(expired({ version: 1, expiresAt }, expiresAt - 1), false);
  assert.equal(expired({ version: 1, expiresAt }, expiresAt), true);
  assert.equal(expired({ version: 0, expiresAt }, 0), true);
});
test('PDF generator includes only chosen sections; draft and blank worksheet contain no credentials', () => {
  const data = { ...emptyExploration(), password: 'DO-NOT-EXPORT', token: 'SECRET-TOKEN' };
  data.discussion.reason = 'PRIVATE DISCUSSION';
  data.plan.support = 'PRIVATE SUPPORT';
  assert.equal(JSON.stringify(exportSections(data, { plan: true })).includes('PRIVATE'), false);
  assert.equal(JSON.stringify(exportSections(data, { plan: true })).includes('SECRET'), false);
  assert.equal(exportSections(data, { plan: true })[0].text.includes('Draf'), true);
  assert.ok(
    JSON.stringify(exportSections(data, { discussion: true })).includes('PRIVATE DISCUSSION')
  );
  assert.equal(exportSections(data, { blank: true }).length, 1);
});
test('long PDF content wraps to multiple pages and has no omitted secrets', async () => {
  const data = emptyExploration();
  data.plan.tasks = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    title: `Langkah ${i + 1}: ` + 'Uji teks panjang yang harus tetap terbaca pada PDF. '.repeat(4),
    due: '2026-12-01',
    done: false,
  }));
  data.discussion.reason = 'JANGAN-IKUT';
  const doc = await downloadPlan(data, { plan: true }, false);
  assert.ok(doc.getNumberOfPages() > 1);
  assert.equal(doc.output().includes('JANGAN-IKUT'), false);
});
test('source reference HTML remains intact and application avoids CDN/role preview', async () => {
  const app = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(app.includes('cdn.tailwindcss'), false);
  const shell = await readFile(
    new URL('../src/components/navigation/Shell.jsx', import.meta.url),
    'utf8'
  );
  assert.equal(shell.includes('href="#"'), false);
  const tokens = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
  assert.ok(tokens.includes('--duration-micro: 150ms'));
  assert.ok(tokens.includes('--duration-ui: 220ms'));
  assert.ok(tokens.includes('--duration-panel: 280ms'));
  assert.ok(tokens.includes('prefers-reduced-motion: reduce'));
  const printCss = await readFile(new URL('../src/styles/print.css', import.meta.url), 'utf8');
  assert.ok(printCss.includes('animation: none !important'));
  assert.ok(printCss.includes('transition: none !important'));
  const appCss = await readFile(new URL('../src/styles/app.css', import.meta.url), 'utf8');
  assert.ok(appCss.includes('@media (hover: hover) and (pointer: fine)'));
  assert.ok(appCss.includes('@media (prefers-reduced-motion: reduce)'));
  assert.ok(appCss.includes('.tab-indicator'));
  assert.ok(appCss.includes('.motion-panel.is-exiting'));
  assert.ok(appCss.includes('.score-bar-fill'));
  assert.equal(prefersReducedMotion(), false);
});
test('shared storage restores data, expiry is not extended and unavailable/quota errors stay failures', async () => {
  const entries = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => entries.get(k) || null,
    setItem: (k, v) => entries.set(k, v),
    removeItem: (k) => entries.delete(k),
  };
  globalThis.localStorage = { getItem: () => null };
  const first = Date.now();
  await saveGuest('shared', { answers: { R1: 4 } }, first);
  assert.equal((await loadGuest('shared')).data.answers.R1, 4);
  const saved = await saveGuest('shared', { answers: { R1: 3 } }, first);
  assert.equal(saved.expiresAt, first + 30 * 86400000);
  await saveGuest('shared', { answers: { R1: 3 } }, first - 31 * 86400000);
  assert.equal(await loadGuest('shared'), null);
  globalThis.sessionStorage = {
    getItem: () => {
      throw new Error('Storage unavailable');
    },
    setItem: () => {
      throw new Error('Quota exceeded');
    },
  };
  assert.equal(guestMode(), 'shared');
  assert.equal(chooseGuestMode('personal'), false);
  await assert.rejects(saveGuest('shared', {}), /Quota exceeded/);
  delete globalThis.sessionStorage;
  delete globalThis.localStorage;
});
