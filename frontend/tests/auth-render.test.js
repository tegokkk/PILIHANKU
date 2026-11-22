import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString, renderToReadableStream } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
test('all eight layouts render only the session check, even with a stale user in memory', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: App } = await server.ssrLoadModule('/src/App.jsx');
    const { AuthContext } = await server.ssrLoadModule('/src/context/auth.js');
    for (const path of [
      '/',
      '/mulai',
      '/kenali-diriku',
      '/peta-jalur?panel=simulasi',
      '/timbang-pilihan',
      '/rencana-langkahku?panel=export',
      '/guru',
      '/guru/kelola',
    ]) {
      const html = renderToString(
        React.createElement(
          MemoryRouter,
          { initialEntries: [path] },
          React.createElement(
            AuthContext.Provider,
            { value: { user: { id: 'stale-synthetic', role: 'siswa' }, loading: true, error: '' } },
            React.createElement(App)
          )
        )
      );
      assert.match(html, /Menyiapkan ruangmu/);
      assert.doesNotMatch(html, /Keluar|Unduh PDF|Pernyataan 1|Navigasi utama|Permintaanku/);
    }
    // A public home page must not require an exploration provider or load account data.
    const stream = await renderToReadableStream(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(
          AuthContext.Provider,
          { value: { user: null, loading: false, error: '' } },
          React.createElement(App)
        )
      )
    );
    await stream.allReady;
    const homepage = await new Response(stream).text();
    assert.match(homepage, /Rancang masa depan/);
    assert.match(homepage, /Mulai eksplorasi/);
    assert.match(homepage, /tab=masuk/);
    assert.doesNotMatch(homepage, /Selamat datang kembali|Keluar|Lanjutkan dari langkahmu/);
  } finally {
    await server.close();
  }
});
