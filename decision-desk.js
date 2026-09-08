const DESK_STORAGE_KEY = "catatan-kas-decision-desk-v1";
const DESK_MAX_STOCKS = 5;
const DESK_STOCK_EVENTS = [
  { key: "discount", label: "Diskon vs avg" },
  { key: "dividend", label: "Dividen cair / akan cair" },
  { key: "earningsGood", label: "Laporan keuangan bagus" },
  { key: "earningsBad", label: "Laporan keuangan jelek" },
  { key: "corporate", label: "Aksi korporasi" },
  { key: "sector", label: "Berita sektor / risiko" },
  { key: "none", label: "Tidak ada kejadian khusus" },
];

const defaultDeskState = {
  cashReady: 0,
  cashReserve: 0,
  stockTargetPct: 70,
  btcTargetPct: 20,
  stocks: [
    { id: "desk_stock_1", ticker: "BMRI", avg: 0, now: 0, lots: 0, events: {} },
  ],
  btc: { avg: 0, now: 0, held: 0, events: {} },
  market: { fng: null, fngLabel: "", btcUsd: null, btcIdr: null, updatedAt: null },
  journal: [],
};

let deskState = loadDeskState();
let deskSaveTimer = null;

function loadDeskState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DESK_STORAGE_KEY));
    if (!parsed || typeof parsed !== "object") return structuredClone(defaultDeskState);
    return normalizeDeskState(parsed);
  } catch {
    return structuredClone(defaultDeskState);
  }
}

function normalizeDeskState(raw = {}) {
  const stocks = Array.isArray(raw.stocks)
    ? raw.stocks.slice(0, DESK_MAX_STOCKS).map((stock, index) => ({
        id: String(stock.id || `desk_stock_${index + 1}`),
        ticker: String(stock.ticker || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
        avg: Math.max(0, Number(stock.avg) || 0),
        now: Math.max(0, Number(stock.now) || 0),
        lots: Math.max(0, Math.floor(Number(stock.lots) || 0)),
        events: stock.events && typeof stock.events === "object" ? stock.events : {},
      }))
    : structuredClone(defaultDeskState.stocks);
  return {
    cashReady: Math.max(0, Number(raw.cashReady) || 0),
    cashReserve: Math.max(0, Number(raw.cashReserve) || 0),
    stockTargetPct: clampDesk(Math.round(Number(raw.stockTargetPct) || 70), 0, 100),
    btcTargetPct: clampDesk(Math.round(Number(raw.btcTargetPct) || 20), 0, 100),
    stocks,
    btc: {
      avg: Math.max(0, Number(raw.btc?.avg) || 0),
      now: Math.max(0, Number(raw.btc?.now) || 0),
      held: Math.max(0, Number(raw.btc?.held) || 0),
      events: raw.btc?.events && typeof raw.btc.events === "object" ? raw.btc.events : {},
    },
    market: {
      fng: raw.market?.fng == null ? null : Number(raw.market.fng),
      fngLabel: String(raw.market?.fngLabel || ""),
      btcUsd: raw.market?.btcUsd == null ? null : Number(raw.market.btcUsd),
      btcIdr: raw.market?.btcIdr == null ? null : Number(raw.market.btcIdr),
      updatedAt: raw.market?.updatedAt || null,
    },
    journal: Array.isArray(raw.journal) ? raw.journal.slice(0, 12) : [],
  };
}

function clampDesk(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function saveDeskState() {
  deskState = normalizeDeskState(deskState);
  localStorage.setItem(DESK_STORAGE_KEY, JSON.stringify(deskState));
}

function scheduleDeskSave() {
  window.clearTimeout(deskSaveTimer);
  deskSaveTimer = window.setTimeout(saveDeskState, 250);
}

function deskMoney(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function deskPct(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")}%`;
}

function deskDiscountPct(avg, now) {
  if (!(avg > 0) || !(now > 0)) return null;
  return ((now - avg) / avg) * 100;
}

function deskDiscountScore(pct) {
  if (pct == null) return 50;
  if (pct <= -10) return 90;
  if (pct <= -5) return 75;
  if (pct < 0) return 62;
  if (pct <= 5) return 48;
  if (pct <= 12) return 32;
  return 18;
}

function deskFngBias(fng) {
  if (fng == null || !Number.isFinite(fng)) return { delta: 0, label: "FNG belum ada" };
  if (fng <= 24) return { delta: 16, label: "Extreme Fear" };
  if (fng <= 44) return { delta: 8, label: "Fear" };
  if (fng <= 55) return { delta: 0, label: "Neutral" };
  if (fng <= 74) return { delta: -8, label: "Greed" };
  return { delta: -18, label: "Extreme Greed" };
}

function deskEventDelta(events = {}, kind) {
  let delta = 0;
  const reasons = [];
  if (kind === "stock") {
    if (events.discount) { delta += 6; reasons.push("diskon dicentang"); }
    if (events.dividend) { delta += 6; reasons.push("dividen"); }
    if (events.earningsGood) { delta += 5; reasons.push("lapkeu bagus"); }
    if (events.earningsBad) { delta -= 22; reasons.push("lapkeu jelek"); }
    if (events.corporate) { reasons.push("aksi korporasi: cek dulu"); }
    if (events.sector) { delta -= 10; reasons.push("risiko sektor"); }
  } else {
    if (events.discount) { delta += 6; reasons.push("diskon BTC"); }
    if (events.halving) { delta += 5; reasons.push("event kalender"); }
    if (events.regulation) { delta -= 16; reasons.push("regulasi/berita besar"); }
    if (events.extremeFear) { delta += 10; reasons.push("fear ekstrem"); }
    if (events.extremeGreed) { delta -= 18; reasons.push("greed ekstrem"); }
  }
  return { delta, reasons };
}

function deskDecisionLabel(score, cashThin) {
  if (cashThin && score >= 70) return { key: "hold", text: "Tahan" };
  if (score >= 70) return { key: "buy", text: "Beli" };
  if (score >= 50) return { key: "hold", text: "Tahan" };
  return { key: "skip", text: "Skip" };
}

function computeDeskDecisions() {
  const cashReady = deskState.cashReady;
  const cashReserve = deskState.cashReserve;
  const available = Math.max(0, cashReady - cashReserve);
  const cashThin = available <= 0;
  const fng = deskState.market.fng;
  const fngBias = deskFngBias(fng);
  const btcNow = deskState.btc.now || deskState.market.btcIdr || 0;
  const btcAvg = deskState.btc.avg;
  const stockValue = deskState.stocks.reduce((total, stock) => total + stock.lots * 100 * (stock.now || 0), 0);
  const btcValue = (deskState.btc.held || 0) * btcNow;
  const portfolio = stockValue + btcValue;
  const stockPct = portfolio > 0 ? (stockValue / portfolio) * 100 : 0;
  const btcPct = portfolio > 0 ? (btcValue / portfolio) * 100 : 0;
  const stockOver = stockPct > deskState.stockTargetPct + 8;
  const btcOver = btcPct > deskState.btcTargetPct + 8;

  const rows = deskState.stocks.filter((stock) => stock.ticker).map((stock) => {
    const vsAvg = deskDiscountPct(stock.avg, stock.now);
    const event = deskEventDelta(stock.events, "stock");
    let score = deskDiscountScore(vsAvg) + event.delta;
    if (stockOver) score -= 12;
    score = clampDesk(score, 0, 100);
    const reasons = [];
    if (vsAvg == null) reasons.push("isi avg & harga");
    else reasons.push(`vs avg ${deskPct(vsAvg)}`);
    reasons.push(...event.reasons);
    if (stockOver) reasons.push("porsi saham gemuk");
    if (cashThin) reasons.push("kas tipis, extra ditahan");
    return {
      id: stock.id,
      kind: "stock",
      name: stock.ticker,
      vsAvg,
      score,
      decision: deskDecisionLabel(score, cashThin),
      reasons,
      value: stock.lots * 100 * (stock.now || 0),
    };
  });

  const btcEvent = deskEventDelta(deskState.btc.events, "btc");
  const btcVsAvg = deskDiscountPct(btcAvg, btcNow);
  let btcScore = deskDiscountScore(btcVsAvg) + btcEvent.delta + fngBias.delta;
  if (btcOver) btcScore -= 12;
  btcScore = clampDesk(btcScore, 0, 100);
  const btcReasons = [];
  if (btcVsAvg == null) btcReasons.push("isi avg BTC");
  else btcReasons.push(`vs avg ${deskPct(btcVsAvg)}`);
  if (fng != null) btcReasons.push(`FNG ${fng} ${fngBias.label}`);
  btcReasons.push(...btcEvent.reasons);
  if (btcOver) btcReasons.push("porsi BTC gemuk");
  if (cashThin) btcReasons.push("kas tipis, extra ditahan");
  rows.push({
    id: "btc",
    kind: "btc",
    name: "BTC",
    vsAvg: btcVsAvg,
    score: btcScore,
    decision: deskDecisionLabel(btcScore, cashThin),
    reasons: btcReasons,
    value: btcValue,
  });

  const buyStocks = rows.filter((row) => row.kind === "stock" && row.decision.key === "buy");
  const buyBtc = rows.find((row) => row.kind === "btc" && row.decision.key === "buy");
  let stockAlloc = 0;
  let btcAlloc = 0;
  let priority = "Tahan kas";
  let priorityMeta = "tidak ada sinyal beli yang cukup kuat";

  if (!cashThin && (buyStocks.length || buyBtc)) {
    const stockWant = buyStocks.length > 0 && !stockOver;
    const btcWant = Boolean(buyBtc) && !btcOver;
    if (stockWant && btcWant) {
      if (fng != null && fng >= 75) {
        stockAlloc = available;
        priority = "Saham";
        priorityMeta = "FNG greed ekstrem: extra ke saham yang diskon, BTC ditahan";
      } else if (fng != null && fng <= 24 && btcVsAvg != null && btcVsAvg < 0) {
        btcAlloc = Math.round(available * 0.6);
        stockAlloc = available - btcAlloc;
        priority = "BTC";
        priorityMeta = "Extreme Fear + BTC di bawah avg: prioritas BTC, sisa ke saham";
      } else {
        stockAlloc = Math.round(available * (deskState.stockTargetPct / Math.max(deskState.stockTargetPct + deskState.btcTargetPct, 1)));
        btcAlloc = available - stockAlloc;
        priority = "Campuran";
        priorityMeta = "Ada sinyal di saham dan BTC, split sesuai target porsi";
      }
    } else if (stockWant) {
      stockAlloc = available;
      priority = "Saham";
      priorityMeta = "Hanya saham yang lolos skor beli";
    } else if (btcWant) {
      btcAlloc = available;
      priority = "BTC";
      priorityMeta = "Hanya BTC yang lolos skor beli";
    }
  } else if (cashThin) {
    priority = "Isi cadangan";
    priorityMeta = "Dana siap beli belum di atas cadangan minimum";
  }

  const stockShare = buyStocks.reduce((sum, row) => sum + Math.max(row.score - 49, 1), 0);
  rows.forEach((row) => {
    if (row.kind === "btc") row.alloc = btcAlloc;
    else if (row.decision.key === "buy" && stockAlloc > 0 && stockShare > 0) {
      row.alloc = Math.round(stockAlloc * (Math.max(row.score - 49, 1) / stockShare));
    } else row.alloc = 0;
  });

  return {
    available,
    cashThin,
    stockValue,
    btcValue,
    stockPct,
    btcPct,
    stockAlloc,
    btcAlloc,
    priority,
    priorityMeta,
    rows,
    fngBias,
  };
}

function deskEventChecks(events, prefix, id, list) {
  return list.map((item) => `
    <label class="checkbox-label">
      <span>${item.label}</span>
      <input data-desk-event="${prefix}" data-desk-id="${id || ""}" data-desk-key="${item.key}" type="checkbox" ${events[item.key] ? "checked" : ""} />
    </label>
  `).join("");
}

function renderDeskStocks() {
  const list = document.querySelector("#deskStockList");
  if (!list) return;
  if (!deskState.stocks.length) {
    list.innerHTML = `<p class="decision-empty">Belum ada saham. Tambah maksimal ${DESK_MAX_STOCKS}.</p>`;
    return;
  }
  list.innerHTML = deskState.stocks.map((stock) => `
    <article class="decision-asset-card">
      <div class="decision-asset-head">
        <input class="desk-ticker" data-desk-stock="${stock.id}" data-desk-field="ticker" maxlength="8" value="${stock.ticker}" placeholder="KODE" />
        <button class="icon-button delete" data-desk-remove="${stock.id}" type="button">Hapus</button>
      </div>
      <div class="decision-asset-grid">
        <label>Avg / lembar<input data-desk-stock="${stock.id}" data-desk-field="avg" type="text" inputmode="numeric" value="${stock.avg ? stock.avg.toLocaleString("id-ID") : ""}" /></label>
        <label>Harga sekarang<input data-desk-stock="${stock.id}" data-desk-field="now" type="text" inputmode="numeric" value="${stock.now ? stock.now.toLocaleString("id-ID") : ""}" /></label>
        <label>Lot dipegang<input data-desk-stock="${stock.id}" data-desk-field="lots" type="number" min="0" step="1" value="${stock.lots || ""}" /></label>
      </div>
      <div class="decision-events">${deskEventChecks(stock.events, "stock", stock.id, DESK_STOCK_EVENTS)}</div>
    </article>
  `).join("");
}

function renderDeskDecisions() {
  const result = computeDeskDecisions();
  const readyOut = document.querySelector("#deskReadyCashOut");
  const reserveMeta = document.querySelector("#deskReserveMeta");
  const priorityOut = document.querySelector("#deskPriorityOut");
  const priorityMeta = document.querySelector("#deskPriorityMeta");
  const table = document.querySelector("#deskDecisionTable");
  const alloc = document.querySelector("#deskAllocSummary");
  if (readyOut) readyOut.textContent = deskMoney(result.available);
  if (reserveMeta) reserveMeta.textContent = `cadangan ${deskMoney(deskState.cashReserve)} tidak dipakai extra`;
  if (priorityOut) priorityOut.textContent = result.priority;
  if (priorityMeta) priorityMeta.textContent = result.priorityMeta;
  if (table) {
    table.innerHTML = result.rows.length
      ? result.rows.map((row) => `
          <tr>
            <td><strong>${row.name}</strong></td>
            <td>${row.vsAvg == null ? "-" : deskPct(row.vsAvg)}</td>
            <td>${Math.round(row.score)}</td>
            <td><span class="desk-badge desk-${row.decision.key}">${row.decision.text}</span></td>
            <td>${row.alloc ? deskMoney(row.alloc) : "-"}</td>
            <td>${row.reasons.join(" · ")}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="6"><div class="empty-state">Isi saham atau BTC untuk melihat keputusan.</div></td></tr>`;
  }
  if (alloc) {
    alloc.innerHTML = `
      <article><span>Ke saham</span><strong>${deskMoney(result.stockAlloc)}</strong></article>
      <article><span>Ke BTC</span><strong>${deskMoney(result.btcAlloc)}</strong></article>
      <article><span>Ditahan</span><strong>${deskMoney(Math.max(0, result.available - result.stockAlloc - result.btcAlloc))}</strong></article>
      <article><span>Porsi sekarang</span><strong>Saham ${result.stockPct.toFixed(0)}% · BTC ${result.btcPct.toFixed(0)}%</strong></article>
    `;
  }
}

function renderDeskMarket() {
  const fngValue = document.querySelector("#deskFngValue");
  const fngMeta = document.querySelector("#deskFngMeta");
  const btcPrice = document.querySelector("#deskBtcPrice");
  const btcMeta = document.querySelector("#deskBtcPriceMeta");
  const market = deskState.market;
  if (fngValue) fngValue.textContent = market.fng == null ? "-" : String(market.fng);
  if (fngMeta) fngMeta.textContent = market.fngLabel ? `${market.fngLabel}` : "menarik Alternative.me";
  if (btcPrice) btcPrice.textContent = market.btcIdr ? deskMoney(market.btcIdr) : "-";
  if (btcMeta) {
    btcMeta.textContent = market.btcUsd
      ? `USD ${market.btcUsd.toLocaleString("en-US")} · ${market.updatedAt ? new Date(market.updatedAt).toLocaleTimeString("id-ID") : ""}`
      : "CoinGecko, USD & IDR";
  }
}

function applyDeskForm() {
  const cashReady = document.querySelector("#deskCashReady");
  const cashReserve = document.querySelector("#deskCashReserve");
  const stockTarget = document.querySelector("#deskStockTargetPct");
  const btcTarget = document.querySelector("#deskBtcTargetPct");
  const btcAvg = document.querySelector("#deskBtcAvg");
  const btcNow = document.querySelector("#deskBtcNow");
  const btcHeld = document.querySelector("#deskBtcHeld");
  const btcValue = document.querySelector("#deskBtcValue");
  if (cashReady && document.activeElement !== cashReady) cashReady.value = deskState.cashReady ? deskState.cashReady.toLocaleString("id-ID") : "";
  if (cashReserve && document.activeElement !== cashReserve) cashReserve.value = deskState.cashReserve ? deskState.cashReserve.toLocaleString("id-ID") : "";
  if (stockTarget) stockTarget.value = String(deskState.stockTargetPct);
  if (btcTarget) btcTarget.value = String(deskState.btcTargetPct);
  if (btcAvg && document.activeElement !== btcAvg) btcAvg.value = deskState.btc.avg ? deskState.btc.avg.toLocaleString("id-ID") : "";
  if (btcNow && document.activeElement !== btcNow) btcNow.value = deskState.btc.now ? deskState.btc.now.toLocaleString("id-ID") : "";
  if (btcHeld && document.activeElement !== btcHeld) btcHeld.value = deskState.btc.held ? String(deskState.btc.held) : "";
  if (btcValue) {
    const now = deskState.btc.now || deskState.market.btcIdr || 0;
    btcValue.value = deskState.btc.held && now ? deskMoney(deskState.btc.held * now) : "";
  }
  document.querySelectorAll("[data-desk-btc-event]").forEach((input) => {
    input.checked = Boolean(deskState.btc.events[input.dataset.deskBtcEvent]);
  });
}

function renderDesk() {
  applyDeskForm();
  renderDeskStocks();
  renderDeskMarket();
  renderDeskDecisions();
}

function parseDeskNumber(value) {
  return Number(String(value || "").replace(/\D/g, "")) || 0;
}

function parseDeskDecimal(value) {
  const text = String(value || "").trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function refreshDeskMarket() {
  const fngMeta = document.querySelector("#deskFngMeta");
  const btcMeta = document.querySelector("#deskBtcPriceMeta");
  if (fngMeta) fngMeta.textContent = "mengambil Fear & Greed...";
  try {
    const [fngRes, priceRes] = await Promise.all([
      fetch("https://api.alternative.me/fng/?limit=1"),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,idr"),
    ]);
    if (fngRes.ok) {
      const fngJson = await fngRes.json();
      const row = fngJson?.data?.[0];
      deskState.market.fng = row ? Number(row.value) : null;
      deskState.market.fngLabel = row ? row.value_classification : "";
    }
    if (priceRes.ok) {
      const priceJson = await priceRes.json();
      deskState.market.btcUsd = Number(priceJson?.bitcoin?.usd) || null;
      deskState.market.btcIdr = Number(priceJson?.bitcoin?.idr) || null;
      if (deskState.market.btcIdr && !deskState.btc.now) deskState.btc.now = deskState.market.btcIdr;
    }
    deskState.market.updatedAt = new Date().toISOString();
    saveDeskState();
    renderDesk();
  } catch {
    if (fngMeta) fngMeta.textContent = "API gagal, isi harga BTC manual";
    if (btcMeta) btcMeta.textContent = "CoinGecko tidak terjangkau";
  }
}

function readDeskInputsFromDom() {
  deskState.cashReady = parseDeskNumber(document.querySelector("#deskCashReady")?.value);
  deskState.cashReserve = parseDeskNumber(document.querySelector("#deskCashReserve")?.value);
  deskState.stockTargetPct = clampDesk(Number(document.querySelector("#deskStockTargetPct")?.value) || 0, 0, 100);
  deskState.btcTargetPct = clampDesk(Number(document.querySelector("#deskBtcTargetPct")?.value) || 0, 0, 100);
  deskState.btc.avg = parseDeskNumber(document.querySelector("#deskBtcAvg")?.value);
  deskState.btc.now = parseDeskNumber(document.querySelector("#deskBtcNow")?.value) || deskState.btc.now;
  deskState.btc.held = parseDeskDecimal(document.querySelector("#deskBtcHeld")?.value);
}

function initDecisionDesk() {
  const view = document.querySelector("#decisionView");
  if (!view || view.dataset.deskReady === "true") return;
  view.dataset.deskReady = "true";

  view.addEventListener("input", (event) => {
    const stockField = event.target.closest("[data-desk-stock][data-desk-field]");
    if (stockField) {
      const stock = deskState.stocks.find((item) => item.id === stockField.dataset.deskStock);
      if (stock) {
        const field = stockField.dataset.deskField;
        if (field === "ticker") {
          stock.ticker = stockField.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
          stockField.value = stock.ticker;
        } else if (field === "lots") {
          stock.lots = Math.max(0, Math.floor(Number(stockField.value) || 0));
        } else {
          const numeric = parseDeskNumber(stockField.value);
          stock[field] = numeric;
          stockField.value = numeric ? numeric.toLocaleString("id-ID") : "";
        }
      }
      scheduleDeskSave();
      renderDeskDecisions();
      return;
    }
    if (event.target.closest("#deskCashReady, #deskCashReserve, #deskStockTargetPct, #deskBtcTargetPct, #deskBtcAvg, #deskBtcNow, #deskBtcHeld, #deskBtcValue")) {
      if (event.target.matches("#deskCashReady, #deskCashReserve, #deskBtcAvg, #deskBtcNow")) {
        const raw = parseDeskNumber(event.target.value);
        event.target.value = raw ? raw.toLocaleString("id-ID") : "";
      }
      readDeskInputsFromDom();
      scheduleDeskSave();
      renderDeskMarket();
      renderDeskDecisions();
    }
  });

  view.addEventListener("change", (event) => {
    const eventInput = event.target.closest("[data-desk-event]");
    if (eventInput) {
      if (eventInput.dataset.deskEvent === "stock") {
        const stock = deskState.stocks.find((item) => item.id === eventInput.dataset.deskId);
        if (stock) stock.events[eventInput.dataset.deskKey] = eventInput.checked;
      }
      scheduleDeskSave();
      renderDeskDecisions();
      return;
    }
    const btcEvent = event.target.closest("[data-desk-btc-event]");
    if (btcEvent) {
      deskState.btc.events[btcEvent.dataset.deskBtcEvent] = btcEvent.checked;
      scheduleDeskSave();
      renderDeskDecisions();
    }
  });

  view.addEventListener("click", (event) => {
    const removeId = event.target.dataset.deskRemove;
    if (removeId) {
      deskState.stocks = deskState.stocks.filter((item) => item.id !== removeId);
      saveDeskState();
      renderDesk();
    }
  });

  document.querySelector("#deskAddStock")?.addEventListener("click", () => {
    if (deskState.stocks.length >= DESK_MAX_STOCKS) {
      alert(`Maksimal ${DESK_MAX_STOCKS} saham.`);
      return;
    }
    deskState.stocks.push({
      id: `desk_stock_${Date.now()}`,
      ticker: "",
      avg: 0,
      now: 0,
      lots: 0,
      events: {},
    });
    saveDeskState();
    renderDesk();
  });

  document.querySelector("#deskRefreshMarket")?.addEventListener("click", () => {
    refreshDeskMarket();
  });

  renderDesk();
}

window.initDecisionDesk = initDecisionDesk;
window.renderDecisionDesk = renderDesk;
window.refreshDeskMarket = refreshDeskMarket;
