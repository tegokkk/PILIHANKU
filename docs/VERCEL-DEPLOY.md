# Panduan Deploy Manual PILIHANKU ke Vercel

Konfigurasi di repository ini menjalankan **Frontend (Vite SPA)** dan **Backend (Express Serverless Function `/api/*`)** dalam **satu proyek Vercel (same-origin)** agar cookie sesi `HttpOnly; Secure; SameSite=Lax`, proteksi CSRF, dan CSP berjalan tanpa masalah lintas-domain.

## 1. Prasyarat

1. **PostgreSQL cloud** yang dapat diakses publik melalui TLS (misalnya Neon, Supabase, Railway, atau Vercel Marketplace Postgres).
   - Pastikan menggunakan database production bersih (bukan database demo/development).
   - Gunakan connection string dengan `?sslmode=require` bila penyedia mewajibkan TLS.
2. **Node.js 24.x** di Vercel Project Settings → *General* → *Node.js Version* (`24.x`).

## 2. Environment Variables di Vercel

Atur variabel berikut pada **Vercel Project → Settings → Environment Variables** (untuk *Production*):

| Variabel | Contoh / Nilai | Keterangan |
| --- | --- | --- |
| `NODE_ENV` | `production` | Wajib `production` |
| `APP_ORIGIN` | `https://pilihanku.vercel.app` | Harus HTTPS dan sama persis dengan domain Vercel/custom domain aktif (tanpa `/` di akhir) |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Koneksi PostgreSQL production |
| `SESSION_SECRET` | *(minimal 32 karakter acak)* | Buat dengan `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `TRUST_PROXY` | `1` | Wajib `1` karena Vercel berada di belakang reverse proxy HTTPS |
| `DEMO_CONTENT` | `false` | Wajib `false` di production |
| `PENDING_RETENTION_DAYS` | `90` | Opsional (1–365 hari, default `90`) |

> **Penting:** Jangan simpan `BOOTSTRAP_USERNAME` / `BOOTSTRAP_PASSWORD` di Environment Variables Vercel. Server production akan menolak menyala bila variabel bootstrap masih terpasang.

## 3. Migrasi Database & Bootstrap Superadmin (Sekali Sebelum Membuka Akses)

Jalankan dari komputer lokal Anda terhadap `DATABASE_URL` production:

```powershell
cd backend
$env:DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
npm run migrate
```

Buat akun Superadmin pertama (hanya 1 kali):

```powershell
$env:BOOTSTRAP_USERNAME="admin.sekolah"
$env:BOOTSTRAP_PASSWORD="GantiPasswordKuatMin12Karakter!"
$env:BOOTSTRAP_SCHOOL_NAME="SMA Negeri Contoh"
$env:BOOTSTRAP_TIMEZONE="Asia/Jakarta"
npm run bootstrap
```

Setelah selesai, bersihkan variabel `BOOTSTRAP_*` dari sesi terminal Anda.

## 4. Deploy Manual ke Vercel

### Opsi A — Melalui Vercel Dashboard (Git)
1. Push repository ke GitHub/GitLab/Bitbucket.
2. Buka **Vercel Dashboard → Add New Project → Import** repository.
3. Biarkan **Root Directory** pada root repository (`.`) — Vercel akan otomatis membaca `vercel.json`:
   - Install Command: `npm --prefix frontend ci && npm --prefix backend ci`
   - Build Command: `npm --prefix frontend run build`
   - Output Directory: `frontend/dist`
4. Masukkan Environment Variables dari Langkah 2, lalu klik **Deploy**.
5. Setelah mendapatkan domain produksi (misal `https://nama-proyek.vercel.app`), pastikan `APP_ORIGIN` cocok persis, lalu lakukan **Redeploy** bila sebelumnya berbeda.

### Opsi B — Melalui Vercel CLI (Tanpa Git / Manual)
```powershell
npm i -g vercel
vercel login
vercel link
# Atur env production di dashboard Vercel atau via `vercel env add`
vercel --prod
```

## 5. Verifikasi Pasca-Deploy

1. Buka `https://<domain-anda>/api/health` → harus mengembalikan `{"data":{"status":"ok","database":"connected"}}`.
2. Buka `https://<domain-anda>/mulai` → coba login menggunakan akun Superadmin hasil bootstrap.
3. Pastikan cookie `pilihanku.sid` memiliki atribut `HttpOnly`, `Secure`, dan `SameSite=Lax`.
4. Jalankan tugas retensi secara berkala dari server/scheduler eksternal atau GitHub Actions menggunakan `npm --prefix backend run retention` dengan `DATABASE_URL` production.
