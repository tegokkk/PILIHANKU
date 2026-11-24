# PILIHANKU - Design Specification & UI Generation Brief

| Metadata | Isi |
| --- | --- |
| Versi | 1.2 - tiga role dan approval siswa |
| Tanggal | 21 November 2026 |
| Acuan produk | [PRD.md](./PRD.md), versi 1.2 - JavaScript/React, tiga role dan approval siswa |
| Acuan visual | [Referensi 01](../assets/design/reference-01.png), gambar yang diberikan pengguna |
| Tujuan | Pedoman visual, spesifikasi layar, dan kumpulan prompt untuk generasi UI di Stitch |
| Cakupan | Website siswa serta dashboard BK/superadmin berbasis role |
| Acuan implementasi | [structure.md](./structure.md), JavaScript/React, backend Express/PostgreSQL |
| Bahasa UI | Bahasa Indonesia |
| Status | Spesifikasi desain; layar dan aset final belum digenerasikan |

## 1. Cara menggunakan dokumen

PRD menjadi sumber aturan produk. Dokumen ini menjelaskan **seperti apa aturan tersebut ditampilkan dan digunakan pada antarmuka**. Jika ada perbedaan fungsi, hak akses, perhitungan, atau retensi, ikuti PRD dan sesuaikan desainnya.

Seluruh ukuran, warna, komposisi, komponen, serta contoh tampilan dalam dokumen ini merupakan keputusan desain. Contoh data dan teks refleksi bukan materi yang sudah divalidasi ahli. Penggunaan data siswa nyata tetap mengikuti kesiapan pada PRD Bagian 21.

Saat ini tersedia satu gambar referensi. Gambar telah disalin ke `assets/design/reference-01.png` agar acuan tidak bergantung pada folder sementara. Tulisan, navigasi, harga, dan tombol pada gambar adalah isi website referensi, bukan instruksi untuk menambah fitur PILIHANKU.

**Ketentuan terbaru pengguna:** login memiliki tiga role `superadmin`, `bk`, dan `siswa`. Siswa mendaftar dengan username/password dan menunggu approval superadmin sebelum akun aktif. Akun BK dibuat superadmin. Ketentuan ini menggantikan aktivasi akun lewat kode kelas/kunci pemulihan pada rancangan awal. Mode Tamu tetap lokal dan bukan role keempat.

**Batas generasi: 8 layar utama, 4 kelompok prompt.** Detail, hasil, dan pengaturan menjadi keadaan, tab, atau panel pada layar induk. Desktop/mobile adalah adaptasi layout yang sama. Tidak perlu membuat halaman fondasi komponen atau setiap keadaan sebagai desain terpisah.

Untuk generasi UI:

1. Sertakan gambar referensi dan **Master Prompt di Bagian 10**.
2. Jalankan **empat prompt di Bagian 11**, satu kelompok setiap kali.
3. Tetapkan beranda dan halaman refleksi sebagai acuan visual untuk layar berikutnya.
4. Periksa checklist Bagian 12; lengkapi keadaan panel tanpa menambah halaman utama.

Prompt tidak bergantung pada menu tertentu di Stitch. Jika konteks tidak terbawa, sertakan kembali Master Prompt dan gambar acuan. Dokumen ini tidak mengasumsikan Markdown otomatis diimpor atau semua interaksi otomatis berfungsi.

## 2. Konsep desain: Tumbuh ke Arahmu

PILIHANKU terasa seperti ruang yang tenang untuk mengenali diri dan menjelajahi masa depan. Kata kunci: **hijau mendalam, tipografi tegas, ruang lapang, bentuk membulat, dan langkah yang jelas**.

Metafora pertumbuhan menghubungkan estetika botani referensi dengan proses eksplorasi siswa. Visual daun boleh hadir pada hero dan penutup beranda; isi utama tetap tentang belajar, keterampilan, kerja, usaha, serta dukungan manusia.

### 2.1 Penerjemahan referensi

| Unsur yang terlihat pada referensi | Penerapan PILIHANKU | Penyesuaian untuk produk |
| --- | --- | --- |
| Bingkai terang di atas latar hijau redup | Bingkai halus pada beranda desktop | Dihilangkan pada mobile dan halaman kerja agar ruang efektif |
| Hero foto hijau gelap dengan judul sangat besar | Hero editorial dengan judul putih dan foto/tekstur hijau | Copy bertema masa depan; teks tidak menyatu ke gambar |
| Navigasi pil dan garis tipis | Navigasi publik, filter, dan pilihan kategori | Setiap target interaktif minimal 44 px |
| Kartu transparan pada hero | Satu panel kecil penjelasan empat langkah | Gunakan latar cukup padat; keterbacaan tidak bergantung blur |
| Kartu foto dengan sudut besar | Kartu langkah, jalur, dan skenario | Isi deskriptif berada di permukaan terang untuk informasi penting |
| Judul hitam besar dan blok asimetris | Heading bagian dan grid langkah pada landing | Asimetri tidak dipakai untuk mengunggulkan salah satu jalur |
| Tombol panah dalam lingkaran | Aksen arah dan affordance kartu | Tindakan penting selalu memiliki teks/label yang jelas |
| Accordion garis tipis | FAQ beranda dan detail informasi | Jawaban terbuka menggunakan teks 16 px, bukan teks mini |
| Footer hijau dengan CTA | Penutup beranda dan ajakan mulai | Isi layanan, privasi, dan guru; tidak ada toko atau langganan pemasaran |

### 2.2 Batas adaptasi

- Nuansa foto gelap dan judul besar dipusatkan pada beranda. Halaman tugas memakai permukaan terang yang stabil.
- Empat kategori jalur selalu setara dalam ukuran, urutan akses, kontras, dan kekuatan CTA.
- Komposisi bento boleh digunakan untuk empat **langkah proses**, bukan hierarki nilai kuliah dibanding kerja.
- Hindari elemen belanja: harga produk, keranjang, diskon, rating, wishlist berbentuk hati, dan badge terlaris.
- Tidak ada statistik pengguna, testimoni, logo mitra, atau klaim hasil yang dibuat-buat.
- Tidak menambahkan video autoplay, carousel wajib, chat mengambang, atau pola gamifikasi peringkat.
- UI menggunakan nama fitur PRD: **Kenali Diriku, Peta Jalur, Timbang Pilihan, Rencana Langkahku, Tanya Guru BK, dan Ruang Guru BK**.

## 3. Identitas dan fondasi visual

### 3.1 Nama dan tanda merek

Wordmark utama: `PILIHANKU`, huruf tebal dengan jarak huruf sedikit rapat. Tanda opsional berupa dua garis jalur yang membuka ke dua arah, dengan ujung membulat; cukup sederhana untuk ikon 24 px. Motif tunas boleh menjadi aksen kecil. Jangan memakai logo tanaman toko pada referensi atau lambang sekolah yang belum disediakan.

Tagline: **"Kenali dirimu. Jelajahi pilihanmu."**

Nama sekolah dan avatar guru hanya muncul sebagai data yang dikonfigurasi. Pada mockup gunakan label `Sekolah Contoh` dan `Data contoh`.

### 3.2 Token warna

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| `color.canvas` | `#F5F4EF` | Latar utama hangat |
| `color.surface` | `#FFFFFF` | Kartu, formulir, drawer |
| `color.surface-soft` | `#EAF0E9` | Panel bantu dan keadaan terpilih |
| `color.frame` | `#477B75` | Latar luar beranda desktop, diadaptasi dari referensi |
| `color.hero` | `#092C22` | Hero dan penutup beranda |
| `color.primary` | `#0F5B5B` | Tombol utama, tautan, indikator aktif |
| `color.primary-hover` | `#0B4848` | Hover tombol utama |
| `color.forest` | `#1E6258` | Aksen diagram/ilustrasi |
| `color.ink` | `#172B26` | Teks utama |
| `color.muted` | `#52665E` | Teks pendamping yang tetap terbaca |
| `color.on-dark` | `#FFFFFF` | Teks di atas permukaan gelap |
| `color.accent` | `#E9B949` | CTA awal pada hero atau penanda kecil, teks `ink` |
| `color.border` | `#D7DED7` | Garis pembagi dan kartu noninteraktif |
| `color.control-border` | `#6B827A` | Batas input yang harus terlihat |
| `color.focus` | `#0F5B5B` | Outline fokus, dipisahkan offset terang |
| `color.success-bg` / `success-text` | `#EAF5EC` / `#276749` | Selesai, tersimpan, berhasil |
| `color.warning-bg` / `warning-text` | `#FFF3D6` / `#805500` | Draf, perlu diperiksa, belum terkirim |
| `color.error-bg` / `error-text` | `#FFF0EE` / `#B42318` | Kesalahan dan tindakan hapus |
| `color.info-bg` / `info-text` | `#EDF5FD` / `#235C93` | Informasi proses dan jadwal |

Kontras pasangan warna solid telah dihitung saat penyusunan: `ink/canvas` 13,52:1; `muted/canvas` 5,57:1; putih/primary 7,87:1; putih/hero 15,05:1; ink/accent 8,16:1. Ini pemeriksaan token, bukan bukti keterbacaan teks di atas foto. Teks di atas foto wajib diperiksa ulang pada gambar/crop final.

Gunakan aksen kuning secara terbatas. Jangan memakai teks putih pada kuning. Garis `border` yang pucat bukan satu-satunya indikator input, pilihan aktif, atau fokus.

### 3.3 Warna kategori

Semua kategori memakai teks `ink`, ikon garis, ukuran kartu sama, dan CTA yang sama. Warna hanya membantu mengenali, bukan menentukan mana lebih baik.

| Kategori | Tint latar label |
| --- | --- |
| Kuliah | `#E6EFEB` |
| Vokasi & Kedinasan | `#E9EEDF` |
| Kerja & Pelatihan | `#E5EEF1` |
| Wirausaha | `#F3EAD9` |

Kode RIASEC menggunakan chip netral dengan nama dimensi. Jangan memakai merah sebagai tanda minat rendah atau hijau sebagai vonis cocok.

### 3.4 Tipografi

Gunakan satu keluarga utama **Manrope**, dengan cadangan `Arial, sans-serif`. Gunakan font sistem bila pemuatan font menambah beban halaman. Ini pilihan desain, bukan ketergantungan pada penyedia font tertentu.

| Gaya | Desktop | Mobile | Bobot / line-height |
| --- | --- | --- | --- |
| Display hero | 96 px | 44 px | 800 / 1,02 |
| Display bagian landing | 56 px | 32 px | 800 / 1,08 |
| H1 aplikasi | 36 px | 28 px | 750 atau 700 / 1,2 |
| H2 aplikasi | 28 px | 24 px | 700 / 1,25 |
| Judul kartu | 22 px | 20 px | 700 / 1,3 |
| Pengantar | 20 px | 18 px | 500 / 1,6 |
| Isi/form/opsi jawaban | 16 px | 16 px | 400-600 / 1,6 |
| Navigasi/tombol | 16 px | 16 px | 600-700 / 1,25 |
| Metadata/badge | 14 px | 14 px | 500-600 / 1,45 |

Letter-spacing judul besar sekitar -0,04em; judul aplikasi -0,02em; body normal. Judul tidak dipaksa menjadi satu baris. Panjang paragraf maksimal sekitar 65 karakter per baris. Angka matriks/status memakai angka berlebar tetap jika tersedia. Teks penting seperti penjelasan persetujuan, instruksi, dan isi kartu tetap minimal 16 px.

### 3.5 Spasi, radius, dan elevasi

| Kelompok | Token/nilai |
| --- | --- |
| Spasi | 4, 8, 12, 16, 24, 32, 48, 64, 96 px |
| Jarak bagian landing | 80-96 px desktop; 48-64 px mobile |
| Jarak kelompok form | 24-32 px |
| Padding kartu | 24 px desktop; 20 px mobile |
| Padding pilihan radio | 16 px |
| Radius kontrol | 12 px |
| Radius kartu | 24 px |
| Radius hero/section unggulan | 32 px desktop; 24 px mobile |
| Radius chip/tombol pil | 999 px |
| Border | 1 px; pilihan aktif 2 px tanpa menggeser layout |
| Shadow kartu biasa | Tidak wajib; gunakan garis dan perbedaan permukaan |
| Shadow overlay | `0 16px 48px rgba(9,44,34,0.16)` |

Gunakan maksimal satu lapisan kartu utama pada form. Hindari setiap paragraf dibungkus kartu tambahan. Glass effect terbatas pada panel hero dan memiliki latar fallback gelap yang tetap terbaca.

## 4. Layout responsif dan shell aplikasi

### 4.1 Ukuran acuan

| Ukuran | Perilaku |
| --- | --- |
| 360 px | Lebar minimum verifikasi; satu kolom, isi 328 px dengan padding 16 px |
| 390 px | Frame mobile utama untuk generasi UI |
| 768 px | Tablet; grid dua kolom jika isi memungkinkan |
| 1024 px | Mulai layout desktop; kontrol tidak dipaksa terlalu rapat |
| 1440 px | Frame desktop utama untuk generasi UI |

Grid desktop 12 kolom dengan gap 24 px. Tablet 8 kolom dengan gap 20 px. Mobile 4 kolom dengan gap 16 px. Grid membantu komposisi, bukan mewajibkan setiap komponen menjadi kotak.

### 4.2 Tiga shell

**A. Shell beranda publik**

- Pada 1440 px, bingkai luar maksimal 1328 px, rata tengah, padding 24 px; area isi maksimal 1280 px.
- Latar luar hijau redup, permukaan bingkai `canvas`, radius 36 px, aksen garis putih tipis.
- Header berada di dalam hero: wordmark, Beranda, Peta Jalur, Cara Kerja, Bantuan; akses Ruang Guru BK dan tombol Mulai.
- Pada lebar sempit, logo + tombol Mulai + menu; hindari deretan tujuh pil yang diperkecil.
- Mobile memakai lebar penuh, padding 16 px, tanpa bingkai putih dan gutter hijau yang memakan ruang.
- Header tidak menutupi hero; posisi CTA berada dalam alur dokumen, bukan menggantung di atas teks.

**B. Shell ruang siswa**

- Latar `canvas`, header terang tinggi sekitar 72 px desktop / 64 px mobile.
- Header: wordmark, status mode/perangkat, Pengaturan Data; navigasi siswa di bawah/header sesuai ruang.
- Area kerja maksimal 1120 px; form satu kolom maksimal 720 px.
- Stepper empat langkah ada pada halaman kerja. Semua langkah dapat dibuka; status berbeda dari kontrol akses.
- Mobile memakai bottom navigation: Beranda, Jalur, Rencana, Tanya BK. Kenali Diriku dan Timbang Pilihan tetap tersedia dari stepper dan menu.
- Bottom navigation sekitar 72 px ditambah safe area; sediakan padding isi agar tombol/form tidak tertutup.
- Footer tindakan form berada dalam alur/sticky di atas bottom navigation. Jangan menumpuk bottom navigation, tray perbandingan, dan footer form sekaligus; masing-masing halaman memakai satu toolbar tindakan kontekstual.

**C. Shell pengelola BK/superadmin**

- Desktop: sidebar 240 px, area utama dengan padding 32 px, header kelas/tahun ajaran.
- Menu BK: Ringkasan, Permintaan Konsultasi, Bank Informasi, Kelas, Keluar. Menu superadmin: Pendaftaran Siswa, Akun BK, Kelas, Keluar. Server menentukan role, bukan dropdown login.
- Tidak memakai hero foto atau judul display besar pada area operasional.
- Tablet/mobile: sidebar berubah menjadi menu drawer; tabel menjadi daftar ringkas dengan detail terpisah.
- Konteks kelas dan label Data contoh tetap terlihat pada mockup.

### 4.3 Aturan responsif khusus

- Empat kategori jalur: empat kartu setara desktop, dua di tablet, satu di mobile. Jangan memotong menjadi carousel yang menyembunyikan kategori terakhir.
- Filter ponsel menggunakan tombol `Filter` yang membuka bottom sheet; chip aktif tetap terlihat dan bisa dihapus.
- Matriks mobile menggunakan tab per opsi dengan bobot yang tetap tersinkron, lalu ringkasan skor lintas opsi. Versi tabel desktop tidak diperkecil sampai teks tidak terbaca.
- Modal besar menjadi halaman atau sheet hampir penuh pada mobile. Hindari modal di dalam modal.
- Sisi kanan ringkasan/pratinjau pada desktop berpindah di bawah form pada mobile.
- Tidak ada konten yang hanya muncul saat hover. Tooltip memiliki pemicu fokus/tap dan label yang tetap bermakna tanpa tooltip.

## 5. Komponen bersama

### 5.1 Inventaris komponen

| ID | Komponen | Spesifikasi inti |
| --- | --- | --- |
| C-01 | Wordmark / BrandMark | Versi gelap dan terang; teks tetap terbaca tanpa ikon |
| C-02 | PublicHeader | Navigasi pil ringan, active filled, fokus jelas |
| C-03 | StudentHeader / TeacherSidebar | Shell konsisten; status mode dan konteks kelas |
| C-04 | Button | Primary, secondary outline, ghost, danger; tinggi 48 px, kecil minimum 44 px |
| C-05 | IconButton | 44x44 px; label aksesibel, tooltip jika perlu |
| C-06 | Chip / FilterPill | Selected, unselected, removable; filter interaktif minimum 44 px |
| C-07 | Stepper | Empat judul lengkap, angka/check + teks status, dapat dinavigasi |
| C-08 | ProgressBar | Nilai aktual dengan teks, misalnya 7 dari 24; tanpa persen kecocokan |
| C-09 | TextField / TextArea | Label selalu terlihat, bantuan, penghitung karakter, error inline |
| C-10 | RadioCard / CheckboxCard | Seluruh permukaan bisa dipilih, indikator + label, keadaan aktif 2 px |
| C-11 | Select / DateField | Label jelas, placeholder bukan pilihan sah, tanggal mudah diubah |
| C-12 | RouteCard | Gambar opsional, kategori, judul, ringkasan, minat, sumber/tanggal, bandingkan |
| C-13 | StepCard / ScenarioCard | Angka/tema, ringkasan, status bila ada, CTA eksplisit |
| C-14 | ComparisonTray | 0-3 pilihan, hapus/ganti, CTA aktif setelah minimal dua |
| C-15 | MatrixInput | Bobot 1-3, penilaian 1-4, belum tahu; label kolom/baris |
| C-16 | TaskRow | Checkbox, judul, tenggat, edit/hapus; target sentuh tidak bertabrakan |
| C-17 | StatusBadge | Ikon/bentuk + teks; warna tidak menjadi satu-satunya indikator |
| C-18 | InlineNotice / SaveIndicator | Informasi, sukses, peringatan, error; status simpan menyebut lokasi |
| C-19 | Accordion | Pertanyaan, tombol buka/tutup, fokus, isi tidak terpotong |
| C-20 | Dialog / Drawer / BottomSheet | Judul, penjelasan, aksi, batal, close; fokus kembali ke pemicu |
| C-21 | DataTable / CompactList | Header jelas, keadaan kosong/memuat, tindakan per baris |
| C-22 | BarChart / PrivacyPlaceholder | Label angka, caption; sel tersembunyi tidak memiliki tooltip angka |
| C-23 | EmptyState | Judul konkret, alasan singkat, satu tindakan berikutnya |
| C-24 | ExportPreview | Cakupan dipilih, preview halaman, status menyiapkan/gagal/berhasil |

### 5.2 Tombol, kontrol, dan fokus

- Primary: latar `primary`, teks putih, boleh ikon panah kanan.
- Secondary: permukaan putih/transparent terang, border `control-border`, teks `ink`.
- Hero primary: kuning dengan teks `ink`; tombol lain pada hero memakai putih solid atau outline putih dengan keterbacaan terjamin.
- Danger: merah untuk konfirmasi hapus; jangan memakai merah untuk pilihan karier.
- Hover mengubah warna/garis secara halus. Fokus memakai outline 3 px + offset 3 px. Pada hero gelap gunakan ring putih dengan pemisah gelap.
- Disabled tetap disertai alasan di dekat kontrol; tidak hanya dibuat lebih pudar.
- Loading menggunakan label bermakna seperti `Mengirim...`; cegah klik ganda selama proses tanpa menghilangkan teks.
- Hindari tombol ikon tanpa label untuk Kirim, Hapus Data, Simpan, Unduh, atau Bandingkan.

### 5.3 Kartu jalur

Anatomi urut:

1. Gambar 16:10, opsional, kompresi ringan.
2. Chip kategori.
3. Judul maksimal sekitar dua baris, tetapi boleh bertambah jika dibutuhkan.
4. Deskripsi singkat 1-2 kalimat.
5. Lama tempuh/contoh kegiatan jika sudah tersedia, tanpa menebak biaya.
6. Chip minat, misalnya `S - Sosial` dan `I - Investigatif`.
7. Sumber dan tanggal verifikasi, atau label Data contoh pada mockup.
8. Tautan `Lihat jalur` serta kontrol `Tambahkan ke perbandingan`.

Keadaan terpilih memakai garis primary, checkmark, dan label `Dipilih`. Tidak menggunakan ikon hati, harga, rating bintang, atau badge "paling cocok". Tombol di dalam kartu tidak ditempatkan pada seluruh kartu sebagai target klik bertumpuk.

### 5.4 Status konsultasi

| Status | Tampilan |
| --- | --- |
| Baru | Badge info, ikon kotak masuk |
| Ditinjau | Badge warning, ikon jam |
| Dijadwalkan | Badge info, ikon kalender; jadwal lengkap di detail |
| Selesai | Badge success, ikon check; penjelasan proses permintaan ditutup |
| Dibatalkan | Badge netral, ikon garis silang; bukan kegagalan siswa |

UI `Belum terkirim` adalah kondisi formulir, bukan status server yang seolah sudah diterima. Tombol `Selesai` di ruang guru tidak boleh mengklaim masalah siswa sudah selesai.

## 6. Arah foto, ilustrasi, ikon, dan gerak

### 6.1 Aset visual

- Hero: daun hijau/kanopi taman dengan ruang negatif, atau suasana jalur hijau yang tidak ramai. Lapisan gelap menjamin teks terbaca.
- Kategori jalur: kegiatan belajar, keterampilan terapan, kerja/pelatihan, dan pengembangan ide usaha. Gunakan kualitas, ukuran, dan perlakuan warna yang setara.
- Pada detail/form, visual cukup berupa ikon garis atau blok warna. Tidak perlu foto di setiap isian.
- Tidak memakai wajah siswa nyata tanpa izin, logo lembaga tanpa aset sah, atau foto yang memberi kesan mitra resmi.
- Hasil generasi UI boleh memakai placeholder foto yang diberi nama aset; sumber/lisensi final diselesaikan saat implementasi.
- Gambar referensi dipakai sebagai moodboard, bukan dijadikan satu gambar panjang sebagai seluruh UI.

Usulan daftar aset:

| Nama aset | Isi | Target anggaran awal |
| --- | --- | --- |
| `hero-growth` | Foto hijau mendalam/kanopi | Maksimal sekitar 140 KB |
| `path-kuliah` | Aktivitas belajar | Sekitar 30-45 KB |
| `path-vokasi` | Keterampilan terapan | Sekitar 30-45 KB |
| `path-kerja` | Aktivitas kerja/pelatihan | Sekitar 30-45 KB |
| `path-usaha` | Pengembangan ide/usaha | Sekitar 30-45 KB |
| `brand-path` | Ikon dua jalur sederhana | Vektor ringan |

Anggaran ini arahan produksi, bukan aset yang sudah dibuat. Hero menggunakan varian ukuran sesuai perangkat; foto di bawah fold dimuat bertahap. Total pemuatan awal halaman siswa harus tetap memenuhi target PRD <1 MB. Jangan menyisipkan gambar base64 besar pada hasil implementasi.

### 6.2 Ikon dan gerak

Ikon garis konsisten, ukuran 20/24 px, stroke sekitar 1,75-2 px, ujung membulat. Contoh fungsi: arah/jalur, buku, alat, tas kerja, ide, kalender, perisai, unduh, panah. Tidak menggunakan emoji sebagai sistem ikon utama.

Transisi 150-200 ms untuk hover, buka sheet, dan perubahan pilihan; tidak ada animasi yang menggeser jawaban saat dibaca. Hormati preferensi reduced motion. Tidak ada confetti, skor prestasi, atau animasi untuk mendorong siswa memilih jalur tertentu.

## 7. Struktur ringkas: 8 layar utama

Enam layar untuk siswa/publik dan dua layout pengelola dengan isi sesuai role. Nama fitur dan aturan PRD tetap dipertahankan; beberapa fungsi memakai satu layout dengan tab/panel. Rute pada PRD adalah alamat fungsional dan dapat membuka keadaan yang sesuai pada layar induk, bukan kewajiban membuat layout baru untuk setiap URL.

| ID | Layar utama | Isi yang digabung | PRD |
| --- | --- | --- | --- |
| L01 | Beranda | Pengantar, empat langkah, empat jalur, FAQ, progres saat kembali | FR-01 |
| L02 | Mulai | Tab Tamu, Masuk, Daftar Siswa; status pending/ditolak, perangkat/persetujuan, reset akses | FR-01, FR-10, FR-12 |
| L03 | Kenali Diriku | Refleksi 24 butir, nilai/kondisi opsional, ringkasan hasil | FR-02 |
| L04 | Peta Jalur | Katalog, filter, detail jalur, lima simulasi, pilihan perbandingan | FR-03, FR-04 |
| L05 | Timbang Pilihan | Matriks 2-3 opsi, pilihan sementara, musyawarah keluarga | FR-05 |
| L06 | Rencana Langkahku | Tugas, utama/cadangan, ekspor, Tanya Guru BK, status permintaan | FR-06, FR-07 |
| L07 | Dashboard Pengelola | Superadmin: antrean/detail approval siswa; BK: ringkasan kelas, kotak masuk, detail/jadwal | FR-08, FR-09, FR-12 |
| L08 | Kelola Informasi | Superadmin: akun BK/kelas; BK: bank informasi/kelas berwenang | FR-09, Bagian 6 dan 15 |

### 7.1 Fungsi pendukung tanpa layar utama tambahan

| Fungsi | Penempatan |
| --- | --- |
| Privasi dan penggunaan data | Panel dari footer/header dan L02 |
| Penyimpanan, izin agregat, keluar, hapus data | Panel Pengaturan Data dari header siswa |
| Detail kartu jalur | Panel detail di L04; mobile mengisi area konten dengan tombol kembali |
| Daftar/pemain/akhir simulasi | Tab Simulasi di L04 dengan keadaan konten yang berganti |
| Ringkasan kecenderungan | Tab Ringkasan di L03 |
| Lembar musyawarah | Tab Musyawarah di L05 |
| Pilihan cakupan/pratinjau ekspor | Panel dari L06 |
| Form, tinjau kirim, hasil kirim, status konsultasi | Panel Tanya Guru BK dari L06, dengan tab Ajukan dan Permintaanku |
| Login tiga role | Tab Masuk L02; L07/L08 tanpa sesi diarahkan ke sini |
| Approval siswa | Antrean/detail/Setujui/Tolak L07 khusus superadmin, tanpa layout tambahan |
| Editor kartu | Panel/area edit pada tab Bank Informasi L08 |
| Lembar kerja cetak | Hasil cetak/unduhan dari L06 dan tautan footer; bukan halaman aplikasi baru |
| Error, luring, kosong, gagal simpan | Keadaan komponen pada layar terkait |

Pada mobile, panel yang panjang boleh memenuhi viewport dengan tombol kembali. Ini tetap keadaan pada layar induk, tidak menambah navigasi utama. Panel aktif menggantikan area konten yang sedang digunakan; **jangan menumpuk panel di dalam panel**. Tindakan tinjau mengganti isi panel, bukan membuka modal kedua.

Akses `Tanya BK` tetap tersedia dari seluruh halaman siswa dan dapat membuka panel konsultasi pada L06 tanpa memaksa menyelesaikan rencana terlebih dahulu. Begitu pula navigasi empat langkah tidak dikunci oleh progres.

### 7.2 Aturan mengurangi lapisan visual

- Satu halaman memiliki satu area kerja utama dan paling banyak satu panel pendamping.
- Hindari kartu di dalam kartu di dalam kartu. Kelompok input cukup menggunakan judul, spasi, dan garis pembagi.
- Satu panel/dialog aktif setiap saat; tutup atau ganti isinya sebelum membuka fungsi berikutnya.
- Kartu dipakai untuk opsi, jalur, atau unit yang bisa dipilih. Paragraf bantuan tidak perlu menjadi kartu tersendiri.
- Landing boleh lebih editorial; seluruh form memakai pola terang yang sama.
- Empat kategori tetap setara. Pengurangan layar tidak boleh menghilangkan kategori, akses privasi, atau penjelasan penting.

## 8. Spesifikasi 8 layar

### L01 - Beranda

**Tujuan:** memahami PILIHANKU dan memilih mulai atau jelajahi jalur.

Urutan isi:

1. Header logo, Beranda, Peta Jalur, Cara Kerja, Bantuan, akses guru, dan CTA Mulai.
2. Hero hijau gelap dengan judul putih: **Kenali diri. Jelajahi pilihan. Rancang masa depan.** Pengantar: `Mulai dari minat dan hal yang penting bagimu. Jelajahi kuliah, vokasi, kerja, atau wirausaha, lalu susun langkahmu sendiri.`
3. CTA `Mulai eksplorasi` ke L02 dan `Jelajahi jalur` ke L04. Panel kecil `4 langkah, sesuai ritmemu`, tanpa statistik pengguna rekaan.
4. Empat langkah bernomor; empat kartu kategori setara; teaser simulasi; FAQ garis tipis; footer hijau dengan ajakan mulai.
5. FAQ menjelaskan: bukan tes psikologi, tamu tanpa akun, akses data terbatas, pilihan bisa diubah.

Saat ada data tersimpan, gunakan beranda yang sama dengan hero dipadatkan dan panel `Lanjutkan perjalananmu`. Panel berisi empat status langkah dan CTA sesuai progres. Teks simpan menyebut perangkat atau akun kelas yang benar. Tidak membuat dashboard siswa terpisah.

### L02 - Mulai

**Tujuan:** memilih tamu, login akun, atau mengajukan pendaftaran siswa.

Tiga tab pada satu layout: **Tamu**, **Masuk**, **Daftar Siswa**.

- Tamu tidak meminta nama/email/telepon. Pilihan perangkat pribadi/bersama dan penjelasan penyimpanan tetap berlaku. Tamu tersimpan kedaluwarsa 30 hari sejak penyimpanan pertama.
- Masuk menggunakan username/password untuk tiga role; tidak ada dropdown pemberi role. Server mengarahkan siswa approved ke perjalanan siswa, BK/superadmin ke L07 sesuai role.
- Daftar Siswa berisi username, nama tampilan, password/konfirmasi, kelas tujuan, persetujuan relevan. Tidak ada pilihan role; hasil selalu siswa pending.
- Setelah daftar: **Menunggu persetujuan superadmin**, penjelasan belum bisa login sebagai siswa, kembali masuk atau eksplorasi tamu.
- Setelah verifikasi kredensial, status ditolak menampilkan alasan singkat kepada pemiliknya; suspended menjelaskan akses dinonaktifkan. Jangan tampilkan sukses login sebelum approved.
- Reset akses memakai prosedur verifikasi sekolah oleh superadmin. Tidak ada pencarian profil privat lewat nama panggilan atau aktivasi dengan kunci pemulihan lama.
- Kode kelas hanya konteks, bukan password/approval. Setelah approved, pemindahan draf tamu memerlukan tinjauan dan persetujuan eksplisit.
- Privasi, masa simpan kelas, izin agregat dan berbagi tetap terpisah, tidak ada checkbox berbagi yang sudah dicentang.

Form maksimal 720 px dan bahasa sederhana. Tidak ada pendaftaran publik BK/superadmin. Approval superadmin tidak menggantikan persetujuan siswa/wali yang diperlukan sekolah.

### L03 - Kenali Diriku

**Tujuan:** mengisi refleksi dan memahami kecenderungan tanpa merasa sedang dihakimi.

Satu halaman dengan tiga bagian/tab: **Minat**, **Nilai & Kondisi**, **Ringkasan**. Gunakan stepper empat langkah global di atas; tab bagian berada di dalam halaman.

- Minat: satu dari 24 pernyataan, progres `7 dari 24`, empat radio card: Sangat tidak suka, Kurang suka, Suka, Sangat suka. Tersedia Kembali/Berikutnya, tanpa timer atau auto-advance.
- Contoh butir pada mockup ditandai sebagai materi contoh yang memerlukan review ahli, bukan instrumen baku.
- Nilai: pilih 3-5 dari daftar nilai. Kekuatan, mapel, dukungan, dan hambatan opsional; beri label dan akses lewati. Tidak meminta data keluarga terperinci atau dokumen.
- Ringkasan: enam batang horizontal dalam urutan R,I,A,S,E,C, skor mentah 4-16. Contoh R=8, I=14, A=10, S=15, E=9, C=8. Penjelasan: `Sosial dan Investigatif tampak menonjol dari jawabanmu saat ini.`
- Penjelasan hasil: `Bahan refleksi, bukan tes psikologi atau keputusan akhir.` Tidak ada persentase cocok atau rekomendasi profesi.
- Bila ada skor seri, sebutkan dimensi yang seri; bila semua sama, jelaskan netral. Jawaban belum lengkap menahan ringkasan final.
- CTA ringkasan `Jelajahi semua jalur`; filter minat di L04 tetap dipilih sendiri, tidak otomatis aktif.

Indikator simpan berada dekat tindakan. Isi utama terang tanpa foto di belakang radio/form. Ringkasan mengganti konten halaman yang sama, bukan modal atau halaman baru.

### L04 - Peta Jalur

**Tujuan:** mengenal alternatif, mencoba simulasi, dan memilih 2-3 opsi untuk dibandingkan.

Dua tab utama: **Jelajahi Jalur** dan **Simulasi**.

**Tab Jelajahi Jalur:**

- Empat kategori setara: Kuliah, Vokasi & Kedinasan, Kerja & Pelatihan, Wirausaha.
- Cari dengan label jelas, filter kategori dan enam minat, reset, jumlah hasil aktual.
- Grid tiga kartu desktop, dua tablet, satu mobile. Kartu berisi kategori, judul, gambaran, minat, sumber/tanggal, `Lihat jalur`, dan `Tambahkan ke perbandingan`.
- Detail terbuka pada panel di dalam layar: gambaran, syarat umum, mapel, waktu/biaya, contoh kegiatan, minat, pertanyaan refleksi, sumber/verifikasi. Satu panel aktif; tombol kembali ke daftar terlihat.
- Biaya belum terverifikasi: `Belum tersedia - periksa sumber resmi`. Tidak ada biaya/jadwal/tautan resmi palsu pada contoh.
- Tray `2 dari 3 opsi dipilih` dengan hapus/ganti dan CTA ke L05. Batas tiga dijelaskan tanpa mengganti pilihan diam-diam.
- Empty search menawarkan hapus filter, bukan menyimpulkan siswa tidak cocok.

**Tab Simulasi:**

- Lima tema: tidak lolos jalur prestasi, biaya terbatas, kerja sambil kuliah, perbedaan dengan orang tua, dan merintis usaha.
- Memilih tema mengganti isi tab menjadi pemain cerita, satu pertanyaan dengan minimal dua pilihan dan kontrol kembali/lanjut/keluar.
- Akhir skenario memuat konsekuensi, alternatif, dan refleksi. Tidak ada benar/salah, peluang lolos numerik, atau perubahan rencana otomatis.
- Gunakan penanda tahap yang faktual; jangan membuat persen selesai jika panjang cabang berbeda.

Foto hanya pada kartu/heading yang membantu. Tidak ada hati, keranjang, ranking jalur, atau badge paling cocok.

### L05 - Timbang Pilihan

**Tujuan:** menimbang pilihan berdasarkan nilai siswa dan menyiapkan diskusi keluarga.

Dua tab: **Perbandingan** dan **Musyawarah**.

**Perbandingan:** 2-3 opsi, 3-5 kriteria, bobot 1-3, penilaian 1-4. `Belum tahu` berarti belum terisi, bukan nol. Tahan seluruh total final bila masih ada sel wajib kosong.

Contoh tiga kriteria memakai bobot 3,3,2: opsi A bernilai 4,2,4 menghasilkan 26; opsi B bernilai 3,4,3 menghasilkan 27. Total ditampilkan sesuai urutan opsi, tanpa warna pemenang, trophy, atau pemilihan otomatis.

Desktop memakai tabel terbaca. Mobile memakai tab opsi dengan bobot kriteria bersama dan ringkasan lintas opsi. Pilihan sementara ditentukan siswa sendiri atau `Aku masih menjelajah`.

**Musyawarah:** alasan pilihan, kesepakatan, perbedaan pandangan, informasi yang perlu dicari, dukungan, dan langkah diskusi berikutnya. Refleksi sesuai keyakinan/istikharah opsional, tidak memengaruhi skor. Tidak meminta tanda tangan, nama lengkap orang tua, atau unggahan bukti. Catatan: `Lembar ini tidak otomatis dibagikan kepada siapa pun.`

CTA `Simpan pertimbangan` dan `Lanjut ke Rencana Langkahku`. Kedua tab dapat diubah kapan saja.

### L06 - Rencana Langkahku

**Tujuan:** menyusun langkah, menyimpan ringkasan, dan mengajukan konsultasi bila diperlukan.

Area utama berisi pilihan utama/cadangan atau status masih menjelajah, daftar tugas dengan tenggat/checkbox/edit/hapus, serta dukungan/hambatan opsional. Contoh tiga tugas dengan satu dicentang. Tidak ada persen kesiapan karier; hanya `1 dari 3 langkah dicentang` jika diperlukan.

Tombol utama: `Unduh ringkasan`; sekunder: `Tanya Guru BK`. Tugas yang melewati tenggat dapat direvisi dan tidak diberi label kegagalan siswa. Draf kurang dari tiga tugas tetap dapat diunduh dengan penanda belum lengkap.

**Panel ekspor:** pilihan cakupan, pratinjau, unduh/cetak, dan status menyiapkan/gagal. Bagian pribadi opsional tidak dipilih diam-diam. Tidak menyertakan password, rahasia reset, atau token. Lembar kosong dapat dicetak dari akses yang sama tanpa membuka halaman utama baru.

**Panel Tanya Guru BK:** dua tab `Ajukan` dan `Permintaanku`.

- Ajukan: tujuan, nama panggilan, topik, preferensi waktu, pesan, empat checkbox berbagi kosong awal: refleksi, matriks, rencana, musyawarah.
- Tamu harus menentukan tujuan sekolah/guru dan memberi persetujuan; belum punya tujuan dapat mencetak ringkasan untuk dibawa langsung. Data eksplorasi penuh tidak ikut dikirim otomatis.
- `Tinjau permintaan` mengganti isi panel dengan penerima, pesan, cakupan berbagi, dan persetujuan. Aksi final `Kirim permintaan`.
- Sukses hanya setelah konfirmasi penyimpanan; gagal/luring tetap `Belum terkirim`. Preferensi waktu bukan jadwal yang sudah disetujui.
- Permintaanku: daftar/detail milik pengirim, status Baru/Ditinjau/Dijadwalkan/Selesai/Dibatalkan, jadwal faktual, batal aktif, dan tarik bagian berbagi.
- Tamu menyimpan token pemantauan sendiri. Token tidak berada di URL/PDF. Penarikan berbagi menjelaskan batas terhadap salinan yang sudah diunduh penerima.
- Banner terbaca: layanan adalah permintaan konsultasi, bukan chat atau layanan darurat.

Panel konsultasi juga bisa dibuka dari navigasi global tanpa membuat rencana dahulu. Hanya satu panel aktif; tindakan review/status mengganti isi panel.

### L07 - Dashboard Pengelola

**Tujuan:** memahami kebutuhan kelas dan menindaklanjuti permintaan yang sengaja dikirim.

Login bersama berada di L02; tanpa sesi yang sah, arahkan ke L02. Setelah login, isi L07 mengikuti role server.

**Superadmin - Pendaftaran Siswa:** jumlah pending, filter status, daftar username/nama tampilan, kelas tujuan, waktu pendaftaran, dan status. Detail pada satu panel dengan tombol **Setujui** dan **Tolak**, alasan penolakan singkat, serta keadaan memproses/gagal/konflik yang jujur. Tidak ada isi refleksi siswa. Ini fitur utama superadmin.

**BK:** dua tab **Ringkasan Kelas** dan **Permintaan** sesuai rincian berikut. BK tidak melihat kontrol approval dan juga ditolak pada API admin. Akses L08 sesuai izin.

**Ringkasan:** pemilih kelas/tahun ajaran berwenang, agregat tanpa nama, chart batang kategori. Contoh aman berlabel Data contoh: 32 peserta kontribusi, 26 mulai, 15 memiliki rencana. Eksplorasi kategori dapat 18,10,12,7; satu siswa bisa menjelajahi lebih dari satu kategori sehingga bukan pie 100%.

Kelompok di bawah lima disembunyikan beserta sel/total lain yang bisa mengungkapnya melalui pengurangan. Gunakan `Data belum cukup`, tanpa angka, panjang bar, tooltip, atau label aksesibel berisi data tersembunyi. Kelas kurang dari lima kontributor tidak menampilkan agregat perilaku. Tidak ada klik chart menuju jawaban individu, ranking, atau daftar siswa berisiko.

**Permintaan:** tabel/daftar nama panggilan, topik, tanggal, preferensi, dan status. Detail dalam panel yang sama menampilkan pesan dan hanya bagian yang dibagikan. Bagian lain bertuliskan `Tidak dibagikan`, bukan akses profil penuh.

Tindakan tinjau, jadwalkan, selesai, batal mengikuti transisi PRD. Penjadwalan mengganti panel dengan form tanggal/jam/zona sekolah/tempat, bukan modal kedua. Tidak ada chat atau catatan konseling terperinci. Mobile memakai daftar kemudian detail memenuhi area konten.

### L08 - Kelola Informasi

**Tujuan:** memperbarui bank jalur dan konfigurasi kelas sesuai izin.

**Superadmin:** tab **Akun BK** dan **Kelas** untuk membuat/menonaktifkan/reset akun BK serta penugasan kelas. **BK:** tab **Bank Informasi** dan **Kelas** sesuai penugasan, seperti rincian berikut.

- Bank Informasi: daftar judul, kategori, status editorial, tanggal verifikasi, tambah/edit/arsip. Editor mengganti area konten atau panel, tidak membuat layar utama baru.
- Editor memuat identitas, gambaran, syarat/mapel, waktu/biaya, kegiatan, minat, pertanyaan refleksi, sumber/verifikasi. `Simpan draf` terpisah dari `Terbitkan`. Penerbitan memerlukan sumber dan tanggal verifikasi; tanggal edit bukan tanggal verifikasi.
- Arsip perlu konfirmasi dan menjelaskan informasi lama pada salinan siswa tidak hilang diam-diam.
- Kelas: daftar kelas berwenang, XI/XII, tahun ajaran, kode bergabung, status kode, akhir retensi, guru penanggung jawab. Salin/rotasi/nonaktifkan kode hanya sesuai izin.
- Tidak menampilkan password/rahasia reset siswa, data privat seluruh peserta, atau tombol mengangkat diri menjadi admin.
- Tanggal akhir retensi mempunyai arti penghapusan sesuai PRD, bukan sekadar label arsip.

## 9. Keadaan pendukung dan batas implementasi

| Keadaan | Cara ditampilkan pada layar induk |
| --- | --- |
| Memuat | Skeleton stabil tanpa hasil/angka palsu |
| Simpan berhasil | Teks lokasi simpan: perangkat atau akun kelas |
| Simpan/kirim gagal | Pesan menetap, isi dipertahankan, coba lagi |
| Luring | Jelaskan fitur lokal tersedia dan kirim belum tersedia |
| Belum lengkap | Jumlah/kolom yang perlu dilengkapi; total/hasil final ditahan |
| Data tidak ada | Empty state dengan satu tindakan yang relevan |
| Izin ditolak/sesi habis | Kembali ke ruang sendiri atau masuk ulang; tidak bocorkan isi |
| Konflik simpan | Tinjau versi atau muat yang terbaru, tanpa overwrite diam-diam |
| Agregat privat | Placeholder tanpa angka/grafik/tooltip yang mengungkap |
| Konten lama | Peringatan + sumber/opsi aktif |
| Hapus data | Konfirmasi cakupan, proses, hasil aktual; tanpa izin guru |

Panel Pengaturan Data menjelaskan mode, lokasi, izin kontribusi kelas, kedaluwarsa, keluar, dan hapus. Panel Privasi menjelaskan data, tujuan, penerima, masa simpan, hak hapus, serta kontak sekolah. Akses tersedia dari header/footer, bukan disembunyikan di akhir alur.

Lembar cetak memakai A4, putih, teks gelap, margin sekitar 16 mm, empat langkah dan musyawarah opsional. Tidak menyertakan navigasi, foto hero, rahasia, atau blok tinta tebal. Ini format hasil, bukan satu layar utama tambahan.

Gunakan teks isi/form minimal 16 px, target sentuh 44 px, focus ring, label, error yang terbaca, dan indikator selain warna. Hanya satu toolbar tetap pada satu konteks; bottom navigation tidak menutupi tray atau akhir form.

Desain dengan banyak tab tidak berarti semua isi muncul bersamaan. Perlihatkan satu keadaan utama saat generasi awal, kemudian rincikan keadaan yang dibutuhkan pada layout yang sama. Backend, autentikasi, perhitungan, retensi, dan penghapusan tetap harus dibangun serta diuji sesuai PRD; gambar UI bukan bukti fungsi tersebut bekerja.

## 10. Master Prompt untuk Stitch

Gunakan prompt ini bersama referensi gambar, lalu pilih satu kelompok pada Bagian 11. Bahasa instruksi Inggris; teks UI tetap Bahasa Indonesia. Tidak perlu menghasilkan board design system atau setiap error sebagai halaman terpisah.

```text
Design PILIHANKU, a responsive Indonesian career exploration website for grade XI-XII students and school counselors. All visible UI copy is natural Bahasa Indonesia. Create only EIGHT primary screen layouts: L01 Beranda, L02 Mulai, L03 Kenali Diriku, L04 Peta Jalur, L05 Timbang Pilihan, L06 Rencana Langkahku, L07 Dashboard Pengelola, L08 Kelola Informasi. Generate only the pair requested in the next prompt. Supporting functions are inline states, tabs, or ONE active panel within these screens, never new top-level pages or nested modals.

Use the supplied botanical website image for visual direction: forest-green photographic landing hero, oversized bold editorial typography, warm off-white background, thin outline pill navigation, rounded cards, generous space, and restrained arrow accents. Adapt the growth metaphor to personal exploration. Do not copy the shop, prices, hearts, cart, newsletter, or social links. Keep task pages bright and quiet, with no large photo hero behind forms. Avoid nested cards and excessive visual layers.

Tokens: canvas #F5F4EF, white surfaces, soft surface #EAF0E9, muted teal landing frame #477B75, hero #092C22, primary #0F5B5B, text #172B26, secondary text #52665E, accent #E9B949 with dark text, border #D7DED7, input border #6B827A. Manrope with sans-serif fallback. Hero 96px desktop/44px mobile, application H1 36px/28px, body/form 16px minimum. Card radius 24px, hero 32px desktop/24px mobile, pill controls, 48px buttons, minimum 44px touch targets. Restrained shadows; one main work area plus at most one supporting panel.

Design desktop at 1440px and mobile at 390px with usability at 360px. Landing content max 1280px, task content max 1120px, focused forms max 720px. Remove decorative outer gutters on mobile. Student bottom navigation: Beranda, Jalur, Rencana, Tanya BK; keep the four exact steps accessible: Kenali Diriku, Peta Jalur, Timbang Pilihan, Rencana Langkahku. Steps can be revisited freely. Teacher desktop sidebar can be 240px, mobile uses a menu drawer. Do not overlap fixed action trays and navigation. Mobile panels may fill the content area with a clear back action while remaining within their parent screen.

Product rules: login has exactly three roles superadmin, bk, siswa. One username/password form in L02; role comes from the server. Public student registration always creates pending siswa; only superadmin approves/rejects before active login. Superadmin creates BK accounts. Class code is context, not login. L02 tabs: Tamu, Masuk, Daftar Siswa with pending/rejected/reset states inline. L07 superadmin primarily shows Pendaftaran Siswa with review, Setujui/Tolak; BK shows class summary and requests. L08 superadmin manages BK accounts/classes; BK manages content/assigned classes. No extra primary layouts or default admin access to private reflections. Guest exploration has no name/email/phone, is not a fourth role, uses personal/shared-device choice, and saved guest data expires 30 days after first save; class data follows school-year end. Sharing choices start unchecked and are separate from aggregate consent. No automatic uploads.

RIASEC uses 24 reflection items, six raw dimension scores 4-16, no diagnosis, career-fit percentage, or automatic recommendations. Four route categories have equal prominence: Kuliah, Vokasi & Kedinasan, Kerja & Pelatihan, Wirausaha. Interest filters are optional, not preselected. Comparison uses 2-3 options, 3-5 criteria, weights 1-3, ratings 1-4; unknown is missing, not zero. Withhold final totals when incomplete, never select a winner automatically. The student may stay undecided.

Consultation is a request for human follow-up, not chat or emergency counseling. Destination, nickname, topic, preferred time, message, optional shared sections, review, and consent are required as appropriate. Preferred time is not an appointment. Separate unsent, sending, failed, and confirmed success. Statuses: Baru, Ditinjau, Dijadwalkan, Selesai, Dibatalkan. Teachers see only authorized classes and explicitly shared request sections. Suppress aggregate groups below five and any complementary numbers that could expose them; no hidden numeric tooltip, bar, or accessible label. No rankings, risk labels, or individual-answer drill-down.

Use clearly labeled Data contoh, not invented verified sources, current fees, admissions facts, testimonials, partner logos, or outcome statistics. Include relevant empty/error/offline/permission states within existing layouts. Export and privacy/settings are panels, printing is an output. No additional primary screens, component-board pages, AI chat, parent portal, or commerce. Interface states are design examples, not proof of implemented backend functionality.
```

## 11. Empat prompt generasi

Master Prompt tetap menjadi konteks bersama. Setiap kelompok menghasilkan dua layout utama; varian mobile adalah adaptasinya. Tinjau satu kelompok sebelum melanjutkan agar gaya tidak berubah.

### P1 - Beranda dan Mulai (L01-L02)

```text
Create only L01 Beranda and L02 Mulai, following the PILIHANKU master brief and supplied reference. Provide 1440px desktop and 390px mobile adaptations using the same components.

L01: forest-green botanical hero, headline Kenali diri. Jelajahi pilihan. Rancang masa depan., explanatory Indonesian copy, Mulai eksplorasi and Jelajahi jalur. Add four numbered exploration steps, four equally prominent route categories, simulation teaser, outlined FAQ, and a dark closing CTA. A returning-user progress block is an inline variant of this same page, not a new dashboard. No fake statistics or shop features.

L02: one light layout with Tamu, Masuk, Daftar Siswa tabs. Guest has no personal fields and explains personal/shared-device storage. Login uses username/password for all three roles, determined by server. Register asks username, display name, password/confirmation, class and consent, always creates pending siswa. Show Menunggu persetujuan superadmin, rejected/suspended/reset states inline. No public BK/admin signup, self-selected privilege, one-time recovery-key activation, or successful login before approval. Class code is context only. Keep sharing unchecked, no automatic data upload, no extra login/status/privacy pages, one panel maximum.
```

### P2 - Kenali Diriku dan Peta Jalur (L03-L04)

```text
Create only L03 Kenali Diriku and L04 Peta Jalur in desktop/mobile adaptations, matching the approved L01/L02 visual language. Both are quiet light task layouts, not photo-heavy landing pages.

L03 has tabs Minat, Nilai & Kondisi, Ringkasan. Default view: 7 dari 24 pernyataan, one illustrative question, four large labeled radio cards, Kembali/Berikutnya, save status. No timer or auto-advance. Optional context can be skipped. Summary replaces the same content area: fixed R,I,A,S,E,C bars with raw example scores 8,14,10,15,9,8, no percentages, diagnosis, or career suggestions. Include neutral tie/incomplete wording. No separate results screen.

L04 has tabs Jelajahi Jalur and Simulasi. Show equal category access, search/optional interest filters, readable route cards marked Data contoh, and a comparison tray for 2-3 options. Detail opens in one panel, not a new page. Simulation list/player/ending are states within its tab for the five proposal themes. Do not add winner badges, fake official facts, shopping controls, or hidden mobile categories. Make supporting states compact and keep only one active panel.
```

### P3 - Timbang Pilihan dan Rencana (L05-L06)

```text
Create only L05 Timbang Pilihan and L06 Rencana Langkahku in desktop/mobile adaptations. Follow the same PILIHANKU light shell, tokens, readable forms, and no nested panels.

L05 tabs: Perbandingan and Musyawarah. Compare two options with three criteria, weights 3,3,2; option A ratings 4,2,4 total 26; B ratings 3,4,3 total 27. Show totals without ranking or automatic main selection. Unknown is missing, final totals withheld until complete. Mobile uses option tabs/shared weights and cross-option summary, not a tiny table. Musyawarah replaces content with family discussion fields, optional respectful reflection, save/print, and no signatures or automatic sharing.

L06: student-selected main/backup or exploring state, three tasks/deadlines with one checked, add/edit/delete, optional support/barriers, Unduh ringkasan and Tanya Guru BK. Export is one scope/preview panel. Consultation is one panel with Ajukan and Permintaanku tabs: destination, nickname, topic, preference, message, unchecked sharing, then review and actual-confirmation states replacing the same panel. Request status and scheduling details stay in this panel. No separate export, chat, review, success, or request-status pages. Global Tanya BK opens this panel even without an existing plan. Privacy/settings/delete are global panels, print is output, not new screens.
```

### P4 - Ruang Guru dan Pengelolaan (L07-L08)

```text
Create only L07 Ruang Guru BK and L08 Kelola Informasi in desktop/mobile adaptations with a consistent counselor shell. Desktop sidebar and class/year context; mobile menu drawer. No large photographic hero.

Shared login is in L02, role determined by the server. L07 superadmin primarily shows Pendaftaran Siswa: pending count/list, metadata, target class/date/status, one review panel with Setujui and Tolak plus a short rejection reason and honest loading/conflict/error states. Only superadmin can decide, never BK. Do not reveal private reflections during approval. L07 BK has tabs Ringkasan Kelas and Permintaan. Show Data contoh: 32 contributing participants, 26 started, 15 plans; category explorations 18,10,12,7 with a note that categories overlap, not a 100% pie. Suppress groups below five and revealing complementary totals; show Data belum cukup without a numeric tooltip or implied bar. No student ranking, risk diagnosis, or chart-to-private-answer drill-down. Inbox/detail/scheduling are states of the same tab/panel. Only explicitly shared sections are visible; show Tidak dibagikan otherwise. No full-profile or chat interface.

L08 superadmin tabs: Akun BK and Kelas, with account creation/status/reset and class assignments. L08 BK tabs: Bank Informasi and Kelas according to scope. Bank list/editor/preview/archive confirmation stay within this layout. Official sources and verification date are required for publishing; distinguish draft from published and edit date from verification. Classes show authorized class context, join-code controls according to permission, school-year end and retention information. Never expose passwords/reset secrets or add admin self-promotion. Do not create separate admin-approval, teacher-login, editor, scheduler, or class-detail pages. Use one active panel and avoid nested cards.
```

Jika satu kelompok terlalu padat, jalankan prompt yang sama untuk satu ID terlebih dahulu lalu ID berikutnya, tanpa menambah jumlah layar utama. Tidak wajib meminta seluruh keadaan digenerasikan pada putaran pertama; keadaan penting tetap dicatat dalam spesifikasi untuk dilengkapi saat pengembangan.

## 12. Checklist hasil dan handoff

- [ ] Hanya delapan layout utama L01-L08; hasil refleksi, detail, konsultasi, ekspor, dan pengaturan berada dalam layar induknya.
- [ ] Hanya empat kelompok prompt; tidak ada permintaan board komponen sebagai halaman tambahan.
- [ ] Bentuk desktop/mobile menggunakan komponen dan identitas visual sama.
- [ ] Maksimal satu panel aktif, tanpa nested modal atau susunan kartu berlapis-lapis.
- [ ] Nuansa referensi terasa pada hero, tipografi, pil, kartu, dan ruang lapang; tidak ada isi toko tanaman.
- [ ] Empat kategori jalur setara; semua langkah tetap bisa dibuka.
- [ ] Tamu tanpa nama/email/telepon; persetujuan dan berbagi tidak dicentang otomatis.
- [ ] Login memiliki superadmin, bk, siswa; daftar publik selalu siswa pending dan hanya superadmin menyetujui sebelum akun aktif.
- [ ] L07/L08 menyesuaikan role tanpa layout tambahan; approval tidak membuka refleksi dan BK tidak mempunyai kontrol persetujuan.
- [ ] Tidak ada diagnosis, persentase kecocokan, ranking, atau penentuan jurusan otomatis.
- [ ] Matriks dan contoh total benar; keadaan belum lengkap tidak diberi angka nol.
- [ ] Konsultasi memiliki review, tujuan, izin berbagi, status jujur, dan akses tanpa wajib menyelesaikan rencana.
- [ ] Guru hanya melihat kelas berwenang dan bagian yang dibagikan; agregat kecil tidak dapat ditebak melalui tampilan lain.
- [ ] Akses privasi, hapus data, lembar cetak, dan pemulihan tetap tersedia meskipun bukan layar utama.
- [ ] Kontrol minimal 44 px, teks isi 16 px, fokus/label/error terbaca, dan toolbar mobile tidak bertumpuk.
- [ ] Data contoh ditandai; materi/sumber/biaya belum terverifikasi tidak diklaim sebagai fakta final.
- [ ] Handoff menyertakan token, aset/hak penggunaan, perilaku tab/panel, keadaan gagal, dan pemetaan ke aturan PRD.

Penamaan desain: `L04-PetaJalur-Desktop` dan `L04-PetaJalur-Mobile`; keadaan detail/simulasi dicatat sebagai varian pada layout yang sama. PRD tetap menjadi acuan perilaku dan pengujian; pengelompokan layar ini menyederhanakan desain tanpa menghilangkan kebutuhan produk.
