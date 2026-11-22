# PILIHANKU

Aplikasi eksplorasi karier siswa XI–XII dengan delapan layout React, API Express, PostgreSQL/Knex, serta sesi server. Referensi Stitch asli berada di `stitch_pilihanku_career_platform_ui/` dan tidak diubah.

Implementasi lokal tersedia. **Belum merupakan rilis sekolah yang tervalidasi**: naskah refleksi/simulasi masih draf, katalog demo berisi 10 contoh, dan belum ada 40 kartu terverifikasi, telaah ahli, persetujuan sekolah/wali, SUS, atau deployment produksi. Lihat [TASKLIST](TASKLIST.md), [laporan verifikasi](docs/VERIFICATION.md), dan [daftar aset](docs/ASSETS.md).

Hasil terbaru: [remediasi production dan batas verifikasinya](docs/REMEDIATION-2026-11-22.md). Temuan kode lokal sudah ditangani; backend 41/41, frontend 13/13, backup/restore PostgreSQL serta outage/restart lulus, p95 katalog lokal terburuk 1.166 ms. Validasi sekolah/ahli, katalog resmi, uji pengguna/perangkat sasaran dan pemeriksaan hosting manual masih terbuka. Riwayat temuan tersedia pada [audit awal](docs/PRODUCTION-AUDIT-2026-11-22.md). Startup memeriksa kelengkapan migration; production menolak sekolah demo, DEMO_CONTENT=true, dan kredensial bootstrap yang tertinggal. Counter pembatasan request disimpan bersama di PostgreSQL.

Tindak lanjut 22 November 2026: migration `005_rate_limits` sudah diterapkan pada database development lokal `pilihanku` untuk memperbaiki error 500 `/api/auth/me`. Jumlah baris akun dan data domain sebelum/sesudah tetap sama. Health, pemeriksaan sesi, dan persiapan CSRF kembali 200; database production tidak disentuh. Pada instalasi lain, tetap jalankan `npm run migrate` sebelum memakai versi baru.

## Akses wajib login (22 November 2026)

Seluruh fitur membutuhkan sesi server dengan akun **approved**. Ketentuan ini menggantikan persyaratan Mode Tamu dalam dokumen rancangan awal. Beranda pengenalan tetap terbuka untuk umum. Siswa perlu login dengan akun approved untuk menjalankan fitur. Sebelum masuk, proses Masuk, Daftar Siswa, pemeriksaan status dengan username/password, dan informasi privasi juga tersedia. Halaman fitur, ekspor termasuk lembar kosong, simulasi, dan API dilindungi. API fitur mengembalikan 401 tanpa sesi dan 403 untuk role yang tidak berwenang. Akun pending/rejected/suspended tidak dapat masuk.

Siswa diarahkan ke Kenali Diriku; BK dan superadmin ke dashboard sesuai role. Logout/kedaluwarsa membongkar tampilan privat, membatalkan permintaan, membersihkan draf konsultasi sesi, serta menolak respons terlambat. Pemeriksaan sesi pasif tidak memperpanjang waktu idle. Jika logout terputus jaringan, akses tetap terkunci sampai pencabutan sesi dapat dicoba kembali. Draf tamu lama tidak dibaca atau diunggah. Lihat [rincian pengujian akses](docs/LOGIN-ACCESS.md).

## Prasyarat

- Node.js LTS 24 (diuji dengan 24.21.0); gunakan LTS 24 sesuai engine proyek dan `.nvmrc`.
- npm; gunakan `npm ci` agar mengikuti lockfile masing-masing aplikasi.
- PostgreSQL. Alternatif development: `npm run db:local` menjalankan PostgreSQL sungguhan dari paket `embedded-postgres`, bukan database tiruan. Helper ini hanya untuk development dan memakai loopback `127.0.0.1:55432`.
- Tidak membutuhkan akun layanan cloud untuk menjalankan aplikasi lokal.

## Setup lokal yang cepat

Terminal database:

```powershell
cd backend
npm ci
npm run db:local
```

Helper membuat database `pilihanku` dan `pilihanku_test`, kredensial acak di `backend/.local/`, dan `.env` lokal bila belum ada. Ia tidak menimpa `.env` yang sudah ada. Jangan menutup terminal ini selama memakai database lokal.

Terminal backend, setelah database siap:

```powershell
cd backend
npm run migrate
npm run bootstrap
npm run seed:demo
npm run dev
```

Bootstrap hanya boleh dijalankan sekali pada database awal. Username lokal diatur oleh `BOOTSTRAP_USERNAME`; password lokal dihasilkan acak oleh helper dan tersimpan hanya di `.env` yang diabaikan Git. Jangan membagikan `.env`. Setelah akses diserahkan dengan aman, hapus variabel bootstrap dari environment operasional. Seed demo hanya membuat kelas/kode konteks; tidak membuat password siswa/BK tetap. Kode demo disimpan pada `backend/.local/demo-class.json`.

Terminal frontend:

```powershell
cd frontend
npm ci
npm run dev
```

Buka **http://localhost:5173**. API berada di http://localhost:3001/api/health. Proxy Vite meneruskan `/api` ke Express; Origin harus sama persis dengan `APP_ORIGIN`. Jika port/hostname berubah, sesuaikan environment dan mulai ulang backend.

Untuk workspace yang sudah disiapkan pada pekerjaan ini, migration dan bootstrap lokal telah dijalankan; cukup jalankan database serta kedua dev server. Bootstrap berikutnya akan ditolak jika superadmin sudah ada.

## PostgreSQL yang dikelola sendiri

Salin `backend/.env.example` menjadi `backend/.env`. Buat database development dan database test **terpisah**, lalu isi URL koneksi yang diberikan operator. Isi `SESSION_SECRET` dengan setidaknya 32 karakter acak kriptografis. Tidak ada kredensial yang boleh menggunakan awalan `VITE_`.

| Variabel                                      | Fungsi                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                | PostgreSQL aplikasi; hanya server                                                                   |
| `TEST_DATABASE_URL`                           | Database disposable dengan nama berakhiran `_test`; pengujian menghapus isi database ini            |
| `SESSION_SECRET`                              | Rahasia tanda tangan sesi, minimal 32 karakter acak                                                 |
| `APP_ORIGIN`                                  | Origin frontend yang sah; HTTPS wajib pada produksi                                                 |
| `PORT`                                        | Port Express, default 3001                                                                          |
| `BIND_HOST`                                   | Default loopback; gunakan `0.0.0.0` hanya untuk container/jaringan deployment yang memang disiapkan |
| `NODE_ENV`                                    | `development`, `test`, atau `production`                                                            |
| `TRUST_PROXY`                                 | `1` hanya bila ada satu reverse proxy tepercaya; default `0`                                        |
| `PENDING_RETENTION_DAYS`                      | 1–365 hari, default usulan 90; wajib ditetapkan sekolah sebelum produksi                            |
| `LOG_REQUESTS`                                | Log request tersanitasi; aktif secara default pada production kecuali diset `false`                 |
| `DELETION_LEDGER_PATH`                        | Path absolut ledger independen; wajib untuk worker production                                       |
| `PG_BIN`, `BACKUP_KEY`                        | Client PostgreSQL dan kunci backup 32 byte acak base64; hanya server/operator                       |
| `RESTORE_DATABASE_URL`                        | Database kosong terisolasi untuk pemulihan; bukan database aplikasi aktif                           |
| `DEMO_CONTENT`                                | `true` hanya pada development; selalu nonaktif di produksi                                          |
| `BOOTSTRAP_USERNAME`, `BOOTSTRAP_PASSWORD`    | Hanya untuk bootstrap pertama                                                                       |
| `BOOTSTRAP_SCHOOL_NAME`, `BOOTSTRAP_TIMEZONE` | Nama dan zona waktu IANA sekolah awal                                                               |

Frontend tidak memerlukan environment rahasia. Paket dikunci pada `backend/package-lock.json` dan `frontend/package-lock.json`.

## Alur per role

1. **Superadmin** masuk melalui L02. Di L08 buat kelas, rotasi kode bergabung, buat akun BK, dan tentukan penugasan kelas. Atur kontak/jam layanan serta zona waktu melalui tab Layanan. Layanan konsultasi tidak menerima kiriman sebelum informasi ini tersedia.
2. **Siswa** mendaftar dengan kode kelas aktif. Akun selalu `siswa/pending`; role/status tambahan dalam payload ditolak. Superadmin meninjau L07, menyetujui atau menolak dengan alasan. Setelah approved, siswa masuk dan menyimpan miliknya sendiri.
3. **BK** masuk dengan password awal yang diberikan melalui saluran aman, lalu wajib menggantinya. BK hanya melihat kelas yang ditugaskan, agregat aman, serta konsultasi yang ditujukan kepadanya. Superadmin tidak memperoleh akses rutin ke refleksi/konsultasi privat.
4. **Tanpa sesi** dapat melihat beranda, mengurus akses akun, dan membaca privasi. Mode Tamu dan pemantauan konsultasi dengan token tamu dinonaktifkan. Penghapusan akun siswa tersedia setelah login melalui Pengaturan Data.

Setelah login sebagai siswa, empat langkah dapat dipilih tanpa harus menyelesaikannya berurutan. Refleksi bukan diagnosis; skor RIASEC dihitung setelah 24 jawaban. Matriks menahan seluruh total saat belum lengkap dan tidak memilih pemenang. Rencana kurang dari tiga tugas tetap bisa disimpan/diunduh sebagai draf.

## Konsultasi, konten, dan privasi

- Tanya BK tersedia secara global pada panel L06, termasuk sebelum rencana diisi. Empat pilihan berbagi awalnya kosong. Tinjauan menampilkan penerima, pesan, dan bagian yang akan dikirim.
- Salinan dibuat dari data akun siswa yang sudah disimpan dan bagian yang secara eksplisit dipilih. Retry dengan kunci operasi sama tidak membuat duplikasi. Pengirim dapat memantau, membatalkan permintaan aktif, menarik bagian, atau menghapus permintaan.
- Konsultasi hanya menerima siswa approved pada kelasnya sendiri; kode kelas atau token tamu tidak memberikan akses.
- Preferensi bukan jadwal. BK menetapkan tanggal/jam/tempat dengan zona waktu sekolah, mengikuti transisi Baru → Ditinjau → Dijadwalkan/Selesai, atau pembatalan.
- Kartu draf tidak tampil di katalog. Terbit memerlukan sumber HTTPS, konfirmasi pemeriksaan guru, kelengkapan isi, dan tanggal verifikasi. Aplikasi memvalidasi kelengkapan; keabsahan substansi tetap memerlukan verifikator manusia. Laporan tautan/informasi lama masuk ke Bank Informasi BK.
- Katalog memakai pagination dan filter server: OR antarminat, lalu AND dengan kategori/pencarian. Salinan opsi menyimpan versi; perubahan/arsip tidak menimpa pertimbangan lama.
- Kontribusi agregat terpisah dari berbagi konsultasi. Server menutup seluruh vektor agregat bila nilai atau pelengkapnya dapat mengungkap kelompok 1–4. Tidak ada angka kecil tersembunyi dalam respons API/tooltip.
- Password memakai Argon2id. Sesi berada di PostgreSQL, ID cookie HttpOnly, usia absolut 8 jam dan idle 30 menit. Reset/status/password/penugasan mencabut sesi lama. Mutasi memakai token CSRF dan pemeriksaan Origin; auth/konsultasi dibatasi lajunya.
- Reset akses dilakukan superadmin setelah verifikasi sekolah, bukan lewat pencarian nama atau email yang diasumsikan tersedia. Password asli tidak dapat dibaca.
- Service worker produksi hanya menyimpan shell/aset publik. `/api` tidak masuk cache. Verifikasi sesi dan fitur membutuhkan koneksi; shell luring tidak membuka eksplorasi privat.

## Pengujian dan build

Jalankan saat PostgreSQL test siap, secara berurutan:

```powershell
cd backend
npm run lint
npm test
# Opsional: mengisi ulang database test dengan 50 sesi dan 1.000 kartu sintetis
node src/scripts/measure-pilot.js
```

```powershell
cd frontend
npm run lint
npm test
npm run build
```

`npm test` backend menolak URL test yang namanya tidak berakhiran `_test`. Jangan arahkan ke data nyata. Uji backend menggunakan Express, Argon2id, store sesi, constraint, dan transaksi PostgreSQL sesungguhnya. Uji frontend mencakup kesetaraan materi offline/server, perhitungan, kedaluwarsa, cakupan ekspor, dan PDF panjang. Pengujian browser melalui CUA dicatat di [laporan verifikasi](docs/VERIFICATION.md), bukan diklaim sebagai validasi siswa/ahli.

Format kode memakai Prettier, konfigurasi pada root. Jalankan dari frontend: `npx prettier --check src tests scripts ../backend/src ../backend/tests`.

Build menghasilkan `frontend/dist/`, daftar aset publik `precache.json`, dan service worker berversi. PDF dimuat secara dinamis saat diminta. Untuk preview build: `npm run preview`. Jika menguji login pada port preview, ubah `APP_ORIGIN` backend agar cocok. Preview bukan konfigurasi produksi.

## Retensi, hapus, dan pemulihan

`DELETE /api/me/data` menghapus akun siswa beserta seluruh turunan aktif, kontribusi, permintaan, salinan berbagi, dan sesi. Tindakan mandiri ini memerlukan sesi siswa approved dan tidak membutuhkan persetujuan guru. Akun belum aktif mengurus penghapusan pendaftaran melalui petugas sekolah. Jalur penghapusan anonim lama di L02 dinonaktifkan. Dokumen yang sudah diunduh penerima berada di luar kemampuan penarikan sistem.

Jalankan dari direktori backend:

```powershell
npm run retention
node src/scripts/export-deletions.js ABSOLUTE_PATH_TO_SEPARATE_LEDGER.json
```

Job menghapus akun sesuai `retention_end_at`, pengajuan yang melewati batas, permintaan tamu historis yang jatuh tempo, sesi kedaluwarsa, dan audit lebih dari 90 hari. Akses data kelas sudah ditolak setelah tenggat meskipun job belum berjalan. `npm run worker` menyediakan loop retensi setiap jam dengan advisory lock dan ekspor ledger setiap menit; jalankan melalui pengelola proses operator. Script tidak diaktifkan pada database pengguna selama audit.

Simpan cadangan harian terenkripsi dan deletion ledger pada tempat terpisah. Tetapkan masa cadangan maksimal 30 hari. Setelah memulihkan database, **sebelum membuka trafik**:

```powershell
npm run migrate
node src/scripts/reapply-deletions.js ABSOLUTE_PATH_TO_CURRENT_LEDGER.json
npm run retention
```

Ledger memakai hash identitas acak dan mencakup akun serta permintaan yang dihapus. Backup terenkripsi/restore PostgreSQL nyata sudah diuji lokal pada database sintetis. Perintah baru `npm run backup` dan `npm run restore` serta health, monitoring, worker, batas RPO dan rekonsiliasi kredensial dijelaskan dalam [runbook operasional](docs/OPERASIONAL.md). Cadangan penyedia dan rekonsiliasi pasca-snapshot tetap diuji operator pada targetnya.

## Deployment

Target yang didukung: Node.js dengan koneksi PostgreSQL, HTTPS, dan satu origin. Pada `NODE_ENV=production`, Express juga menyajikan `frontend/dist/` serta fallback delapan rute. Contoh container ada di [Dockerfile](Dockerfile); contoh reverse proxy pada [deploy/nginx.conf.example](deploy/nginx.conf.example). Image/container belum dibangun di mesin ini karena Docker tidak tersedia.

Urutan: pilih penyedia/domain/operator → buat PostgreSQL terpisah → set rahasia/runtime → `npm ci` dan build → migration → bootstrap aman → atur kelas/penugasan/layanan → uji cookie HTTPS dan alur per role → pasang retensi, backup, monitoring → smoke test browser sampai database. Jangan menjalankan seed atau fixture QA di database produksi. Data PostgreSQL lokal pada `.local/` bukan mekanisme backup produksi.

Pemilik proyek akan melakukan deployment manual. Perbaikan ini tidak membuat paket deployment, melakukan deployment eksternal, atau membeli layanan.

## Struktur implementasi

`backend/src/modules/` memisahkan auth, approval, users/classes, exploration, content, consultations, reports, dan audit. Identitas, kelas, keputusan, sesi, konten, konsultasi, audit, laporan sumber, dan ledger dinormalisasi. Eksplorasi privat memakai JSONB tervalidasi/berevisi agar jawaban, matriks, musyawarah, rencana, serta versinya tersimpan atomik. Ini keputusan implementasi model domain, bukan penyimpanan hasil perhitungan dari browser sebagai sumber kebenaran.

`frontend/src/pages/` memuat tepat delapan halaman utama. Komponen bersama, context, storage, ekspor, dan Fetch API terpusat berada di folder terpisah. Semua kode aplikasi JavaScript/JSX. Tidak ada role dari localStorage atau kontrol pratinjau role.

## Pekerjaan eksternal yang tersisa

- Ahli BK/media menelaah 24 butir, penjelasan dimensi, lima simulasi, musyawarah, dan teks persetujuan.
- Verifikator menyiapkan 10 kartu awal lalu 40 kartu terverifikasi lintas kategori. Sepuluh contoh yang tersedia tidak dihitung sebagai kartu terverifikasi.
- Sekolah menetapkan mekanisme persetujuan siswa/wali, periode retensi, kontak/jam nyata, penanggung jawab layanan, serta prosedur reset identitas.
- Uji 6–10 siswa dan satu BK dengan persetujuan; ukur keberhasilan tugas, keterpahaman, dan SUS. Uji perangkat Android/pembaca layar sasaran dan 4G yang tercatat.
- Operator memilih hosting/domain, memasang HTTPS, scheduler/backup/monitoring, melakukan simulasi restore dan smoke test pada deployment.

Tidak ada hasil uji manusia, persetujuan sekolah, sumber resmi, atau biaya yang dibuat-buat.
