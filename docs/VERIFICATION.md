# Verifikasi implementasi PILIHANKU

> Hasil mutakhir setelah perbaikan 22 November 2026: [remediasi production](REMEDIATION-2026-11-22.md), backend 41/41 dan frontend 13/13, backup/restore serta outage/restart nyata lokal lulus. Catatan di bawah merupakan riwayat verifikasi sebelumnya.

> Audit production 22 November 2026: lihat [laporan terbaru](PRODUCTION-AUDIT-2026-11-22.md). Catatan historis di bawah tidak menggantikan hasil dan batas audit tersebut.

> Pembaruan 22 November 2026: aturan login approved menggantikan alur tamu pada catatan historis di bawah. Lihat [verifikasi akses wajib login](LOGIN-ACCESS.md).

Tanggal pencatatan: 21 November 2026. Semua akun, pesan, kelas, kartu, dan pengukuran memakai data sintetis. Ini laporan teknis lokal, bukan hasil telaah ahli atau uji siswa.

## Hasil nyata

| Pemeriksaan                 | Hasil dan batas                                                                                                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend                     | 22 test lulus, 0 gagal; Node test runner + Supertest + PostgreSQL sungguhan. Tambahan konteks kelas diuji ulang melalui test auth terkait.                                               |
| Frontend/domain/PDF/storage | 7 test lulus, 0 gagal.                                                                                                                                                                   |
| Lint                        | Backend dan frontend lulus, tanpa error/peringatan; rules hooks, dependensi effect, dan Fast Refresh aktif.                                                                              |
| Build                       | Vite produksi lulus; Tailwind melalui build, font lokal, PDF dynamic import; precache hanya aset publik.                                                                                 |
| Database                    | Empat migration berhasil; rollback seluruh migration dan pembangunan ulang schema kosong lulus. Constraint role, status, username, foreign key lintas sekolah, serta transaksi diuji.    |
| M1 browser → API → DB       | Daftar pending → login ditolak → superadmin Setujui → siswa login. SQL membuktikan user/pengajuan approved, satu profil kelas, satu audit approval.                                      |
| Eksplorasi browser          | 24 respons Suka menghasilkan enam skor 12; seri penuh dijelaskan. Dua opsi dan matriks menghasilkan 26/27, tetap tanpa penentuan pemenang.                                               |
| Rencana                     | Tiga langkah pulih setelah reload. PDF berhasil diunduh dari browser. PDF 20 langkah panjang menghasilkan dua halaman, dirender Poppler, kedua halaman diperiksa tanpa potongan/overlap. |
| Konsultasi browser          | Hanya Rencana dipilih. BK mendapat Rencana; tiga bagian lain Tidak dibagikan. Jadwal yang ditetapkan BK muncul di siswa: tanggal/jam, Asia/Jakarta, dan tempat sintetis.                 |
| Penyimpanan tamu            | IndexedDB pribadi pulih setelah reload. Akun transfer belum memiliki draf server sebelum consent; sesudah tinjau/salin, SQL menunjukkan jawaban tersimpan.                               |
| Luring                      | Build produksi di port 4173; jaringan offline melalui CDP; shell/draf sesi pulih setelah reload; edit offline bertahan setelah online/reload. Tidak ada sukses kirim palsu.              |
| Kelima simulasi             | Setiap tema dijalankan lewat dua keputusan sampai refleksi akhir, diulang, lalu keluar. Semua simpul/cabang/akhir juga diperiksa otomatis tanpa siklus/buntu.                            |
| Keyboard/panel              | ArrowRight memindahkan tab Jelajahi ke Simulasi beserta fokus. Pertanyaan ke-7 tetap aktif setelah membuka/menutup Pengaturan Data.                                                      |
| Cetak web                   | Emulasi media print mengonfirmasi header, footer, dan stepper `display:none`; lembar empat langkah + musyawarah terlihat. Media/viewport/network override dipulihkan setelah QA.         |

## Transfer dan beban

Build terbaru di Vite preview, cache browser dinonaktifkan dan service worker dilewati selama pengukuran awal; event `Network.loadingFinished` dijumlahkan. Ini ukuran transfer lokal, bukan simulasi Android/4G.

| Layout | Transfer terukur |
| ------ | ---------------: |
| L01    |     287.046 byte |
| L02    |     170.545 byte |
| L03    |     169.830 byte |
| L04    |     172.281 byte |
| L05    |     170.110 byte |
| L06    |     173.807 byte |

Semua di bawah anggaran 1 MB pada data uji. Ekspor jsPDF dimuat ketika diminta, di luar pemuatan awal. Foto pengganti lokal sekitar 116 KB.

Uji 50 sesi aktif dan 1.000 kartu sintetis pada PostgreSQL test: sebelum pagination p95 3.751 ms. Setelah pagination 24 kartu/halaman: 50/50 respons benar, p50 1.833 ms, p95 1.932 ms, maksimum 1.937 ms. Angka ini adalah pengukuran lokal yang tersimpan di `output/qa/pilot-load.json`, bukan jaminan SLA atau hasil jaringan 4G. Login fixture dibuat sebelum fan-out; pengujian tidak menyatakan bahwa 50 login serentak dari satu IP melewati rate limit produksi.

## Responsif dan aksesibilitas

L01–L08 diperiksa melalui browser pada lebar CSS 360, 390, sekitar 768 (767 dan 769), sekitar 1366 (1367), dan 1440. Tidak ditemukan overflow horizontal halaman pada pemeriksaan tersebut; input/select/textarea yang diperiksa memiliki label. Zoom in-app 0,8 menyebabkan dua ukuran acuan jatuh pada piksel terdekat, sehingga laporan tidak menyatakan keduanya diuji persis.

Screenshot beranda desktop/mobile diperiksa terhadap arah visual botani, warna, tipografi, pil, kartu, dan ruang dari sumber. Teks, radio, input, target utama, focus ring, dan navigasi keyboard tersedia. Review visual semua state, pembaca layar manusia, perangkat Android sekolah, serta profil CPU/4G terukur masih perlu dilakukan. Tidak ada skor axe, SUS, atau hasil observasi siswa yang dikarang.

## Bukti yang dapat diulang

- `backend/tests/integration.test.js`: auth, approval bersamaan, transaksi/idempotensi, peran/sekolah/kelas, kepemilikan, revisi, perhitungan, konsultasi, sharing, agregat, konten, laporan sumber, snapshot dan hapus.
- `backend/tests/operations.test.js`: kalender, usia sesi, Unicode CSRF, rate limit aktual, ledger penghapusan, serta rollback/rebuild migration.
- `frontend/tests/domain.test.js`: materi offline/server sama, skor, matriks, kedaluwarsa, cakupan ekspor, PDF panjang, penyimpanan bersama serta error unavailable/quota.
- `frontend/tests/flows/README.md`: langkah browser aktual untuk pengulangan.
- `output/qa/database-evidence.json`: hasil SQL akun browser utama; tidak menyertakan password, ID sesi, atau token.
- `output/qa/browser-plan.pdf` dan `long-plan.pdf`, serta PNG render: bukti ekspor sintetis.
- `output/qa/source-checksums.json`: inventaris checksum 16 HTML sumber yang dipertahankan.

## Checklist AC-01 sampai AC-61

`L` = mekanisme teknis lulus pada cakupan uji ini. `P` = sebagian/masih membutuhkan bukti luar. Status L tidak menyatakan materi telah ditelaah ahli atau layanan produksi sudah disetujui.

| AC  | Status | Bukti / batas                                                                                      |
| --- | ------ | -------------------------------------------------------------------------------------------------- |
| 01  | L      | Tamu tanpa nama/email/telepon; browser pribadi dan bersama.                                        |
| 02  | L      | Konteks sekolah/kelas/retensi di L02 sebelum consent, tujuan data dan hak hapus dijelaskan.        |
| 03  | L      | Kode tidak aktif ditolak, tanpa daftar anggota; transaksi register diuji.                          |
| 04  | L      | Progres dari data aktual; pulih sesuai mode.                                                       |
| 05  | L      | 24 butir bisa diubah; browser mengisi seluruhnya.                                                  |
| 06  | L      | Ringkasan ditahan bila jawaban belum lengkap.                                                      |
| 07  | L      | Enam skor mentah 4–16, tanpa diagnosis/rekomendasi otomatis.                                       |
| 08  | L      | Konteks opsional dapat kosong; tidak menjadi nol.                                                  |
| 09  | L      | Seri penuh dan seri di batas dua tertinggi diuji.                                                  |
| 10  | L      | Status simpan aktual, konflik/network error, uji quota/unavailable.                                |
| 11  | P      | 10 contoh berlabel tersedia; 10/40 kartu terverifikasi belum tersedia.                             |
| 12  | L      | Pencarian seluruh katalog, pagination, OR minat + AND kategori/teks, tanpa hasil.                  |
| 13  | L      | Draf disaring; sumber/tanggal/konfirmasi verifikator wajib untuk terbit. Substansi perlu manusia.  |
| 14  | L      | Maksimal tiga opsi; hapus/tambah mengganti secara eksplisit.                                       |
| 15  | L      | Tautan HTTPS dibuka aman; laporan sumber diterima dan ditangani BK berwenang.                      |
| 16  | L      | Snapshot tidak ditimpa; perubahan/arsip memberi pemberitahuan saat memuat akun.                    |
| 17  | L      | Lima tema sampai akhir, ulang dan keluar diuji browser.                                            |
| 18  | L      | Semua cabang valid, terjangkau, tanpa siklus/buntu.                                                |
| 19  | L      | Akhir memuat alternatif dan langkah mencari informasi; materi tetap draf.                          |
| 20  | L      | Pemutar hanya mengubah refleksi simulasi, tanpa perubahan pilihan/rencana otomatis.                |
| 21  | L      | Validator menolak duplikasi/bobot/skor tidak sah.                                                  |
| 22  | L      | Sel kosong mempertahankan draf dan menahan total seluruh opsi.                                     |
| 23  | L      | Perhitungan lokal dan server; contoh manual 26/27.                                                 |
| 24  | L      | Seri tidak dipecah dengan pemenang semu.                                                           |
| 25  | L      | Utama dipilih siswa; setelah matriks lengkap rencana tetap masih menjelajah.                       |
| 26  | L      | Musyawarah privat, simpan, ubah dan ekspor opsional.                                               |
| 27  | L      | Tugas tambah/edit/centang/hapus berbasis data; tiga judul pulih setelah reload.                    |
| 28  | L      | Tidak ada pilihan utama otomatis dari total.                                                       |
| 29  | L      | Unduhan aktual + render PDF dua halaman dengan teks panjang.                                       |
| 30  | L      | Scope/pratinjau; bagian tidak dipilih dan rahasia dikecualikan.                                    |
| 31  | L      | Alternatif cetak tersedia; emulasi print terverifikasi.                                            |
| 32  | L      | Sukses konsultasi setelah insert dan validasi penerima aktif.                                      |
| 33  | L      | Pengiriman paralel dengan operation key sama menghasilkan satu baris.                              |
| 34  | L      | Pengirim/guru tepat saja; token tamu salah/nomor saja ditolak.                                     |
| 35  | L      | Snapshot bagian yang dipilih; tiga bagian lain tidak dikirim ke BK.                                |
| 36  | L      | Jadwal BK dibaca siswa dari server, lengkap zona waktu/tempat.                                     |
| 37  | L      | Draf luring bertahan; tidak ada kirim latar belakang otomatis.                                     |
| 38  | L      | Batas layanan, penerima, tinjauan dan persetujuan tampil.                                          |
| 39  | L      | BK kelas/sekolah lain ditolak server.                                                              |
| 40  | L      | Ambang 0/1/4/5 dan pelengkap, opt-out, topik, serta respons tersupresi diuji.                      |
| 41  | L      | Tidak ada drill-down agregat menuju jawaban individu.                                              |
| 42  | L      | Agregat hanya akun approved yang memberi consent, tidak memasukkan tamu.                           |
| 43  | L      | Audit metadata keputusan/status/terbit; tidak menyalin pesan/jawaban/password.                     |
| 44  | L      | Draf/edit/versi/terbit/arsip, sumber/tanggal dan scope sekolah divalidasi.                         |
| 45  | L      | IndexedDB/sessionStorage pulih, termasuk reload luring.                                            |
| 46  | L      | Tinjauan UI hapus; API menghapus turunan tanpa persetujuan guru.                                   |
| 47  | L      | Sesi/account lama tidak dapat mengunggah kembali setelah hapus.                                    |
| 48  | L      | Banner luring dan penolakan operasi jaringan, eksplorasi lokal tetap tersedia.                     |
| 49  | L      | PDF dan media print tanpa navigasi/rahasia.                                                        |
| 50  | L      | Tepat delapan route/layout utama; fungsi pendukung berupa state/panel.                             |
| 51  | L      | Query tab/filter, draf konsultasi, jawaban dan konteks panel dipertahankan; pertanyaan ke-7 diuji. |
| 52  | L      | Tanya BK global tanpa prasyarat rencana/refleksi.                                                  |
| 53  | L      | Satu panel aktif; review/edit/status mengganti isi.                                                |
| 54  | L      | Privasi, hapus, status/reset dan lembar kosong tersedia dari layout induk.                         |
| 55  | L      | Implementasi responsif bersama; bottom nav satu lapisan, tray tidak fixed bertumpuk.               |
| 56  | L      | Register selalu siswa/pending; role/status palsu ditolak.                                          |
| 57  | L      | Pending/rejected/suspended ditolak; status sendiri memakai password.                               |
| 58  | L      | Approval hanya superadmin dalam sekolahnya; BK/siswa ditolak langsung API.                         |
| 59  | L      | Row lock/transaksi; race berlawanan konflik, retry sama tanpa duplikasi.                           |
| 60  | L      | Alasan penolakan wajib; versi sesi/reset/password/status mencabut akses.                           |
| 61  | L      | L07/L08 berdasarkan server; superadmin tidak membaca refleksi privat.                              |

## Pekerjaan yang belum dapat diterima sebagai selesai

- **UI-08, QA-04**: review komparatif visual semua state, ukuran acuan persis dan pengujian pembaca layar/perangkat sasaran belum lengkap.
- **QA-05**: transfer enam halaman dan beban lokal lulus; profil Android menengah/4G terukur belum dijalankan.
- **SEC-07**: job dan ledger/reapply sudah diimplementasikan, tetapi batas retensi final sekolah, scheduler produksi dan restore cadangan penyedia belum diverifikasi.
- **CNT-01–05, QA-07–08**: naskah/konten final, 40 sumber terverifikasi, telaah ahli, siswa/wali, BK, dan SUS memerlukan pihak manusia; hanya draf/contoh disiapkan.
- **OPS-01–04, OPS-06**: penyedia/domain/operator/akses belum diberikan; Docker tidak tersedia untuk build container; HTTPS, cookie proxy, scheduler, backup/restore dan smoke deployment belum dijalankan. Tidak ada pembelian atau deployment eksternal.

M1 diterima secara teknis. Fungsi lokal eksplorasi/layanan sudah tersedia dan diuji pada cakupan di atas. **Gerbang M2/M3 belum diterima** karena konten/validasi manusia dan lingkungan operasional belum siap. Tidak ada persentase ahli, keberhasilan siswa, keterpahaman, atau SUS yang dikarang.
