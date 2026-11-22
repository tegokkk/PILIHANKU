export const instrumentVersion = 'draft-reflection-1';
export const dimensions = {
  R: 'Realistik',
  I: 'Investigatif',
  A: 'Artistik',
  S: 'Sosial',
  E: 'Enterprising',
  C: 'Konvensional',
};
const statements = {
  R: [
    'Merakit atau memperbaiki benda sederhana.',
    'Melakukan kegiatan praktik di luar ruangan.',
    'Menggunakan peralatan untuk membuat sesuatu.',
    'Mencoba cara kerja mesin atau alat.',
  ],
  I: [
    'Mencari penjelasan dari suatu gejala.',
    'Menyelidiki pertanyaan melalui percobaan.',
    'Menganalisis data untuk memahami masalah.',
    'Membaca tentang penemuan dan penelitian.',
  ],
  A: [
    'Membuat gambar atau karya visual.',
    'Menulis cerita, musik, atau puisi.',
    'Mencoba gagasan kreatif dengan cara sendiri.',
    'Mengekspresikan ide melalui pertunjukan.',
  ],
  S: [
    'Membantu teman memahami pelajaran.',
    'Mendengarkan kebutuhan orang lain.',
    'Bekerja bersama dalam kegiatan sosial.',
    'Mendampingi orang mempelajari keterampilan.',
  ],
  E: [
    'Mengajak kelompok mewujudkan gagasan.',
    'Menyampaikan usulan kepada orang lain.',
    'Merencanakan kegiatan atau usaha kecil.',
    'Membagi tugas dalam sebuah proyek.',
  ],
  C: [
    'Merapikan catatan dan dokumen.',
    'Memeriksa ketelitian suatu pekerjaan.',
    'Menyusun jadwal atau daftar kegiatan.',
    'Mengelola informasi dengan aturan jelas.',
  ],
};
export const questions = Object.entries(statements).flatMap(([dimension, items]) =>
  items.map((text, i) => ({ id: `${dimension}${i + 1}`, dimension, text }))
);
export const values = [
  'Membantu orang lain',
  'Kreativitas',
  'Kestabilan penghasilan',
  'Kemandirian',
  'Belajar berkelanjutan',
  'Dekat keluarga',
  'Fleksibilitas',
  'Kontribusi sosial',
];
export const categories = ['Kuliah', 'Vokasi & Kedinasan', 'Kerja & Pelatihan', 'Wirausaha'];
const themes = [
  [
    'Tidak lolos jalur prestasi',
    'Menyiapkan jalur lain',
    'Meninjau kembali tujuan',
    'Periksa ketentuan seleksi alternatif pada penyelenggara.',
  ],
  [
    'Biaya terbatas',
    'Menjelajahi bantuan',
    'Membandingkan jalur terjangkau',
    'Cari informasi biaya total dan bantuan dari sumber resmi.',
  ],
  [
    'Bekerja sambil kuliah',
    'Mulai bekerja',
    'Mulai belajar',
    'Periksa jadwal, beban waktu, dan dukungan yang tersedia.',
  ],
  [
    'Pilihan berbeda dengan orang tua',
    'Siapkan data diskusi',
    'Minta fasilitasi BK',
    'Cari informasi bersama dan susun pertanyaan tanpa menyalahkan.',
  ],
  [
    'Merintis usaha',
    'Uji ide kecil',
    'Cari pelatihan atau pengalaman',
    'Riset kebutuhan calon pengguna dan batas risiko yang mampu ditanggung.',
  ],
];
export const scenarios = themes.map(([title, a, b, action], i) => ({
  id: `scenario-${i + 1}`,
  version: 'draft-1',
  title,
  label: 'Draf materi — belum ditelaah ahli',
  start: 'start',
  nodes: {
    start: {
      text: `Bayangkan: ${title.toLowerCase()}. Apa yang ingin kamu coba?`,
      choices: [
        { text: a, next: 'research' },
        { text: b, next: 'support' },
      ],
    },
    research: {
      text: 'Informasi masih belum lengkap. Langkah berikutnya?',
      choices: [
        { text: 'Periksa informasi penyelenggara', next: 'end-research' },
        { text: 'Diskusikan bersama pendamping', next: 'end-support' },
      ],
    },
    support: {
      text: 'Kamu ingin dukungan sebelum melanjutkan. Apa yang akan kamu siapkan?',
      choices: [
        { text: 'Daftar pertanyaan dan alternatif', next: 'end-research' },
        { text: 'Rencana percobaan bertahap', next: 'end-support' },
      ],
    },
    'end-research': {
      text: `Informasi baru dapat mengubah pertimbangan. ${action}`,
      alternative: 'Pertimbangkan jalur lain atau beri waktu untuk meninjau tujuan.',
      reflection: 'Informasi apa yang masih ingin kamu cari?',
    },
    'end-support': {
      text: `Dukungan membantu melihat kebutuhanmu. ${action}`,
      alternative: 'Coba langkah kecil yang bisa dievaluasi, lalu diskusikan lagi.',
      reflection: 'Siapa yang dapat membantu, dan pertanyaan apa yang ingin kamu ajukan?',
    },
  },
}));
export const demoCards = [
  [
    'Pendidikan Teknik Informatika',
    0,
    ['I', 'S'],
    'Belajar teknologi dan cara mendampingi proses belajar.',
  ],
  ['Sains Lingkungan', 0, ['I', 'R'], 'Mengeksplorasi lingkungan melalui pengamatan dan data.'],
  ['Desain Komunikasi Visual', 0, ['A', 'E'], 'Mengembangkan gagasan melalui komunikasi visual.'],
  ['D3/D4 Multimedia', 1, ['A', 'R'], 'Berlatih produksi media melalui proyek terapan.'],
  ['Teknologi Rekayasa', 1, ['R', 'I'], 'Mengeksplorasi penerapan teknologi melalui praktik.'],
  [
    'Eksplorasi Kedinasan',
    1,
    ['C', 'S'],
    'Membaca ragam pendidikan kedinasan dan syarat penyelenggaranya.',
  ],
  [
    'Pelatihan Teknisi Layanan IT',
    2,
    ['R', 'C'],
    'Mencoba keterampilan layanan perangkat dan pemecahan masalah.',
  ],
  ['Pelatihan Administrasi', 2, ['C', 'S'], 'Mempelajari pengelolaan informasi dan pelayanan.'],
  ['Jasa Desain Lokal', 3, ['A', 'E'], 'Menguji kebutuhan jasa desain dalam lingkup kecil.'],
  [
    'Usaha Produk Kreatif',
    3,
    ['E', 'R'],
    'Mengembangkan percobaan produk dan mengevaluasi kebutuhan.',
  ],
].map(([title, c, interests, summary], i) => ({
  id: `demo-${i + 1}`,
  title,
  category: categories[c],
  version: 1,
  status: 'example',
  verified_at: null,
  data: {
    summary,
    interests,
    activities: 'Contoh untuk eksplorasi, bukan jaminan profesi.',
    subjects: 'Periksa kurikulum penyelenggara.',
    requirements: 'Belum tersedia — periksa sumber resmi.',
    duration: 'Belum tersedia — periksa sumber resmi.',
    cost: 'Belum tersedia — periksa sumber resmi.',
    environment: 'Bergantung pada kegiatan dan penyelenggara.',
    reflection: 'Bagian kegiatan mana yang ingin kamu coba lebih dahulu?',
    sources: [],
    example: true,
  },
}));
