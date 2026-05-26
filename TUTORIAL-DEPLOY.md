# Tutorial Deploy Catatan Kas Realtime

Tutorial ini menjelaskan langkah dari awal sampai aplikasi bisa online, dibuka dari device lain, dan sinkron realtime tanpa harus menyalakan laptop.

## Yang Dibutuhkan

1. Akun GitHub.
2. Akun Vercel.
3. Akun Supabase.
4. Folder aplikasi:

```text
C:\Users\daffa\Downloads\codexai\finance-tracker
```

## 1. Buat Database Supabase

1. Buka https://supabase.com
2. Login.
3. Klik **New Project**.
4. Isi data project:
   - Project name: `catatan-kas`
   - Database password: buat password sendiri dan simpan.
   - Region: pilih yang terdekat, misalnya Singapore.
5. Klik **Create new project**.
6. Tunggu sampai project selesai dibuat.

## 2. Buat Tabel Database

1. Di dashboard Supabase, buka menu **SQL Editor**.
2. Klik **New query**.
3. Buka file ini di komputer:

```text
C:\Users\daffa\Downloads\codexai\finance-tracker\supabase-schema.sql
```

4. Copy semua isi file tersebut.
5. Paste ke SQL Editor Supabase.
6. Klik **Run**.

Kalau berhasil, database sudah punya tabel:

```text
categories
transactions
```

## 3. Ambil URL dan Anon Key Supabase

1. Di Supabase, buka **Project Settings**.
2. Masuk ke menu **API**.
3. Copy:
   - **Project URL**
   - **anon public key**

Contoh bentuk datanya:

```js
url: "https://xxxxx.supabase.co"
anonKey: "eyJhbGciOi..."
```

## 4. Isi Konfigurasi Supabase di Project

Buka file:

```text
C:\Users\daffa\Downloads\codexai\finance-tracker\supabase-config.js
```

Isi menjadi seperti ini:

```js
window.CATATAN_KAS_SUPABASE = {
  url: "https://PROJECT_ID.supabase.co",
  anonKey: "ANON_PUBLIC_KEY",
};
```

Ganti:

- `https://PROJECT_ID.supabase.co` dengan **Project URL** dari Supabase.
- `ANON_PUBLIC_KEY` dengan **anon public key** dari Supabase.

## 5. Test Lokal Dulu

Buka file ini di browser:

```text
C:\Users\daffa\Downloads\codexai\finance-tracker\index.html
```

Kalau konfigurasi Supabase benar, di kanan atas aplikasi akan muncul status:

```text
Cloud realtime aktif
```

Coba tambah transaksi. Jika berhasil, data sudah masuk ke Supabase.

## 6. Upload ke GitHub

Cara paling mudah:

1. Buka GitHub.
2. Klik **New repository**.
3. Nama repo misalnya:

```text
catatan-kas
```

4. Buat repo kosong.
5. Upload isi folder:

```text
C:\Users\daffa\Downloads\codexai\finance-tracker
```

File yang perlu ada di root repository GitHub:

```text
index.html
styles.css
app.js
README.md
TUTORIAL-DEPLOY.md
supabase-config.js
supabase-schema.sql
```

Pastikan `index.html` berada langsung di root repo GitHub, bukan di dalam folder tambahan.

## 7. Deploy ke Vercel

1. Buka https://vercel.com
2. Login pakai GitHub.
3. Klik **Add New Project**.
4. Pilih repo `catatan-kas`.
5. Gunakan setting:
   - Framework Preset: **Other**
   - Build Command: kosongkan
   - Output Directory: `.`
6. Klik **Deploy**.

Setelah selesai, Vercel akan memberi link seperti:

```text
https://catatan-kas.vercel.app
```

Buka link itu dari HP atau device lain. Selama ada internet, data akan masuk ke Supabase dan sinkron realtime.

## Catatan Penting

Versi ini belum memakai login. Artinya siapa pun yang punya link web kamu bisa membuka dan mengubah data. Untuk pemakaian pribadi, jangan sebar link-nya.

Tahap berikutnya yang disarankan adalah menambahkan fitur login Supabase Auth agar data lebih aman.
