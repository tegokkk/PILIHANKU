# Alur browser yang diverifikasi

Pengujian pada 21 November 2026 memakai CUA in-app Chromium, database development berisi data sintetis, dan API Express dengan store sesi PostgreSQL. Tidak menggunakan data siswa nyata. Database test otomatis terpisah.

1. Daftar `qa.siswa.browser` melalui L02 → pesan pending dari server → login pending ditolak.
2. Masuk sebagai operator QA → L07 detail → Setujui → keluar → siswa yang sama dapat masuk. SQL mengonfirmasi status user/pengajuan, satu profil kelas, dan satu audit approval.
3. Isi 24 jawaban Suka → enam skor 12; tinjau bagian opsional. Pilih dua kartu, isi matriks manual → total 26/27 tanpa pemenang.
4. Tambah tiga langkah → tunggu indikator simpan → reload → ketiga judul kembali. Unduh PDF melalui panel scope → berkas benar-benar ada dan dirender untuk QA.
5. Konsultasi hanya memilih Rencana → tinjau penerima/pesan → persetujuan → kirim. BK melihat Rencana Dibagikan; Refleksi/Matriks/Musyawarah Tidak dibagikan. BK meninjau dan menetapkan jadwal → siswa melihat tanggal/jam/zona/tempat aktual.
6. Tamu pribadi → satu jawaban → IndexedDB berhasil → reload memulihkan jawaban. Masuk akun transfer yang awalnya kosong → belum ada draf server sebelum consent → tinjau/salin → SQL mengonfirmasi satu jawaban setelah persetujuan.
7. Build di port 4173 → tamu bersama → simpan sesi → jaringan offline via CDP → reload memulihkan shell/draf → edit offline → online/reload tetap mempertahankan edit. API privat tidak di-cache.
8. Pemeriksaan overflow/label untuk L01–L08 pada lebar CSS 360, 390, sekitar 768 (767 dan 769), sekitar 1366 (1367), dan 1440. Faktor zoom in-app 0,8 membuat dua lebar acuan dibatasi piksel terdekat; hal ini tidak diklaim sebagai pengujian perangkat Android fisik.

Untuk mengulang fixture browser, gunakan `node src/scripts/browser-fixtures.js` dari backend dengan `DEMO_CONTENT=true`. Password baru acak ditulis hanya pada `.local/browser-fixtures.json`; fixture tidak dijalankan saat start/seed/produksi. Script tidak mengubah password akun fixture yang sudah ada. Pengujian penggantian password awal, rate limit, race, dan akses negatif juga dijalankan melalui API test runner.

Daftar ini merupakan catatan pengujian aktual, bukan klaim Playwright CLI, ahli, SUS, atau pembaca layar manusia sudah lulus. Bukti agregat dan batas uji terdapat pada `docs/VERIFICATION.md` serta `output/qa/`.
