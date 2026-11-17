# Plan Migrasi Desain `mockup-investasi.html` ke Halaman Utama (`index.html`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menggantikan halaman utama lama dengan desain final `mockup-investasi.html` tanpa mengubah tampilan, warna, layout, teks UI, ataupun rumus perhitungan asli di `app.js` / `decision-desk.js`, serta memastikan seluruh alur data Supabase Realtime dan static deploy Vercel berjalan aman.

**Architecture:** Aplikasi statis vanilla HTML/CSS/JavaScript tanpa build step, di-host di Vercel (root `.`) dengan backend Supabase (PostgreSQL + RLS `anon` key + Realtime channel `"catatan-kas-realtime"`). Halaman `index.html` lama diarsipkan menjadi `index-legacy.html`, `mockup-investasi.html` disalin menjadi `index.html` (hanya tab Investasi: Program 1, Program 2, Tools), `decision-desk.js` tetap disimpan di repo namun **tidak dimuat** di `index.html` (kode mati / nonaktif), dan `app.js` diadaptasi via *binding/selector mapping* dengan null-guard untuk logika non-investasi tanpa mengubah rumus.

**Tech Stack:** HTML5, CSS3 (custom properties + responsive grid), Vanilla JavaScript (ES2020+), Chart.js `4.6.1` CDN (pinned), `@supabase/supabase-js@2.119.0` CDN (pinned), Supabase PostgreSQL Realtime, Vercel Static Hosting.

**Spec:** Hasil Fase 1 (pemetaan rumus `app.js` & `decision-desk.js`, alur data Supabase 7 tabel, Gap Analysis 181 ID legacy vs 158 ID mockup, serta Aturan Keras #1–#6 dari user).

---

## Global Constraints

1. **Rumus & konstanta tidak berubah**: Dilarang mengubah `DEFAULT_SIMULATOR_CONFIG`, `SIMULATION_MONTHS`, `LOT_SIZE`, `CORE_STOCKS`, `SELLING_FEE_RATE`, `simulateInvestment()`, `buyCustomLotsWithDividendPolicy()`, `buyAffordableCustomLots()`, `buyRepeatingCustomLots()`, `dividendPerShare()`, `applyAnnualPriceChange()`, `actualInvestmentForSimulationMonth()`, `calculateInvestmentSummary()`, `avgSimCalcScenario()`, `avgSimRiskOpinion()`, `renderKalkulatorPorsi()`, `renderAsetPersenSimulator()`, maupun logika `decision-desk.js`.
2. **Desain UI final tetap**: Dilarang mengubah tampilan, layout, warna, atau teks UI yang sudah disetujui pada `mockup-investasi.html`.
3. **Arsip halaman lama**: Halaman `index.html` lama tidak boleh dihapus; wajib di-rename menjadi `index-legacy.html`.
4. **Keamanan kredensial**: Hanya gunakan `anon` public key + RLS di `supabase-config.js`. Dilarang menaruh `service_role` key atau secret baru di repo.
5. **Urutan script & stylesheet *(Revisi #2a, #7)***:
   - Stylesheet: `./styles.css` sebelum `<style>` mockup agar tidak menimpa token desain mockup.
   - Script wajib berurutan di akhir `<body>` dengan CDN versi terpin (tanpa `./decision-desk.js` karena tab Decision Desk dihapus; file tetap ada di repo sebagai kode nonaktif):
     1. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0`
     2. `https://cdn.jsdelivr.net/npm/chart.js@4.6.1`
     3. `./supabase-config.js`
     4. `./app.js`
6. **Tanpa data dummy & hapus `#resetDummyBtn` *(Revisi #5, #6)***: Hapus `#resetDummyBtn` dan handler UI-nya (simpan `resetRemoteData()` di `app.js` tanpa dipanggil UI). Hapus angka/teks/placeholder dummy hardcode di `index.html` (ganti `"—"`/`"Memuat..."`), hapus prefill contoh di calculator Tools; pertahankan parameter konfigurasi rumus (`DEFAULT_SIMULATOR_CONFIG`, `CORE_STOCKS`, `LOT_SIZE`, `SELLING_FEE_RATE`, `simulator_config`).
7. **Deploy Vercel bersih *(Revisi #8)***: Path aset lokal harus relatif (`./...`), dan `.vercelignore` mengecualikan `Screenshot*.png`, `supabase-schema.sql`, `PLAN-MIGRASI.md`, `mockup-investasi.html`, serta `*.md` yang tidak perlu publik.
8. **Keputusan Produk *(Final)***: Aplikasi hanya memuat tab **Investasi** (`Program 1`, `Program 2`, `Tools`). Tab `Dashboard`, `Transaksi`, `Kategori`, dan `Decision Desk` sengaja dihapus dari UI (bukan bug/fitur hilang). Logika non-investasi di `app.js` tetap dipertahankan dengan guard `!isInvestmentsOnlyLayout`.
9. **Titik Berhenti *(wajib lapor sebelum eksekusi lanjut)***: Berhenti dan minta konfirmasi user bila: (a) ditemukan bug/ketidakkonsistenan rumus, (b) ada perhitungan baru (`renderStrategySummary`, milestone, `#kpiMultiple`, ringkasan akordeon), (c) audit RLS berisiko (`using (true)`), (d) status *Posisi Portofolio Aktual*, (e) permintaan non-investasi di `loadRemoteState()`/`initRemoteStore()`, atau (f) perilaku cache `localStorage` (`"catatan-kas-v1"`) saat Supabase gagal.

## Review Focus

1. **Sinkronisasi awal cloud saat view default adalah `investasi`**: Jika `initRemoteStore().then(renderAll)` tidak memanggil `markInvestmentsDirty()` di `loadRemoteState()`, tabel & KPI Program 2 tetap kosong (`Rp0` / `0 entri`) meski data cloud sudah terambil.
2. **Input `#simMonthlyDeposit` berformat pemisah ribuan (`.` )**: `readNumber()` (`Number("1.100.000")`) menghasilkan `NaN`; input berformat ribuan wajib dibaca dengan `parseNumberInput()` agar nilai numerik tetap identik dengan input mentah.
3. **Elemen null dari view non-investasi & elemen opsional**: Menghapus `dashboardView`/`transactionsView`/`categoriesView`/`decisionView`/`toolsView` dan `#simBtcHint`/`#simStockAllocationNumber`/`#portfolioAnalysisTable` menyebabkan `Uncaught TypeError` pada `app.js` jika tidak ada null-guard (`if (!isInvestmentsOnlyLayout)` dan `if (el.xxx)`).
4. **Overriding CSS antara `styles.css` lama dan mockup, serta `[hidden]` pada `.btn`**: Jika `styles.css` dimuat bersama style mockup, selector global (`body`, `.card`, `.nav-item`, `.btn`) berisiko bentrok; selain itu `.btn { display: inline-flex }` mengalahkan atribut HTML `[hidden]` sehingga tombol `Batal Edit` harus memakai class `.hidden` sekaligus `btn.hidden`.
5. **Fallback tabel `public.btc_purchases` (HTTP 404 pada schema lama)**: Jika project Supabase belum menjalankan migrasi `btc_purchases` dari `supabase-schema.sql`, `loadRemoteInvestments()` dan `persistBtcPurchase()` harus tetap aman memakai backup `investment_settings.simulator_config.btcPurchases` tanpa menggagalkan render.

---

## Rencana Tugas Step-by-Step

### Task 1: Backup Halaman Lama & Artefak Deploy Ignore

**Files:**
- Rename/Backup: `index.html` → `index-legacy.html`
- Create: `.vercelignore`
- Verify: `README.md`, `TUTORIAL-DEPLOY.md`, `Screenshot*.png` (tidak ada yang terhapus)

**Interfaces:**
- Produces: `index-legacy.html` sebagai salinan utuh halaman lama; `.vercelignore` mengecualikan `Screenshot*.png`.

- [ ] **Step 1: Pastikan status awal & backup Git / file**

Run:
```powershell
Test-Path index.html; Test-Path mockup-investasi.html
```
Expected: Keduanya `True` (jika `index.html` belum di-backup).

- [ ] **Step 2: Rename `index.html` menjadi `index-legacy.html`**

Run:
```powershell
Move-Item -Path "index.html" -Destination "index-legacy.html"
```
Expected: `index-legacy.html` ada, `index.html` lama sudah berpindah.

- [x] **Step 3: Buat `.vercelignore` *(Revisi #8)***

Isi `.vercelignore`:
```gitignore
Screenshot*.png
supabase-schema.sql
PLAN-MIGRASI.md
mockup-investasi.html
README.md
TUTORIAL-DEPLOY.md
AGENTS.md
*.md
```

- [x] **Step 4: Verifikasi keberadaan backup & ignore file**

Run:
```powershell
Test-Path index-legacy.html; Get-Content .vercelignore
```
Expected: `True` dan output `Screenshot*.png`.

---

### Task 2: Salin `mockup-investasi.html` Menjadi `index.html` & Hubungkan Stylesheet + Script

**Files:**
- Source: `mockup-investasi.html`
- Create: `index.html`
- Reference: `styles.css`, `supabase-config.js`, `decision-desk.js`, `app.js`

**Interfaces:**
- Consumes: Desain CSS, HTML, ID, dan teks UI dari `mockup-investasi.html`.
- Produces: `index.html` dengan badge `#syncStatus` + `#syncStatusText`, `<link rel="stylesheet" href="./styles.css" />` yang tidak menimpa style mockup, dan urutan `<script>` yang diminta tanpa script dummy inline.

- [ ] **Step 1: Salin `mockup-investasi.html` ke `index.html` dan pasang hook `#syncStatus`**

Pertahankan seluruh struktur DOM, CSS `<style>`, layout, warna, dan teks UI. Pada badge status topbar, pasang hook status sinkronisasi:
```html
<span class="badge badge-emerald" id="syncStatus">
  <span class="pulse-dot"></span>
  <span id="syncStatusText">Mode lokal</span>
</span>
```

- [ ] **Step 2: Hubungkan `./styles.css` tanpa merusak tampilan mockup**

Letakkan `<link rel="stylesheet" href="./styles.css" />` **sebelum** blok `<style>` final mockup di `<head>`, dan pastikan tidak ada rule `styles.css` yang menimpa token/layout mockup (mis. `.app-shell`, `.sidebar`, `.nav-item`, `.input`, `.select`, `body`). Jika ada properti di `styles.css` yang memiliki spesifisitas lebih tinggi (seperti `.app-shell.sidebar-collapsed .sidebar`), pastikan rule pada `<style>` mockup di bawahnya tetap menang atau tetap eksplisit.

- [ ] **Step 3: Hapus `#resetDummyBtn`, data dummy hardcode, `<script>` dummy inline, dan pasang CDN terpin *(Revisi #2a, #5, #6, #7)***

- Hapus tombol `#resetDummyBtn` dari topbar.
- Ganti seluruh teks/angka dummy hardcode (KPI, banner sinkron, akordeon ringkasan, pill sidebar, *Modal Tercatat*, `actualMonthTitle`) dengan `"—"` atau `"Memuat..."`; kosongkan nilai contoh prefill Tools dan netralkan placeholder input. Pertahankan parameter konfigurasi rumus.
- Pasang urutan script resmi tanpa `./decision-desk.js` dan dengan CDN terpin:
```html
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.6.1"></script>
    <script src="./supabase-config.js"></script>
    <script src="./app.js"></script>
  </body>
</html>
```

- [ ] **Step 4: Verifikasi path relatif, CDN terpin, & ketiadaan sisa dummy *(Revisi #6g, #7)***

Run:
```powershell
Select-String -Path index.html -Pattern 'createInitialMockState|runSimulation|resetDummyBtn|Oktober 2026|40\.000\.000|60\.000\.000|100\.000\.000|4\.350|3\.980|1\.800\.000|300rb|http://localhost'
Select-String -Path index.html -Pattern 'styles\.css|supabase-js@|chart\.js@|supabase-config\.js|app\.js'
```
Expected: Query pertama 0 temuan; query kedua menampilkan CDN terpin `@2.119.0` & `@4.6.1` dan `./styles.css`, `./supabase-config.js`, `./app.js` tanpa `decision-desk.js`.

---

### Task 3: Pemetaan Selector & Adaptasi Binding di `app.js`

**Files:**
- Modify: `app.js` (`activeView`, `el`, `setSyncStatus`, helper visual, `readSimulationInputs`, `applySimulatorConfigToForm`, `initInvestmentCharts`, `updateInvestmentSimulator`, `renderAll`, `renderInvestmentTables`, `renderInvestmentSummary`, `renderKalkulatorPorsi`, `initAsetPersenSimulator`, `renderAsetPersenSimulator`, `avgSimRenderResult`, `initAvgDownUpSimulator`, `setupInvestmentTabs`, `switchInvestmentTab`, `initEvents`, bootstrap)

**Interfaces:**
- Consumes: ID & class di `index.html` (dan fallback ID `index-legacy.html`).
- Produces: Binding DOM 100% cocok dengan `index.html` baru tanpa mengubah satu pun fungsi rumus.

- [ ] **Step 1: Deteksi layout & update dictionary `el` dengan fallback selector**

Gunakan `const isInvestmentsOnlyLayout = !document.querySelector("#dashboardView");` dan `let activeView = isInvestmentsOnlyLayout ? "investments" : "dashboard";`. Petakan seluruh selector di `el`:

| Komponen | Selector Mockup (`index.html`) | Fallback Legacy (`index-legacy.html`) |
|---|---|---|
| Status sync | `#syncStatus`, `#syncStatusText` | `#syncStatus`, `#storageHint` |
| Simulator form & setoran | `#simulatorForm`, `#simBtcMonthly` | `#investmentSimulatorForm`, `#simBtcMonthlyContribution` |
| Alokasi & slider | `#simStockAllocation`, `#simAllocLabel`, `#simRdpuAllocLabel`, `#simStockAllocAmount`, `#simRdpuAllocAmount` | `#simStockAllocationNumber`, `#simRdpuAllocationLabel`, `#simStockAllocationAmount`, `#simRdpuAllocationAmount` |
| Custom lot & preset | `#simBmriLots`, `#simBbriLots`, `[data-lot-preset]`, `#customBmriOut`, `#customBbriOut`, `#customStockOut`, `#customRdpuOut`, `#customLotStatus` | `#simBmriMonthlyLots`, `#simBbriMonthlyLots`, `[data-sim-lot-preset]`, `#simCustomBmriPurchase`, `#simCustomBbriPurchase`, `#simCustomStockPurchase`, `#simCustomRdpuPurchase`, `#simCustomLotStatus` |
| Dividen awal | `#simBmriDiv`, `#simBbriDiv` | `#simBmriYield`, `#simBbriYield` |
| KPI & banner Program 1 | `#syncBanner`/`Title`/`Text`/`Meta`, `#kpiTotalContribution`/`Meta`, `#kpiFinalAsset`, `#kpiMultiple`, `#kpiNetProfit`, `#kpiPassiveIncome`, `#kpiBtcValue`, `#kpiBtcSub`, `#chartMultipleBadge` | `#programActualSyncBanner`/`Title`/`Text`/`Meta`, `#simTotalContribution`/`Meta`, `#simFinalAsset`, `#simNetProfit`, `#simPassiveIncome`, `#simBtcValue`, `#simBtcKpiContribution`, `#simAssetMultiple` |
| Posisi Akhir | `#posBmriLots`/`Val`/`Bar`, `#posBbriLots`/`Val`/`Bar`, `#posRdpuVal`/`Share`/`Bar`, `#posBtcShare`/`Bar`/`Val`, `#statSellingFee`, `#statTotalDividends`, `#statTotalRdpu`, `#statRdpuGain` | `#simBmriLots`/`Value`/`Bar`, `#simBbriLots`/`Value`/`Bar`, `#simRdpuValue`/`Share`/`Bar`, `#simBtcPositionShare`/`Bar`/`Value`, `#simSellingFee`, `#simTotalDividends`, `#simTotalRdpuContributions`, `#simRdpuReturnGain` |
| Chart & tabel Program 1 | `#growthChartCanvas`, `#simHistoryBody`, `#simDividendBody` | `#investmentGrowthChart`, `#simHistoryTable`, `#simDividendPurchaseTable` |
| Program 2 (Aktual) | `#actualHorizonInput`, `#addHorizonYearBtn`, `#actKpiStock`/`Lots`/`Rdpu`/`Btc`/`Portfolio`, `#actualMonthTitle`/`Meta`/`Bmri`/`Bbri`/`Rdpu`/`Total`, `#tickerAddForm`/`#newTickerInput`/`#tickerChips`, `#stockPurchaseForm`/`#stockForm*`/`#actualStockBody`, `#rdpuForm*`/`#actualRdpuBody`, `#btcForm*`/`#actualBtcBody`, `#annualSummaryBody` | `#investmentHorizon`, `#addInvestmentYearButton`, `#investmentStockTotal`/`LotTotal`/`RdpuTotal`/`BtcTotal`/`PortfolioTotal`, `#investmentActualMonthTitle`..`Total`, `#investmentTickerForm`/`Input`/`List`, `#investmentStockForm`..`Table`, `#investmentRdpuForm`..`Table`, `#investmentBtcForm`..`Table`, `#investmentSummaryTable` |
| Chart & info Aktual | `#stockPurchaseChartCanvas`, `#stockChartTickerFilter`/`YearFilter`, `#infoTickerFilter`/`YearFilter`, `#infoMin*`/`Max*` | `#investmentStockChart`, `#investmentStockChartTickerFilter`/`YearFilter`, `#investmentInfoTickerFilter`/`YearFilter`, `#investmentMin*`/`Max*` |
| Tools Kalkulator | `#kalcSaham`, `#kalcEtf`, `#kalcOutput`, `#apTotalAset`, `#apRows`, `#apAddRowBtn`, `#apCalcBtn`, `#apOutput`, `#avgNow`, `#lotNow`, `#hargaBaru`, `#lotBaru`, `#avgCalcBtn`, `#avgError`, `#avgOutput` | `#kalcSaham`, `#kalcEtf`, `#kalcOutput`, `#apTotalAset`, `#apRows`, `#apAddRow`, `#apHitung`, `#apOutput`, `#avgSimAvgNow`, `#avgSimLotNow`, `#avgSimHargaBaru`, `#avgSimLotBaru`, `#avgSimHitung`, `#avgSimError`, `#avgSimOutput` |

- [ ] **Step 2: Tambah null-guard untuk view non-investasi & elemen opsional**

  - Di `renderAll()` dan `initEvents()`: jalankan bagian `Dashboard`, `Transaksi`, `Tab & Jenis`, `Export/Import` hanya jika `!isInvestmentsOnlyLayout` (dan gunakan `?.`).
  - Guard `el.simBtcContributionInfo`, `el.simStockAllocationNumber`, `el.simPriceChangePanel/Toggle/Fields`, `el.simDividendPurchaseTableWrap/Empty`, `el.investmentActualUsed`, `el.investmentStockChartEmpty`, dan `el.portfolioAnalysisTable` (sudah di-guard `if (!table || !summary) return;`).
  - Di `decision-desk.js`: `initDecisionDesk()` sudah melakukan `const view = document.querySelector("#decisionView"); if (!view) return;`, sehingga aman dimuat sebelum `app.js` tanpa memodifikasi `decision-desk.js`.

- [ ] **Step 3: Sinkronkan renderer & mikro-interaksi UI mockup**

  - `readSimulationInputs()`: baca `simMonthlyDeposit` memakai `parseNumberInput(...)` pada `isInvestmentsOnlyLayout` dan `allocInput = el.simStockAllocationNumber || el.simStockAllocation`.
  - `updateInvestmentSimulator()`: render `#kpiMultiple`, `#simAllocLabel`, slider track fill (`updateSliderTrack`), ringkasan akordeon `#acc01Summary`–`#acc04Summary`, serta card `Ringkasan Jalur Strategi & Milestone` (`renderStrategySummary(inputs, result)` menggunakan output `simulateInvestment` tanpa mengubah rumus).
  - `setupInvestmentTabs()` & `switchInvestmentTab(tab)`: ikat `.tab-trigger[data-tab]` dan sidebar `[data-tab-nav]`, update `#topbarSubtitle`, dan resize chart.
  - `enter*EditMode` / `exit*EditMode`: toggle **keduanya** `btn.hidden` dan `btn.classList.toggle("hidden", ...)` agar tombol `Batal Edit` tersembunyi benar walau `.btn` memakai `display: inline-flex`.
  - Pasang handler `#toggleAllAccBtn`, `#themeToggle` (`localStorage` key `"catatan-kas-theme"` + `updateInvestmentThemeCharts()`), `showToast()` (`#toastStack`), dan `triggerKpiFlash()`.

- [ ] **Step 4: Verifikasi sintaks & audit seluruh ID DOM**

Run:
```powershell
node --check app.js
```
Expected: Exit code `0`.

---

### Task 4: Ganti Data Dummy dengan Alur Data & Sinkronisasi Supabase

**Files:**
- Modify: `app.js` (`loadRemoteState()`, `renderInvestmentSummary()`, `el.resetButton`)
- Verify: `supabase-config.js`, `supabase-schema.sql`

**Interfaces:**
- Consumes: `window.CATATAN_KAS_SUPABASE` (`url`, `anonKey`) dari `supabase-config.js`, 7 tabel Supabase di `supabase-schema.sql`.
- Produces: Sinkronisasi awal cloud & realtime aktif ke UI baru tanpa data dummy statis.

- [ ] **Step 1: Pastikan `loadRemoteState()` menandai `markInvestmentsDirty()`**

Di akhir `loadRemoteState()` (setelah `saveState()`), panggil `markInvestmentsDirty();` agar `initRemoteStore().then(renderAll)` selalu me-render ulang KPI, tabel Program 2, dan sidebar modal tercatat saat `activeView === "investments"`.

- [ ] **Step 2: Pastikan `renderInvestmentSummary()` mengisi ringkasan sidebar**

Update `#sidebarModalValue`, `#sideLotTotal`, `#sideStockVal`, `#sideRdpuVal`, `#sideBtcVal` langsung dari hasil `calculateInvestmentSummary()`, serta `#tabBadgeRecords` & `#sidePillRecords` dari `stockRows.length + rdpuRows.length + btcRows.length`.

- [ ] **Step 3: Hapus handler UI `#resetDummyBtn` dan pertahankan `resetRemoteData()` *(Revisi #5)***

Hapus fallback `#resetDummyBtn` dari `el.resetButton` dan bungkus listener `el.resetButton` hanya untuk layout legacy (`!isInvestmentsOnlyLayout`). Fungsi `resetRemoteData()` di `app.js` **tidak dihapus** dan tidak dipanggil dari UI baru. Catat status ini di `AGENTS.md`.

- [ ] **Step 4: Hapus contoh dummy di Tools & pastikan empty/error state bersih *(Revisi #6b–6d)***

- Di `initAsetPersenSimulator()`: hapus `apAddRow("Saham Bluechip", ...)`, ganti dengan 2 baris kosong (`apAddRow(); apAddRow();`).
- Di `initAvgDownUpSimulator()`: saat input kosong di awal, tampilkan empty state informatif di `#avgOutput` tanpa memicu error `#avgError`.
- Saat Supabase gagal/offline: `#syncStatusText` menampilkan status error (`"Cloud gagal, mode lokal"`) tanpa mengisi data dummy. *(Titik berhenti: konfirmasi perilaku cache `localStorage` `"catatan-kas-v1"` dengan user).*

- [ ] **Step 5: Verifikasi keamanan key & tabel Supabase**

Run:
```powershell
Select-String -Path index.html,app.js,supabase-config.js,decision-desk.js -Pattern 'service_role'
```
Expected: Tidak ada output (0 temuan).

*(Catatan operasional: jika console/network browser mencatat `404` pada `/rest/v1/btc_purchases`, jalankan blok `create table public.btc_purchases ...` dari `supabase-schema.sql` di Supabase SQL Editor secara terpisah; aplikasi tetap aman memakai backup `simulator_config.btcPurchases`.)*

---

### Task 5: Cek Path Relatif untuk Vercel & Verifikasi End-to-End di Browser

**Files:**
- Verify: `index.html`, `index-legacy.html`, `app.js`, `decision-desk.js`, `styles.css`, `supabase-config.js`, `.vercelignore`

**Interfaces:**
- Produces: Bukti verifikasi siap deploy Vercel (static preset `Other`, output directory `.`).

- [ ] **Step 1: Audit seluruh path relatif & kesiapan Vercel**

Run:
```powershell
Select-String -Path index.html -Pattern 'href=|src='
Test-Path vercel.json
```
Expected: Semua aset lokal memakai `./...` (`./styles.css`, `./supabase-config.js`, `./decision-desk.js`, `./app.js`), tidak ada path absolut `C:\...` atau `/C:/...`.

- [ ] **Step 2: Jalankan static server lokal & buka di browser**

Run:
```powershell
python -m http.server 4173
```
Buka `http://localhost:4173/`.

- [ ] **Step 3: Checklist verifikasi fungsional & responsif (read-only tanpa merusak data cloud)**

  1. Console & page errors: **0 error**.
  2. `#syncStatusText`: berubah dari `Mode lokal` → `Cloud realtime aktif` (atau `Mode lokal` jika offline).
  3. **Program 1**: 5 KPI + `#kpiMultiple`, `#growthChartCanvas`, *Posisi Akhir*, *Strategi & Milestone*, *Riwayat Tahunan*, *Pembelian dari Dividen*, akordeon `03`/`04`, dan toggle `Custom lot bulanan` berfungsi; angka KPI tidak terpotong di `1440x900`.
  4. **Program 2**: 5 KPI, tabel Saham/RDPU/BTC, *Akumulasi Tahunan*, `#stockPurchaseChartCanvas`, filter, *Informasi Pembelian*, dan sidebar *Modal Tercatat* terisi sesuai data aktual.
  5. **Tools**: Hanya 3 alat (*Kalkulator Komposisi*, *Average Down / Up*, *Simulator Persentase Aset*) dengan empty state awal (tanpa contoh angka dummy); *Posisi Portofolio Aktual* tidak ada. *(Catatan: hilangnya tab Dashboard, Transaksi, Kategori, Decision Desk adalah keputusan produk final).*
  6. **Responsif & Tema**: `1440x900` (2 kolom + sidebar) dan `1000x800` (tanpa sidebar, `<main>` full width) tidak overflow; `#themeToggle` Light/Dark bekerja.

- [ ] **Step 4: Hentikan server lokal setelah verifikasi**

---

### Task 6: Paritas Rumus (`index-legacy.html` vs `index.html`) *(Revisi #1 & #3)*

- [ ] **Step 1: Jalankan pengujian paritas fungsi rumus di Node.js**

Jalankan `simulateInvestment()` dan fungsi turunannya (`buyCustomLotsWithDividendPolicy()`, `avgSimCalcScenario()`, `calculateInvestmentSummary()`) dengan minimal 3 skenario input berbeda (Selang-seling default, Custom lot + Reinvest ON, Price change + Override Aktual + BTC) untuk membuktikan output versi lama vs versi baru identik 100%.

- [ ] **Step 2: Cek integritas fungsi rumus & laporkan perhitungan UI baru**

Periksa keberadaan `.git` (atau bandingkan langsung blok rumus `app.js`). Laporkan perhitungan tampilan baru (`renderStrategySummary`, `milestoneStrip`, `#kpiMultiple`, `#acc01Summary`–`#acc04Summary`) untuk persetujuan user di Titik Berhenti.

---

### Task 7: Audit RLS & Query Non-Investasi Supabase *(Revisi #2c & #4)*

- [ ] **Step 1: Audit seluruh policy RLS di `supabase-schema.sql`**

Daftar seluruh policy tiap tabel (`categories`, `transactions`, `investment_settings`, `investment_tickers`, `stock_purchases`, `rdpu_purchases`, `btc_purchases`) dan evaluasi risikonya dengan `anon` key (`using (true)` / `with check (true)`). Laporkan ke user di Titik Berhenti.

- [ ] **Step 2: Audit query `initRemoteStore()` / `loadRemoteState()`**

Periksa request non-investasi (`categories`, `transactions`), perilaku auto-upsert `defaultState` jika DB kosong, dan laporkan ke user di Titik Berhenti tanpa mengubahnya diam-diam.

---

### Task 8: Fase 5 — Dokumentasi `AGENTS.md` & `requesting-code-review` *(Revisi #9)*

- [ ] **Step 1: Tulis `AGENTS.md` lengkap** (setelah seluruh Titik Berhenti diputuskan user): ringkasan produk, stack Vercel + Supabase, struktur file, kamus rumus, alur data, skema DB + RLS, cara deploy, aturan kerja, daftar skill, status `decision-desk.js` nonaktif, dan status `resetRemoteData()` / logika non-investasi.
- [ ] **Step 2: Jalankan verifikasi final & `requesting-code-review`.**

---

## Risiko & Rencana Rollback

### Matriks Risiko

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Bentrokan CSS `./styles.css` dengan `<style>` mockup pada selector bernama sama (`.sidebar`, `.nav-item`, `.btn`, `.card`) | Layout atau warna komponen mockup berubah | Tempatkan `./styles.css` sebelum `<style>` mockup dan uji visual pada `1440x900` & `1000x800`; jika masih bentrok pada selector spesifisitas tinggi, jadikan `./styles.css` hanya dipakai oleh `index-legacy.html` sementara `index.html` memakai `<style>` mandiri mockup |
| Error null DOM pada `app.js` karena elemen view lama tidak ada di `index.html` | Render berhenti di tengah jalan dan `initRemoteStore()` tidak pernah jalan | Bungkus seluruh listener & renderer non-investasi dengan `if (!isInvestmentsOnlyLayout)` dan null-guard `if (el.xxx)` |
| `#resetDummyBtn` ditekan tidak sengaja oleh user | Data produksi di `localStorage` & Supabase ter-reset ke `defaultState` | Wajib lindungi dengan dialog `confirm(...)` sebelum memanggil `resetRemoteData()` |
| Tabel `public.btc_purchases` belum dibuat di project Supabase tertentu | Request `GET /rest/v1/btc_purchases` HTTP 404 | `isMissingInvestmentTableError(error)` menangkap `404`/`42P01` dan fallback otomatis ke `investment_settings.simulator_config.btcPurchases` |
| Tombol `Batal Edit` tetap muncul meski `btn.hidden = true` | Form edit terlihat membingungkan | Gunakan **keduanya** `btn.hidden = ...` dan `btn.classList.toggle("hidden", ...)` |
| `Screenshot*.png` atau file mockup ikut terpublikasi ke URL Vercel | File tidak perlu ter-host di CDN produksi | Kecualikan `Screenshot*.png` di `.vercelignore` (dan tambahkan `mockup-investasi.html` / `PLAN-MIGRASI.md` jika ingin di-exclude dari deploy) |

### Prosedur Rollback Cepat

Jika terjadi masalah kritis setelah deploy atau saat pengujian lokal:

1. **Rollback file secara lokal (instan tanpa kehilangan data Supabase)**:
   Workspace bukan repositori Git; sumber pemulihan resmi adalah folder `_asli/app.js` dan `index-legacy.html` (dari zip asli `ori-Uanggggggg-main`):
   ```powershell
   Move-Item -Path "index.html" -Destination "index-migrated-failed.html" -Force
   Move-Item -Path "index-legacy.html" -Destination "index.html" -Force
   Copy-Item -Path "_asli/app.js" -Destination "app.js" -Force
   ```
   *(Jangan mengubah atau menimpa `_asli/app.js`.)*
2. **Rollback di Vercel (produksi)**:
   - Opsi A (tercepat): Di dashboard Vercel → **Deployments** → pilih deployment stabil sebelumnya → **Instant Rollback**.
   - Opsi B (via Git): Jalankan `git revert <commit-migrasi>` dan push ke branch utama agar Vercel auto-deploy kembali ke `index.html` lama.
3. **Integritas data**: Karena migrasi tidak mengubah skema tabel Supabase maupun key `localStorage` (`"catatan-kas-v1"`), seluruh data transaksi dan investasi user tetap utuh selama dan sesudah rollback.
