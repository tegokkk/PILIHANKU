# TASKLIST Pengerjaan PILIHANKU

> **Perubahan akses, 22 November 2026:** instruksi pengguna terbaru mewajibkan login approved untuk seluruh fitur. Ketentuan Mode Tamu, eksplorasi publik, transfer draf tamu, konsultasi token tamu dan ekspor tanpa sesi pada rincian lama di bawah dinyatakan digantikan. Implementasi dan bukti pengujian terbaru: [LOGIN-ACCESS](docs/LOGIN-ACCESS.md).

- [x] Gerbang sesi sebelum delapan layout/panel/animasi; URL langsung ke Masuk.
- [x] API fitur wajib sesi approved; 401 anonim dan 403 role salah; lingkup milik siswa/penugasan BK/administrasi server.
- [x] Pembersihan tampilan dan permintaan privat saat logout/kedaluwarsa; tidak mengunggah draf tamu lama; API tidak dicache.

| Metadata             | Keterangan                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Versi                | 1.0                                                                                           |
| Tanggal              | 21 November 2026                                                                              |
| Acuan produk         | [PRD.md](./PRD.md), versi 1.2                                                                 |
| Acuan desain         | [design.md](./design.md), versi 1.2                                                           |
| Acuan struktur/stack | [structure.md](./structure.md), versi 1.0                                                     |
| Sumber UI selesai    | `stitch_pilihanku_career_platform_ui/`                                                        |
| Kondisi awal         | 16 file HTML hasil Stitch: 8 layout, masing-masing desktop 1440 px dan mobile 390 px          |
| Target aplikasi      | `frontend/`: React + Vite, JavaScript/JSX; `backend/`: Node.js + Express; database PostgreSQL |
| Role                 | `superadmin`, `bk`, `siswa`; seluruh fitur wajib login approved                               |
| Prioritas pertama    | Daftar siswa -> pending -> disetujui superadmin -> login siswa                                |

## 1. Cara menggunakan tasklist

UI hasil Stitch sudah tersedia dan menjadi acuan tampilan. Pekerjaan selanjutnya adalah memindahkan HTML ke React responsif, mengaktifkan interaksi, menghubungkan API/database, serta memverifikasi perilaku produk. Tidak perlu mengulang generasi desain dari awal.

- `[x]` berarti pekerjaan yang sudah dilakukan dan memiliki bukti pada pemeriksaan saat tasklist dibuat.
- `[ ]` berarti belum selesai atau belum dibuktikan. Tombol yang terlihat berfungsi pada demo tidak otomatis berarti fitur backend selesai.
- **P0:** fondasi, login/approval, pembatasan akses, integritas data, dan integrasi yang menghalangi alur utama.
- **P1:** seluruh fitur produk wajib lain dan kesiapan rilis lengkap.
- **P2:** perapihan setelah alur wajib lulus, tanpa menunda perbaikan aksesibilitas atau kesalahan data penting.
- Selesaikan satu task dengan bukti singkat: file/commit yang berubah, hasil pemeriksaan atau pengujian, dan keterbatasan bila ada.
- ID task tetap dipakai saat membuat laporan progres; subtask boleh ditambahkan di bawah task terkait.
- Delapan layout tetap L01-L08. Detail, hasil, simulasi, konsultasi, ekspor, dan pengaturan menggunakan tab/panel, bukan halaman utama tambahan.

Tasklist ini tidak menyatakan aplikasi sudah diimplementasikan. Peninjauan UI awal dilakukan terhadap struktur dan kode HTML, belum melalui pengujian visual di browser.

## 2. Kondisi awal yang sudah diperiksa

- [x] **OBS-01** - Membaca dokumen PRD, desain, dan struktur yang menetapkan JavaScript/React, delapan layout, serta tiga role.
- [x] **OBS-02** - Menemukan dan mencatat 16 file `code.html` pada folder hasil Stitch.
- [x] **OBS-03** - Memeriksa kode awal: terdapat Tailwind CDN, script DOM untuk tab/panel, data contoh, dan tautan placeholder; tidak ditemukan pemanggilan `fetch()` pada 16 HTML tersebut.
- [x] **OBS-04** - Memeriksa contoh interaksi L02/L07/L08: status pending dan approval ditampilkan melalui perubahan DOM; pergantian role masih berupa kontrol pratinjau, bukan autentikasi server.

Belum ditemukan `package.json`, aplikasi React, atau implementasi backend dalam workspace saat pemeriksaan. Temuan ini menjadi dasar task yang belum dicentang.

### 2.1 Pemetaan UI yang harus digunakan kembali

| Layout                  | Sumber desktop                                                                                         | Sumber mobile                                                                                       | Hasil React target      |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------- |
| L01 Beranda             | [HTML desktop](./stitch_pilihanku_career_platform_ui/l01_beranda_desktop_1440px/code.html)             | [HTML mobile](./stitch_pilihanku_career_platform_ui/l01_beranda_mobile_390px/code.html)             | `HomePage.jsx`          |
| L02 Mulai               | [HTML desktop](./stitch_pilihanku_career_platform_ui/l02_mulai_desktop_1440px/code.html)               | [HTML mobile](./stitch_pilihanku_career_platform_ui/l02_mulai_mobile_390px/code.html)               | `StartPage.jsx`         |
| L03 Kenali Diriku       | [HTML desktop](./stitch_pilihanku_career_platform_ui/l03_kenali_diriku_desktop_1440px/code.html)       | [HTML mobile](./stitch_pilihanku_career_platform_ui/l03_kenali_diriku_mobile_390px/code.html)       | `SelfDiscoveryPage.jsx` |
| L04 Peta Jalur          | [HTML desktop](./stitch_pilihanku_career_platform_ui/l04_peta_jalur_desktop_1440px/code.html)          | [HTML mobile](./stitch_pilihanku_career_platform_ui/l04_peta_jalur_mobile_390px/code.html)          | `PathwaysPage.jsx`      |
| L05 Timbang Pilihan     | [HTML desktop](./stitch_pilihanku_career_platform_ui/l05_timbang_pilihan_desktop_1440px/code.html)     | [HTML mobile](./stitch_pilihanku_career_platform_ui/l05_timbang_pilihan_mobile_390px/code.html)     | `ComparisonPage.jsx`    |
| L06 Rencana Langkahku   | [HTML desktop](./stitch_pilihanku_career_platform_ui/l06_rencana_langkahku_desktop_1440px/code.html)   | [HTML mobile](./stitch_pilihanku_career_platform_ui/l06_rencana_langkahku_mobile_390px/code.html)   | `ActionPlanPage.jsx`    |
| L07 Dashboard Pengelola | [HTML desktop](./stitch_pilihanku_career_platform_ui/l07_dashboard_pengelola_desktop_1440px/code.html) | [HTML mobile](./stitch_pilihanku_career_platform_ui/l07_dashboard_pengelola_mobile_390px/code.html) | `DashboardPage.jsx`     |
| L08 Kelola Informasi    | [HTML desktop](./stitch_pilihanku_career_platform_ui/l08_kelola_informasi_desktop_1440px/code.html)    | [HTML mobile](./stitch_pilihanku_career_platform_ui/l08_kelola_informasi_mobile_390px/code.html)    | `ManagementPage.jsx`    |

### 2.2 Temuan konkret yang harus ditangani

| Temuan dari kode UI                                                                                                                      | Pekerjaan terkait                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| CSS masih melalui Tailwind CDN dan konfigurasi inline                                                                                    | SET-02, UI-02                                                               |
| Banyak navigasi masih `href="#"` dan interaksi memakai listener DOM                                                                      | UI-03, UI-04                                                                |
| Tombol daftar hanya membuka pemberitahuan pending                                                                                        | AUTH-02, AUTH-03                                                            |
| Tombol approval langsung mengganti teks menjadi berhasil tanpa API                                                                       | ADM-02, ADM-03, ADM-05                                                      |
| L07/L08 menyediakan tombol pratinjau role yang mengubah area tampilan                                                                    | AUTH-05, ADM-06                                                             |
| Contoh jumlah kelas kecil, termasuk angka 3, masih muncul pada pilihan kelas L07 desktop                                                 | BK-04, SEC-04; data nyata tidak boleh bocor melalui opsi, DOM, atau tooltip |
| Ringkasan minat dan total matriks masih angka contoh                                                                                     | EXP-02, EXP-05                                                              |
| Mobile menyederhanakan beberapa fungsi: misalnya L04 hanya menampilkan dua kartu contoh dan L06 belum memuat detail panel setara desktop | UI-05, UI-06, CON-04                                                        |
| Judul/deskripsi kartu contoh belum konsisten, misalnya Teknik Informatika dan Pendidikan Teknik Informatika                              | CNT-02, CNT-03                                                              |

Data contoh pada sumber tetap boleh dipakai sebagai referensi visual, tetapi tidak menjadi bukti data sebenarnya sudah tersimpan atau diproses.

## 3. Tahap A - Persiapan dan fondasi proyek

**Prioritas:** P0. **Dependensi:** sumber UI sudah ditemukan. **Hasil:** dua aplikasi dapat dijalankan dengan konfigurasi yang jelas.

- [ ] **SET-01** - Simpan folder HTML Stitch sebagai referensi asli. Catat pasangan layout dan kebutuhan aset; jangan menimpa sumber saat mengonversi.
- [ ] **SET-02** - Buat `frontend/` menggunakan React + Vite template JavaScript, React Router, Tailwind melalui build, dan lockfile sesuai `structure.md`.
- [ ] **SET-03** - Buat `backend/` menggunakan Node.js/Express JavaScript, pemisahan `app.js`/`server.js`, config, middleware, serta modul fitur.
- [ ] **SET-04** - Siapkan PostgreSQL lokal/development dan database test terpisah, koneksi Knex/pg, `.env.example`, serta validasi environment tanpa menampilkan rahasia.
- [ ] **SET-05** - Tambahkan script dev/build/lint/test/migration, `.gitignore`, serta panduan menjalankan frontend dan backend dari dua terminal. Kunci versi dependensi yang kompatibel.
- [ ] **SET-06** - Siapkan proxy `/api` Vite ke Express, endpoint health, respons/error API seragam, logging minimum, dan pola same-origin produksi.

**Selesai bila:** frontend terbuka, API health merespons, database tersambung, script terdokumentasi, serta konfigurasi rahasia tidak masuk bundle/frontend atau source control.

## 4. Tahap B - Konversi UI HTML ke React responsif

**Prioritas:** P0 untuk shell dan login/dashboard; P1 untuk kelengkapan seluruh layout. **Dependensi:** SET-01, SET-02. **Hasil:** delapan layout React memakai tampilan Stitch yang sudah ada.

- [ ] **UI-01** - Konversi pasangan HTML desktop/mobile menjadi **satu implementasi responsif per layout** L01-L08; sesuaikan atribut JSX dan struktur semantik, bukan menanam seluruh HTML melalui `dangerouslySetInnerHTML`.
- [ ] **UI-02** - Pindahkan token warna/font/radius/spasi dari konfigurasi inline ke sistem styling frontend. Hapus ketergantungan Tailwind CDN pada aplikasi hasil konversi; inventaris font, ikon, gambar eksternal dan hak penggunaannya.
- [ ] **UI-03** - Hubungkan delapan rute utama pada React Router sesuai PRD. Ganti navigasi placeholder dengan route, tab, panel, atau aksi yang benar; pertahankan stepper dan Tanya BK global.
- [ ] **UI-04** - Ubah listener `querySelector`/manipulasi class DOM untuk tab, panel, pilihan, dan form menjadi state/props React; gunakan satu panel aktif dan perilaku kembali yang konsisten.
- [ ] **UI-05** - Ekstrak Button, Input, RadioCard, Tabs, Dialog/Drawer, Badge, header, stepper, sidebar dan bottom navigation menjadi komponen bersama. Samakan fungsi mobile dengan desktop tanpa menambah layar utama.
- [ ] **UI-06** - Lengkapi adaptasi mobile untuk detail/filter/simulasi L04, musyawarah L05, ekspor/konsultasi L06, dashboard BK dan pengelolaan akun L07/L08. Gunakan panel yang memenuhi area konten bila diperlukan.
- [ ] **UI-07** - Tambahkan keadaan loading, kosong, validasi, gagal, luring, sesi habis dan akses ditolak memakai komponen UI yang sama. Jangan menampilkan contoh status sukses sebagai keadaan awal produksi.
- [ ] **UI-08** - Bandingkan hasil React dengan sumber pada 390/1440 px, lalu periksa 360/768/1366 px; perbaiki pembungkusan teks, kontras, fokus, target sentuh, scroll dan toolbar tanpa mendesain ulang identitas.

**Selesai bila:** delapan layout dapat dinavigasi, tampilan mengikuti UI selesai, mobile setara fungsi, serta tidak ada modal bertingkat atau kontrol demo yang menjadi sumber hak akses.

## 5. Tahap C - Database dan model domain

**Prioritas:** P0 untuk akun/kelas/sesi; P1 untuk tabel fitur. **Dependensi:** SET-03, SET-04. **Hasil:** schema berversi dapat dibangun ulang.

- [ ] **DB-01** - Buat migration sekolah, tahun ajaran/kelas, `users`, `student_registrations`, profil siswa/BK, penugasan kelas, sessions, dan audit.
- [ ] **DB-02** - Terapkan unique username yang dinormalisasi, tiga role sah, empat status akun, foreign key, satu pengajuan aktif, dan aturan integritas keanggotaan kelas.
- [ ] **DB-03** - Tambahkan migration instrumen/jawaban refleksi, nilai/kondisi, pilihan jalur, matriks, musyawarah, rencana/tugas, serta nomor revisi dan versi sumber.
- [ ] **DB-04** - Tambahkan migration kartu/sumber/verifikasi, skenario berversi, konsultasi, bagian berbagi, persetujuan, serta pekerjaan hapus/retensi.
- [ ] **DB-05** - Buat seed sekolah/kelas dan data demo yang jelas terpisah dari produksi. Seed tidak berisi password tetap atau akun superadmin publik.
- [ ] **DB-06** - Buat skrip bootstrap superadmin melalui konfigurasi aman; tambahkan pemeriksaan akun awal dan audit tanpa mencetak rahasia.
- [ ] **DB-07** - Jalankan migration pada database kosong dan database test; verifikasi constraint, transaksi, pembacaan relasi, serta penghapusan turunan yang diperlukan.

**Selesai bila:** schema dapat direproduksi dari migration dan tidak mungkin mempunyai username ganda atau approval/kelas yang hanya berubah sebagian.

## 6. Tahap D - Login tiga role dan pendaftaran siswa

**Prioritas:** P0. **Dependensi:** fondasi backend, DB-01/02/05/06, shell L02. **Acuan:** PRD AC-56/57/60/61.

- [ ] **AUTH-01** - Implementasikan hash/verifikasi Argon2id, validator allowlist, batas input, password/konfirmasi, serta normalisasi username tanpa memangkas password.
- [ ] **AUTH-02** - Buat API register yang **selalu** membuat `role=siswa` dan `status=pending`, merekam pengajuan kelas serta persetujuan dalam transaksi. Tolak injeksi role/status dari payload.
- [ ] **AUTH-03** - Hubungkan form Daftar Siswa L02 ke API. Tampilkan pending hanya setelah server berhasil, pertahankan input saat gagal, dan tampilkan kesalahan username/kelas secara tepat.
- [ ] **AUTH-04** - Implementasikan login/logout/me, cookie sesi aman, store PostgreSQL, regenerasi sesi, batas usia/idle, CSRF/Origin dan rate limit auth. Jangan simpan password atau kredensial sesi di localStorage.
- [ ] **AUTH-05** - Buat middleware status/role/sekolah/kelas/kepemilikan dan guard frontend. Role berasal dari akun server; buang kontrol pratinjau role dari UI produksi.
- [ ] **AUTH-06** - Implementasikan verifikasi status pendaftaran milik sendiri tanpa sesi aplikasi penuh; akun pending/rejected/suspended tidak boleh memperoleh akses API siswa.
- [ ] **AUTH-07** - Hubungkan login tunggal L02 ke AuthContext. Arahkan siswa approved ke perjalanan siswa, BK/superadmin ke dashboard yang sesuai; muat ulang mempertahankan sesi sah.
- [ ] **AUTH-08** - Implementasikan logout, pencabutan sesi ketika suspend/reset/password berubah, prosedur reset akses terverifikasi, serta penggantian password awal akun BK sesuai `structure.md`.
- [ ] **AUTH-09** - Uji kredensial salah, username ganda, role/status palsu, sesi habis, CSRF, akses langsung API, reset dan sesi lama. Jangan membuka status calon siswa hanya dari username/nomor pendaftaran.

**Selesai bila:** ketiga role dapat login sesuai haknya dan akun siswa belum approved tidak dapat memperoleh sesi aplikasi atau menembus API lewat URL/payload.

## 7. Tahap E - Superadmin: approval siswa dan akun BK

**Prioritas:** P0, fitur bisnis pertama yang harus lulus end-to-end. **Dependensi:** DB akun/kelas dan AUTH. **Acuan:** FR-12, AC-56 sampai AC-61.

- [ ] **ADM-01** - Buat API daftar/detail pendaftaran dengan filter status, pagination, jumlah yang konsisten, dan pembatasan sekolah; hanya metadata yang diperlukan untuk review.
- [ ] **ADM-02** - Buat service Setujui yang memeriksa pending, mengubah status akun/pengajuan, mengaktifkan profil/kelas, dan mencatat peninjau/waktu dalam satu transaksi.
- [ ] **ADM-03** - Buat service Tolak dengan alasan singkat wajib, audit, dan penanganan konflik status. Klik ganda/retry tidak menghasilkan keputusan atau keanggotaan ganda.
- [ ] **ADM-04** - Buat API akun BK: buat, penugasan kelas, reset, suspend/aktifkan kembali sesuai prosedur. Generic update status tidak boleh mengaktifkan siswa pending tanpa approval.
- [ ] **ADM-05** - Hubungkan L07 superadmin ke data/API nyata. Ganti script demo yang langsung menampilkan “berhasil disetujui”; tampilkan sukses hanya setelah transaksi server terkonfirmasi.
- [ ] **ADM-06** - Hubungkan L08 superadmin ke akun BK/kelas. Tampilkan menu menurut role server dan jangan memuat data role lain hanya untuk disembunyikan dengan CSS.
- [ ] **ADM-07** - Uji alur lengkap: siswa daftar -> pending tidak dapat login -> superadmin menyetujui -> siswa login -> profil/kelas benar. Uji juga penolakan dan alasan yang diterima pemohon.
- [ ] **ADM-08** - Uji dua keputusan bersamaan, klik ganda, pengajuan kelas tidak aktif, sekolah berbeda, serta percobaan approval oleh BK/siswa. Buktikan tidak ada akses refleksi privat dari panel admin.

**Gerbang M1:** jangan menyatakan modul akun selesai sebelum ADM-07 dan ADM-08 lulus menggunakan database serta sesi nyata. Prioritaskan perbaikan alur ini sebelum memperluas dashboard statistik.

## 8. Tahap F - Eksplorasi siswa, jalur dan perbandingan

**Prioritas:** P1; perhitungan/integritas wajib benar sebelum uji siswa. **Dependensi:** UI L03-L05, tabel fitur, AUTH untuk penyimpanan akun.

- [ ] **EXP-01** - Hubungkan L03 ke 24 butir berversi, empat respons, navigasi butir, edit, bagian nilai/kondisi opsional, serta penyimpanan milik sendiri/lokal sesuai mode.
- [ ] **EXP-02** - Implementasikan enam skor RIASEC 4-16, semua jawaban lengkap, penanganan seri/all-equal, ringkasan netral, dan perhitungan ulang backend; ganti skor contoh UI dengan hasil aktual.
- [ ] **EXP-03** - Implementasikan API/katalog L04, pencarian, filter kategori/minat dengan aturan PRD, sumber/tanggal, detail serta peringatan konten lama. Jangan mengaktifkan filter minat otomatis.
- [ ] **EXP-04** - Implementasikan pilihan 2-3 opsi lintas halaman, hapus/ganti/batas, opsi pribadi berlabel belum diverifikasi, serta salinan versi kartu agar perubahan konten tidak menghapus pertimbangan lama.
- [ ] **EXP-05** - Implementasikan matriks bobot 1-3, penilaian 1-4, 3-5 kriteria, total berbobot, penyimpanan parsial, dan tahan total final ketika belum lengkap. Total contoh 26/27 tidak boleh tetap statis.
- [ ] **EXP-06** - Hubungkan tab opsi mobile dengan matriks yang sama; bobot milik kriteria dipakai konsisten pada semua opsi. Pilihan utama tetap dipilih siswa atau masih menjelajah.
- [ ] **EXP-07** - Hubungkan tab Musyawarah ke simpan/ubah/cetak privat, label opsional, dan persetujuan berbagi eksplisit. Jangan otomatis mengirim catatan keluarga ke guru.
- [ ] **EXP-08** - Implementasikan pemutar lima skenario bercabang di tab Simulasi, validasi semua simpul/cabang/akhir, kembali/ulang/keluar dan refleksi alternatif; tidak ada perubahan rencana otomatis.
- [ ] **EXP-09** - Uji lintas alur L03 -> L04 -> L05, perubahan jawaban/opsi, reload, data belum lengkap, tiga pola RIASEC, seri, dan total matriks dibanding hitung manual.

**Selesai bila:** hasil dan pilihan berasal dari input aktual, tetap dapat direvisi, tidak memberi keputusan otomatis, dan tersimpan sesuai pemilik/mode.

## 9. Tahap G - Rencana, ekspor, dan konsultasi

**Prioritas:** P1. **Dependensi:** UI L06, tabel rencana/konsultasi, AUTH dan penugasan BK. **Acuan:** FR-06/07, AC-27 sampai AC-38, AC-52.

- [ ] **CON-01** - Hubungkan rencana utama/cadangan atau masih menjelajah, tugas/tenggat, tambah/edit/centang/hapus, dukungan/hambatan dan indikator simpan. Draf kurang dari tiga tugas tetap boleh disimpan.
- [ ] **CON-02** - Implementasikan cakupan/pratinjau ekspor, dynamic import jsPDF/AutoTable, unduh PDF dan cetak alternatif. Kecualikan bagian pribadi yang tidak dipilih serta semua password/token/rahasia reset.
- [ ] **CON-03** - Buat API kirim konsultasi dengan tujuan aktif, pesan/topik/preferensi, persetujuan, salinan bagian yang dipilih, dan idempotensi agar retry tidak menggandakan permintaan.
- [ ] **CON-04** - Hubungkan panel Ajukan -> Tinjau -> Kirim pada desktop/mobile. Semua checkbox berbagi awalnya kosong; sukses hanya setelah server mengonfirmasi, luring/gagal tetap belum terkirim.
- [ ] **CON-05** - Implementasikan Permintaanku, status/jadwal, batal aktif dan penarikan bagian berbagi dengan pemeriksaan pemilik. Perubahan refleksi berikutnya tidak mengubah salinan yang sudah dikirim diam-diam.
- [x] **CON-06 (revisi akses)** - Nonaktifkan alur konsultasi tamu, tujuan tanpa login, payload guestData dan token pemantauan tamu; konsultasi hanya untuk siswa approved pada kelasnya.
- [ ] **CON-07** - Pastikan Tanya BK dapat dibuka dari navigasi global sebelum rencana/refleksi/matriks selesai. Tindakan review/konfirmasi mengganti panel, bukan menumpuk modal.
- [ ] **CON-08** - Uji penerima benar, bagian tidak dibagikan tidak terbaca, pengiriman ganda, status aktual, batal/tarik berbagi, PDF panjang/multipage, teks/font, dan ekspor dari draf.

**Selesai bila:** rencana tersimpan, PDF dapat dibaca, dan permintaan benar-benar muncul di BK yang dituju tanpa membawa bagian yang tidak dipilih siswa.

## 10. Tahap H - BK, pengelolaan kelas dan bank konten

**Prioritas:** P1; batas akses/privasi P0 ketika data sudah digunakan. **Dependensi:** AUTH, penugasan kelas, konten, konsultasi dan data kontribusi agregat.

- [ ] **BK-01** - Hubungkan L07 role BK ke kotak masuk/detail berwenang, filter status dan bagian berbagi; bagian lain bertuliskan Tidak dibagikan, tanpa akses profil penuh.
- [ ] **BK-02** - Implementasikan transisi status dan jadwal tanggal/jam/zona waktu sekolah/tempat; preferensi siswa tidak otomatis menjadi jadwal. Audit perubahan tanpa menyalin pesan pribadi ke log.
- [ ] **BK-03** - Buat agregat per siswa unik yang menyetujui kontribusi, dengan definisi memulai/menyusun rencana serta kategori yang dapat tumpang tindih. Jangan memakai pie total 100% untuk data tersebut.
- [ ] **BK-04** - Terapkan ambang <5 dan penyembunyian tambahan di server. Hapus bocoran angka kelompok kecil pada pemilih kelas, total, teks, DOM, tooltip, label aksesibel, respons API dan ekspor; bukan sekadar menyembunyikan grafik.
- [ ] **BK-05** - Hubungkan L08 BK ke daftar/editor/pratinjau/draf/terbit/arsip kartu; sumber resmi dan tanggal verifikasi wajib saat terbit. Pisahkan tanggal edit dari tanggal verifikasi.
- [ ] **BK-06** - Hubungkan kelas/tahun ajaran/kode/retensi sesuai kewenangan. BK tidak bisa menaikkan role, menyetujui pendaftaran, atau membaca kelas lain.
- [ ] **BK-07** - Uji BK A vs kelas/BK B, ambang 0/1/4/5, pengurangan total, penarikan izin agregat, serta siswa/superadmin yang tidak mempunyai izin isi layanan tersebut.

**Selesai bila:** BK menindaklanjuti permintaan yang benar, statistik aman, konten dapat diperbarui, dan tidak ada akses individu melalui chart.

## 11. Tahap I - Data lokal, penghapusan, dan retensi

**Prioritas:** P0 sebelum data pribadi nyata; P1 untuk akses alternatif. **Dependensi:** mode penyimpanan, schema, sesi dan fitur terkait.

- [ ] **SEC-01** - Implementasikan IndexedDB/sesi lokal menurut perangkat pribadi/bersama, versi data, tanggal kedaluwarsa, autosave aktual, indikator gagal, serta tombol selesai/hapus dari perangkat.
- [x] **SEC-02 (revisi akses)** - Nonaktifkan pembacaan dan pemindahan draf tamu ke akun. Draf lama tidak diunggah; bersihkan draf konsultasi sesi saat logout/kedaluwarsa.
- [ ] **SEC-03** - Terapkan nomor revisi dan konflik dua perangkat, pemulihan draf saat sesi habis sesuai pilihan, serta pencegahan upload ulang data yang sudah dihapus.
- [ ] **SEC-04** - Tinjau seluruh respons/log/cache/URL/DOM untuk data yang seharusnya tidak diberikan: password, token, isi refleksi, agregat kecil, metadata sekolah lain. Konten yang dilarang tidak boleh dikirim lalu hanya di-hide.
- [ ] **SEC-05** - Hubungkan panel Privasi/Pengaturan Data ke izin, lokasi simpan, tanggal retensi, reset/logout, dan hapus mandiri dengan hasil operasi yang jujur. Pending/rejected memiliki jalur hak hapus melalui verifikasi kepemilikan.
- [ ] **SEC-06** - Implementasikan penghapusan turunan: refleksi, opsi, matriks, musyawarah, tugas, kontribusi agregat, permintaan, salinan berbagi, sesi dan cache terkait sesuai PRD.
- [ ] **SEC-07** - Implementasikan job akhir tahun ajaran, retensi pengajuan pending/rejected yang disepakati, cleanup sesi, pencatatan penyelesaian, dan proses penerapan ulang penghapusan saat pemulihan cadangan.
- [ ] **SEC-08** - Siapkan manifest/pemasangan layar utama dan cache shell/konten publik ringan bila diperlukan. Jangan cache respons privat; luring tidak mengklaim konsultasi terkirim.
- [ ] **SEC-09** - Uji perangkat bersama, penyimpanan penuh/tidak tersedia, batas waktu, hapus lalu reconnect perangkat lama, pencabutan izin, dan job retensi dengan waktu uji terkontrol.

**Selesai bila:** lokasi simpan sesuai pilihan, tidak ada upload tersembunyi, dan data yang dihapus atau akses yang dicabut tidak muncul kembali.

## 12. Tahap J - Materi dan konten final

**Prioritas:** P1, dimulai sebelum uji materi/siswa. **Dependensi:** penanggung jawab materi dan format konten; dapat disiapkan sebelum seluruh UI terintegrasi.

- [ ] **CNT-01** - Siapkan 24 butir refleksi, empat per dimensi, skala dan penjelasan hasil berversi; telaah ahli materi. Jangan menganggap satu butir contoh HTML sebagai instrumen lengkap.
- [ ] **CNT-02** - Siapkan 10 kartu awal lalu target 40 kartu lintas empat kategori, beserta sumber resmi/tahun berlaku/tanggal verifikasi; selaraskan judul, deskripsi, mapel, dan penanda minat.
- [ ] **CNT-03** - Perbaiki data contoh yang tidak konsisten pada UI saat menggantinya dengan data terverifikasi; jangan menerbitkan judul Teknik Informatika dengan deskripsi/prospek jalur lain.
- [ ] **CNT-04** - Lengkapi lima pohon skenario, minimal dua titik keputusan dengan dua opsi, alternatif dan akhir yang bermakna; validasi materi serta semua cabang.
- [ ] **CNT-05** - Finalisasi petunjuk, FAQ, bahasa persetujuan/privasi, batas konsultasi, kontak/jam layanan, musyawarah dan lembar kerja cetak. Pisahkan data contoh dari konten terbit nyata.

**Selesai bila:** konten jumlahnya cukup, konsisten dan ditelaah, serta informasi syarat/biaya/sumber bukan isian buatan dari mockup.

## 13. Tahap K - Pengujian terintegrasi dan revisi

**Prioritas:** P0 untuk bug akses/data/perhitungan; P1 untuk seluruh kelayakan. **Dependensi:** fitur yang diuji terintegrasi, konten siap, dan database test terpisah.

- [ ] **QA-01** - Buat serta jalankan pengujian API auth, approval/transaksi/race, otorisasi tiga role, kepemilikan, idempotensi, dan pencabutan sesi menggunakan data test.
- [ ] **QA-02** - Jalankan alur browser siswa daftar -> pending -> superadmin setujui -> siswa login -> refleksi/jalur/matriks -> tiga tugas -> unduh -> konsultasi -> BK jadwalkan -> siswa melihat jadwal.
- [ ] **QA-03** - Jalankan alur negatif: pendaftaran ditolak, pending/suspended login, siswa A ke data B, BK kelas lain, role preview/payload, API admin langsung, luring/gagal kirim, konflik simpan dan hapus data.
- [ ] **QA-04** - Periksa delapan layout pada 360/390/768/1366/1440 px, keyboard/pembaca layar yang relevan, target sentuh, fokus, kontras, tab/back/reload/deep-link, serta tanpa toolbar bertumpuk.
- [ ] **QA-05** - Ukur pemuatan awal halaman siswa <1 MB tanpa video dengan cache kosong; periksa aset, dynamic import PDF, kegagalan gambar/font, dan performa pada kondisi uji yang dicatat.
- [ ] **QA-06** - Jalankan lint/build serta seluruh checklist AC-01 sampai AC-61. Catat hasil per butir, bukan menganggap seluruhnya lulus dari satu screenshot atau happy path.
- [ ] **QA-07** - Lakukan validasi ahli materi/media, kemudian uji terbatas 6-10 siswa dengan persetujuan yang diperlukan dan satu BK, memakai data contoh sesuai rancangan penelitian.
- [ ] **QA-08** - Hitung hasil tugas, keterpahaman dan SUS sesuai instrumen; catat hambatan per fitur, tingkat keparahan, perbaikan dan bukti uji ulang.

**Gerbang M2:** 100% fungsi minimum berjalan, minimal 90% keseluruhan butir fungsional, nilai ahli minimal 76% tiap aspek, keberhasilan tugas minimal 80%, keterpahaman rerata >=3,0/4, dan SUS rerata >=68. Bug akses/data/perhitungan kritis tetap wajib nol meskipun persentase keseluruhan sudah tercapai. Target ini berasal dari PRD; bukan hasil yang sudah diperoleh.

## 14. Tahap L - Deployment dan serah terima

**Prioritas:** P1 sebelum rilis sekolah. **Dependensi:** M1/M2 dan kesiapan operasional. **Hasil:** aplikasi dapat dioperasikan dan dipelihara.

- [ ] **OPS-01** - Tetapkan penyedia hosting, domain, penanggung jawab, biaya, database, konfigurasi HTTPS/same-origin, serta environment demo/test/produksi yang terpisah.
- [ ] **OPS-02** - Jalankan migration, bootstrap admin secara aman, konfigurasi cookie/proxy, tahun ajaran/retensi/zona waktu, dan penugasan BK pada target deployment. Jangan memasukkan seed demo ke layanan nyata.
- [ ] **OPS-03** - Atur scheduler job retensi/cleanup, health monitoring, log minimum, pencadangan dan satu simulasi pemulihan termasuk penerapan ulang penghapusan.
- [ ] **OPS-04** - Uji smoke pada deployment: register/approval/login, izin tiga role, simpan/ekspor, kirim/jadwal, akses mobile, logout/suspend, dan koneksi database nyata lingkungan tersebut.
- [ ] **OPS-05** - Lengkapi README operasional, environment contoh, skrip, panduan siswa/BK/superadmin, pembaruan konten, reset akses, retensi dan laporan pengujian/log revisi.
- [ ] **OPS-06** - Pastikan persetujuan dan tata kelola sekolah, sumber konten, kontak/jam layanan serta penanggung jawab tersedia sebelum data siswa nyata digunakan; serahkan produk beserta daftar keterbatasan.

**Selesai bila:** deployment terverifikasi dari browser sampai database, pemulihan/retensi dapat dijalankan, dan pengelola menerima panduan serta akun melalui saluran yang sesuai.

## 15. Urutan kerja dan milestone

| Milestone                 | Pekerjaan wajib                           | Bukti penerimaan                                                               |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| M0 - Fondasi dan UI React | SET, shell UI, migration akun             | Frontend/API/database berjalan; tampilan HTML digunakan kembali                |
| M1 - Akun dan approval    | AUTH, ADM, konversi/integrasi L02/L07/L08 | Daftar pending -> persetujuan superadmin -> login siswa; akses ilegal ditolak  |
| M2A - Eksplorasi utuh     | EXP, CON, konten yang diperlukan          | Data siswa dari refleksi sampai rencana/ekspor/konsultasi benar-benar diproses |
| M2B - Layanan aman        | BK, SEC, konten final                     | Tindak lanjut BK, agregat aman, penghapusan/retensi dan mobile setara          |
| M2 - Siap validasi/rilis  | QA dan revisi                             | Checklist/target PRD tercapai; bug kritis nol                                  |
| M3 - Serah terima         | OPS                                       | Deployment teruji, panduan, backup/retensi, dan pemilik layanan siap           |

Konten dapat disiapkan sejak awal; jangan menunggu akhir pengembangan. Pekerjaan tidak harus selesai satu tahap besar seluruhnya sebelum tahap berikutnya: prioritas awal adalah fondasi dan konversi komponen yang dibutuhkan untuk membuktikan M1, lalu perluasan fitur. Tidak menambahkan tanggal selesai tanpa mengetahui kapasitas pelaksana.

### 15.1 Format laporan progres

Gunakan format singkat berikut setiap menyelesaikan kelompok pekerjaan:

```text
Selesai: ID task + hasil nyata
Bukti: file/commit, endpoint atau hasil uji
Belum selesai: ID task dan alasan spesifik
Berikutnya: ID task yang dependensinya sudah siap
```

Jangan mencentang task karena folder/file sudah dibuat saja. Task integrasi selesai ketika tindakan pada UI menghasilkan perubahan yang benar, tersimpan di lokasi yang semestinya, terlihat hanya oleh pihak berwenang, dan tetap benar setelah muat ulang atau kegagalan yang relevan.
