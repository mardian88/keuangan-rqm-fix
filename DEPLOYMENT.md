# Panduan Deployment ke Vercel

Aplikasi keuangan kas ini sudah siap untuk di-deploy ke Vercel. Ikuti langkah-langkah berikut:

## 1. Persiapan Repository

Pastikan semua perubahan sudah di-commit ke Git:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

> **PENTING**: File `.env` sudah ditambahkan ke `.gitignore` untuk keamanan. Kredensial database dan API keys tidak akan ter-upload ke repository.

## 2. Deploy ke Vercel

### Opsi A: Deploy via Vercel Dashboard

1. Buka [vercel.com](https://vercel.com) dan login
2. Klik "Add New Project"
3. Import repository Git Anda
4. Vercel akan otomatis mendeteksi Next.js project
5. Klik "Deploy"

### Opsi B: Deploy via Vercel CLI

```bash
# Install Vercel CLI (jika belum)
npm install -g vercel

# Deploy
vercel
```

## 3. Konfigurasi Environment Variables

Setelah deployment pertama, tambahkan environment variables di Vercel Dashboard:

1. Buka project di Vercel Dashboard
2. Pergi ke **Settings** → **Environment Variables**
3. Tambahkan variabel berikut (lihat file `.env.example` untuk referensi):

### Required Variables:

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `DATABASE_URL` | PostgreSQL connection string dari Supabase | `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@...` |
| `NEXTAUTH_SECRET` | Secret key untuk NextAuth | Generate dengan: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL production aplikasi | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase project | `https://[PROJECT-REF].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Dari Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Dari Supabase project settings |

> **CATATAN**: Variabel yang dimulai dengan `NEXT_PUBLIC_` akan ter-expose ke browser. Jangan gunakan prefix ini untuk data sensitif!

## 4. Redeploy Setelah Menambahkan Environment Variables

Setelah menambahkan environment variables:

1. Pergi ke **Deployments** tab
2. Klik tombol "..." pada deployment terakhir
3. Pilih "Redeploy"

Atau push commit baru ke repository untuk trigger deployment otomatis.

## 5. Verifikasi Deployment

1. Buka URL production aplikasi
2. Test login dengan kredensial Admin/Komite
3. Verifikasi koneksi database berfungsi
4. Test fitur-fitur utama

## Troubleshooting

### Build Error

Jika terjadi build error:
- Check build logs di Vercel Dashboard
- Pastikan semua dependencies ada di `package.json`
- Verifikasi tidak ada TypeScript errors: `npm run build` locally

### Database Connection Error

Jika tidak bisa connect ke database:
- Verifikasi `DATABASE_URL` sudah benar
- Check Supabase project masih aktif
- Pastikan IP Vercel tidak di-block oleh Supabase

### Authentication Error

Jika login tidak berfungsi:
- Verifikasi `NEXTAUTH_SECRET` sudah di-set
- Check `NEXTAUTH_URL` sesuai dengan URL production
- Pastikan `SUPABASE_SERVICE_ROLE_KEY` benar

## Fitur Vercel yang Sudah Dikonfigurasi

✅ **Image Optimization**: Konfigurasi untuk Supabase images  
✅ **Environment Variables**: Template tersedia di `.env.example`  
✅ **React Strict Mode**: Enabled untuk development best practices  
✅ **Automatic HTTPS**: Vercel provides SSL certificates  
✅ **Edge Network**: Global CDN untuk performa optimal  

## Update Aplikasi

Untuk update aplikasi setelah deployment:

1. Buat perubahan di local
2. Commit dan push ke repository
3. Vercel akan otomatis deploy versi baru

```bash
git add .
git commit -m "Update feature X"
git push origin main
```

## Custom Domain (Opsional)

Untuk menggunakan domain sendiri:

1. Pergi ke **Settings** → **Domains**
2. Tambahkan domain Anda
3. Update DNS records sesuai instruksi Vercel
4. Update `NEXTAUTH_URL` dengan domain baru

---

**Selamat!** Aplikasi Anda sudah siap di-deploy ke Vercel 🎉
