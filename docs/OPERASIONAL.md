# Operasional PILIHANKU

22 November 2026. Perintah dijalankan dari `backend/`. Deployment dilakukan manual oleh pemilik proyek; tidak ada paket atau deployment baru yang dibuat dalam perbaikan ini. Jangan menjalankan fixture pengujian pada database sekolah.

## Proses dan pemantauan

Jalankan migration sebelum API: `npm run migrate`, kemudian `npm start`. API menolak startup bila migration belum lengkap. Gunakan pengelola proses pilihan operator untuk memulai kembali API/worker yang berhenti.

- `GET /api/health/live`: 200 ketika proses hidup, 503 ketika sedang menutup.
- `GET /api/health`: 200 ketika database dan tabel sesi/limiter tersedia; 503 ketika tidak siap. Route tidak bergantung pada sesi atau penulisan limiter.
- `GET /api/admin/operations`: membutuhkan sesi superadmin. Memuat jumlah request aktif/lambat/error dan status retensi. Tidak memuat jawaban atau pesan siswa. Counter mulai ulang bersama proses; ambil log terpusat untuk riwayat lintas proses.
- `LOG_REQUESTS=true`: JSON `http_request` hanya mencatat method, pola route, status dan durasi. Tidak mencatat body, query, username, cookie, token atau ID URL.
- Alert operator bila readiness 503 berulang, proses berhenti, error 5xx meningkat, atau p95 melebihi 2 detik pada trafik sasaran. Nilai lokal bukan SLA hosting.

`npm run worker` menjalankan retensi setiap jam dengan advisory lock PostgreSQL agar dua worker tidak menghapus bersamaan. Kegagalan retensi tercatat pada `job_runs`; status `stale` menjadi true jika belum pernah berhasil, lebih dari 90 menit, atau ada kegagalan lebih baru. Pantau juga log error worker dan status prosesnya.

Pada production worker mewajibkan `DELETION_LEDGER_PATH`: path absolut ke storage terlindungi yang terpisah dari direktori backup. Worker mengekspor ledger secara atomik setiap menit; kegagalan ekspor menghasilkan log error dan dicoba lagi. Hentikan pembukaan trafik hasil restore bila ledger terbaru belum dapat dipastikan. Ekspor berkala mempunyai jeda kehilangan data; operator perlu menetapkan dan menguji RPO ledger, termasuk rekonsiliasi permintaan penghapusan di antara ekspor dan gangguan.

Sinyal SIGINT/SIGTERM menutup penerimaan koneksi, menyelesaikan request yang sedang berjalan, lalu menutup store sesi dan pool database. Batas penutupan 10 detik; timeout menghasilkan exit nonzero. Pengelola proses harus memberi waktu lebih panjang daripada batas ini.

## Backup terenkripsi

Pasang `pg_dump` dan `pg_restore` resmi yang kompatibel dengan versi server. Set `PG_BIN` ke direktori binary atau gunakan PATH. Simpan `BACKUP_KEY` sebagai rahasia **32 byte acak berformat base64**, terpisah dari backup dan source. Jangan menaruh nilai kunci pada argumen command line atau laporan. Operator harus menguji akses terhadap salinan kunci pemulihan.

Siapkan direktori backup dan direktori ledger secara terpisah. Batasi akses berkas serta direktori kepada operator pemulihan (ACL Windows atau permission Unix); mode file dari Node saja tidak menetapkan ACL Windows.

```powershell
npm run backup -- D:\cadangan\pilihanku-YYYYMMDD.enc E:\ledger\current.json
```

Contoh path hanya placeholder; jangan menganggap drive tersebut tersedia. `DATABASE_URL` dibaca dari environment. Arsip custom PostgreSQL dienkripsi AES-256-GCM dengan nonce acak. Berkas akhir baru tersedia setelah dump/enkripsi/fsync berhasil. Nama berkas yang sudah ada ditolak. Output hanya ukuran/status. Jalankan harian melalui penjadwal yang dipilih operator, simpan di storage tahan kehilangan host, pantau exit code, dan terapkan masa simpan backup maksimal 30 hari sesuai kebijakan produk. Script tidak otomatis menghapus backup lama.

Ledger harus tetap diperbarui sesudah backup, termasuk penghapusan mandiri di antara dua backup. Selain worker, ekspor manual tersedia:

```powershell
node src/scripts/export-deletions.js E:\ledger\current.json
```

Lindungi integritas dan akses ledger. Jangan memakai ledger lama yang diambil bersama snapshot sebagai pengganti ledger terkini. Ekspor satu menit dan backup harian bukan jaminan tidak ada kehilangan transaksi; tetapkan kebutuhan RPO/RTO dan rekonsiliasi sebelum melayani siswa lagi.

## Restore ke database kosong dan terisolasi

1. Hentikan trafik menuju target. Buat database baru yang kosong, jangan arahkan perintah ke database aplikasi aktif. Set `RESTORE_DATABASE_URL`, `BACKUP_KEY`, `PG_BIN`, serta `PENDING_RETENTION_DAYS` sesuai kebijakan sekolah. Jaga nilai kredensial tetap di secret store/environment.
2. Pastikan arsip, kunci pemulihan, dan ledger independen terkini tersedia. Jika ledger tidak lengkap, rekonsiliasi penghapusan dahulu dan pertahankan target offline.
3. Jalankan perintah berikut dengan nama database target yang tepat:

```powershell
npm run restore -- D:\cadangan\pilihanku-YYYYMMDD.enc E:\ledger\current.json pilihanku_restore
```

4. Script memvalidasi ledger dan nama target; menolak tabel yang sudah ada; memeriksa tag autentikasi arsip sebelum menulis database; menjalankan `pg_restore` dalam satu transaksi; migration; replay seluruh tombstone; retensi; serta menghapus sesi dan counter limiter hasil restore. File plaintext sementara dihapus pada akhir proses. Tempatkan area kerja di volume terlindungi; crash/pemutusan daya memerlukan inspeksi berkas sementara sebelum volume digunakan lagi.
5. Bila gagal, target tetap offline; baca status/exit code, periksa penyebab, lalu gunakan target kosong yang baru. Jangan membuka trafik hanya karena sebagian tabel sudah ada.
6. Tinjau akun/status/penugasan dan perubahan kredensial sejak snapshot: password/status lama dapat ikut kembali. Rekonsiliasi reset/suspend setelah waktu backup dan cabut akses terkait sebelum trafik. Pembersihan sesi saja tidak membatalkan password yang ikut dipulihkan.
7. Uji health, login approved, penolakan pending/suspended, scope BK, simpan–reload, konsultasi, dan penghapusan pada data uji yang berwenang. Pastikan subjek yang sudah dihapus tidak kembali. Catat waktu snapshot, ledger, akhir restore, hasil dan penanggung jawab. Baru alihkan trafik setelah rekonsiliasi serta pemeriksaan selesai.

Pemulihan lokal nyata sudah diuji menggunakan PostgreSQL 18.7 dan data sintetis (`output/qa/release/recovery.json`), termasuk kunci salah, arsip rusak, ledger invalid, target berisi tabel, data terhapus sesudah snapshot, dan retensi. Ini tidak membuktikan backup milik penyedia hosting atau ukuran database production.

## Mengulang pengujian

`TEST_DATABASE_URL` harus menuju database disposable dengan nama berakhiran `_test`; suite mengosongkannya. Set `PG_BIN` untuk menjalankan uji backup/restore (tanpanya kasus tersebut dilewati). Uji lifecycle membuat proses PostgreSQL terpisah dengan port/direktori acak; tidak menghentikan cluster aplikasi.

```powershell
npm test
npm run test:load
```

Benchmark dijalankan sesudah suite, memakai 50 sesi yang telah login, 1.000 kartu dan tiga putaran masing-masing 50 request katalog paralel melalui satu HTTP server. Proses gagal bila p95 terburuk mencapai 2 detik. Ini tidak mengukur 50 login bersamaan, 4G, inbox/agregat seluruh sekolah atau kapasitas host production.
