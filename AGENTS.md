# AGENTS.md — Panduan Proyek Investasi Catatan Kas

> Dokumen referensi arsitektur, rumus, alur data, risiko keamanan, dan aturan kerja untuk proyek web statis **Catatan Kas — Tab Investasi**.

---

## 1. Ringkasan Produk

Aplikasi web investasi berbasis HTML/CSS/JavaScript murni (**tanpa build step**) untuk proyeksi compounding dan pencatatan aktual portofolio saham (`BMRI`, `BBRI`, serta emiten tambahan), **RDPU**, dan **BTC**.

- **Keputusan Produk Final**: Antarmuka utama ([`index.html`](index.html)) **hanya memuat tab Investasi** dengan 3 sub-tab:
  1. **Program 1 — Proyeksi Simulator**: simulasi bulanan (`180` bulan default / `1–50` tahun), sinkronisasi override dari Program 2, grafik pertumbuhan, komposisi aset akhir, serta ringkasan jalur likuidasi/keep-lot & milestone.
  2. **Program 2 — Catatan Aktual**: ledger pencatatan pembelian Saham, RDPU, dan BTC per bulan/tahun beserta grafik historis, informasi ekstrem, dan akumulasi tahunan.
  3. **Tools — Analisis & Kalkulator**: 3 kalkulator mandiri (*Kalkulator Komposisi*, *Average Down / Up*, dan *Simulator Persentase Aset*).
- Tab **Dashboard**, **Transaksi**, **Kategori**, dan **Decision Desk** sengaja dihapus dari UI utama.
- Card **Posisi Portofolio Aktual** dihapus dari UI Tools sesuai keputusan produk; fungsi hitung [`calculatePortfolioAnalysis()`](app.js#L2852) dan renderer [`renderPortfolioAnalysis()`](app.js#L2906) tetap dipertahankan utuh di [`app.js`](app.js) tanpa dipanggil oleh UI baru.
- **Kebijakan Tanpa Data Dummy**: Tidak ada angka/contoh dummy hardcoded di UI. Data dimuat langsung dari Supabase (atau empty state `"Belum ada..."` jika kosong).

---

## 2. Stack & Integrasi

| Lapisan | Teknologi | Detail |
|---|---|---|
| **Frontend** | HTML5 + CSS3 + Vanilla JS | Tanpa bundler/transpiler; CSS utama tertanam di [`index.html`](index.html) (`styles.css` hanya dipakai `index-legacy.html`) |
| **Charting** | `chart.js@4.6.1` (CDN pinned) | Grafik *Modal vs Pertumbuhan Aset* (`#growthChartCanvas`) & *Pembelian Saham* (`#stockPurchaseChartCanvas`) |
| **Client SDK** | `@supabase/supabase-js@2.119.0` (CDN pinned) | Koneksi REST & Realtime WebSocket channel `"catatan-kas-realtime"` |
| **Database & Realtime** | Supabase (PostgreSQL + RLS) | Konfigurasi `url` & `anonKey` di [`supabase-config.js`](supabase-config.js) |
| **Hosting / Deploy** | Vercel Static Hosting | Framework preset `Other`, root `.`, deploy otomatis dari Git |
| **Cache Offline** | `localStorage` (`"catatan-kas-v1"`) | Fallback **read-only** saat Supabase gagal terhubung |

---

## 3. Struktur File Proyek

| File / Folder | Peran | Status Deploy (Vercel) |
|---|---|---|
| [`index.html`](index.html) | Halaman utama baru (desain mockup final, hanya tab Investasi, tanpa data dummy) | **Publik** |
| [`app.js`](app.js) | Logika inti simulator, kalkulator, sinkronisasi Supabase, dan DOM binding (`isInvestmentsOnlyLayout`) | **Publik** |
| [`supabase-config.js`](supabase-config.js) | URL & `anon` public key project Supabase (`pgbraloengmbyjhbfsvw`) | **Publik** |
| [`index-legacy.html`](index-legacy.html) | Arsip halaman lama (6 view lengkap); jangan dihapus | Publik (arsip) |
| [`styles.css`](styles.css) | Stylesheet halaman lama (`index-legacy.html`) | Publik (pendukung legacy) |
| [`decision-desk.js`](decision-desk.js) | **NONAKTIF (kode mati)** — modul Decision Desk tidak dimuat di `index.html`, file tetap disimpan di repo | Publik (tidak dieksekusi di `index.html`) |
| [`_asli/app.js`](_asli/app.js) | **Baseline pra-migrasi asli** & sumber rollback; **DILARANG diubah atau ditimpa** | Di-ignore (`.vercelignore`) |
| [`verify-formulas.js`](verify-formulas.js) | Skrip Node.js untuk memverifikasi paritas hash 13 fungsi rumus & 5 konstanta terhadap `_asli/app.js` | Di-ignore (`.vercelignore`) |
| [`supabase-schema.sql`](supabase-schema.sql) | Skema DDL, RLS policy, publikasi realtime, dan seed awal Supabase | Di-ignore (`.vercelignore`) |
| [`mockup-investasi.html`](mockup-investasi.html) | Dokumen referensi desain mockup standalone (masih berisi preview sebelum migrasi) | Di-ignore (`.vercelignore`) |
| [`PLAN-MIGRASI.md`](PLAN-MIGRASI.md), [`README.md`](README.md), [`TUTORIAL-DEPLOY.md`](TUTORIAL-DEPLOY.md), `AGENTS.md` | Dokumentasi proyek | Di-ignore (`*.md` di `.vercelignore`) |
| `Screenshot*.png` | Screenshot referensi visual | Di-ignore (`.vercelignore`) |

### Status Fitur/Fungsi Tidak Aktif di UI Baru
- **`decision-desk.js`**: berstatus **nonaktif** (tag `<script src="./decision-desk.js">` tidak ada di `index.html`; file dipertahankan di repo).
- **`resetRemoteData()`** ([`app.js:1074`](app.js#L1074)): fungsi tetap utuh di `app.js`, **tidak dipanggil dari UI baru** karena `#resetDummyBtn` telah dihapus dan handler `el.resetButton` dibatasi hanya untuk `!isInvestmentsOnlyLayout`.
- **Logika non-investasi di `app.js`** (Dashboard, Transaksi, Kategori, Export/Import): dipertahankan dengan guard `!isInvestmentsOnlyLayout` agar `index-legacy.html` tetap kompatibel.

---

## 4. Kamus Rumus & Verifikasi Baseline

Seluruh rumus dan konstanta inti diverifikasi dengan `node verify-formulas.js _asli/app.js app.js` terhadap baseline [`_asli/app.js`](_asli/app.js).

### Konstanta & Fungsi Identik (16/18 Item — Hash SHA-256 Terkunci)

| Item | Hash (12-char SHA-256) | Peran Singkat |
|---|---|---|
| `SIMULATION_MONTHS` | `b333df5643d1` | Default durasi simulasi (`180` bulan) |
| `LOT_SIZE` | `9e0e1a9eefc6` | Jumlah lembar per lot saham BEI (`100`) |
| `CORE_STOCKS` | `6e48a7906c46` | Emiten inti simulator Program 1 (`["BMRI", "BBRI"]`) |
| `SELLING_FEE_RATE` | `baa728881224` | Fee jual saham saat likuidasi (`0.0035` / `0,35%`) |
| `DEFAULT_SIMULATOR_CONFIG` | `6ac2c5c3759d` | Parameter awal simulator (setoran `1.100.000`, mulai `6/2026`, alokasi `80%`, dst.) |
| `simulateInvestment()` | `9d952a9b45ee` | Mesin simulasi bulanan & agregasi tahunan saham/RDPU/BTC + override Program 2 |
| `buyCustomLotsWithDividendPolicy()` | `718c407b6c06` | Pembelian mode *custom lot* dengan kebijakan reinvestasi dividen |
| `buyAffordableCustomLots()` | `8e8e7c61ab81` | Alokasi pembelian lot sesuai target & kecukupan kas |
| `buyRepeatingCustomLots()` | `1ebef511b0c4` | Pembelian lot tambahan bergilir dari sisa kas dividen |
| `dividendPerShare()` | `58a9f233943e` | Proyeksi dividen/lembar per tahun dengan *dividend growth* |
| `applyAnnualPriceChange()` | `b5a6e68894a3` | Perubahan harga saham tahunan majemuk |
| `actualInvestmentForSimulationMonth()` | `1ce4af977771` | Agregasi catatan aktual Program 2 (`BMRI`, `BBRI`, `RDPU`, `BTC`) per bulan/tahun |
| `calculateInvestmentSummary()` | `c3d3fac9b8f3` | Ringkasan total modal, lot, saham, RDPU, BTC, dan rekap tahunan Program 2 |
| `avgSimCalcScenario()` | `22c54c748224` | Weighted average harga & total lot baru untuk *Average Down / Up* |
| `avgSimRiskOpinion()` | `2146248346a9` | Kategori tingkat risiko (`aman`, `warn`, `danger`) berdasarkan `%` perubahan average |
| `calculatePortfolioAnalysis()` | `26fd10e9c90b` | Hitung posisi portofolio aktual (tetap utuh, UI card dihapus) |

### Pengecualian Resmi (2/18 Item — Hanya UI Template/Selector)

Kedua fungsi renderer Tools berikut berubah **hanya pada markup HTML tampilan baru** (`isInvestmentsOnlyLayout`), return value untuk notifikasi toast (`renderAsetPersenSimulator`), dan sanitasi HTML (`escapeHtml`), **tanpa mengubah satu baris pun rumus perhitungannya**:

| Fungsi | Hash Asli (`_asli/app.js`) | Hash Baru (`app.js`) | Catatan Perubahan |
|---|---|---|---|
| `renderKalkulatorPorsi()` | `b088e9b05311` | `bcf52f9dc3b9` | Branch HTML `isInvestmentsOnlyLayout` + class `.empty-box`. Rumus `(saham / total) * 100` & `(etf / total) * 100` identik 100%. |
| `renderAsetPersenSimulator()` | `9a39f0021961` | `f62f6eb302a7` | Branch HTML `isInvestmentsOnlyLayout`, `return null`/`sumPct`, dan `escapeHtml(item.displayName)`. Rumus `(item.value / totalAset) * 100`, `epsilon = 0.005`, dan `selisihPct = sumPct - 100` identik 100%. |

---

## 5. Formula Tampilan Baru (Disetujui User)

Ditambahkan untuk card & badge desain mockup di `app.js`:

1. **Rasio Multiple Aset Bruto (`#kpiMultiple` & `#chartMultipleBadge`)**:
   - Rumus: `result.finalAsset / Math.max(result.totalContribution, 1)`
   - Tooltip menjelaskan bahwa angka ini berbasis **Aset Akhir bruto sebelum fee jual**.
2. **`renderStrategySummary(inputs, result)`** ([`app.js:2131`](app.js#L2131)):
   - **Nilai Bersih Setelah Fee (`#stratLiqNet`)**: `result.finalAsset - result.sellingFee`
   - **ROI Bersih (`#stratRoiBadge`)**: `result.totalContribution > 0 ? (result.netProfit / result.totalContribution) * 100 : 0` (tooltip menjelaskan berbasis *net profit* setelah fee jual `0,35%`).
   - **Estimasi Dividen / Bulan (`#stratKeepMonthly`)**: `result.passiveIncomeFinalYear / 12`
   - **Cadangan RDPU + BTC (`#stratKeepReserve`)**: `result.rdpuBalance + result.btcBalance`
   - **Milestone (`#milestoneStrip`)**: Mengambil maksimal 3 titik dari `result.yearlyRows` (`clampNumber` + `Set` agar aman untuk horizon `< 3` tahun tanpa indeks `-1` / elemen kosong; tampil `"Belum ada data milestone."` bila 0 baris). Setiap pill menampilkan `portfolioValue`, rasio `portfolioValue / Math.max(totalContribution, 1)`, dan `annualDividends`.
3. **Ringkasan Akordeon (`#acc01Summary`–`#acc04Summary`)**: Pemformatan teks langsung dari `inputs` simulator (`monthlyDeposit`, `btcMonthlyContribution`, `yearsCount`, `purchaseMode`, `stockAllocation`, `priceChangeEnabled`, `rdpuReturnAnnual`, `btcReturnAnnual`, `dividendGrowthAnnual`).
4. **Format Singkat 5 KPI Program 1 (`fmtCompact()` & `setProgramKpiValue()`, Disetujui User — C2 Opsi a)**:
   - Hanya berlaku pada tampilan UI 5 KPI Program 1 (`#kpiTotalContribution`, `#kpiFinalAsset`, `#kpiNetProfit`, `#kpiPassiveIncome`, `#kpiBtcValue`) di semua lebar layar; KPI Program 2 dan seluruh perhitungan/state internal tetap menggunakan angka numerik utuh.
   - Aturan `fmtCompact(value)` (`locale id-ID`, koma desimal): `|n| >= 1.000.000.000` -> `Rp X,XX M` (2 desimal); `|n| >= 10.000.000` -> `Rp X,X jt` (1 desimal); `|n| >= 1.000.000` -> `Rp X,XX jt` (2 desimal); `|n| < 1.000.000` -> `formatMoney(num)` dengan pemisah ribuan (termasuk `0` -> `Rp 0`); `null`/`undefined`/non-finite -> `—`; angka negatif diawali tanda `-` (mis. `-Rp 12,3 jt`).
   - Atribut `title` pada elemen nilai masing-masing KPI menampilkan nominal penuh (`formatMoney(value)`), tanpa menimpa tooltip pada `#kpiMultiple`, `#chartMultipleBadge`, dan `#stratRoiBadge`.

---

## 6. Alur Data & Mode Offline Read-Only

```text
[UI index.html]
   │
   ▼  (saat isInvestmentsOnlyLayout === true)
[app.js: initRemoteStore() -> loadRemoteState() -> loadRemoteInvestments()]
   ├── Query HANYA 5 tabel investasi:
   │     investment_settings, investment_tickers, stock_purchases, rdpu_purchases, btc_purchases
   │     (Tabel categories & transactions DILEWATI total; tidak ada SELECT/subscribe/upsert trx_demo_1/2)
   ├── Realtime subscribe pada 5 tabel investasi via channel "catatan-kas-realtime"
   ├── Simpan snapshot ke localStorage key "catatan-kas-v1" hanya saat sync cloud berhasil
   │
   ▼  (jika Supabase offline / gagal dimuat)
[setOfflineReadOnlyMode(true)]
   ├── Cache localStorage ada   -> Status "Offline (Read-only)", banner #offlineReadOnlyBanner, tampilkan cache
   ├── Cache localStorage kosong -> Status "Cloud gagal (Kosong)", state pembelian kosong ("Belum ada...")
   └── Seluruh form & tombol tulis (Tambah/Edit/Hapus/Horizon) DINONAKTIFKAN; saveState() diblokir
```

---

## 7. Skema Database Supabase, RLS & Risiko Keamanan

Skema didefinisikan di [`supabase-schema.sql`](supabase-schema.sql) (7 tabel):
- `categories`, `transactions` *(tidak diakses di UI Investasi baru)*
- `investment_settings` (`id = 'default'`, `horizon_years`, `simulator_config` JSONB)
- `investment_tickers` (`symbol` PK; default `'BMRI'`, `'BBRI'`)
- `stock_purchases` (`id`, `ticker`, `month`, `year`, `lot_price`, `lots`, `created_at`)
- `rdpu_purchases` (`id`, `month`, `year`, `amount`, `created_at`)
- `btc_purchases` (`id`, `month`, `year`, `amount`, `created_at`) — *Catatan: jika tabel `public.btc_purchases` belum dibuat di project Supabase (HTTP `404` / kode `42P01`), `isMissingInvestmentTableError()` otomatis fallback membaca/menulis ke `investment_settings.simulator_config.btcPurchases`.*

### Audit RLS — **RISIKO TINGGI**

Seluruh 7 tabel di [`supabase-schema.sql`](supabase-schema.sql) mengaktifkan Row Level Security, namun memiliki policy terbuka untuk peran `anon`:
- `SELECT`: `for select to anon using (true)`
- `ALL` (Insert/Update/Delete): `for all to anon using (true) with check (true)`

**Risiko**: Karena `url` dan `anonKey` di [`supabase-config.js`](supabase-config.js) bersifat publik di frontend, siapa pun yang memiliki URL situs produksi dapat membaca, mengubah, atau menghapus seluruh baris tabel via Supabase REST API tanpa autentikasi.

**Mitigasi Operasional (Sementara)**:
1. **Jangan bagikan URL deploy publik** ke pihak tidak berkepentingan.
2. **Aktifkan backup data Supabase** secara berkala (atau ekspor tabel investasi sebelum perubahan besar).
3. **Aktifkan proteksi akses Vercel** (*Vercel Authentication* / *Deployment Protection* / Password Protection jika tersedia pada paket Anda).
4. **Proyek Lanjutan Terpisah**: Migrasikan skema ke **Supabase Auth** dengan kolom `user_id` + policy RLS berbasis `auth.uid() = user_id`.

---

## 8. Known Issues & Batasan Desain

1. **Bug `hasLegacyActual` (Sengaja Dibiarkan Sesuai Kode Asli)**:
   - **Lokasi**: [`actualInvestmentForSimulationMonth()` (`app.js:1467`)](app.js#L1467) dan [`simulateInvestment()` (`app.js:1795-1824`)](app.js#L1795-L1824).
   - **Perilaku sekarang**: `hasLegacyActual: bmriLots > 0 || bbriLots > 0 || rdpuAmount > 0`. Jika pada suatu bulan user hanya mencatat pembelian `RDPU` tanpa catatan saham (`bmriLots === 0 && bbriLots === 0 && rdpuAmount > 0`), `hasLegacyActual` tetap `true`, sehingga pembelian saham simulasi serta perhitungan dividen bulan Mei pada bulan tersebut ikut dilewati (bernilai `0`).
   - **Perilaku yang diharapkan sesuai teks UI**: Override seharusnya bekerja per jenis aset (catatan `RDPU` hanya mengganti porsi `RDPU` bulan itu, sementara pembelian saham simulasi & dividen Mei tetap berjalan).
   - **Status**: Dibiarkan identik dengan `_asli/app.js` untuk menjaga paritas rumus selama migrasi; direncanakan untuk diperbaiki pada **task terpisah** setelah migrasi selesai.
2. **Batasan Desain Emiten Non-`BMRI`/`BBRI` di Program 1**:
   - Emiten tambahan yang ditambahkan user di Program 2 (mis. `BBCA`) tersimpan di `investment_tickers` & `stock_purchases` serta terhitung pada KPI/grafik/akumulasi **Program 2**, namun **tidak dimasukkan** dalam perhitungan proyeksi **Program 1** (`actualInvestmentForSimulationMonth()` dan `simulateInvestment()` hanya memodelkan `CORE_STOCKS = ["BMRI", "BBRI"]`).
3. **Bug Responsif `<= 1024px` dari Mockup Asli (Diperbaiki atas Persetujuan User — C3)**:
   - **Lokasi**: [`index.html:1688-1692`](index.html#L1688-L1692) (`@media (max-width: 1024px)`).
   - **Masalah di `mockup-investasi.html` asli**: `.sidebar` disembunyikan (`display: none`), tetapi `.app-shell` masih memakai `grid-template-columns: 0 minmax(0, 1fr);`, sehingga `<main>` jatuh ke kolom ke-1 selebar `0px`.
   - **Perbaikan yang disetujui**: diubah menjadi `.app-shell, .app-shell.sidebar-collapsed { grid-template-columns: minmax(0, 1fr); }` agar `<main>` tampil full-width pada `<= 1024px`.
4. **Overflow 5 KPI Program 1 pada Mockup Asli (`mockup-investasi.html`) untuk Angka 9+ Digit**:
   - **Masalah di `mockup-investasi.html` asli**: Pada desktop `1440×900`, `.kpi-grid` Program 1 menempatkan 5 kartu sejajar (`clientWidth` teks ~`103px`) di sebelah panel `Parameter Simulasi` (`380px`). Dengan `.kpi-value` `1.18rem` (`18.88px`), angka penuh 9+ digit seperti `Rp 377.451.000` / `Rp 795.545.464` pada mockup asli pun meluber keluar batas kartu (`scrollWidth` `142–153px`).
   - **Solusi yang disetujui (C2 Opsi a)**: `index.html` tetap mempertahankan `.kpi-value` `1.18rem` dan grid 5 kolom persis mockup, sementara tampilan teks 5 KPI Program 1 dipendekkan via `fmtCompact()` + `title` penuh di [`app.js`](app.js#L1161-L1185).

---

## 9. Cara Menjalankan Lokal, Deploy Vercel & Rollback

### Uji Lokal
```powershell
python -m http.server 4173
# Buka http://localhost:4173/
```

### Deploy Vercel
1. Pastikan branch utama di-push ke repository Git yang terhubung ke Vercel.
2. Konfigurasi Vercel: Framework Preset **Other**, Build Command *(kosong)*, Output Directory **`.`**.
3. File [`_asli/`](_asli/), [`verify-formulas.js`](verify-formulas.js), [`supabase-schema.sql`](supabase-schema.sql), `Screenshot*.png`, `mockup-investasi.html`, dan `*.md` otomatis tidak ikut terpublikasi karena sudah tercantum di [`.vercelignore`](.vercelignore).

### Prosedur Rollback Lokal
Workspace bukan repositori Git; gunakan [`_asli/app.js`](_asli/app.js) dan [`index-legacy.html`](index-legacy.html):
```powershell
Move-Item -Path "index.html" -Destination "index-migrated-failed.html" -Force
Move-Item -Path "index-legacy.html" -Destination "index.html" -Force
Copy-Item -Path "_asli/app.js" -Destination "app.js" -Force
```

---

## 10. Aturan Kerja & Daftar Skill

### Aturan Wajib Agent/Developer
1. **Jangan mengubah 13 fungsi rumus & 5 konstanta** tanpa persetujuan eksplisit pemilik. Selalu jalankan `node verify-formulas.js _asli/app.js app.js` dan `node --check app.js` setelah menyentuh `app.js`.
2. **Jangan pernah mengubah atau menimpa [`_asli/app.js`](_asli/app.js)** ataupun menghapus [`index-legacy.html`](index-legacy.html).
3. **Dilarang menaruh `service_role` key** atau secret privat apa pun di kode frontend/repo; hanya gunakan `anon` key di `supabase-config.js`.
4. **Jangan mengembalikan data dummy** atau `trx_demo_1`/`trx_demo_2` ke UI Investasi baru.
5. **Verifikasi sebelum klaim selesai**: pastikan browser console bersih dari error JS/aset lokal, status Supabase aktif, dan UI desktop/mobile (`<= 1024px`) bebas overflow.

### Skill Terkait Proyek
- `executing-plans`, `writing-plans` — perencanaan & eksekusi bertahap migrasi.
- `verification-before-completion` — bukti uji Node, `verify-formulas.js`, dan browser sebelum klaim selesai.
- `requesting-code-review`, `receiving-code-review` — audit kualitas & tinjauan kode sebelum merge/deploy.
- `ui-ux-pro-max`, `frontend-design`, `shadcn` — konsistensi sistem desain & aksesibilitas UI mockup.
