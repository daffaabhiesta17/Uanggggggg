# Catatan Kas

Web UI statis untuk pencatatan pemasukan dan pengeluaran. Bisa berjalan lokal di browser, atau sinkron realtime antar-device memakai Supabase.

## Fitur

- Tab/jenis pemasukan dan pengeluaran fleksibel, bisa dibuat oleh user.
- Input, edit, hapus, cari, dan filter transaksi.
- Ringkasan pemasukan, pengeluaran, selisih saldo, dan rata-rata harian per bulan.
- Chart nominal setiap tab per bulan untuk pemasukan dan pengeluaran.
- Daftar tab terbesar dan aktivitas terbaru.
- Export JSON, export CSV, import JSON, dan reset data.
- Data tersimpan lokal di browser memakai `localStorage`.
- Mode cloud realtime dengan Supabase agar bisa diakses dari device lain tanpa laptop menyala.

## Cara menjalankan

Buka langsung file:

```text
finance-tracker/index.html
```

Atau jalankan static server dari folder ini:

```bash
python -m http.server 4173
```

Lalu buka:

```text
http://localhost:4173
```

## Deploy ke Vercel

Untuk deploy cepat:

1. Upload folder `finance-tracker` ke GitHub.
2. Di Vercel, pilih repo tersebut.
3. Framework preset: `Other`.
4. Build command: kosongkan.
5. Output directory: `.` kalau repo berisi isi folder ini, atau `finance-tracker` kalau repo memakai root project saat ini.

## Supabase Realtime

Pakai ini agar data bisa dibuka dari HP/laptop lain tanpa menyalakan laptop utama.

1. Buat project di Supabase.
2. Buka SQL Editor Supabase.
3. Jalankan isi file `supabase-schema.sql`.
4. Buka Project Settings > API.
5. Salin `Project URL` dan `anon public key`.
6. Isi file `supabase-config.js`:

```js
window.CATATAN_KAS_SUPABASE = {
  url: "https://PROJECT_ID.supabase.co",
  anonKey: "ANON_PUBLIC_KEY",
};
```

7. Deploy folder ini ke Vercel.

Kalau konfigurasi Supabase kosong, aplikasi otomatis kembali ke mode lokal.

Catatan keamanan: schema ini dibuat untuk single-user/simple shared app. Siapa pun yang punya URL aplikasi dan anon key di frontend bisa membaca/ubah data. Untuk data pribadi yang serius, tahap berikutnya adalah menambahkan login Supabase Auth dan Row Level Security per user.
