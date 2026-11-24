# Struktur Proyek PILIHANKU

| Metadata                   | Keterangan                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| Versi                      | 1.0                                                                                               |
| Tanggal                    | 21 November 2026                                                                                  |
| Bahasa aplikasi            | JavaScript: `.js` untuk backend/utilitas, `.jsx` untuk komponen React                             |
| Folder aplikasi utama      | `backend/` dan `frontend/`                                                                        |
| Role akun                  | `superadmin`, `bk`, `siswa`                                                                       |
| Fitur prioritas superadmin | Menyetujui atau menolak pendaftaran akun siswa                                                    |
| Acuan                      | [PRD.md](./PRD.md) dan [design.md](./design.md), diselaraskan ke versi 1.2                        |
| Status                     | Rancangan struktur; belum melakukan scaffolding, instalasi dependensi, atau implementasi aplikasi |

## 1. Keputusan arsitektur

PILIHANKU menggunakan frontend **React + Vite** dan backend **Node.js + Express** dengan **PostgreSQL**. Kode aplikasi memakai JavaScript; komponen React memakai JSX. Gunakan REST API dan server-side session agar frontend dan backend tetap terpisah serta pemeriksaan role berada di server.

Proyek cukup memiliki dua aplikasi utama. Modul fitur berada di dalam masing-masing aplikasi; tidak perlu memecah menjadi banyak layanan. Dokumen, aset referensi yang sudah ada, dan file konfigurasi root tetap dapat berada di root proyek.

Ketentuan terbaru pengguna menetapkan **tiga role login**. Pendaftaran publik hanya membuat akun `siswa` dengan status `pending`. **Hanya superadmin yang dapat menyetujuinya.** Akun pending tidak memiliki akses ke API siswa sampai berstatus `approved`.

Mode Tamu tetap tersedia untuk eksplorasi lokal sesuai PRD dan **bukan role akun keempat**. Kode kelas hanya konteks kelas, bukan kredensial login. Mekanisme akun username/password dan approval menggantikan mekanisme lama yang mengaktifkan peserta melalui kode kelas/kunci pemulihan saja.

## 2. Tech stack yang digunakan

### 2.1 Frontend

| Kebutuhan             | Pilihan                                                                          | Pemakaian                                                                                 |
| --------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Bahasa                | JavaScript ES Modules + JSX                                                      | Kode `.js`/`.jsx`; tidak memakai template TypeScript                                      |
| UI                    | React + React DOM                                                                | Komponen dan interaksi website                                                            |
| Build/dev server      | Vite, template `react`                                                           | Development, bundling, dan build produksi                                                 |
| Routing               | React Router, mode declarative                                                   | Delapan layout, tab/panel, guard navigasi berdasarkan role                                |
| Styling               | Tailwind CSS melalui plugin Vite + CSS variables                                 | Token warna, tipografi, radius, dan responsif dari `design.md`                            |
| State global terbatas | React Context + hooks                                                            | Pengguna/sesi, status mode, dan panel global                                              |
| HTTP                  | Browser Fetch API                                                                | Wrapper terpusat, cookie sesi, penanganan error, dan token CSRF                           |
| Form                  | Controlled form React + validasi field                                           | Login, daftar, approval, eksplorasi, dan konsultasi                                       |
| Simpan lokal          | IndexedDB dan sessionStorage sesuai jenis data                                   | Data eksplorasi tamu/perangkat bersama; bukan penyimpanan kredensial                      |
| Cetak/PDF             | jsPDF + jsPDF-AutoTable, dimuat saat ekspor; print stylesheet sebagai alternatif | Unduh ringkasan/tabel langsung di perangkat dengan cakupan terpilih dan pemisahan halaman |

Pemilihan Vite dengan template React JavaScript dan React Router mengikuti alur yang didokumentasikan oleh [Vite](https://vite.dev/guide/) dan [React Router](https://reactrouter.com/start/declarative/installation). Integrasi styling mengikuti [panduan Tailwind dengan Vite](https://tailwindcss.com/docs/installation/using-vite).

Generasi berkas di perangkat mengikuti [jsPDF](https://github.com/parallax/jsPDF) dan plugin tabel [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable). Muat keduanya secara dinamis saat diperlukan. Uji font/karakter, teks panjang, pratinjau, pemisahan halaman, serta beban halaman sebelum dinyatakan selesai. Alternatif cetak diberi label `Cetak / Simpan sebagai PDF`, bukan mengklaim unduhan otomatis telah terjadi.

### 2.2 Backend dan data

| Kebutuhan       | Pilihan                                                      | Pemakaian                                                             |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| Runtime         | Node.js versi LTS yang kompatibel dengan dependensi terpilih | Menjalankan server dan pekerjaan pemeliharaan                         |
| HTTP framework  | Express                                                      | REST API `/api`, middleware, dan error handling                       |
| Database        | PostgreSQL                                                   | Akun, approval, kelas, eksplorasi, konten, konsultasi, dan audit      |
| Query/migration | Knex + driver `pg`                                           | Query terparameterisasi, transaksi, migration, seed JavaScript        |
| Session         | `express-session` + `connect-pg-simple`                      | Sesi server-side di PostgreSQL; cookie browser hanya memuat ID sesi   |
| Hash password   | `argon2`, menggunakan Argon2id                               | Hash dan verifikasi password; tidak menyimpan password asli           |
| Validasi        | Validator per modul di server                                | Allowlist input, panjang, enum, relasi sekolah/kelas, dan isi request |
| Hardening       | Helmet dan rate limiter Express                              | Header keamanan dan batas percobaan login/daftar/status               |
| CSRF            | Token terikat sesi + pemeriksaan Origin pada request mutasi  | Melindungi operasi berbasis cookie, termasuk approval                 |
| Tugas terjadwal | Skrip Node yang dipanggil scheduler hosting                  | Retensi, pembersihan sesi, dan maintenance konten                     |
| Konfigurasi     | Environment variables                                        | Rahasia dan pengaturan per lingkungan                                 |

Knex mendokumentasikan penggunaan driver PostgreSQL dan migration JavaScript dalam [panduan instalasi](https://knexjs.org/guide/) serta [migration](https://knexjs.org/guide/migrations). Penggunaan session store produksi mengikuti [dokumentasi express-session](https://expressjs.com/en/resources/middleware/session/) dan [connect-pg-simple](https://www.npmjs.com/package/connect-pg-simple). Hash password menggunakan API yang dijelaskan proyek [node-argon2](https://github.com/ranisalt/node-argon2).

Versi paket persis ditentukan saat scaffolding setelah pemeriksaan kompatibilitas, lalu dikunci dalam `package-lock.json` pada masing-masing aplikasi. Jangan memilih angka versi dari asumsi atau mengubah dependensi secara otomatis pada setiap deployment. Tidak ada penyedia hosting yang diwajibkan oleh dokumen ini.

### 2.3 Pemeriksaan dan pengujian

- ESLint untuk JavaScript/React dan formatter yang konsisten.
- Node test runner + Supertest untuk pengujian API penting: role, status akun, approval atomik, kepemilikan, dan sesi.
- Uji browser untuk alur daftar -> persetujuan superadmin -> login siswa, serta alur fitur PRD. Otomatisasi end-to-end dapat memakai Playwright ketika aplikasi tersedia.
- Database test terpisah; data demo/test tidak masuk database siswa nyata.

## 3. Struktur folder

Pohon berikut adalah target organisasi kode. File/folder ini belum dibuat hanya karena tercantum di dokumen.

```text
PILIHANKU/
|-- backend/
|   |-- src/
|   |   |-- app.js                      # Susun Express, middleware, dan routes
|   |   |-- server.js                   # Start server dan graceful shutdown
|   |   |-- config/
|   |   |   |-- env.js                  # Validasi environment
|   |   |   |-- database.js             # Knex dan connection pool
|   |   |   |-- session.js              # Store PostgreSQL dan opsi cookie
|   |   |   `-- permissions.js          # Role dan izin eksplisit
|   |   |-- database/
|   |   |   |-- migrations/             # Tabel, constraint, indeks, perubahan schema
|   |   |   `-- seeds/                  # Data demo; dipisah dari bootstrap admin
|   |   |-- middleware/
|   |   |   |-- authenticate.js         # Sesi sah dan user masih aktif
|   |   |   |-- authorize.js            # Izin role, termasuk superadmin-only
|   |   |   |-- csrf.js                 # Validasi token/Origin
|   |   |   |-- validate.js             # Menjalankan validator request
|   |   |   |-- rate-limit.js
|   |   |   `-- error-handler.js
|   |   |-- modules/
|   |   |   |-- auth/
|   |   |   |   |-- auth.routes.js
|   |   |   |   |-- auth.controller.js
|   |   |   |   |-- auth.service.js
|   |   |   |   `-- auth.validation.js
|   |   |   |-- approvals/
|   |   |   |   |-- approvals.routes.js
|   |   |   |   |-- approvals.controller.js
|   |   |   |   |-- approvals.service.js
|   |   |   |   |-- approvals.repository.js
|   |   |   |   `-- approvals.validation.js
|   |   |   |-- users/                  # Akun, profil minimum, status, reset akses
|   |   |   |-- classes/                # Kelas, tahun ajaran, penugasan BK
|   |   |   |-- exploration/            # Refleksi, matriks, musyawarah, rencana
|   |   |   |-- content/                # Kartu jalur, sumber, skenario berversi
|   |   |   |-- consultations/          # Permintaan dan bagian yang dibagikan
|   |   |   |-- reports/                # Agregat BK dengan ambang privasi
|   |   |   `-- audit/                  # Audit metadata tanpa isi refleksi
|   |   |-- jobs/
|   |   |   |-- retention.js
|   |   |   `-- cleanup-sessions.js
|   |   |-- scripts/
|   |   |   `-- bootstrap-superadmin.js # Akun admin pertama, bukan endpoint publik
|   |   `-- utils/
|   |       |-- api-error.js
|   |       |-- response.js
|   |       `-- logger.js
|   |-- tests/
|   |   |-- auth.test.js
|   |   |-- approvals.test.js
|   |   |-- authorization.test.js
|   |   `-- privacy.test.js
|   |-- knexfile.cjs                   # Konfigurasi CLI Knex dalam JavaScript
|   |-- .env.example
|   |-- package.json
|   `-- package-lock.json
|
|-- frontend/
|   |-- public/                        # Aset publik ringan, favicon, manifest
|   |-- src/
|   |   |-- main.jsx
|   |   |-- App.jsx
|   |   |-- app/
|   |   |   |-- router.jsx             # Delapan route/layout utama
|   |   |   |-- providers.jsx
|   |   |   `-- role-access.js         # Pemetaan menu; bukan pengganti izin API
|   |   |-- pages/
|   |   |   |-- HomePage.jsx           # L01 Beranda
|   |   |   |-- StartPage.jsx          # L02 Tamu, Masuk, Daftar, status pendaftaran
|   |   |   |-- SelfDiscoveryPage.jsx  # L03 Kenali Diriku
|   |   |   |-- PathwaysPage.jsx       # L04 Katalog, detail, simulasi
|   |   |   |-- ComparisonPage.jsx     # L05 Matriks dan musyawarah
|   |   |   |-- ActionPlanPage.jsx     # L06 Rencana, ekspor, konsultasi
|   |   |   |-- DashboardPage.jsx      # L07 Konten sesuai superadmin atau BK
|   |   |   `-- ManagementPage.jsx     # L08 Kelola sesuai izin
|   |   |-- layouts/
|   |   |   |-- PublicLayout.jsx
|   |   |   |-- StudentLayout.jsx
|   |   |   `-- ManagementLayout.jsx
|   |   |-- components/
|   |   |   |-- ui/                    # Button, Input, Tabs, Card, Dialog, Badge
|   |   |   |-- navigation/            # Header, stepper, sidebar, bottom nav
|   |   |   `-- feedback/              # Loading, empty, error, save status
|   |   |-- features/
|   |   |   |-- auth/                  # LoginForm, RegisterForm, AccountStatus
|   |   |   |-- approvals/             # Daftar pending, detail, approve/reject
|   |   |   |-- users/                 # Pengelolaan akun BK/status oleh superadmin
|   |   |   |-- classes/
|   |   |   |-- self-discovery/
|   |   |   |-- pathways/
|   |   |   |-- simulations/
|   |   |   |-- comparison/
|   |   |   |-- action-plan/
|   |   |   |-- consultations/
|   |   |   `-- privacy/               # Pengaturan, izin, retensi, hapus
|   |   |-- context/
|   |   |   |-- AuthContext.jsx
|   |   |   `-- PanelContext.jsx
|   |   |-- hooks/                     # Hooks lintas fitur, bukan semua logika
|   |   |-- services/
|   |   |   `-- api.js                 # Fetch wrapper, cookie, CSRF, error
|   |   |-- exports/
|   |   |   `-- plan-pdf.js            # Dynamic import jsPDF/AutoTable, cakupan ekspor
|   |   |-- storage/
|   |   |   `-- guest-storage.js       # Data lokal, versi, kedaluwarsa, hapus
|   |   |-- styles/
|   |   |   |-- app.css                # Tailwind entry dan CSS tambahan
|   |   |   |-- tokens.css             # Token dari design.md
|   |   |   `-- print.css
|   |   |-- utils/                     # Perhitungan UI, format tanggal
|   |   `-- assets/                    # Aset produk yang memang digunakan
|   |-- tests/                        # Pengujian frontend; catatan browser ada di docs/TEST-FLOWS.md
|   |-- index.html
|   |-- vite.config.js
|   |-- .env.example
|   |-- package.json
|   `-- package-lock.json
|
|-- docs/                            # Seluruh dokumentasi proyek
|   |-- README.md
|   |-- PRD.md
|   |-- design.md
|   |-- structure.md
|   |-- TASKLIST.md
|   |-- TEST-FLOWS.md
|   `-- ...                          # Panduan dan laporan pendukung
|-- assets/design/                     # Referensi desain yang sudah tersedia
`-- .gitignore
```

Backend memakai ES Modules pada kode aplikasi. `knexfile.cjs` hanya konfigurasi CLI JavaScript dengan format CommonJS. Migration/seed menggunakan format JavaScript yang konsisten dengan konfigurasi Knex.

Tidak perlu membuat file kosong untuk seluruh struktur sekaligus. Bangun auth/approval dahulu, lalu tambah modul ketika fitur diimplementasikan. Folder fitur bukan halaman baru: delapan file di `pages/` tetap menjadi delapan layout utama.

## 4. Pembagian tanggung jawab kode

| Lapisan       | Tanggung jawab                                                         |
| ------------- | ---------------------------------------------------------------------- |
| Route         | URL, rangkaian middleware, dan controller tujuan                       |
| Controller    | Membaca input tervalidasi dan mengembalikan respons HTTP               |
| Service       | Aturan bisnis: role, approval, transisi status, transaksi, kepemilikan |
| Repository    | Query database terparameterisasi, tanpa logika UI                      |
| Validation    | Allowlist field, enum, ukuran, dan format                              |
| React page    | Menyusun fitur ke satu layout, tab, atau panel                         |
| React feature | Form/interaksi domain, request API, dan keadaan fitur                  |
| Komponen UI   | Kontrol visual yang dapat digunakan kembali                            |

Tidak semua modul kecil harus langsung mempunyai seluruh lapisan. Auth dapat memakai repository `users` untuk akses akun. Aturan approval terpusat di service, tidak diduplikasi di controller dan komponen React. Backend selalu menghitung/mengecek ulang aturan penting dari input, bukan mempercayai hasil atau role dari browser.

## 5. Role dan izin

| Aktivitas                              | Superadmin                           | BK                                           | Siswa                                              |
| -------------------------------------- | ------------------------------------ | -------------------------------------------- | -------------------------------------------------- |
| Menyetujui/menolak pendaftaran siswa   | **Ya, fitur utama**                  | Tidak                                        | Tidak                                              |
| Melihat daftar calon siswa             | Metadata dalam sekolah yang dikelola | Tidak sebagai antrean approval               | Status milik sendiri setelah verifikasi kredensial |
| Membuat/menonaktifkan akun BK          | Ya                                   | Tidak                                        | Tidak                                              |
| Mengatur kelas dan penugasan BK        | Ya                                   | Sesuai penugasan, tanpa menaikkan role       | Tidak                                              |
| Mengelola kartu jalur                  | Administrasi metadata sesuai izin    | Dalam ruang lingkup penerbit                 | Tidak                                              |
| Melihat agregat eksplorasi             | Tidak sebagai hak rutin approval     | Kelas berwenang, ambang privasi berlaku      | Tidak                                              |
| Melihat refleksi/matriks/rencana siswa | Tidak sebagai hak rutin superadmin   | Hanya bagian yang dikirim melalui konsultasi | Milik sendiri                                      |
| Mengelola konsultasi                   | Tidak sebagai hak rutin approval     | Permintaan yang menjadi tanggung jawabnya    | Ajukan/pantau/batalkan milik sendiri               |
| Menggunakan dan menyimpan fitur siswa  | Tidak atas nama siswa                | Tidak atas nama siswa                        | Ya setelah `approved`                              |
| Hapus data pribadi siswa               | Proses retensi/permintaan yang sah   | Tidak sebagai tindakan rutin                 | Milik sendiri sesuai PRD                           |

Role superadmin tidak otomatis berarti boleh membaca semua isi refleksi. Kewenangan administrasi akun dipisahkan dari kerahasiaan layanan BK. Pengunjung tanpa akun dapat membaca konten publik dan menjalankan Mode Tamu lokal; tidak memiliki hak akun siswa atau pengelola.

Frontend menyembunyikan menu sesuai izin, tetapi backend memeriksa role, status akun terkini, sekolah, penugasan kelas, dan kepemilikan pada setiap endpoint terlindungi. Role dari body request atau localStorage tidak dipakai untuk memberikan akses.

## 6. Pendaftaran, approval, dan login

### 6.1 Status akun

| Nilai       | Arti                                            | Akses akun                                                                    |
| ----------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `pending`   | Pendaftaran siswa menunggu keputusan superadmin | Tidak dapat memperoleh sesi login aplikasi                                    |
| `approved`  | Disetujui; akun boleh login                     | Sesuai role dan ruang lingkup                                                 |
| `rejected`  | Pendaftaran ditolak                             | Tidak dapat login; dapat melihat status sendiri melalui verifikasi kredensial |
| `suspended` | Akun yang pernah aktif dinonaktifkan            | Semua sesi aktif dicabut; API menolak akses                                   |

Role dan status adalah dua atribut berbeda. Mengubah role menjadi `siswa` tidak boleh otomatis menyetujui akun. Hasil keputusan disimpan dalam riwayat tersendiri agar status saat ini tidak menghapus audit keputusan.

### 6.2 Alur siswa

1. Buka L02, tab **Daftar Siswa**.
2. Isi username unik, nama tampilan/nama panggilan, password, konfirmasi password, kelas tujuan aktif, dan persetujuan yang relevan. Email/telepon tidak diwajibkan pada rilis awal.
3. Backend memvalidasi allowlist field, keunikan username, kelas/sekolah, dan persetujuan. Konfirmasi password tidak disimpan; password di-hash.
4. Dalam satu transaksi buat `users.role=siswa`, `users.status=pending`, dan pengajuan kelas. Keanggotaan aktif belum dibuat.
5. UI menampilkan **Menunggu persetujuan superadmin** dan pilihan kembali ke login atau eksplorasi sebagai tamu.
6. Superadmin meninjau lalu menyetujui/menolak. Keputusan approval bukan pengganti persetujuan siswa/wali yang diperlukan untuk pemrosesan data anak.
7. Setelah `approved`, siswa login dengan username/password; backend membuat sesi sah dan menautkan profil/kelas yang disetujui.
8. Siswa mengakses data milik sendiri dan dapat secara eksplisit memindahkan draf tamu yang dipilih. Tidak ada pemindahan otomatis.

Username dinormalisasi sebelum pengecekan keunikan dan diberi constraint unik di database, bukan hanya dicek di React. Password tidak dimasukkan ke log, audit, respons, URL, atau localStorage. Batas awal desain: username 3-30 karakter, password 12-128 karakter; dukung password manager dan jangan memangkas password diam-diam.

### 6.3 Alur superadmin

1. Login melalui form yang sama di L02; backend menentukan role akun.
2. Masuk L07 pada tab utama **Pendaftaran Siswa**.
3. Lihat jumlah pending, daftar username/nama tampilan, kelas tujuan, waktu daftar, dan status. Tanpa hasil refleksi atau dokumen pribadi yang tidak diperlukan.
4. Buka detail pada satu panel, periksa kesesuaian sekolah/kelas dan bukti persetujuan yang memang dikelola sekolah.
5. Pilih **Setujui** atau **Tolak**. Penolakan memerlukan alasan singkat yang layak ditampilkan kepada siswa.
6. Backend mengunci/memvalidasi status `pending`, mencatat keputusan serta peninjau/waktu, memperbarui status, dan mengaktifkan keanggotaan kelas jika disetujui, dalam satu transaksi.
7. Klik ganda approval tidak menghasilkan dua keanggotaan atau audit ganda. Keputusan bersamaan yang bertentangan menghasilkan konflik, bukan penimpaan diam-diam.

Akun superadmin pertama dibuat melalui `bootstrap-superadmin.js` oleh operator deployment dengan rahasia yang diberikan secara aman. Jangan membuat endpoint publik untuk mendaftar atau memilih role superadmin. Superadmin membuat akun BK melalui area pengelolaan, dengan proses penggantian password awal; tidak membagikan kredensial di log.

### 6.4 Perilaku login dan sesi

- Login tunggal memakai username/password; tidak ada dropdown yang memberi role berdasarkan pilihan pengguna.
- Kredensial salah menghasilkan pesan umum. Setelah kredensial benar, tampilkan status pending/rejected/suspended kepada pemilik akun tanpa membuka sesi aplikasi penuh.
- Pemeriksaan status sendiri dapat memakai endpoint khusus berbasis verifikasi kredensial dan rate limit. Mengetahui username atau ID pendaftaran saja tidak cukup.
- Sesi server-side hanya dibuat sebagai sesi terautentikasi untuk akun `approved`. Sesi anonim/token CSRF pra-login tidak memberi izin akun.
- Regenerasi ID sesi setelah login, batasi usia/idle session, hapus saat logout, dan cabut setelah password/status berubah.
- Cookie produksi memakai `HttpOnly`, `Secure`, dan `SameSite=Lax` untuk deployment same-origin yang dipilih; konfigurasi development localhost ditangani terpisah.
- Setiap request terlindungi memeriksa status pengguna di server sehingga akun `suspended` tidak tetap lolos karena sesi lama.
- Reset akses siswa merupakan proses yang diaudit melalui verifikasi sekolah oleh superadmin; BK tidak dapat melihat password atau mengubah role. Kanal reset mandiri berbasis email tidak diasumsikan tersedia.

## 7. Delapan layout dengan tiga role

| ID  | Layout React            | Akses dan isi                                                                    |
| --- | ----------------------- | -------------------------------------------------------------------------------- |
| L01 | `HomePage.jsx`          | Publik; progres milik siswa/tamu bila tersedia                                   |
| L02 | `StartPage.jsx`         | Tab Tamu, Masuk, Daftar Siswa; status pendaftaran dan reset sebagai keadaan form |
| L03 | `SelfDiscoveryPage.jsx` | Siswa approved untuk server, tamu untuk data lokal                               |
| L04 | `PathwaysPage.jsx`      | Konten terbit publik, pilihan lokal/privat sesuai mode                           |
| L05 | `ComparisonPage.jsx`    | Siswa approved atau tamu lokal, tanpa akses data orang lain                      |
| L06 | `ActionPlanPage.jsx`    | Rencana/ekspor dan konsultasi sesuai identitas/izin PRD                          |
| L07 | `DashboardPage.jsx`     | Superadmin: Pendaftaran Siswa; BK: Ringkasan Kelas dan Permintaan                |
| L08 | `ManagementPage.jsx`    | Superadmin: akun BK/kelas; BK: bank informasi dan kelas berwenang                |

L07 dan L08 menggunakan shell/route pengelola yang sama dengan isi berdasarkan role. Pertahankan rute PRD `/guru` dan `/guru/kelola` sebagai alamat pengelola agar tidak menambah layout; label pada superadmin berubah menjadi **Superadmin**, bukan Guru BK. Login dilakukan di L02; akses pengelola tanpa sesi mengarahkan ke L02 lalu kembali hanya ke alamat internal yang diizinkan.

Approval, detail, konfirmasi, pendaftaran, dan reset tidak membutuhkan layar utama tambahan. Hanya satu panel aktif pada satu waktu. Menu superadmin/BK berbeda; guard frontend saja tidak cukup untuk melindungi API.

## 8. Data inti tambahan

| Tabel                   | Kolom inti                                                                                                  | Aturan                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `users`                 | id, school_id, username_normalized, display_name, password_hash, role, status, session_version, created_at  | Role tepat tiga nilai; username unik; hash tidak keluar di respons           |
| `student_registrations` | id, user_id, requested_class_id, status, submitted_at, reviewed_by, reviewed_at, rejection_reason, revision | Satu pengajuan aktif per siswa; status keputusan `pending/approved/rejected` |
| `student_profiles`      | user_id, participant_id, class_id                                                                           | Dibuat/diaktifkan saat approved; penghubung ke data eksplorasi PRD           |
| `teacher_profiles`      | user_id, school_id                                                                                          | Akun role BK; penugasan kelas tetap di tabel relasi                          |
| `sessions`              | sid, sess, expire                                                                                           | Store `connect-pg-simple`; diperlakukan sebagai data rahasia                 |
| `audit_events`          | actor_id, action, target_id, timestamp, metadata_minimum                                                    | Keputusan/status saja, tanpa password atau isi refleksi                      |

Gunakan foreign key, unique constraint, dan transaksi untuk memastikan user/approval/kelas tetap konsisten. `reviewed_by` harus menunjuk superadmin yang sah saat tindakan dilakukan; validasi bisnis tidak cukup hanya foreign key. Tabel refleksi, kartu, skenario, matriks, rencana, konsultasi, dan retensi mengikuti PRD.

Pendaftaran bukan persetujuan untuk membuka seluruh refleksi. Metadata akun dan data bimbingan dipisahkan. Pending/rejected juga memiliki masa simpan terkonfigurasi dan hak penghapusan melalui verifikasi kepemilikan; data tidak dibiarkan tersimpan tanpa batas hanya karena belum aktif. Usulan awal pengajuan pending/rejected maksimal 90 hari dan tidak melewati akhir tahun ajaran tujuan, untuk divalidasi sekolah.

## 9. API utama

Semua endpoint berada di backend. Operasi mutasi dilindungi validasi, CSRF/Origin sesuai konteks, serta rate limit bila relevan. Tabel berikut melengkapi API fitur pada PRD.

| Method dan endpoint                         | Hak akses                     | Tujuan                                                                                      |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| `GET /api/auth/csrf`                        | Publik/pre-auth               | Token CSRF yang tidak memberi hak akun                                                      |
| `POST /api/auth/register`                   | Publik                        | Selalu membuat siswa pending; menolak field role/status yang disisipkan                     |
| `POST /api/auth/login`                      | Publik                        | Verifikasi password, status, role dari database; buat sesi jika approved                    |
| `POST /api/auth/status`                     | Verifikasi kredensial sendiri | Lihat status pengajuan/akun tanpa sesi aplikasi penuh                                       |
| `GET /api/auth/me`                          | Sesi sah                      | Profil minimum, role, izin, konteks sekolah/kelas                                           |
| `POST /api/auth/logout`                     | Sesi terkait                  | Hapus sesi dan cookie                                                                       |
| `GET /api/admin/registrations`              | Superadmin                    | Antrean dengan filter status dan pagination                                                 |
| `GET /api/admin/registrations/:id`          | Superadmin                    | Detail metadata pengajuan dalam sekolahnya                                                  |
| `POST /api/admin/registrations/:id/approve` | Superadmin                    | Setujui atomik, aktifkan kelas, audit                                                       |
| `POST /api/admin/registrations/:id/reject`  | Superadmin                    | Tolak dengan alasan, audit                                                                  |
| `POST /api/admin/bk-users`                  | Superadmin                    | Buat akun BK; bukan pendaftaran publik                                                      |
| `PATCH /api/admin/users/:id/status`         | Superadmin                    | Suspend/aktifkan kembali akun yang sebelumnya approved; bukan jalan pintas approval pending |
| `POST /api/admin/users/:id/reset-access`    | Superadmin                    | Proses reset terverifikasi dan audit; cabut sesi lama                                       |
| `GET /api/teacher/classes/:id/summary`      | BK berwenang                  | Agregat aman sesuai PRD                                                                     |
| `GET /api/teacher/consultations`            | BK berwenang                  | Permintaan yang ditujukan ke penugasannya                                                   |
| `GET/PUT /api/me/reflection`                | Siswa approved                | Data refleksi milik sendiri                                                                 |

Role/status tidak diterima sebagai sumber kewenangan dari body login/register. API pengubahan status tidak boleh mengaktifkan akun pending tanpa catatan approval. Hindari generic CRUD user yang memungkinkan bypass tersebut. Gunakan kode respons konsisten: 401 kredensial/sesi tidak sah, 403 izin/status tidak memenuhi, 409 konflik keputusan/revisi, 422 validasi input.

## 10. Environment, script, dan deployment

Contoh nama konfigurasi backend, tanpa nilai rahasia:

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=
SESSION_SECRET=
SESSION_COOKIE_NAME=pilihanku.sid
APP_ORIGIN=http://localhost:5173
```

Frontend development memakai proxy `/api` dari Vite ke backend. Produksi disajikan pada origin yang sama: frontend untuk halaman dan `/api` diteruskan ke Express. Ini keputusan deployment agar cookie dan CSRF lebih sederhana. Jika origin diubah terpisah, konfigurasi CORS/cookie harus ditinjau secara eksplisit, bukan memakai wildcard bersama credentials.

Frontend tidak menyimpan `DATABASE_URL`, password database, session secret, atau kunci bootstrap. Nilai yang diekspos ke bundle frontend bukan rahasia. `.env` tidak dikomit; `.env.example` hanya nama variabel/contoh aman.

| Aplikasi | Script yang perlu disediakan saat implementasi                                                        |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Backend  | `dev`, `start`, `lint`, `test`, `db:migrate`, `db:seed:demo`, `bootstrap:superadmin`, `job:retention` |
| Frontend | `dev`, `build`, `preview`, `lint`, `test:e2e` saat pengujian browser disiapkan                        |

Jalankan aplikasi dari dua terminal pada folder masing-masing. Gunakan npm dan lockfile per aplikasi; root tidak memerlukan package manager/workspace tambahan. `node --watch` dapat dipakai untuk dev backend jika didukung versi Node terpilih. Bootstrap superadmin tidak dijalankan otomatis sebagai seed demo.

## 11. Urutan implementasi

1. Buat `backend/` dan `frontend/`, konfigurasi JavaScript/JSX, koneksi PostgreSQL, migration, dan token desain.
2. Bangun tabel users, registrations, profiles, sessions, audit, dan bootstrap superadmin.
3. Bangun register siswa pending, login tiga role, cek status sendiri, logout, middleware status/role, dan CSRF.
4. Bangun antrean/detail Setujui/Tolak pada dashboard superadmin, transaksi approval, dan pengelolaan akun BK.
5. Uji alur **daftar siswa -> pending -> approval superadmin -> login siswa** sebelum memperluas fitur.
6. Implementasikan modul PRD: refleksi, kartu/simulasi, perbandingan/musyawarah, rencana/ekspor, konsultasi, agregat BK.
7. Lengkapi data lokal, pemindahan eksplisit, penghapusan/retensi, tab/panel mobile, serta validasi konten/uji pengguna.

## 12. Kriteria penerimaan arsitektur dan approval

- [ ] Folder aplikasi utama hanya `backend/` dan `frontend/`; kode aplikasi menggunakan `.js`/`.jsx`.
- [ ] React menggunakan template JavaScript dan backend menggunakan Node.js/Express.
- [ ] Database memberi constraint unik username dan relasi pengajuan/kelas; tidak mengandalkan validasi browser saja.
- [ ] Pendaftaran publik selalu siswa pending, termasuk bila payload mencoba menyisipkan role superadmin/BK atau status approved.
- [ ] Siswa pending, rejected, atau suspended tidak dapat memperoleh atau memakai sesi aplikasi aktif.
- [ ] Hanya superadmin dapat menyetujui/menolak; BK dan siswa menerima penolakan saat memanggil API admin langsung.
- [ ] Approval mengubah status, riwayat, dan keanggotaan kelas secara atomik; klik ganda/race tidak membuat duplikasi.
- [ ] Akun disetujui dapat login sebagai siswa; status/penggantian password mencabut sesi yang tidak lagi sah.
- [ ] Identitas status hanya dapat dilihat setelah verifikasi kepemilikan, tanpa endpoint enumerasi publik.
- [ ] Superadmin melihat metadata approval, bukan semua jawaban privat; BK hanya kelas/permintaan berwenang.
- [ ] Delapan layout utama tetap dipakai; dashboard/admin approval merupakan variasi role pada L07, bukan halaman utama tambahan.
- [ ] Rahasia tidak masuk frontend, log, contoh data, atau source control; session memakai store PostgreSQL dan cookie produksi aman.
- [ ] Mode Tamu bukan bypass approval: tetap lokal dan tidak mendapat API siswa terautentikasi.
- [ ] Seluruh aturan konten, perhitungan, berbagi, agregat, retensi, dan pengujian PRD tetap diterapkan.

Dokumen ini menjadi acuan struktur implementasi. Dependency, folder, UI, endpoint, dan approval belum dinyatakan berfungsi sampai benar-benar dibangun dan diuji.
