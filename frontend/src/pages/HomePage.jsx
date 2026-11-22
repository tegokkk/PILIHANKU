import { Link } from 'react-router-dom';
import { Compass, GraduationCap, Wrench, BriefcaseBusiness, Lightbulb, Sprout } from 'lucide-react';
import { steps } from '../components/navigation/steps.js';
import { categories } from '../data/materials.js';
import { useExploration } from '../context/exploration.js';
import { matrix, emptyExploration } from '../utils/calculations.js';
import { Accordion } from '../components/ui/index.jsx';
import { ScrambleText } from '../components/ui/scramble-text.jsx';
import { useScrollReveal } from '../hooks/useMotion.js';

export default function HomePage() {
  const data = useExploration()?.data || emptyExploration();
  const revealRef = useScrollReveal('home');
  const done = [
    Object.keys(data.answers).length === 24 &&
      data.context.reviewed &&
      (data.context.values.length === 0 || data.context.values.length >= 3),
    data.comparison.options.length >= 2,
    matrix(data.comparison).complete,
    data.plan.tasks.length >= 3 && (data.plan.status === 'exploring' || data.plan.main),
  ];
  const icons = [GraduationCap, Wrench, BriefcaseBusiness, Lightbulb];
  return (
    <div ref={revealRef}>
      <section className="hero" data-reveal style={{ '--stagger': 0 }}>
        <div className="hero-copy">
          <span className="eyebrow">RUANG UNTUK TUMBUH, ARAH UNTUK MELANGKAH</span>
          <h1>
            <ScrambleText
              text="Kenali diri."
              duration={0.9}
              stagger={0.045}
              delay={0}
              blur={4}
              scrambleSpeed={0.9}
              characters="upperAndLowerCase"
            />
            <br />
            <ScrambleText
              text="Jelajahi pilihan."
              duration={0.9}
              stagger={0.045}
              delay={0.28}
              blur={4}
              scrambleSpeed={0.9}
              characters="upperAndLowerCase"
            />
            <br />
            <ScrambleText
              text="Rancang masa depan."
              duration={0.9}
              stagger={0.045}
              delay={0.56}
              blur={4}
              scrambleSpeed={0.9}
              characters="upperAndLowerCase"
            />
          </h1>
          <p>
            Mulai dari minat dan hal yang penting bagimu. Jelajahi kuliah, vokasi, kerja, atau
            wirausaha, lalu susun langkahmu sendiri.
          </p>
          <div className="row">
            <Link className="button accent" to="/mulai">
              Mulai eksplorasi
            </Link>
            <Link className="button light" to="/peta-jalur">
              Jelajahi jalur
            </Link>
          </div>
        </div>
        <aside className="hero-note">
          <Sprout size={32} />
          <h2>
            4 langkah,
            <br />
            sesuai ritmemu.
          </h2>
          <p>
            Tidak perlu langsung tahu jawabannya. Kamu boleh mencoba, kembali, dan berubah pikiran.
          </p>
          <span>Keputusan tetap milikmu.</span>
        </aside>
      </section>
      {(Object.keys(data.answers).length > 0 || data.comparison.options.length > 0) && (
        <section className="continue-block" data-reveal style={{ '--stagger': 1 }}>
          <div>
            <p className="eyebrow">PERJALANANMU</p>
            <h2>
              <ScrambleText text="Lanjutkan dari langkahmu" duration={0.8} stagger={0.035} />
            </h2>
            <p>
              {done.filter(Boolean).length} dari 4 langkah lengkap. Kamu tetap bebas menjelajah.
            </p>
          </div>
          <Link
            className="button"
            to={
              steps[
                Math.max(
                  0,
                  done.findIndex((x) => !x)
                )
              ][0]
            }
          >
            Lanjutkan eksplorasi
          </Link>
        </section>
      )}
      <section id="cara-kerja" className="landing-section">
        <div className="section-title" data-reveal style={{ '--stagger': 0 }}>
          <p className="eyebrow">PELAN-PELAN, SATU LANGKAH DULU</p>
          <h2>
            <ScrambleText text="Masa depanmu," duration={0.85} stagger={0.04} delay={0} />
            <br />
            <ScrambleText
              text="kamu yang mengenalinya."
              duration={0.85}
              stagger={0.035}
              delay={0.22}
            />
          </h2>
          <p>
            Bukan mencari satu jawaban yang paling benar. Ini ruang untuk mendengar diri sendiri dan
            melihat kemungkinan.
          </p>
        </div>
        <div className="steps-grid">
          {steps.map(([to, label], i) => (
            <Link
              className={`step-card step-${i}`}
              to={to}
              key={to}
              data-reveal
              style={{ '--stagger': i }}
            >
              <span className="step-number">0{i + 1}</span>
              <h3>{label}</h3>
              <p>
                {
                  [
                    'Temukan minat, nilai, dan hal yang berarti untukmu.',
                    'Kenali empat jalur dengan peluang yang setara.',
                    'Lihat pertimbanganmu, ajak orang tepercaya berdiskusi.',
                    'Ubah gagasan menjadi langkah kecil yang bisa kamu coba.',
                  ][i]
                }
              </p>
              <span className="small-label">
                {done[i] ? 'Lengkap · tetap bisa direvisi' : 'Buka langkah'}
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="landing-section">
        <div className="section-title" data-reveal style={{ '--stagger': 0 }}>
          <p className="eyebrow">BANYAK CARA UNTUK BERTUMBUH</p>
          <h2>
            <ScrambleText text="Empat jalur." duration={0.85} stagger={0.04} delay={0} />
            <br />
            <ScrambleText
              text="Peluang yang setara."
              duration={0.85}
              stagger={0.035}
              delay={0.22}
            />
          </h2>
          <p>Setiap jalur punya proses, tantangan, dan ruang belajarnya sendiri.</p>
        </div>
        <div className="category-grid">
          {categories.map((name, i) => {
            const Icon = icons[i];
            return (
              <Link
                to={`/peta-jalur?kategori=${encodeURIComponent(name)}`}
                className={`category-card cat-${i}`}
                key={name}
                data-reveal
                style={{ '--stagger': i }}
              >
                <Icon size={36} />
                <h3>{name}</h3>
                <span>Jelajahi kemungkinan</span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="simulation-banner" data-reveal style={{ '--stagger': 0 }}>
        <Compass size={48} />
        <div>
          <p className="eyebrow">BAGAIMANA JIKA?</p>
          <h2>
            <ScrambleText text="Latihan melihat kemungkinan." duration={0.85} stagger={0.035} />
          </h2>
          <p>
            Coba lima cerita bercabang untuk memikirkan alternatif, tanpa jawaban benar atau salah.
          </p>
        </div>
        <Link className="button outline" to="/peta-jalur?tab=simulasi">
          Coba simulasi
        </Link>
      </section>
      <section className="landing-section faq" data-reveal style={{ '--stagger': 0 }}>
        <h2>
          <ScrambleText text="Pertanyaan yang" duration={0.85} stagger={0.04} delay={0} />
          <br />
          <ScrambleText text="sering diajukan" duration={0.85} stagger={0.04} delay={0.22} />
        </h2>
        <div>
          {[
            [
              'Apakah ini tes penentu jurusan?',
              'Bukan. Refleksi membantu mengenali kecenderungan minat, bukan diagnosis atau rekomendasi jurusan otomatis. Materi draf belum ditelaah ahli.',
            ],
            [
              'Harus punya akun untuk mencoba?',
              'Ya. Seluruh fitur memerlukan login dengan akun yang telah disetujui sekolah. Daftar sebagai siswa dan periksa status pendaftaran melalui halaman Masuk.',
            ],
            [
              'Apakah guru membaca semua jawabanku?',
              'Tidak. Kamu memilih bagian yang dibagikan saat mengirim konsultasi. Pilihan berbagi awalnya kosong.',
            ],
            [
              'Bagaimana jika aku belum tahu pilihanku?',
              'Tidak apa-apa. Pilih Aku masih menjelajah dan susun informasi yang ingin dicari.',
            ],
          ].map(([q, a]) => (
            <Accordion key={q} summary={q}>
              <p>{a}</p>
            </Accordion>
          ))}
        </div>
      </section>
      <section className="closing" data-reveal style={{ '--stagger': 0 }}>
        <p className="eyebrow">MULAI DARI RASA INGIN TAHU</p>
        <h2>
          <ScrambleText text="Siap mengenal arahmu" duration={0.85} stagger={0.04} delay={0} />
          <br />
          <ScrambleText text="lebih tenang?" duration={0.85} stagger={0.04} delay={0.22} />
        </h2>
        <Link className="button accent" to="/mulai">
          Mulai perjalananmu
        </Link>
      </section>
    </div>
  );
}
