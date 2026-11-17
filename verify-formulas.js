#!/usr/bin/env node
/**
 * verify-formulas.js
 * Membandingkan fungsi rumus & konstanta antara app.js ASLI dan app.js hasil migrasi.
 *
 * Pemakaian:
 *   node verify-formulas.js <app.js-asli> <app.js-baru>
 *
 * Hasil:
 *   - FORMULA (kritis): fungsi/konstanta yang tidak boleh berubah. Beda = exit code 1.
 *   - LAINNYA (info)  : fungsi lain yang berubah/ditambah/dihapus (binding UI, dsb.).
 * Perbandingan mengabaikan perbedaan line ending (CRLF/LF) dan spasi di ujung baris.
 */
const fs = require("fs");
const crypto = require("crypto");

const FORMULA_FUNCTIONS = [
  "simulateInvestment",
  "buyCustomLotsWithDividendPolicy",
  "buyAffordableCustomLots",
  "buyRepeatingCustomLots",
  "dividendPerShare",
  "applyAnnualPriceChange",
  "actualInvestmentForSimulationMonth",
  "calculateInvestmentSummary",
  "avgSimCalcScenario",
  "avgSimRiskOpinion",
  "renderKalkulatorPorsi",
  "renderAsetPersenSimulator",
  "calculatePortfolioAnalysis",
];
const FORMULA_CONSTANTS = [
  "SIMULATION_MONTHS",
  "LOT_SIZE",
  "CORE_STOCKS",
  "SELLING_FEE_RATE",
  "DEFAULT_SIMULATOR_CONFIG",
];

const norm = (s) =>
  s.replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();
const hash = (s) => crypto.createHash("sha256").update(norm(s)).digest("hex").slice(0, 12);

// Cari akhir blok yang diawali '{' atau nilai const, dengan melewati string/komentar/template.
function matchEnd(src, start, open, close) {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (c === "/" && n === "/") { i = src.indexOf("\n", i); if (i < 0) return src.length; continue; }
    if (c === "/" && n === "*") { i = src.indexOf("*/", i) + 1; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      for (i++; i < src.length; i++) {
        if (src[i] === "\\") { i++; continue; }
        if (q === "`" && src[i] === "$" && src[i + 1] === "{") {
          i = matchEnd(src, i + 1, "{", "}");
          continue;
        }
        if (src[i] === q) break;
      }
      continue;
    }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function extractFunctions(src) {
  const out = {};
  const re = /^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/gm;
  let m;
  while ((m = re.exec(src))) {
    const bodyStart = src.indexOf("{", re.lastIndex);
    const end = matchEnd(src, bodyStart, "{", "}");
    if (end > 0) out[m[1]] = src.slice(m.index, end + 1);
  }
  return out;
}

function extractConst(src, name) {
  const re = new RegExp("^const\\s+" + name + "\\s*=", "m");
  const m = re.exec(src);
  if (!m) return null;
  const rest = src.slice(m.index);
  const b = rest.search(/[\[{]/);
  const semi = rest.indexOf(";");
  if (b >= 0 && b < semi) {
    const open = rest[b], close = open === "[" ? "]" : "}";
    const end = matchEnd(rest, b, open, close);
    return rest.slice(0, rest.indexOf(";", end) + 1);
  }
  return rest.slice(0, semi + 1);
}

function firstDiffLine(a, b) {
  const A = norm(a).split("\n"), B = norm(b).split("\n");
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if (A[i] !== B[i]) return `baris ${i + 1}\n      asli: ${A[i] ?? "(tidak ada)"}\n      baru: ${B[i] ?? "(tidak ada)"}`;
  }
  return "";
}

const [, , pathOld, pathNew] = process.argv;
if (!pathOld || !pathNew) {
  console.error("Pemakaian: node verify-formulas.js <app.js-asli> <app.js-baru>");
  process.exit(2);
}
const srcOld = fs.readFileSync(pathOld, "utf8");
const srcNew = fs.readFileSync(pathNew, "utf8");
const fOld = extractFunctions(srcOld), fNew = extractFunctions(srcNew);

let critical = 0;
console.log("== FORMULA & KONSTANTA (harus identik) ==");
for (const name of FORMULA_CONSTANTS) {
  const a = extractConst(srcOld, name), b = extractConst(srcNew, name);
  if (a === null && b === null) { console.log(`  ?  ${name}: tidak ditemukan di keduanya`); continue; }
  if (a === null || b === null) { console.log(`  X  ${name}: hanya ada di ${a === null ? "baru" : "asli"}`); critical++; continue; }
  if (norm(a) === norm(b)) console.log(`  OK ${name} [${hash(a)}]`);
  else { console.log(`  X  ${name}: BERBEDA, beda pertama di ${firstDiffLine(a, b)}`); critical++; }
}
for (const name of FORMULA_FUNCTIONS) {
  const a = fOld[name], b = fNew[name];
  if (!a && !b) { console.log(`  ?  ${name}(): tidak ditemukan di keduanya`); continue; }
  if (!a || !b) { console.log(`  X  ${name}(): hanya ada di ${!a ? "baru" : "asli"}`); critical++; continue; }
  if (norm(a) === norm(b)) console.log(`  OK ${name}() [${hash(a)}]`);
  else { console.log(`  X  ${name}(): BERBEDA, beda pertama di ${firstDiffLine(a, b)}`); critical++; }
}

console.log("\n== FUNGSI LAIN (informasi) ==");
const others = new Set([...Object.keys(fOld), ...Object.keys(fNew)]);
let changed = 0, added = [], removed = [];
for (const name of [...others].sort()) {
  if (FORMULA_FUNCTIONS.includes(name)) continue;
  if (!fOld[name]) added.push(name);
  else if (!fNew[name]) removed.push(name);
  else if (norm(fOld[name]) !== norm(fNew[name])) { changed++; console.log(`  ~ berubah: ${name}()`); }
}
added.forEach((n) => console.log(`  + baru   : ${n}()`));
removed.forEach((n) => console.log(`  - hilang : ${n}()`));
console.log(`  ringkas: ${changed} berubah, ${added.length} baru, ${removed.length} hilang`);

console.log(critical === 0
  ? "\nHASIL: SEMUA fungsi rumus & konstanta IDENTIK dengan versi asli."
  : `\nHASIL: ${critical} item rumus/konstanta BERBEDA. Laporkan ke pemilik, jangan lanjut.`);
process.exit(critical === 0 ? 0 : 1);
