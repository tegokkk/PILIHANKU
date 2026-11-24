# Verifikasi akses wajib login

Tanggal: 22 November 2026. Berlaku untuk implementasi lokal PILIHANKU. Instruksi pengguna terbaru menggantikan ketentuan Mode Tamu pada PRD, design, structure, dan tasklist awal. Referensi HTML asli tetap dipertahankan.

## Klarifikasi beranda publik

Pengguna mengklarifikasi bahwa halaman awal harus tetap dapat dilihat sebelum login. Beranda / kini publik, dengan animasi dan informasi pengenalan semula. Tombol fitur dan URL fitur tetap menuju Masuk bagi pengunjung tanpa sesi. Beranda publik memakai data tampilan kosong tanpa provider eksplorasi, pembacaan draf tamu, atau pemuatan data akun. Link Kembali ke Beranda tersedia pada halaman Masuk.

Verifikasi revisi: 11/11 uji frontend lulus, lint kedua aplikasi lulus, dan uji integrasi redirect produksi memastikan / mendapat 200 sementara halaman fitur anonim tetap 302 ke Masuk. Catatan pengujian awal delapan URL di bawah bersifat historis; pengecualian publik terbaru adalah beranda.

## Perilaku akses

- Semua fitur memerlukan sesi server akun approved. Pending, rejected, dan suspended tidak mendapatkan sesi aplikasi.
- Tanpa sesi: Beranda, Masuk, Daftar Siswa, pemeriksaan status dengan verifikasi username/password, dan informasi privasi. Pendaftaran tanpa kode kelas maupun pilihan sekolah/kelas. Server memakai kelas aktif tunggal atau kelas bawaan dari REGISTRATION_CLASS_ID. Jika ada beberapa kelas aktif, pengelola wajib menentukan kelas bawaan di environment. Health check tetap tersedia untuk operasional.
- Mode Tamu, konsultasi token tamu, impor draf tamu, serta penghapusan akun anonim lama dinonaktifkan. Penghapusan mandiri siswa ada di Pengaturan Data setelah login; penghapusan pendaftaran yang belum aktif melalui petugas sekolah.
- Siswa masuk ke Kenali Diriku; BK dan superadmin ke dashboard dengan isi sesuai role server. BK hanya mendapatkan kelas/layanan yang diwenangkan, siswa hanya data miliknya, dan superadmin administrasi.
- Gerbang React berada sebelum shell, provider eksplorasi, route, panel, dan animasi. Beranda pengenalan tetap publik; seluruh URL fitur anonim kembali ke Masuk. Pada konfigurasi produksi, Express juga mengarahkan URL halaman fitur anonim sebelum mengirim shell aplikasi.
- Seluruh API fitur berada setelah gerbang sesi pusat, sebelum CSRF/validasi payload: tanpa sesi 401 SESSION_REQUIRED; role yang tidak berwenang 403. Lingkup sekolah/kelas/kepemilikan tetap diperiksa di server.
- Sesi memiliki batas absolut 8 jam dan idle 30 menit. Pemeriksaan pasif /auth/me tidak memperpanjang idle. Klien memakai tenggat server, pemeriksaan ulang ketika kembali ke tab/riwayat, dan pemeriksaan pasif 30 detik untuk pencabutan status/sesi.
- Pemeriksaan ulang menyembunyikan dan menonaktifkan interaksi tampilan privat sementara. Draf tetap tersedia jika sesi masih sah. Logout/kedaluwarsa membongkar provider/halaman, mengosongkan referensi draf, membersihkan penyimpanan sesi konsultasi, membatalkan permintaan privat, dan menolak hasil yang terlambat, termasuk saat parsing JSON atau persiapan CSRF.
- Logout gagal jaringan tetap mengunci akses lokal. Penanda tanpa data pribadi mencegah pemulihan sesi sebelum pencabutan dicoba kembali. Logout antar-tab disampaikan melalui BroadcastChannel bila tersedia.
- Unduhan PDF, termasuk lembar kosong, memverifikasi sesi siswa dan menolak kelanjutan operasi setelah sesi lokal dibersihkan.
- Respons API memakai Cache-Control: no-store; fetch klien juga no-store. Service worker hanya mencache shell/aset statis publik dan melewatkan /api/. Shell luring tidak melewati gerbang sesi.
- Draf tamu lama tidak dibaca, ditautkan, atau dikirim ke akun. Helper penyimpanan lama tetap ada untuk pengujian kompatibilitas format; tidak diimpor oleh alur aplikasi. Kolom/rekaman tamu historis di database mengikuti retensi, tanpa jalur akses token anonim.

## Hasil pemeriksaan

| Pemeriksaan | Hasil |
| --- | --- |
| Backend: npm test | 25/25 lulus, memakai PostgreSQL test terpisah |
| Frontend: npm test | 11/11 lulus |
| Lint frontend dan backend | Lulus |
| Build produksi frontend | Lulus; 22 aset statis publik dalam precache, tanpa API privat |
| Render selama pemeriksaan sesi | Delapan layout hanya menghasilkan status pemeriksaan; kontrol privat tidak muncul meskipun terdapat user lama pada konteks uji |
| Respons privat terlambat | Ditolak setelah invalidasi, termasuk parsing JSON dan persiapan CSRF |
| API langsung anonim | GET/mutasi fitur menghasilkan 401, juga tanpa token CSRF; header no-store diperiksa |
| API role/status/kelas lain | Role salah 403; status belum aktif ditolak; lingkup lintas siswa/sekolah/kelas serta pencabutan sesi teruji |
| URL produksi anonim | Redirect 302 ke /mulai?tab=masuk melalui konfigurasi Express produksi lokal |

## Pemeriksaan browser lokal

Dijalankan pada pratinjau localhost:5173 dengan akun/data sintetis.

1. URL langsung delapan layout: /, /mulai, /kenali-diriku, /peta-jalur, /timbang-pilihan, /rencana-langkahku, /guru, /guru/kelola. Termasuk query ringkasan, simulasi, panel ekspor dan lembar kosong. Tanpa sesi, semuanya menampilkan Masuk tanpa navigasi/kontrol privat. URL lama /mulai?tab=tamu dinormalisasi menjadi /mulai?tab=masuk.
2. Login siswa approved menuju Kenali Diriku; navigasi dan reload halaman privat tetap menggunakan sesi server.
3. Login BK menuju dashboard BK; membuka URL Kenali Diriku sebagai BK kembali ke dashboard tanpa pertanyaan siswa. Login superadmin menuju Pendaftaran Siswa.
4. Login akun pending ditolak. Pemeriksaan status dengan kredensial yang benar tetap menghasilkan status pending. Daftar Siswa dan informasi privasi tetap dapat dibuka.
5. Konsultasi setelah login mendapatkan kelas/sekolah dan guru tujuan dari server tanpa input kode tujuan/token tamu.
6. Logout dari panel konsultasi, tombol kembali, dan reload berakhir di Masuk. Tidak ada tombol Keluar, kontrol privat, atau tab Tamu.
7. Sesi akun siswa sintetis dibuat melewati batas idle di database lokal. Pemeriksaan sesi otomatis menghapus tampilan privat dan kembali ke Masuk; reload tetap terkunci. Tidak ada perubahan pada kredensial pengguna.
8. Console browser pada halaman siswa/konsultasi tidak memuat error selama pemeriksaan akhir.

Pengujian produksi di atas memakai aplikasi Express berkonfigurasi produksi secara lokal melalui Supertest; belum ada deployment jarak jauh pada pekerjaan ini. Uji render adalah bukti gerbang sebelum animasi, sedangkan uji browser memeriksa hasil navigasi dan siklus sesi nyata.

## Berkas utama

- backend/src/app.js — gerbang pusat API dan redirect halaman produksi.
- backend/src/middleware/authenticate.js — pemeriksaan akun/sesi, role, dan tenggat pasif.
- backend/src/modules/auth/auth.routes.js — identitas server/tenggat sesi dan proses akses akun.
- backend/src/modules/consultations/consultations.routes.js — konsultasi siswa approved tanpa jalur tamu.
- frontend/src/App.jsx — gerbang delapan layout/panel di atas animasi.
- frontend/src/context/AuthContext.jsx — bootstrap, revalidasi, expiry, logout, invalidasi lintas tab.
- frontend/src/context/ExplorationContext.jsx — penyimpanan eksplorasi akun tanpa pembacaan/impor tamu.
- frontend/src/services/api.js — pembatalan permintaan, invalidasi hasil terlambat, dan no-store.
- frontend/tests/auth-access.test.js, frontend/tests/auth-render.test.js — pengujian akses, ekspor, dan gerbang render.
