const STORAGE_KEY = "catatan-kas-v1";
const LEGACY_INVESTMENT_STORAGE_KEY = "compoundingSahamRdpuManualPurchases";

const defaultState = {
  categories: [
    { id: "cat_salary", type: "income", name: "Gaji", color: "#0f9f6e" },
    { id: "cat_project", type: "income", name: "Proyek", color: "#2563eb" },
    { id: "cat_food", type: "expense", name: "Makan", color: "#dc2626" },
    { id: "cat_bills", type: "expense", name: "Tagihan", color: "#b45309" },
  ],
  transactions: [
    {
      id: "trx_demo_1",
      type: "income",
      categoryId: "cat_salary",
      title: "Contoh pemasukan",
      amount: 3500000,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      note: "Data contoh bisa dihapus.",
    },
    {
      id: "trx_demo_2",
      type: "expense",
      categoryId: "cat_food",
      title: "Contoh pengeluaran",
      amount: 125000,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date(Date.now() + 1).toISOString(),
      note: "",
    },
  ],
  investments: {
    horizonYears: 11,
    tickers: ["BMRI", "ASII"],
    stockPurchases: [],
    rdpuPurchases: [],
  },
};

const INVESTMENT_START_YEAR = new Date().getFullYear();
const INVESTMENT_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const SIMULATION_MONTHS = 180;
const LOT_SIZE = 100;
const SELLING_FEE_RATE = 0.0035;
const DEFAULT_SIMULATOR_CONFIG = {
  monthlyDeposit: 1100000,
  startMonth: 6,
  startYear: 2026,
  stockAllocation: 80,
  purchaseMode: "alternating",
  reinvestCustomDividends: false,
  bmriMonthlyLots: 1,
  asiiMonthlyLots: 1,
  bmriPrice: 4130,
  asiiPrice: 4800,
  rdpuReturnAnnual: 4.14,
  dividendGrowthAnnual: 5,
  bmriDividendInitial: 206.5,
  asiiDividendInitial: 390,
  priceChangeEnabled: false,
  bmriPriceChangeAnnual: 5,
  asiiPriceChangeAnnual: 5,
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let state = loadState();
let activeView = "dashboard";
let activeChartType = "income";
let transactionSelectionMode = false;
let selectedTransactionIds = new Set();
let chartBars = [];
let investmentsDirty = true;
let simulatorSettingsSaveTimer = null;
let investmentGrowthChart = null;
let investmentStockChart = null;
let investmentStockChartPurchases = [];
let activeInvestmentTab = "simulator";
let remoteStore = {
  enabled: false,
  investmentsEnabled: false,
  client: null,
  channel: null,
  refreshing: false,
};

const el = {
  pageTitle: document.querySelector("#pageTitle"),
  monthFilter: document.querySelector("#monthFilter"),
  monthBalance: document.querySelector("#monthBalance"),
  monthMeta: document.querySelector("#monthMeta"),
  totalIncome: document.querySelector("#totalIncome"),
  totalExpense: document.querySelector("#totalExpense"),
  totalBalance: document.querySelector("#totalBalance"),
  runningBalance: document.querySelector("#runningBalance"),
  incomeCount: document.querySelector("#incomeCount"),
  expenseCount: document.querySelector("#expenseCount"),
  balanceStatus: document.querySelector("#balanceStatus"),
  dailyAverage: document.querySelector("#dailyAverage"),
  transactionForm: document.querySelector("#transactionForm"),
  transactionFormTitle: document.querySelector("#transactionFormTitle"),
  editingTransactionId: document.querySelector("#editingTransactionId"),
  transactionType: document.querySelector("#transactionType"),
  transactionCategory: document.querySelector("#transactionCategory"),
  transactionTitle: document.querySelector("#transactionTitle"),
  transactionAmount: document.querySelector("#transactionAmount"),
  transactionDate: document.querySelector("#transactionDate"),
  transactionNote: document.querySelector("#transactionNote"),
  cancelEditButton: document.querySelector("#cancelEditButton"),
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  allMonthsFilter: document.querySelector("#allMonthsFilter"),
  toggleSelectionButton: document.querySelector("#toggleSelectionButton"),
  selectionSummary: document.querySelector("#selectionSummary"),
  selectedCount: document.querySelector("#selectedCount"),
  selectedTotal: document.querySelector("#selectedTotal"),
  transactionTableHead: document.querySelector("#transactionTableHead"),
  transactionTable: document.querySelector("#transactionTable"),
  tableEmpty: document.querySelector("#tableEmpty"),
  categoryForm: document.querySelector("#categoryForm"),
  categoryType: document.querySelector("#categoryType"),
  categoryName: document.querySelector("#categoryName"),
  categoryColor: document.querySelector("#categoryColor"),
  categoryBoard: document.querySelector("#categoryBoard"),
  categoryChart: document.querySelector("#categoryChart"),
  chartTooltip: document.querySelector("#chartTooltip"),
  chartDetails: document.querySelector("#chartDetails"),
  chartEmpty: document.querySelector("#chartEmpty"),
  topCategories: document.querySelector("#topCategories"),
  recentTransactions: document.querySelector("#recentTransactions"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  importFile: document.querySelector("#importFile"),
  resetButton: document.querySelector("#resetButton"),
  syncStatus: document.querySelector("#syncStatus"),
  storageHint: document.querySelector("#storageHint"),
  investmentSimulatorForm: document.querySelector("#investmentSimulatorForm"),
  simulatorSyncBanner: document.querySelector("#simulatorSyncBanner"),
  simulatorSyncBannerText: document.querySelector("#simulatorSyncBannerText"),
  simMonthlyDeposit: document.querySelector("#simMonthlyDeposit"),
  simStartMonth: document.querySelector("#simStartMonth"),
  simStartYear: document.querySelector("#simStartYear"),
  simStockAllocation: document.querySelector("#simStockAllocation"),
  simStockAllocationNumber: document.querySelector("#simStockAllocationNumber"),
  simRdpuAllocationLabel: document.querySelector("#simRdpuAllocationLabel"),
  simStockAllocationAmount: document.querySelector("#simStockAllocationAmount"),
  simRdpuAllocationAmount: document.querySelector("#simRdpuAllocationAmount"),
  simPurchaseMode: document.querySelector("#simPurchaseMode"),
  simCustomLotPanel: document.querySelector("#simCustomLotPanel"),
  simReinvestCustomDividends: document.querySelector("#simReinvestCustomDividends"),
  simBmriMonthlyLots: document.querySelector("#simBmriMonthlyLots"),
  simAsiiMonthlyLots: document.querySelector("#simAsiiMonthlyLots"),
  simCustomBmriPurchase: document.querySelector("#simCustomBmriPurchase"),
  simCustomAsiiPurchase: document.querySelector("#simCustomAsiiPurchase"),
  simCustomStockPurchase: document.querySelector("#simCustomStockPurchase"),
  simCustomRdpuPurchase: document.querySelector("#simCustomRdpuPurchase"),
  simCustomLotStatus: document.querySelector("#simCustomLotStatus"),
  simBmriPrice: document.querySelector("#simBmriPrice"),
  simAsiiPrice: document.querySelector("#simAsiiPrice"),
  simEnablePriceChange: document.querySelector("#simEnablePriceChange"),
  simPriceChangePanel: document.querySelector("#simPriceChangePanel"),
  simPriceChangeToggle: document.querySelector("#simPriceChangeToggle"),
  simPriceChangeFields: document.querySelector("#simPriceChangeFields"),
  simPriceChangeStatus: document.querySelector("#simPriceChangeStatus"),
  simBmriPriceChange: document.querySelector("#simBmriPriceChange"),
  simAsiiPriceChange: document.querySelector("#simAsiiPriceChange"),
  simRdpuReturn: document.querySelector("#simRdpuReturn"),
  simDividendGrowth: document.querySelector("#simDividendGrowth"),
  simBmriYield: document.querySelector("#simBmriYield"),
  simAsiiYield: document.querySelector("#simAsiiYield"),
  simTotalContribution: document.querySelector("#simTotalContribution"),
  simFinalAsset: document.querySelector("#simFinalAsset"),
  simNetProfit: document.querySelector("#simNetProfit"),
  simPassiveIncome: document.querySelector("#simPassiveIncome"),
  simAssetMultiple: document.querySelector("#simAssetMultiple"),
  simBmriLots: document.querySelector("#simBmriLots"),
  simAsiiLots: document.querySelector("#simAsiiLots"),
  simBmriValue: document.querySelector("#simBmriValue"),
  simAsiiValue: document.querySelector("#simAsiiValue"),
  simRdpuValue: document.querySelector("#simRdpuValue"),
  simRdpuShare: document.querySelector("#simRdpuShare"),
  simBmriBar: document.querySelector("#simBmriBar"),
  simAsiiBar: document.querySelector("#simAsiiBar"),
  simRdpuBar: document.querySelector("#simRdpuBar"),
  simSellingFee: document.querySelector("#simSellingFee"),
  simTotalDividends: document.querySelector("#simTotalDividends"),
  simTotalRdpuContributions: document.querySelector("#simTotalRdpuContributions"),
  simRdpuReturnGain: document.querySelector("#simRdpuReturnGain"),
  simHistoryTable: document.querySelector("#simHistoryTable"),
  simDividendPurchaseTableWrap: document.querySelector("#simDividendPurchaseTableWrap"),
  simDividendPurchaseTable: document.querySelector("#simDividendPurchaseTable"),
  simDividendPurchaseEmpty: document.querySelector("#simDividendPurchaseEmpty"),
  investmentGrowthChart: document.querySelector("#investmentGrowthChart"),
  investmentHorizon: document.querySelector("#investmentHorizon"),
  addInvestmentYearButton: document.querySelector("#addInvestmentYearButton"),
  monthlyStrategyDeposit: document.querySelector("#monthlyStrategyDeposit"),
  monthlyStrategyBmriPrice: document.querySelector("#monthlyStrategyBmriPrice"),
  monthlyStrategyAsiiPrice: document.querySelector("#monthlyStrategyAsiiPrice"),
  monthlyStrategyBmriBaseLots: document.querySelector("#monthlyStrategyBmriBaseLots"),
  monthlyStrategyAsiiBaseLots: document.querySelector("#monthlyStrategyAsiiBaseLots"),
  monthlyStrategyBmriExtraAmount: document.querySelector("#monthlyStrategyBmriExtraAmount"),
  monthlyStrategyBmriAveragePrice: document.querySelector("#monthlyStrategyBmriAveragePrice"),
  monthlyStrategyBmriCurrentPrice: document.querySelector("#monthlyStrategyBmriCurrentPrice"),
  monthlyStrategyUseIndicator: document.querySelector("#monthlyStrategyUseIndicator"),
  monthlyStrategyUseExtra: document.querySelector("#monthlyStrategyUseExtra"),
  monthlyStrategyUseDividend: document.querySelector("#monthlyStrategyUseDividend"),
  monthlyStrategySyncSimulator: document.querySelector("#monthlyStrategySyncSimulator"),
  monthlyStrategyIndicatorPanel: document.querySelector("#monthlyStrategyIndicatorPanel"),
  monthlyStrategyExtraPanel: document.querySelector("#monthlyStrategyExtraPanel"),
  monthlyStrategyDividendGate: document.querySelector("#monthlyStrategyDividendGate"),
  monthlyStrategyDividendPanel: document.querySelector("#monthlyStrategyDividendPanel"),
  monthlyStrategyDividendAmount: document.querySelector("#monthlyStrategyDividendAmount"),
  monthlyStrategyDividendBasisResult: document.querySelector("#monthlyStrategyDividendBasisResult"),
  monthlyStrategyIndicatorResults: document.querySelectorAll(".monthly-indicator-result"),
  monthlyStrategyExtraResults: document.querySelectorAll(".monthly-extra-result"),
  monthlyStrategyDividendResults: document.querySelectorAll(".monthly-dividend-result"),
  monthlyStrategyBmriBaseResult: document.querySelector("#monthlyStrategyBmriBaseResult"),
  monthlyStrategyAsiiBaseResult: document.querySelector("#monthlyStrategyAsiiBaseResult"),
  monthlyStrategyBaseStockResult: document.querySelector("#monthlyStrategyBaseStockResult"),
  monthlyStrategyGrossRdpuResult: document.querySelector("#monthlyStrategyGrossRdpuResult"),
  monthlyStrategyExtraBmriResult: document.querySelector("#monthlyStrategyExtraBmriResult"),
  monthlyStrategyRdpuRedeemResult: document.querySelector("#monthlyStrategyRdpuRedeemResult"),
  monthlyStrategyNetRdpuResult: document.querySelector("#monthlyStrategyNetRdpuResult"),
  monthlyStrategyBridgeResult: document.querySelector("#monthlyStrategyBridgeResult"),
  monthlyStrategyTotalStockResult: document.querySelector("#monthlyStrategyTotalStockResult"),
  monthlyStrategyDividendResult: document.querySelector("#monthlyStrategyDividendResult"),
  monthlyStrategyExtraPoolResult: document.querySelector("#monthlyStrategyExtraPoolResult"),
  monthlyStrategySuggestedLotsResult: document.querySelector("#monthlyStrategySuggestedLotsResult"),
  monthlyStrategyExtraLeftoverResult: document.querySelector("#monthlyStrategyExtraLeftoverResult"),
  monthlyStrategyTotalBmriLotsResult: document.querySelector("#monthlyStrategyTotalBmriLotsResult"),
  monthlyStrategyTotalAsiiLotsResult: document.querySelector("#monthlyStrategyTotalAsiiLotsResult"),
  monthlyStrategyTotalRdpuResult: document.querySelector("#monthlyStrategyTotalRdpuResult"),
  monthlyStrategyBmriDiscountResult: document.querySelector("#monthlyStrategyBmriDiscountResult"),
  monthlyStrategyBmriFormulaResult: document.querySelector("#monthlyStrategyBmriFormulaResult"),
  monthlyStrategyBmriDecisionResult: document.querySelector("#monthlyStrategyBmriDecisionResult"),
  monthlyStrategySyncStatus: document.querySelector("#monthlyStrategySyncStatus"),
  monthlyStrategyNote: document.querySelector("#monthlyStrategyNote"),
  investmentStockTotal: document.querySelector("#investmentStockTotal"),
  investmentLotTotal: document.querySelector("#investmentLotTotal"),
  investmentRdpuTotal: document.querySelector("#investmentRdpuTotal"),
  investmentPortfolioTotal: document.querySelector("#investmentPortfolioTotal"),
  investmentTickerForm: document.querySelector("#investmentTickerForm"),
  investmentTickerInput: document.querySelector("#investmentTickerInput"),
  investmentTickerList: document.querySelector("#investmentTickerList"),
  investmentStockForm: document.querySelector("#investmentStockForm"),
  investmentStockTicker: document.querySelector("#investmentStockTicker"),
  investmentStockMonth: document.querySelector("#investmentStockMonth"),
  investmentStockYear: document.querySelector("#investmentStockYear"),
  investmentStockLotPrice: document.querySelector("#investmentStockLotPrice"),
  investmentStockLots: document.querySelector("#investmentStockLots"),
  investmentStockTable: document.querySelector("#investmentStockTable"),
  investmentRdpuForm: document.querySelector("#investmentRdpuForm"),
  investmentRdpuMonth: document.querySelector("#investmentRdpuMonth"),
  investmentRdpuYear: document.querySelector("#investmentRdpuYear"),
  investmentRdpuAmount: document.querySelector("#investmentRdpuAmount"),
  investmentRdpuTable: document.querySelector("#investmentRdpuTable"),
  investmentInfoTickerFilter: document.querySelector("#investmentInfoTickerFilter"),
  investmentInfoYearFilter: document.querySelector("#investmentInfoYearFilter"),
  investmentMinPrice: document.querySelector("#investmentMinPrice"),
  investmentMinPriceMeta: document.querySelector("#investmentMinPriceMeta"),
  investmentMaxPrice: document.querySelector("#investmentMaxPrice"),
  investmentMaxPriceMeta: document.querySelector("#investmentMaxPriceMeta"),
  investmentMinLots: document.querySelector("#investmentMinLots"),
  investmentMinLotsMeta: document.querySelector("#investmentMinLotsMeta"),
  investmentMaxLots: document.querySelector("#investmentMaxLots"),
  investmentMaxLotsMeta: document.querySelector("#investmentMaxLotsMeta"),
  investmentMinRdpu: document.querySelector("#investmentMinRdpu"),
  investmentMinRdpuMeta: document.querySelector("#investmentMinRdpuMeta"),
  investmentMaxRdpu: document.querySelector("#investmentMaxRdpu"),
  investmentMaxRdpuMeta: document.querySelector("#investmentMaxRdpuMeta"),
  investmentStockChartTickerFilter: document.querySelector("#investmentStockChartTickerFilter"),
  investmentStockChartYearFilter: document.querySelector("#investmentStockChartYearFilter"),
  investmentStockChart: document.querySelector("#investmentStockChart"),
  investmentStockChartEmpty: document.querySelector("#investmentStockChartEmpty"),
  investmentSummaryTable: document.querySelector("#investmentSummaryTable"),
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return normalizeState({
      ...structuredClone(defaultState),
      investments: loadLegacyInvestments() || defaultState.investments,
    });
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeState({
      categories: Array.isArray(parsed.categories) ? parsed.categories : defaultState.categories,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      investments: parsed.investments || loadLegacyInvestments(),
    });
  } catch {
    return normalizeState(structuredClone(defaultState));
  }
}

function loadLegacyInvestments() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_INVESTMENT_STORAGE_KEY));
    if (!legacy || typeof legacy !== "object") return null;
    return {
      horizonYears: Number(legacy.horizonYears) || 11,
      tickers: Array.isArray(legacy.tickers) ? legacy.tickers : [],
      stockPurchases: Array.isArray(legacy.stockPurchases) ? legacy.stockPurchases : [],
      rdpuPurchases: Array.isArray(legacy.rdpuPurchases) ? legacy.rdpuPurchases : [],
    };
  } catch {
    return null;
  }
}

function saveState() {
  state = normalizeState(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(snapshot) {
  return {
    categories: Array.isArray(snapshot.categories) ? snapshot.categories : [],
    transactions: Array.isArray(snapshot.transactions) ? snapshot.transactions.map(normalizeTransaction) : [],
    investments: normalizeInvestments(snapshot.investments),
  };
}

function normalizeInvestments(investments = {}) {
  const tickers = Array.isArray(investments.tickers) ? investments.tickers.map(sanitizeTicker).filter(Boolean) : [];
  const stockPurchases = Array.isArray(investments.stockPurchases)
    ? investments.stockPurchases
        .map((purchase) => ({
          id: String(purchase.id || uid("stock")),
          ticker: sanitizeTicker(purchase.ticker),
          month: clampNumber(Math.round(Number(purchase.month) || 1), 1, 12),
          year: Math.round(Number(purchase.year) || INVESTMENT_START_YEAR),
          lotPrice: positiveNumber(purchase.lotPrice),
          lots: Math.max(0, Math.floor(positiveNumber(purchase.lots))),
          createdAt: purchase.createdAt || purchase.created_at || new Date().toISOString(),
        }))
        .filter((purchase) => purchase.ticker && purchase.lotPrice > 0 && purchase.lots > 0)
    : [];
  const rdpuPurchases = Array.isArray(investments.rdpuPurchases)
    ? investments.rdpuPurchases
        .map((purchase) => ({
          id: String(purchase.id || uid("rdpu")),
          month: clampNumber(Math.round(Number(purchase.month) || 1), 1, 12),
          year: Math.round(Number(purchase.year) || INVESTMENT_START_YEAR),
          amount: positiveNumber(purchase.amount),
          createdAt: purchase.createdAt || purchase.created_at || new Date().toISOString(),
        }))
        .filter((purchase) => purchase.amount > 0)
    : [];

  return {
    horizonYears: clampNumber(Math.round(Number(investments.horizonYears) || 11), 1, 50),
    simulatorConfig: normalizeSimulatorConfig(investments.simulatorConfig || investments.simulator_config),
    tickers: [...new Set(["BMRI", "ASII", ...tickers, ...stockPurchases.map((purchase) => purchase.ticker)])],
    stockPurchases,
    rdpuPurchases,
  };
}

function normalizeSimulatorConfig(config = {}) {
  const numberOrDefault = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const bmriPrice = Math.max(1, numberOrDefault(config.bmriPrice, DEFAULT_SIMULATOR_CONFIG.bmriPrice));
  const asiiPrice = Math.max(1, numberOrDefault(config.asiiPrice, DEFAULT_SIMULATOR_CONFIG.asiiPrice));
  const legacyDividendValue = (dividendValue, yieldValue, price, fallback) => {
    if (dividendValue !== undefined && dividendValue !== null) {
      return Math.max(0, numberOrDefault(dividendValue, fallback));
    }
    if (yieldValue !== undefined && yieldValue !== null) {
      return Math.max(0, (numberOrDefault(yieldValue, 0) / 100) * price);
    }
    return fallback;
  };

  return {
    monthlyDeposit: Math.max(0, numberOrDefault(config.monthlyDeposit, DEFAULT_SIMULATOR_CONFIG.monthlyDeposit)),
    startMonth: clampNumber(Math.round(numberOrDefault(config.startMonth, DEFAULT_SIMULATOR_CONFIG.startMonth)), 1, 12),
    startYear: clampNumber(Math.round(numberOrDefault(config.startYear, DEFAULT_SIMULATOR_CONFIG.startYear)), 2000, 2100),
    stockAllocation: clampNumber(Math.round(numberOrDefault(config.stockAllocation, DEFAULT_SIMULATOR_CONFIG.stockAllocation)), 0, 100),
    purchaseMode: config.purchaseMode === "custom" ? "custom" : "alternating",
    reinvestCustomDividends: Boolean(config.reinvestCustomDividends),
    bmriMonthlyLots: Math.max(0, Math.floor(numberOrDefault(config.bmriMonthlyLots, DEFAULT_SIMULATOR_CONFIG.bmriMonthlyLots))),
    asiiMonthlyLots: Math.max(0, Math.floor(numberOrDefault(config.asiiMonthlyLots, DEFAULT_SIMULATOR_CONFIG.asiiMonthlyLots))),
    bmriPrice,
    asiiPrice,
    rdpuReturnAnnual: Math.max(0, numberOrDefault(config.rdpuReturnAnnual, DEFAULT_SIMULATOR_CONFIG.rdpuReturnAnnual)),
    dividendGrowthAnnual: Math.max(0, numberOrDefault(config.dividendGrowthAnnual, DEFAULT_SIMULATOR_CONFIG.dividendGrowthAnnual)),
    bmriDividendInitial: legacyDividendValue(
      config.bmriDividendInitial,
      config.bmriYieldInitial,
      bmriPrice,
      DEFAULT_SIMULATOR_CONFIG.bmriDividendInitial,
    ),
    asiiDividendInitial: legacyDividendValue(
      config.asiiDividendInitial,
      config.asiiYieldInitial,
      asiiPrice,
      DEFAULT_SIMULATOR_CONFIG.asiiDividendInitial,
    ),
    priceChangeEnabled: Boolean(config.priceChangeEnabled),
    bmriPriceChangeAnnual: clampNumber(
      numberOrDefault(config.bmriPriceChangeAnnual, DEFAULT_SIMULATOR_CONFIG.bmriPriceChangeAnnual),
      -99,
      1000,
    ),
    asiiPriceChangeAnnual: clampNumber(
      numberOrDefault(config.asiiPriceChangeAnnual, DEFAULT_SIMULATOR_CONFIG.asiiPriceChangeAnnual),
      -99,
      1000,
    ),
  };
}

function normalizeTransaction(transaction) {
  return {
    ...transaction,
    amount: Number(transaction.amount) || 0,
    createdAt: transactionCreatedAt(transaction),
  };
}

function createdAtFromId(id) {
  const match = String(id || "").match(/^trx_(\d+)_/);
  if (!match) return "";

  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp)) return "";

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function transactionCreatedAt(transaction) {
  return transaction.createdAt || transaction.created_at || createdAtFromId(transaction.id) || `${transaction.date || ""}T00:00:00.000Z`;
}

function setSyncStatus(text, mode = "") {
  el.syncStatus.textContent = text;
  el.syncStatus.classList.toggle("cloud", mode === "cloud");
  el.syncStatus.classList.toggle("error", mode === "error");
  el.storageHint.textContent = remoteStore.enabled
    ? "Data otomatis tersimpan ke cloud dan sinkron antar-device."
    : "Data otomatis tersimpan di browser.";
}

function hasSupabaseConfig() {
  const config = window.CATATAN_KAS_SUPABASE;
  return Boolean(config?.url && config?.anonKey && window.supabase);
}

function toDbCategory(category) {
  return {
    id: category.id,
    type: category.type,
    name: category.name,
    color: category.color,
  };
}

function fromDbCategory(category) {
  return {
    id: category.id,
    type: category.type,
    name: category.name,
    color: category.color,
  };
}

function toDbTransaction(transaction) {
  return {
    id: transaction.id,
    type: transaction.type,
    category_id: transaction.categoryId,
    title: transaction.title,
    amount: transaction.amount,
    date: transaction.date,
    created_at: transactionCreatedAt(transaction),
    note: transaction.note || "",
  };
}

function fromDbTransaction(transaction) {
  return {
    id: transaction.id,
    type: transaction.type,
    categoryId: transaction.category_id,
    title: transaction.title,
    amount: Number(transaction.amount),
    date: transaction.date,
    createdAt: transactionCreatedAt(transaction),
    note: transaction.note || "",
  };
}

function toDbInvestmentTicker(ticker) {
  return {
    symbol: ticker,
  };
}

function fromDbInvestmentTicker(row) {
  return sanitizeTicker(row.symbol);
}

function toDbStockPurchase(purchase) {
  return {
    id: purchase.id,
    ticker: purchase.ticker,
    month: purchase.month,
    year: purchase.year,
    lot_price: purchase.lotPrice,
    lots: purchase.lots,
    created_at: purchase.createdAt || new Date().toISOString(),
  };
}

function fromDbStockPurchase(purchase) {
  return {
    id: purchase.id,
    ticker: sanitizeTicker(purchase.ticker),
    month: Number(purchase.month),
    year: Number(purchase.year),
    lotPrice: Number(purchase.lot_price),
    lots: Number(purchase.lots),
    createdAt: purchase.created_at,
  };
}

function toDbRdpuPurchase(purchase) {
  return {
    id: purchase.id,
    month: purchase.month,
    year: purchase.year,
    amount: purchase.amount,
    created_at: purchase.createdAt || new Date().toISOString(),
  };
}

function fromDbRdpuPurchase(purchase) {
  return {
    id: purchase.id,
    month: Number(purchase.month),
    year: Number(purchase.year),
    amount: Number(purchase.amount),
    createdAt: purchase.created_at,
  };
}

function toDbInvestmentSettings(investments) {
  return {
    id: "default",
    horizon_years: clampNumber(Math.round(Number(investments.horizonYears) || 11), 1, 50),
    simulator_config: normalizeSimulatorConfig(investments.simulatorConfig),
  };
}

async function initRemoteStore() {
  if (!hasSupabaseConfig()) {
    setSyncStatus("Mode lokal");
    return;
  }

  const localSnapshot = structuredClone(state);
  remoteStore.client = window.supabase.createClient(
    window.CATATAN_KAS_SUPABASE.url,
    window.CATATAN_KAS_SUPABASE.anonKey,
  );

  try {
    await loadRemoteState();
    const remoteIsEmpty = state.categories.length === 0 && state.transactions.length === 0;
    const localHasData = localSnapshot.categories.length > 0 || localSnapshot.transactions.length > 0;

    if (remoteIsEmpty && localHasData) {
      state = localSnapshot;
      await syncFullStateToRemote();
    } else if (!state.categories.length) {
      await remoteStore.client.from("categories").upsert(defaultState.categories.map(toDbCategory));
      await loadRemoteState();
    }

    remoteStore.enabled = true;
    setSyncStatus("Cloud realtime aktif", "cloud");
    remoteStore.channel = remoteStore.client
      .channel("catatan-kas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, refreshFromRemote)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, refreshFromRemote)
      .on("postgres_changes", { event: "*", schema: "public", table: "investment_settings" }, refreshFromRemote)
      .on("postgres_changes", { event: "*", schema: "public", table: "investment_tickers" }, refreshFromRemote)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_purchases" }, refreshFromRemote)
      .on("postgres_changes", { event: "*", schema: "public", table: "rdpu_purchases" }, refreshFromRemote)
      .subscribe();
  } catch (error) {
    console.error(error);
    remoteStore.enabled = false;
    setSyncStatus("Cloud gagal, mode lokal", "error");
  }
}

async function loadRemoteState() {
  const localInvestments = structuredClone(state.investments);
  const [categoriesResult, transactionsResult] = await Promise.all([
    remoteStore.client.from("categories").select("*").order("created_at", { ascending: true }),
    remoteStore.client
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  state = {
    categories: categoriesResult.data.map(fromDbCategory),
    transactions: transactionsResult.data.map(fromDbTransaction),
    investments: state.investments,
  };
  await loadRemoteInvestments(localInvestments);
  saveState();
}

function isMissingInvestmentTableError(error) {
  return error?.code === "42P01" || String(error?.message || "").toLowerCase().includes("does not exist");
}

async function loadRemoteInvestments(localInvestments = state.investments) {
  try {
    const [settingsResult, tickersResult, stockResult, rdpuResult] = await Promise.all([
      remoteStore.client.from("investment_settings").select("*").eq("id", "default").maybeSingle(),
      remoteStore.client.from("investment_tickers").select("*").order("symbol", { ascending: true }),
      remoteStore.client
        .from("stock_purchases")
        .select("*")
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .order("created_at", { ascending: true }),
      remoteStore.client
        .from("rdpu_purchases")
        .select("*")
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    const errors = [settingsResult.error, tickersResult.error, stockResult.error, rdpuResult.error].filter(Boolean);
    if (errors.length) throw errors[0];

    const remoteHasInvestmentData =
      Boolean(settingsResult.data) ||
      tickersResult.data.length > 0 ||
      stockResult.data.length > 0 ||
      rdpuResult.data.length > 0;

    state.investments = remoteHasInvestmentData
      ? normalizeInvestments({
          horizonYears: Number(settingsResult.data?.horizon_years) || state.investments.horizonYears,
          simulatorConfig: settingsResult.data?.simulator_config || state.investments.simulatorConfig,
          tickers: tickersResult.data.map(fromDbInvestmentTicker),
          stockPurchases: stockResult.data.map(fromDbStockPurchase),
          rdpuPurchases: rdpuResult.data.map(fromDbRdpuPurchase),
        })
      : normalizeInvestments(localInvestments);

    remoteStore.investmentsEnabled = true;

    if (!remoteHasInvestmentData && state.investments.tickers.length) {
      await syncInvestmentsToRemote();
    }
  } catch (error) {
    remoteStore.investmentsEnabled = false;
    if (!isMissingInvestmentTableError(error)) {
      console.warn("Investment cloud sync disabled:", error);
    }
  }
}

async function syncFullStateToRemote() {
  if (state.categories.length) {
    const categoriesResult = await remoteStore.client.from("categories").upsert(state.categories.map(toDbCategory));
    if (categoriesResult.error) throw categoriesResult.error;
  }

  if (state.transactions.length) {
    const transactionsResult = await remoteStore.client
      .from("transactions")
      .upsert(state.transactions.map(toDbTransaction));
    if (transactionsResult.error) throw transactionsResult.error;
  }

  await syncInvestmentsToRemote();
  saveState();
}

async function syncInvestmentsToRemote() {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;

  const settingsResult = await remoteStore.client
    .from("investment_settings")
    .upsert(toDbInvestmentSettings(state.investments));
  if (settingsResult.error) throw settingsResult.error;

  const tickerResult = await remoteStore.client
    .from("investment_tickers")
    .upsert(state.investments.tickers.map(toDbInvestmentTicker));
  if (tickerResult.error) throw tickerResult.error;

  if (state.investments.stockPurchases.length) {
    const stockResult = await remoteStore.client
      .from("stock_purchases")
      .upsert(state.investments.stockPurchases.map(toDbStockPurchase));
    if (stockResult.error) throw stockResult.error;
  }

  if (state.investments.rdpuPurchases.length) {
    const rdpuResult = await remoteStore.client
      .from("rdpu_purchases")
      .upsert(state.investments.rdpuPurchases.map(toDbRdpuPurchase));
    if (rdpuResult.error) throw rdpuResult.error;
  }
}

async function persistInvestmentSettings() {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("investment_settings").upsert(toDbInvestmentSettings(state.investments));
  if (error) throw error;
}

async function persistInvestmentTicker(ticker) {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("investment_tickers").upsert(toDbInvestmentTicker(ticker));
  if (error) throw error;
}

async function deleteInvestmentTickerRemote(ticker) {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("investment_tickers").delete().eq("symbol", ticker);
  if (error) throw error;
}

async function persistStockPurchase(purchase) {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("stock_purchases").upsert(toDbStockPurchase(purchase));
  if (error) throw error;
}

async function deleteStockPurchaseRemote(id) {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("stock_purchases").delete().eq("id", id);
  if (error) throw error;
}

async function persistRdpuPurchase(purchase) {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("rdpu_purchases").upsert(toDbRdpuPurchase(purchase));
  if (error) throw error;
}

async function deleteRdpuPurchaseRemote(id) {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("rdpu_purchases").delete().eq("id", id);
  if (error) throw error;
}

async function refreshFromRemote() {
  if (remoteStore.refreshing) return;
  remoteStore.refreshing = true;
  try {
    await loadRemoteState();
    markInvestmentsDirty();
    renderAll();
  } catch (error) {
    console.error(error);
    setSyncStatus("Sync bermasalah", "error");
  } finally {
    remoteStore.refreshing = false;
  }
}

async function persistCategory(category) {
  saveState();
  if (!remoteStore.enabled) return;
  const { error } = await remoteStore.client.from("categories").upsert(toDbCategory(category));
  if (error) throw error;
}

async function deleteCategoryRemote(categoryId) {
  saveState();
  if (!remoteStore.enabled) return;
  const { error } = await remoteStore.client.from("categories").delete().eq("id", categoryId);
  if (error) throw error;
}

async function persistTransaction(transaction) {
  saveState();
  if (!remoteStore.enabled) return;
  const { error } = await remoteStore.client.from("transactions").upsert(toDbTransaction(transaction));
  if (error) throw error;
}

async function deleteTransactionRemote(transactionId) {
  saveState();
  if (!remoteStore.enabled) return;
  const { error } = await remoteStore.client.from("transactions").delete().eq("id", transactionId);
  if (error) throw error;
}

async function resetRemoteData() {
  saveState();
  if (!remoteStore.enabled) return;

  const transactionsResult = await remoteStore.client.from("transactions").delete().neq("id", "__never__");
  if (transactionsResult.error) throw transactionsResult.error;

  const categoriesResult = await remoteStore.client.from("categories").delete().neq("id", "__never__");
  if (categoriesResult.error) throw categoriesResult.error;

  const seedResult = await remoteStore.client.from("categories").upsert(defaultState.categories.map(toDbCategory));
  if (seedResult.error) throw seedResult.error;

  if (remoteStore.investmentsEnabled) {
    const stockResult = await remoteStore.client.from("stock_purchases").delete().neq("id", "__never__");
    if (stockResult.error) throw stockResult.error;

    const rdpuResult = await remoteStore.client.from("rdpu_purchases").delete().neq("id", "__never__");
    if (rdpuResult.error) throw rdpuResult.error;

    const tickerResult = await remoteStore.client.from("investment_tickers").delete().neq("symbol", "__never__");
    if (tickerResult.error) throw tickerResult.error;

    const settingsResult = await remoteStore.client.from("investment_settings").upsert(toDbInvestmentSettings(defaultState.investments));
    if (settingsResult.error) throw settingsResult.error;

    const defaultTickerResult = await remoteStore.client
      .from("investment_tickers")
      .upsert(defaultState.investments.tickers.map(toDbInvestmentTicker));
    if (defaultTickerResult.error) throw defaultTickerResult.error;
  }
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatMoney(value) {
  return rupiah.format(value || 0);
}

function formatNumberInput(value) {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(Number(digits));
}

function parseNumberInput(value) {
  return Number(String(value).replace(/\D/g, "")) || 0;
}

function parseDecimalInput(value) {
  const text = String(value || "").trim().replace(/\s/g, "");
  if (!text) return 0;

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  if (decimalIndex >= 0) {
    const integerPart = text.slice(0, decimalIndex).replace(/\D/g, "");
    const decimalPart = text.slice(decimalIndex + 1).replace(/\D/g, "");
    return Number(`${integerPart || "0"}.${decimalPart}`) || 0;
  }

  return Number(text.replace(/\D/g, "")) || 0;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function sanitizeTicker(ticker) {
  return String(ticker || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function investmentValue(purchase) {
  return purchase.lotPrice * purchase.lots;
}

function investmentTimestamp(purchase) {
  return purchase.year * 100 + purchase.month;
}

function investmentMonthLabel(month) {
  return INVESTMENT_MONTHS[month - 1] || "";
}

function formatInvestmentDate(purchase) {
  return `${investmentMonthLabel(purchase.month)} ${purchase.year}`;
}

function readNumber(input, fallback = 0) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function compactMoney(value) {
  if (value >= 1000000000) return `${decimal.format(value / 1000000000)} M`;
  if (value >= 1000000) return `${decimal.format(value / 1000000)} jt`;
  return formatMoney(value);
}

function dividendPerShare(initialDividend, growthPercent, year) {
  const growthMultiplier = Math.pow(1 + growthPercent / 100, year - 1);
  return initialDividend * growthMultiplier;
}

function applyAnnualPriceChange(currentPrice, annualChangePercent, enabled) {
  if (!enabled) return currentPrice;
  return Math.max(0.01, currentPrice * (1 + annualChangePercent / 100));
}

function readWholeLots(input, fallback = 0) {
  return Math.max(0, Math.floor(readNumber(input, fallback)));
}

function buildMonthlyLotPlan(bmriTarget, asiiTarget) {
  const plan = [];
  const maxTarget = Math.max(bmriTarget, asiiTarget);
  for (let index = 0; index < maxTarget; index += 1) {
    if (index < bmriTarget) plan.push("BMRI");
    if (index < asiiTarget) plan.push("ASII");
  }
  return plan;
}

function buyAffordableCustomLots(availableCash, bmriLotPrice, asiiLotPrice, bmriTarget, asiiTarget) {
  let cash = availableCash;
  let bmriBought = 0;
  let asiiBought = 0;

  buildMonthlyLotPlan(bmriTarget, asiiTarget).forEach((ticker) => {
    const lotPrice = ticker === "BMRI" ? bmriLotPrice : asiiLotPrice;
    if (cash < lotPrice) return;

    cash -= lotPrice;
    if (ticker === "BMRI") {
      bmriBought += 1;
    } else {
      asiiBought += 1;
    }
  });

  return {
    bmriBought,
    asiiBought,
    leftoverCash: cash,
  };
}

function buyRepeatingCustomLots(availableCash, bmriLotPrice, asiiLotPrice, bmriTarget, asiiTarget) {
  const plan = buildMonthlyLotPlan(bmriTarget, asiiTarget);
  let cash = availableCash;
  let bmriBought = 0;
  let asiiBought = 0;

  if (!plan.length) {
    return {
      bmriBought,
      asiiBought,
      leftoverCash: cash,
    };
  }

  while (cash >= Math.min(bmriLotPrice, asiiLotPrice)) {
    let boughtThisRound = false;

    plan.forEach((ticker) => {
      const lotPrice = ticker === "BMRI" ? bmriLotPrice : asiiLotPrice;
      if (cash < lotPrice) return;

      cash -= lotPrice;
      boughtThisRound = true;
      if (ticker === "BMRI") {
        bmriBought += 1;
      } else {
        asiiBought += 1;
      }
    });

    if (!boughtThisRound) break;
  }

  return {
    bmriBought,
    asiiBought,
    leftoverCash: cash,
  };
}

function buyCustomLotsWithDividendPolicy(
  monthlyDeposit,
  dividendCash,
  bmriLotPrice,
  asiiLotPrice,
  bmriTarget,
  asiiTarget,
  reinvestAfterTarget,
) {
  if (!reinvestAfterTarget) {
    const basePurchase = buyAffordableCustomLots(monthlyDeposit, bmriLotPrice, asiiLotPrice, bmriTarget, asiiTarget);
    const combinedPurchase = buyAffordableCustomLots(
      monthlyDeposit + dividendCash,
      bmriLotPrice,
      asiiLotPrice,
      bmriTarget,
      asiiTarget,
    );
    const stockCost = combinedPurchase.bmriBought * bmriLotPrice + combinedPurchase.asiiBought * asiiLotPrice;

    return {
      ...combinedPurchase,
      dividendBmriBought: Math.max(0, combinedPurchase.bmriBought - basePurchase.bmriBought),
      dividendAsiiBought: Math.max(0, combinedPurchase.asiiBought - basePurchase.asiiBought),
      dividendStockCashUsed: Math.min(dividendCash, Math.max(0, stockCost - monthlyDeposit)),
    };
  }

  const basePurchase = buyAffordableCustomLots(monthlyDeposit, bmriLotPrice, asiiLotPrice, bmriTarget, asiiTarget);
  const missingBmriLots = Math.max(0, bmriTarget - basePurchase.bmriBought);
  const missingAsiiLots = Math.max(0, asiiTarget - basePurchase.asiiBought);
  const targetDividendPurchase = buyAffordableCustomLots(
    dividendCash,
    bmriLotPrice,
    asiiLotPrice,
    missingBmriLots,
    missingAsiiLots,
  );
  const extraDividendPurchase = buyRepeatingCustomLots(
    targetDividendPurchase.leftoverCash,
    bmriLotPrice,
    asiiLotPrice,
    bmriTarget,
    asiiTarget,
  );

  return {
    bmriBought: basePurchase.bmriBought + targetDividendPurchase.bmriBought + extraDividendPurchase.bmriBought,
    asiiBought: basePurchase.asiiBought + targetDividendPurchase.asiiBought + extraDividendPurchase.asiiBought,
    dividendBmriBought: targetDividendPurchase.bmriBought + extraDividendPurchase.bmriBought,
    dividendAsiiBought: targetDividendPurchase.asiiBought + extraDividendPurchase.asiiBought,
    dividendStockCashUsed:
      targetDividendPurchase.bmriBought * bmriLotPrice +
      targetDividendPurchase.asiiBought * asiiLotPrice +
      extraDividendPurchase.bmriBought * bmriLotPrice +
      extraDividendPurchase.asiiBought * asiiLotPrice,
    leftoverCash: basePurchase.leftoverCash + extraDividendPurchase.leftoverCash,
  };
}

function formatDividendStockPurchase(row) {
  const totalLots = row.dividendBmriLots + row.dividendAsiiLots;
  if (totalLots <= 0) return "-";

  return (
    `BMRI ${row.dividendBmriLots.toLocaleString("id-ID")} lot + ` +
    `ASII ${row.dividendAsiiLots.toLocaleString("id-ID")} lot`
  );
}

function formatLotPurchase(lots, amount) {
  return `${lots.toLocaleString("id-ID")} lot - ${formatMoney(amount)}`;
}

function formatSimulatorPriceInput(value) {
  const rounded = Math.round(value * 10000) / 10000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function simulationCalendarMonth(inputs, monthIndex) {
  return ((inputs.startMonth - 1 + monthIndex - 1) % 12) + 1;
}

function simulationCalendarYear(inputs, monthIndex) {
  return inputs.startYear + Math.floor((inputs.startMonth - 1 + monthIndex - 1) / 12);
}

function simulationMonthYearLabel(inputs, monthIndex) {
  const month = simulationCalendarMonth(inputs, monthIndex);
  const year = simulationCalendarYear(inputs, monthIndex);
  return `${investmentMonthLabel(month)} ${year}`;
}

function simulationPeriodLabel(inputs, startMonthIndex, endMonthIndex) {
  return `${simulationMonthYearLabel(inputs, startMonthIndex)} - ${simulationMonthYearLabel(inputs, endMonthIndex)}`;
}

function actualInvestmentForSimulationMonth(calendarMonth, calendarYear) {
  const stockPurchases = state.investments.stockPurchases.filter(
    (purchase) => purchase.month === calendarMonth && purchase.year === calendarYear,
  );
  const rdpuPurchases = state.investments.rdpuPurchases.filter(
    (purchase) => purchase.month === calendarMonth && purchase.year === calendarYear,
  );
  const bmriPurchases = stockPurchases.filter((purchase) => purchase.ticker === "BMRI");
  const asiiPurchases = stockPurchases.filter((purchase) => purchase.ticker === "ASII");
  const bmriLots = bmriPurchases.reduce((total, purchase) => total + purchase.lots, 0);
  const asiiLots = asiiPurchases.reduce((total, purchase) => total + purchase.lots, 0);
  const bmriAmount = bmriPurchases.reduce((total, purchase) => total + investmentValue(purchase), 0);
  const asiiAmount = asiiPurchases.reduce((total, purchase) => total + investmentValue(purchase), 0);
  const rdpuAmount = rdpuPurchases.reduce((total, purchase) => total + purchase.amount, 0);

  return {
    hasActual: bmriLots > 0 || asiiLots > 0 || rdpuAmount > 0,
    bmriLots,
    asiiLots,
    bmriAmount,
    asiiAmount,
    stockAmount: bmriAmount + asiiAmount,
    rdpuAmount,
    contribution: bmriAmount + asiiAmount + rdpuAmount,
  };
}

function simulationMonthIndexForDate(inputs, calendarMonth, calendarYear) {
  return (calendarYear - inputs.startYear) * 12 + (calendarMonth - inputs.startMonth) + 1;
}

function isMonthInSimulationRange(calendarMonth, calendarYear, inputs = readSimulationInputs()) {
  const monthIndex = simulationMonthIndexForDate(inputs, calendarMonth, calendarYear);
  return monthIndex >= 1 && monthIndex <= SIMULATION_MONTHS;
}

function actualInvestmentLine(actualInvestment, { withStockAmounts = false } = {}) {
  const stockSuffix = (amount) => (withStockAmounts ? ` - ${formatMoney(amount)}` : "");
  return [
    `BMRI ${actualInvestment.bmriLots.toLocaleString("id-ID")} lot${stockSuffix(actualInvestment.bmriAmount)}`,
    `ASII ${actualInvestment.asiiLots.toLocaleString("id-ID")} lot${stockSuffix(actualInvestment.asiiAmount)}`,
    `RDPU ${formatMoney(actualInvestment.rdpuAmount)}`,
  ].join(", ");
}

function simulationActualSyncSummary(inputs) {
  for (let month = 1; month <= SIMULATION_MONTHS; month += 1) {
    const calendarMonth = simulationCalendarMonth(inputs, month);
    const calendarYear = simulationCalendarYear(inputs, month);
    const actualInvestment = actualInvestmentForSimulationMonth(calendarMonth, calendarYear);
    if (actualInvestment.hasActual) {
      return {
        hasActual: true,
        label: simulationMonthYearLabel(inputs, month),
        actualInvestment,
      };
    }
  }

  return {
    hasActual: false,
    label: simulationPeriodLabel(inputs, 1, SIMULATION_MONTHS),
    actualInvestment: null,
  };
}

function renderProgramActualSyncBanner(inputs) {
  if (!el.programActualSyncBanner) return;
  const summary = simulationActualSyncSummary(inputs);
  el.programActualSyncBanner.classList.toggle("has-actual", summary.hasActual);
  el.programActualSyncTitle.textContent = "Sinkron Program 2 aktif";
  if (summary.hasActual) {
    el.programActualSyncText.textContent =
      `${summary.label} memakai data aktual: ${actualInvestmentLine(summary.actualInvestment)}.`;
    el.programActualSyncMeta.textContent = "Bulan kosong berikutnya memakai konfigurasi simulator.";
  } else {
    el.programActualSyncText.textContent = `Belum ada data aktual BMRI, ASII, atau RDPU dalam rentang ${summary.label}.`;
    el.programActualSyncMeta.textContent = "Semua bulan saat ini memakai konfigurasi simulator.";
  }
}

function simulationSourceStatus(actualMonths) {
  if (actualMonths >= 12) return { key: "actual", label: "Aktual" };
  if (actualMonths > 0) return { key: "mixed", label: "Campuran" };
  return { key: "simulated", label: "Simulasi" };
}

function formatSimulationSourceBadge(actualMonths) {
  const status = simulationSourceStatus(actualMonths);
  return `<span class="source-badge source-${status.key}">${status.label}</span>`;
}

function formatAnnualActualPurchase(row) {
  if (!row.actualMonths) return "-";
  const parts = [
    `BMRI ${row.actualBmriLots.toLocaleString("id-ID")} lot`,
    `ASII ${row.actualAsiiLots.toLocaleString("id-ID")} lot`,
    `RDPU ${formatMoney(row.actualRdpuContributions)}`,
  ];
  return `
    <div class="actual-sync-cell">
      <strong>${row.actualMonths.toLocaleString("id-ID")} bulan aktual</strong>
      <span>${parts.join(" Â· ")}</span>
      <small>Total ${formatMoney(row.actualContribution)}</small>
    </div>
  `;
}

function updateCustomLotSummary(inputs) {
  const bmriLotPrice = inputs.bmriPrice * LOT_SIZE;
  const asiiLotPrice = inputs.asiiPrice * LOT_SIZE;
  const purchase = buyAffordableCustomLots(
    inputs.monthlyDeposit,
    bmriLotPrice,
    asiiLotPrice,
    inputs.bmriMonthlyLots,
    inputs.asiiMonthlyLots,
  );
  const bmriAmount = purchase.bmriBought * bmriLotPrice;
  const asiiAmount = purchase.asiiBought * asiiLotPrice;
  const stockAmount = bmriAmount + asiiAmount;
  const targetAmount = inputs.bmriMonthlyLots * bmriLotPrice + inputs.asiiMonthlyLots * asiiLotPrice;
  const targetReached = purchase.bmriBought === inputs.bmriMonthlyLots && purchase.asiiBought === inputs.asiiMonthlyLots;

  el.simCustomBmriPurchase.textContent = formatLotPurchase(purchase.bmriBought, bmriAmount);
  el.simCustomAsiiPurchase.textContent = formatLotPurchase(purchase.asiiBought, asiiAmount);
  el.simCustomStockPurchase.textContent = formatMoney(stockAmount);
  el.simCustomRdpuPurchase.textContent = formatMoney(purchase.leftoverCash);

  if (targetAmount <= 0) {
    el.simCustomLotStatus.textContent = "Tidak ada target saham, seluruh setoran bulan normal masuk RDPU.";
  } else if (targetReached) {
    const dividendPolicy = inputs.reinvestCustomDividends
      ? "Saat dividen cair, sisa dividen setelah target akan lanjut membeli lot tambahan."
      : "Saat dividen cair, sisa setelah target masuk RDPU.";
    el.simCustomLotStatus.textContent =
      `Target penuh. Kebutuhan saham ${formatMoney(targetAmount)}, sisa bulan normal masuk RDPU ${formatMoney(purchase.leftoverCash)}. ${dividendPolicy}`;
  } else {
    el.simCustomLotStatus.textContent = `Kas belum cukup untuk target ${formatMoney(targetAmount)}. Simulator membeli lot yang terjangkau, lalu sisa masuk RDPU.`;
  }
}

function readSimulationInputs() {
  const stockAllocation = clampNumber(Math.round(readNumber(el.simStockAllocationNumber, 80)), 0, 100);
  return {
    monthlyDeposit: Math.max(0, readNumber(el.simMonthlyDeposit, 1100000)),
    startMonth: clampNumber(Math.round(readNumber(el.simStartMonth, 6)), 1, 12),
    startYear: clampNumber(Math.round(readNumber(el.simStartYear, 2026)), 2000, 2100),
    stockAllocation,
    rdpuAllocation: 100 - stockAllocation,
    purchaseMode: el.simPurchaseMode.value === "custom" ? "custom" : "alternating",
    reinvestCustomDividends: el.simReinvestCustomDividends.checked,
    bmriMonthlyLots: readWholeLots(el.simBmriMonthlyLots, 1),
    asiiMonthlyLots: readWholeLots(el.simAsiiMonthlyLots, 1),
    bmriPrice: Math.max(1, readNumber(el.simBmriPrice, 4130)),
    asiiPrice: Math.max(1, readNumber(el.simAsiiPrice, 4800)),
    rdpuReturnAnnual: Math.max(0, readNumber(el.simRdpuReturn, 4.14)),
    dividendGrowthAnnual: Math.max(0, readNumber(el.simDividendGrowth, 5)),
    bmriDividendInitial: Math.max(0, parseDecimalInput(el.simBmriYield.value)),
    asiiDividendInitial: Math.max(0, parseDecimalInput(el.simAsiiYield.value)),
    priceChangeEnabled: el.simEnablePriceChange.checked,
    bmriPriceChangeAnnual: clampNumber(readNumber(el.simBmriPriceChange, 5), -99, 1000),
    asiiPriceChangeAnnual: clampNumber(readNumber(el.simAsiiPriceChange, 5), -99, 1000),
  };
}

function applySimulatorConfigToForm(config) {
  const normalized = normalizeSimulatorConfig(config);
  el.simMonthlyDeposit.value = String(normalized.monthlyDeposit);
  el.simStartMonth.value = String(normalized.startMonth);
  el.simStartYear.value = String(normalized.startYear);
  el.simStockAllocation.value = String(normalized.stockAllocation);
  el.simStockAllocationNumber.value = String(normalized.stockAllocation);
  el.simPurchaseMode.value = normalized.purchaseMode;
  el.simReinvestCustomDividends.checked = normalized.reinvestCustomDividends;
  el.simBmriMonthlyLots.value = String(normalized.bmriMonthlyLots);
  el.simAsiiMonthlyLots.value = String(normalized.asiiMonthlyLots);
  el.simBmriPrice.value = formatSimulatorPriceInput(normalized.bmriPrice);
  el.simAsiiPrice.value = formatSimulatorPriceInput(normalized.asiiPrice);
  el.simRdpuReturn.value = String(normalized.rdpuReturnAnnual);
  el.simDividendGrowth.value = String(normalized.dividendGrowthAnnual);
  el.simBmriYield.value = formatSimulatorPriceInput(normalized.bmriDividendInitial);
  el.simAsiiYield.value = formatSimulatorPriceInput(normalized.asiiDividendInitial);
  el.simEnablePriceChange.checked = normalized.priceChangeEnabled;
  el.simBmriPriceChange.value = String(normalized.bmriPriceChangeAnnual);
  el.simAsiiPriceChange.value = String(normalized.asiiPriceChangeAnnual);
}

function saveSimulatorConfigFromInputs() {
  state.investments.simulatorConfig = normalizeSimulatorConfig(readSimulationInputs());
  saveState();
  schedulePersistInvestmentSettings();
}

function schedulePersistInvestmentSettings() {
  window.clearTimeout(simulatorSettingsSaveTimer);
  simulatorSettingsSaveTimer = window.setTimeout(async () => {
    try {
      await persistInvestmentSettings();
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan konfigurasi simulator cloud gagal", "error");
    }
  }, 500);
}

function simulateInvestment(inputs) {
  let bmriLots = 0;
  let asiiLots = 0;
  let rdpuBalance = 0;
  let totalRdpuContributions = 0;
  let totalDividends = 0;
  let totalContribution = 0;
  let annualDividends = 0;
  let annualDividendBmriLots = 0;
  let annualDividendAsiiLots = 0;
  let annualDividendStockCashUsed = 0;
  let annualActualRdpuContributions = 0;
  let annualActualBmriLots = 0;
  let annualActualAsiiLots = 0;
  let annualActualStockAmount = 0;
  let annualActualContribution = 0;
  let annualActualMonths = 0;
  let currentBmriPrice = inputs.bmriPrice;
  let currentAsiiPrice = inputs.asiiPrice;
  const yearlyRows = [];
  const chartYears = [];
  const chartContributions = [];
  const chartAssets = [];
  const monthlyRdpuRate = inputs.rdpuReturnAnnual / 12 / 100;
  const monthlyStockBudget = (inputs.monthlyDeposit * inputs.stockAllocation) / 100;
  const monthlyRdpuBudget = (inputs.monthlyDeposit * inputs.rdpuAllocation) / 100;

  for (let month = 1; month <= SIMULATION_MONTHS; month += 1) {
    const year = Math.ceil(month / 12);
    const isOddMonth = month % 2 === 1;
    const calendarMonth = simulationCalendarMonth(inputs, month);
    const calendarYear = simulationCalendarYear(inputs, month);
    const actualInvestment = actualInvestmentForSimulationMonth(calendarMonth, calendarYear);
    const isBmriDividendMonth = calendarMonth === 5;
    const isAsiiDividendMonth = calendarMonth === 7;
    let monthlyContribution = inputs.monthlyDeposit;

    if (month > 1 && (month - 1) % 12 === 0) {
      currentBmriPrice = applyAnnualPriceChange(currentBmriPrice, inputs.bmriPriceChangeAnnual, inputs.priceChangeEnabled);
      currentAsiiPrice = applyAnnualPriceChange(currentAsiiPrice, inputs.asiiPriceChangeAnnual, inputs.priceChangeEnabled);
    }

    const bmriLotPrice = currentBmriPrice * LOT_SIZE;
    const asiiLotPrice = currentAsiiPrice * LOT_SIZE;
    const bmriDividend = isBmriDividendMonth
      ? bmriLots * LOT_SIZE * dividendPerShare(inputs.bmriDividendInitial, inputs.dividendGrowthAnnual, year)
      : 0;
    const asiiDividend = isAsiiDividendMonth
      ? asiiLots * LOT_SIZE * dividendPerShare(inputs.asiiDividendInitial, inputs.dividendGrowthAnnual, year)
      : 0;
    const dividendThisMonth = bmriDividend + asiiDividend;
    let rdpuContribution = monthlyRdpuBudget;
    let dividendBmriBought = 0;
    let dividendAsiiBought = 0;
    let dividendStockCashUsed = 0;

    if (actualInvestment.hasActual) {
      bmriLots += actualInvestment.bmriLots;
      asiiLots += actualInvestment.asiiLots;
      rdpuContribution = actualInvestment.rdpuAmount + dividendThisMonth;
      monthlyContribution = actualInvestment.contribution;
      annualActualBmriLots += actualInvestment.bmriLots;
      annualActualAsiiLots += actualInvestment.asiiLots;
      annualActualStockAmount += actualInvestment.stockAmount;
      annualActualRdpuContributions += actualInvestment.rdpuAmount;
      annualActualContribution += actualInvestment.contribution;
      annualActualMonths += 1;
    } else if (inputs.purchaseMode === "custom") {
      const purchase = buyCustomLotsWithDividendPolicy(
        inputs.monthlyDeposit,
        dividendThisMonth,
        bmriLotPrice,
        asiiLotPrice,
        inputs.bmriMonthlyLots,
        inputs.asiiMonthlyLots,
        inputs.reinvestCustomDividends,
      );

      bmriLots += purchase.bmriBought;
      asiiLots += purchase.asiiBought;
      dividendBmriBought = purchase.dividendBmriBought || 0;
      dividendAsiiBought = purchase.dividendAsiiBought || 0;
      dividendStockCashUsed = purchase.dividendStockCashUsed || 0;
      rdpuContribution = purchase.leftoverCash;
    } else if (isOddMonth) {
      const stockCash = monthlyStockBudget + dividendThisMonth;
      const boughtLots = Math.floor(stockCash / bmriLotPrice);
      const depositOnlyLots = Math.floor(monthlyStockBudget / bmriLotPrice);
      const stockCost = boughtLots * bmriLotPrice;
      dividendBmriBought = Math.max(0, boughtLots - depositOnlyLots);
      dividendStockCashUsed = Math.min(dividendThisMonth, Math.max(0, stockCost - monthlyStockBudget));
      bmriLots += boughtLots;
      rdpuContribution += stockCash - boughtLots * bmriLotPrice;
    } else {
      const stockCash = monthlyStockBudget + dividendThisMonth;
      const boughtLots = Math.floor(stockCash / asiiLotPrice);
      const depositOnlyLots = Math.floor(monthlyStockBudget / asiiLotPrice);
      const stockCost = boughtLots * asiiLotPrice;
      dividendAsiiBought = Math.max(0, boughtLots - depositOnlyLots);
      dividendStockCashUsed = Math.min(dividendThisMonth, Math.max(0, stockCost - monthlyStockBudget));
      asiiLots += boughtLots;
      rdpuContribution += stockCash - boughtLots * asiiLotPrice;
    }

    totalDividends += dividendThisMonth;
    totalContribution += monthlyContribution;
    annualDividends += dividendThisMonth;
    annualDividendBmriLots += dividendBmriBought;
    annualDividendAsiiLots += dividendAsiiBought;
    annualDividendStockCashUsed += dividendStockCashUsed;
    totalRdpuContributions += rdpuContribution;
    rdpuBalance = (rdpuBalance + rdpuContribution) * (1 + monthlyRdpuRate);

    if (month % 12 === 0) {
      const bmriValue = bmriLots * LOT_SIZE * currentBmriPrice;
      const asiiValue = asiiLots * LOT_SIZE * currentAsiiPrice;
      const portfolioValue = bmriValue + asiiValue + rdpuBalance;

      yearlyRows.push({
        year,
        periodLabel: simulationPeriodLabel(inputs, month - 11, month),
        actualMonths: annualActualMonths,
        actualBmriLots: annualActualBmriLots,
        actualAsiiLots: annualActualAsiiLots,
        actualStockAmount: annualActualStockAmount,
        actualContribution: annualActualContribution,
        totalContribution,
        bmriPrice: currentBmriPrice,
        bmriLots,
        asiiPrice: currentAsiiPrice,
        asiiLots,
        annualDividends,
        dividendBmriLots: annualDividendBmriLots,
        dividendAsiiLots: annualDividendAsiiLots,
        dividendStockCashUsed: annualDividendStockCashUsed,
        dividendLeftoverToRdpu: Math.max(0, annualDividends - annualDividendStockCashUsed),
        actualRdpuContributions: annualActualRdpuContributions,
        rdpuContributions: totalRdpuContributions,
        rdpuReturnGain: rdpuBalance - totalRdpuContributions,
        rdpuBalance,
        portfolioValue,
      });

      chartYears.push(`T${year}: ${simulationPeriodLabel(inputs, month - 11, month)}`);
      chartContributions.push(Math.round(totalContribution));
      chartAssets.push(Math.round(portfolioValue));
      annualDividends = 0;
      annualDividendBmriLots = 0;
      annualDividendAsiiLots = 0;
      annualDividendStockCashUsed = 0;
      annualActualRdpuContributions = 0;
      annualActualBmriLots = 0;
      annualActualAsiiLots = 0;
      annualActualStockAmount = 0;
      annualActualContribution = 0;
      annualActualMonths = 0;
    }
  }

  const bmriValue = bmriLots * LOT_SIZE * currentBmriPrice;
  const asiiValue = asiiLots * LOT_SIZE * currentAsiiPrice;
  const stockValue = bmriValue + asiiValue;
  const finalAsset = stockValue + rdpuBalance;
  const rdpuReturnGain = rdpuBalance - totalRdpuContributions;
  const sellingFee = stockValue * SELLING_FEE_RATE;
  const netProfit = finalAsset - sellingFee - totalContribution;
  const finalYear = Math.ceil(SIMULATION_MONTHS / 12);
  const passiveIncomeFinalYear =
    bmriLots * LOT_SIZE * dividendPerShare(inputs.bmriDividendInitial, inputs.dividendGrowthAnnual, finalYear) +
    asiiLots * LOT_SIZE * dividendPerShare(inputs.asiiDividendInitial, inputs.dividendGrowthAnnual, finalYear);

  return {
    totalContribution,
    finalAsset,
    netProfit,
    passiveIncomeFinalYear,
    sellingFee,
    totalDividends,
    totalRdpuContributions,
    rdpuReturnGain,
    bmriLots,
    asiiLots,
    bmriValue,
    asiiValue,
    rdpuBalance,
    yearlyRows,
    chartYears,
    chartContributions,
    chartAssets,
  };
}

function initInvestmentCharts() {
  if (!window.Chart) return;

  investmentGrowthChart = new Chart(el.investmentGrowthChart, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Total Modal",
          data: [],
          borderColor: "#dc2626",
          backgroundColor: "rgba(220, 38, 38, 0.10)",
          borderWidth: 3,
          pointRadius: 3,
          tension: 0.28,
        },
        {
          label: "Pertumbuhan Total Aset",
          data: [],
          borderColor: "#0f9f6e",
          backgroundColor: "rgba(15, 159, 110, 0.12)",
          borderWidth: 3,
          pointRadius: 3,
          tension: 0.28,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { boxWidth: 12, boxHeight: 12, color: "#172033", font: { weight: "bold" } } },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${formatMoney(context.raw)}`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#64748b" } },
        y: {
          ticks: { color: "#64748b", callback: compactMoney },
          grid: { color: "rgba(15, 23, 42, 0.08)" },
        },
      },
    },
  });

  investmentStockChart = new Chart(el.investmentStockChart, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Harga / Lot",
          data: [],
          borderColor: "#dc2626",
          backgroundColor: "rgba(220, 38, 38, 0.10)",
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.28,
          yAxisID: "y",
        },
        {
          label: "Jumlah Lot",
          data: [],
          borderColor: "#0f9f6e",
          backgroundColor: "rgba(15, 159, 110, 0.12)",
          borderWidth: 3,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.28,
          fill: true,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { labels: { boxWidth: 12, boxHeight: 12, color: "#172033", font: { weight: "bold" } } },
        tooltip: {
          callbacks: {
            title(items) {
              const purchase = investmentStockChartPurchases[items[0]?.dataIndex];
              return purchase ? `${purchase.ticker} - ${formatInvestmentDate(purchase)}` : "";
            },
            label(context) {
              const purchase = investmentStockChartPurchases[context.dataIndex];
              if (!purchase) return "";
              if (context.dataset.label === "Harga / Lot") return `Harga / lot: ${formatMoney(purchase.lotPrice)}`;
              return `Jumlah lot: ${purchase.lots.toLocaleString("id-ID")} lot`;
            },
            afterBody(items) {
              const purchase = investmentStockChartPurchases[items[0]?.dataIndex];
              return purchase ? `Nominal: ${formatMoney(investmentValue(purchase))}` : "";
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#64748b", maxRotation: 0, autoSkip: true } },
        y: {
          beginAtZero: true,
          ticks: { color: "#64748b", callback: compactMoney },
          grid: { color: "rgba(15, 23, 42, 0.08)" },
        },
        y1: {
          beginAtZero: true,
          position: "right",
          ticks: {
            color: "#64748b",
            precision: 0,
            callback(value) {
              return `${value} lot`;
            },
          },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function updateInvestmentSimulator({ persistConfig = true } = {}) {
  const inputs = readSimulationInputs();
  if (persistConfig) {
    saveSimulatorConfigFromInputs();
  }
  const isCustomPurchase = inputs.purchaseMode === "custom";
  el.simStockAllocation.value = String(inputs.stockAllocation);
  el.simStockAllocationNumber.value = String(inputs.stockAllocation);
  el.simStockAllocation.disabled = isCustomPurchase;
  el.simStockAllocationNumber.disabled = isCustomPurchase;
  el.simCustomLotPanel.classList.toggle("hidden", !isCustomPurchase);
  el.simReinvestCustomDividends.disabled = !isCustomPurchase;
  el.simBmriMonthlyLots.disabled = !isCustomPurchase;
  el.simAsiiMonthlyLots.disabled = !isCustomPurchase;
  el.simRdpuAllocationLabel.textContent = isCustomPurchase ? "Sisa kas" : `${inputs.rdpuAllocation}%`;
  el.simStockAllocationAmount.textContent = isCustomPurchase
    ? `${inputs.bmriMonthlyLots.toLocaleString("id-ID")} lot BMRI + ${inputs.asiiMonthlyLots.toLocaleString("id-ID")} lot ASII`
    : formatMoney((inputs.monthlyDeposit * inputs.stockAllocation) / 100);
  el.simRdpuAllocationAmount.textContent = isCustomPurchase
    ? "Sisa setelah beli saham"
    : formatMoney((inputs.monthlyDeposit * inputs.rdpuAllocation) / 100);
  if (isCustomPurchase) {
    updateCustomLotSummary(inputs);
  }
  el.simBmriPriceChange.disabled = !inputs.priceChangeEnabled;
  el.simAsiiPriceChange.disabled = !inputs.priceChangeEnabled;
  el.simPriceChangePanel.classList.toggle("active", inputs.priceChangeEnabled);
  el.simPriceChangeToggle.classList.toggle("active", inputs.priceChangeEnabled);
  el.simPriceChangeFields.classList.toggle("disabled", !inputs.priceChangeEnabled);
  el.simPriceChangeStatus.textContent = inputs.priceChangeEnabled
    ? "Aktif - persentase perubahan harga per tahun dipakai dalam simulasi."
    : "Mati - harga saham tetap memakai harga awal.";
  renderProgramActualSyncBanner(inputs);
  renderCurrentActualSummary(inputs);

  const result = simulateInvestment(inputs);
  el.simTotalContribution.textContent = formatMoney(result.totalContribution);
  el.simFinalAsset.textContent = formatMoney(result.finalAsset);
  el.simNetProfit.textContent = formatMoney(result.netProfit);
  el.simNetProfit.classList.toggle("negative", result.netProfit < 0);
  el.simNetProfit.classList.toggle("positive", result.netProfit >= 0);
  el.simPassiveIncome.textContent = formatMoney(result.passiveIncomeFinalYear);
  el.simSellingFee.textContent = formatMoney(result.sellingFee);
  el.simTotalDividends.textContent = formatMoney(result.totalDividends);
  el.simTotalRdpuContributions.textContent = formatMoney(result.totalRdpuContributions);
  el.simRdpuReturnGain.textContent = formatMoney(result.rdpuReturnGain);
  el.simAssetMultiple.textContent = `${decimal.format(result.finalAsset / Math.max(result.totalContribution, 1))}x modal`;

  const total = Math.max(result.finalAsset, 1);
  const bmriPct = (result.bmriValue / total) * 100;
  const asiiPct = (result.asiiValue / total) * 100;
  const rdpuPct = (result.rdpuBalance / total) * 100;

  el.simBmriLots.textContent = `${result.bmriLots.toLocaleString("id-ID")} lot`;
  el.simAsiiLots.textContent = `${result.asiiLots.toLocaleString("id-ID")} lot`;
  el.simBmriValue.textContent = formatMoney(result.bmriValue);
  el.simAsiiValue.textContent = formatMoney(result.asiiValue);
  el.simRdpuValue.textContent = formatMoney(result.rdpuBalance);
  el.simRdpuShare.textContent = `${decimal.format(rdpuPct)}%`;
  el.simBmriBar.style.width = `${Math.min(bmriPct, 100)}%`;
  el.simAsiiBar.style.width = `${Math.min(asiiPct, 100)}%`;
  el.simRdpuBar.style.width = `${Math.min(rdpuPct, 100)}%`;

  el.simHistoryTable.innerHTML = result.yearlyRows
    .map(
      (row) => {
        const status = simulationSourceStatus(row.actualMonths);
        return `
        <tr class="source-row-${status.key}">
          <td>
            <div class="history-period-head">
              <strong>Tahun ${row.year}</strong>
              ${formatSimulationSourceBadge(row.actualMonths)}
            </div>
            <small>${row.periodLabel}${row.actualMonths ? ` - ${row.actualMonths} bulan aktual Program 2` : ""}</small>
          </td>
          <td>${formatAnnualActualPurchase(row)}</td>
          <td>${formatMoney(row.totalContribution)}</td>
          <td>${formatMoney(row.bmriPrice)}</td>
          <td>${row.bmriLots.toLocaleString("id-ID")} lot</td>
          <td>${formatMoney(row.asiiPrice)}</td>
          <td>${row.asiiLots.toLocaleString("id-ID")} lot</td>
          <td>${formatMoney(row.annualDividends)}</td>
          <td>${formatMoney(row.rdpuContributions)}</td>
          <td>${formatMoney(row.rdpuReturnGain)}</td>
          <td>${formatMoney(row.rdpuBalance)}</td>
          <td><strong>${formatMoney(row.portfolioValue)}</strong></td>
        </tr>
      `;
      },
    )
    .join("");

  const dividendPurchaseRows = result.yearlyRows.filter(
    (row) => row.dividendBmriLots + row.dividendAsiiLots > 0 || row.actualMonths > 0,
  );
  el.simDividendPurchaseTableWrap.classList.toggle("hidden", dividendPurchaseRows.length === 0);
  el.simDividendPurchaseEmpty.classList.toggle("hidden", dividendPurchaseRows.length > 0);
  el.simDividendPurchaseTable.innerHTML = dividendPurchaseRows
    .map(
      (row) => {
        const status = simulationSourceStatus(row.actualMonths);
        return `
        <tr class="source-row-${status.key}">
          <td>
            <div class="history-period-head">
              <strong>Tahun ${row.year}</strong>
              ${formatSimulationSourceBadge(row.actualMonths)}
            </div>
            <small>${row.periodLabel}${row.actualMonths ? ` - ${row.actualMonths} bulan aktual Program 2` : ""}</small>
          </td>
          <td>${formatMoney(row.annualDividends)}</td>
          <td>${formatDividendStockPurchase(row)}</td>
          <td>${formatMoney(row.dividendStockCashUsed)}</td>
          <td>${formatMoney(row.dividendLeftoverToRdpu)}</td>
          <td>${formatAnnualActualPurchase(row)}</td>
        </tr>
      `;
      },
    )
    .join("");

  if (investmentGrowthChart) {
    investmentGrowthChart.data.labels = result.chartYears;
    investmentGrowthChart.data.datasets[0].data = result.chartContributions;
    investmentGrowthChart.data.datasets[1].data = result.chartAssets;
    investmentGrowthChart.update();
  }
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function monthTransactions() {
  return state.transactions.filter((transaction) => transaction.date.startsWith(el.monthFilter.value));
}

function categoryById(id) {
  return state.categories.find((category) => category.id === id);
}

function categoryName(id) {
  return categoryById(id)?.name || "Tanpa tab";
}

function categoryColor(id) {
  return categoryById(id)?.color || "#64748b";
}

function typeLabel(type) {
  return type === "income" ? "Pemasukan" : "Pengeluaran";
}

function renderAll() {
  renderCategoryOptions();
  renderDashboard();
  renderTransactions();
  renderCategories();
  renderInvestmentsIfActive();
}

function renderCategoryOptions() {
  const selectedType = el.transactionType.value;
  const selectedCategory = el.transactionCategory.value;
  const categories = state.categories.filter((category) => category.type === selectedType);

  el.transactionCategory.innerHTML = categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");

  if (categories.some((category) => category.id === selectedCategory)) {
    el.transactionCategory.value = selectedCategory;
  }

  if (!categories.length) {
    el.transactionCategory.innerHTML = `<option value="">Buat tab ${typeLabel(selectedType).toLowerCase()} dulu</option>`;
  }

  const filterValue = el.categoryFilter.value;
  el.categoryFilter.innerHTML = `<option value="all">Semua tab</option>${state.categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)} (${typeLabel(category.type)})</option>`)
    .join("")}`;
  el.categoryFilter.value = state.categories.some((category) => category.id === filterValue) ? filterValue : "all";
}

function renderDashboard() {
  const transactions = monthTransactions();
  const income = transactions.filter((item) => item.type === "income");
  const expense = transactions.filter((item) => item.type === "expense");
  const incomeTotal = sum(income);
  const expenseTotal = sum(expense);
  const balance = incomeTotal - expenseTotal;
  const runningBalance = totalRunningBalance();
  const day = Number(new Date().toISOString().slice(8, 10));

  el.totalIncome.textContent = formatMoney(incomeTotal);
  el.totalExpense.textContent = formatMoney(expenseTotal);
  el.totalBalance.textContent = formatMoney(balance);
  el.totalBalance.classList.toggle("positive", balance > 0);
  el.totalBalance.classList.toggle("negative", balance < 0);
  el.runningBalance.textContent = formatMoney(runningBalance);
  el.runningBalance.classList.toggle("positive", runningBalance > 0);
  el.runningBalance.classList.toggle("negative", runningBalance < 0);
  el.incomeCount.textContent = `${income.length} transaksi`;
  el.expenseCount.textContent = `${expense.length} transaksi`;
  el.balanceStatus.textContent = balance > 0 ? "Surplus" : balance < 0 ? "Defisit" : "Netral";
  el.dailyAverage.textContent = formatMoney((incomeTotal + expenseTotal) / Math.max(day, 1));
  el.monthBalance.textContent = formatMoney(balance);
  el.monthMeta.textContent = `${transactions.length} transaksi`;

  renderChart(transactions);
  renderTopCategories(transactions);
  renderRecentTransactions();
}

function renderChart(transactions) {
  const ctx = el.categoryChart.getContext("2d");
  const scopedTransactions = transactions.filter((item) => item.type === activeChartType);
  const total = sum(scopedTransactions);
  const data = chartDataByCategory(scopedTransactions, total);
  const rows = data
    .sort((a, b) => b.amount - a.amount);

  chartBars = [];
  ctx.clearRect(0, 0, el.categoryChart.width, el.categoryChart.height);
  el.chartEmpty.classList.toggle("hidden", rows.length > 0);
  el.categoryChart.classList.toggle("hidden", rows.length === 0);
  el.chartTooltip.classList.add("hidden");
  renderChartDetails(rows);
  if (!rows.length) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = el.categoryChart.getBoundingClientRect();
  el.categoryChart.width = rect.width * dpr;
  el.categoryChart.height = 260 * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = 260;
  const padding = 34;
  const barGap = 16;
  const barWidth = Math.max(26, (width - padding * 2 - barGap * (rows.length - 1)) / rows.length);
  const max = Math.max(...rows.map((row) => row.amount));

  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textBaseline = "middle";

  rows.forEach((row, index) => {
    const x = padding + index * (barWidth + barGap);
    const barHeight = Math.max(8, (row.amount / max) * 150);
    const y = height - 64 - barHeight;
    const color = categoryColor(row.categoryId);

    ctx.fillStyle = color;
    roundRect(ctx, x, y, barWidth, barHeight, 6);
    ctx.fill();

    chartBars.push({ ...row, x, y, width: barWidth, height: barHeight, color });

    ctx.fillStyle = "#172033";
    ctx.textAlign = "center";
    ctx.fillText(shortLabel(categoryName(row.categoryId), 12), x + barWidth / 2, height - 38);
    ctx.fillStyle = "#64748b";
    ctx.fillText(compactMoney(row.amount), x + barWidth / 2, y - 12);
  });
}

function chartDataByCategory(transactions, total) {
  const grouped = transactions.reduce((acc, item) => {
    if (!acc[item.categoryId]) {
      acc[item.categoryId] = {
        categoryId: item.categoryId,
        amount: 0,
        count: 0,
        percentage: 0,
      };
    }

    acc[item.categoryId].amount += Number(item.amount);
    acc[item.categoryId].count += 1;
    return acc;
  }, {});

  return Object.values(grouped).map((row) => ({
    ...row,
    average: row.amount / row.count,
    percentage: total > 0 ? (row.amount / total) * 100 : 0,
  }));
}

function renderChartDetails(rows) {
  el.chartDetails.innerHTML = rows
    .map(
      (row) => `
        <div class="chart-detail-item">
          <div class="row-between">
            <span class="row-between">
              <i class="color-dot" style="background:${categoryColor(row.categoryId)}"></i>
              <strong>${escapeHtml(categoryName(row.categoryId))}</strong>
            </span>
            <strong>${row.percentage.toFixed(1)}%</strong>
          </div>
          <div class="chart-detail-bar">
            <span style="width:${Math.min(row.percentage, 100)}%; background:${categoryColor(row.categoryId)}"></span>
          </div>
          <span class="muted">${formatMoney(row.amount)} - ${row.count} transaksi - rata-rata ${formatMoney(row.average)}</span>
        </div>
      `,
    )
    .join("");
}

function renderTopCategories(transactions) {
  const rows = Object.entries(totalsByCategory(transactions))
    .map(([categoryId, amount]) => ({ categoryId, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  el.topCategories.innerHTML = rows.length
    ? rows
        .map(
          (row) => `
            <div class="rank-item">
              <div class="row-between">
                <span class="row-between"><i class="color-dot" style="background:${categoryColor(row.categoryId)}"></i>${escapeHtml(
                  categoryName(row.categoryId),
                )}</span>
                <strong>${formatMoney(row.amount)}</strong>
              </div>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">Belum ada tab terpakai bulan ini.</div>`;
}

function renderRecentTransactions() {
  const recent = [...state.transactions].sort(compareTransactionsNewestFirst).slice(0, 5);
  el.recentTransactions.innerHTML = recent.length
    ? recent
        .map(
          (item) => `
            <div class="activity-item">
              <div class="row-between">
                <strong>${escapeHtml(item.title)}</strong>
                <span class="${item.type === "income" ? "amount-income" : "amount-expense"}">${formatMoney(item.amount)}</span>
              </div>
              <span class="muted">${formatDate(item.date)} - ${escapeHtml(categoryName(item.categoryId))}</span>
            </div>
          `,
        )
        .join("")
    : `<div class="empty-state">Belum ada transaksi.</div>`;
}

function renderTransactions() {
  const query = el.searchInput.value.trim().toLowerCase();
  const type = el.typeFilter.value;
  const category = el.categoryFilter.value;
  const runningBalances = runningBalanceByTransaction();

  const rows = state.transactions
    .filter((item) => el.allMonthsFilter.checked || item.date.startsWith(el.monthFilter.value))
    .filter((item) => type === "all" || item.type === type)
    .filter((item) => category === "all" || item.categoryId === category)
    .filter((item) => {
      const haystack = `${item.title} ${item.note} ${categoryName(item.categoryId)}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort(compareTransactionsChronological);

  const visibleIds = new Set(rows.map((item) => item.id));
  selectedTransactionIds = new Set([...selectedTransactionIds].filter((id) => visibleIds.has(id)));
  renderTransactionSelectionSummary(rows);

  el.transactionTableHead.innerHTML = `
    ${transactionSelectionMode ? `<th class="select-column">Pilih</th>` : ""}
    <th>Tanggal</th>
    <th>Judul</th>
    <th>Tab</th>
    <th>Tipe</th>
    <th>Nominal</th>
    <th>Saldo Setelah</th>
    <th>Aksi</th>
  `;

  el.transactionTable.innerHTML = rows
    .map(
      (item) => `
        <tr>
          ${
            transactionSelectionMode
              ? `<td class="select-column"><input class="transaction-select" data-select-transaction="${item.id}" type="checkbox" ${
                  selectedTransactionIds.has(item.id) ? "checked" : ""
                } aria-label="Pilih ${escapeHtml(item.title)}" /></td>`
              : ""
          }
          <td>${formatDate(item.date)}</td>
          <td>
            <strong>${escapeHtml(item.title)}</strong>
            ${item.note ? `<div class="muted">${escapeHtml(item.note)}</div>` : ""}
          </td>
          <td><span class="pill"><i class="color-dot" style="background:${categoryColor(item.categoryId)}"></i>${escapeHtml(
            categoryName(item.categoryId),
          )}</span></td>
          <td>${typeLabel(item.type)}</td>
          <td class="${item.type === "income" ? "amount-income" : "amount-expense"}">${formatMoney(item.amount)}</td>
          <td class="${(runningBalances.get(item.id) || 0) >= 0 ? "amount-income" : "amount-expense"}">${formatMoney(
            runningBalances.get(item.id) || 0,
          )}</td>
          <td>
            <div class="table-actions">
              <button class="icon-button" data-edit="${item.id}" type="button">Edit</button>
              <button class="icon-button delete" data-delete="${item.id}" type="button">Hapus</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");

  el.tableEmpty.classList.toggle("hidden", rows.length > 0);
}

function renderTransactionSelectionSummary(visibleRows = []) {
  el.toggleSelectionButton.textContent = transactionSelectionMode ? "Selesai Pilih" : "Pilih Nominal";
  el.selectionSummary.classList.toggle("hidden", !transactionSelectionMode);

  const selectedRows = visibleRows.filter((item) => selectedTransactionIds.has(item.id));
  el.selectedCount.textContent = `${selectedRows.length} dipilih`;
  el.selectedTotal.textContent = formatMoney(sum(selectedRows));
}

function renderCategories() {
  const groups = ["income", "expense"];
  el.categoryBoard.innerHTML = groups
    .map((type) => {
      const items = state.categories.filter((category) => category.type === type);
      return `
        <div class="category-group">
          <h4>${typeLabel(type)}</h4>
          ${
            items.length
              ? items
                  .map(
                    (category) => `
                      <div class="category-item">
                        <div class="row-between">
                          <span class="row-between">
                            <i class="color-dot" style="background:${category.color}"></i>
                            <strong>${escapeHtml(category.name)}</strong>
                          </span>
                          <span class="muted">${countTransactions(category.id)} transaksi</span>
                        </div>
                        <div class="category-actions">
                          <button class="icon-button" data-rename-category="${category.id}" type="button">Rename</button>
                          <button class="icon-button delete" data-delete-category="${category.id}" type="button">Hapus</button>
                        </div>
                      </div>
                    `,
                  )
                  .join("")
              : `<div class="empty-state">Belum ada tab.</div>`
          }
        </div>
      `;
    })
    .join("");
}

function totalsByCategory(transactions) {
  return transactions.reduce((acc, item) => {
    acc[item.categoryId] = (acc[item.categoryId] || 0) + Number(item.amount);
    return acc;
  }, {});
}

function sum(transactions) {
  return transactions.reduce((total, item) => total + Number(item.amount), 0);
}

function signedAmount(transaction) {
  return transaction.type === "income" ? Number(transaction.amount) : -Number(transaction.amount);
}

function totalRunningBalance() {
  return state.transactions.reduce((total, transaction) => total + signedAmount(transaction), 0);
}

function compareTransactionsChronological(a, b) {
  const dateCompare = a.date.localeCompare(b.date);
  if (dateCompare !== 0) return dateCompare;
  const createdCompare = transactionCreatedAt(a).localeCompare(transactionCreatedAt(b));
  if (createdCompare !== 0) return createdCompare;
  return a.id.localeCompare(b.id);
}

function compareTransactionsNewestFirst(a, b) {
  const dateCompare = b.date.localeCompare(a.date);
  if (dateCompare !== 0) return dateCompare;
  const createdCompare = transactionCreatedAt(b).localeCompare(transactionCreatedAt(a));
  if (createdCompare !== 0) return createdCompare;
  return b.id.localeCompare(a.id);
}

function sortedTransactionsAscending() {
  return [...state.transactions].sort(compareTransactionsChronological);
}

function runningBalanceByTransaction() {
  const balances = new Map();
  let balance = 0;

  sortedTransactionsAscending().forEach((transaction) => {
    balance += signedAmount(transaction);
    balances.set(transaction.id, balance);
  });

  return balances;
}

function countTransactions(categoryId) {
  return state.transactions.filter((item) => item.categoryId === categoryId).length;
}

function shortLabel(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 1)}.` : value;
}

function compactMoney(value) {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}M`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
  return String(value);
}

function showChartTooltip(event) {
  const rect = el.categoryChart.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = chartBars.find((bar) => x >= bar.x && x <= bar.x + bar.width && y >= bar.y && y <= bar.y + bar.height);

  if (!hit) {
    el.chartTooltip.classList.add("hidden");
    return;
  }

  el.chartTooltip.innerHTML = `
    <strong>${escapeHtml(categoryName(hit.categoryId))}</strong>
    <span>Total: ${formatMoney(hit.amount)}</span>
    <span>Kontribusi: ${hit.percentage.toFixed(1)}%</span>
    <span>Transaksi: ${hit.count}</span>
    <span>Rata-rata: ${formatMoney(hit.average)}</span>
  `;
  el.chartTooltip.style.left = `${Math.min(x + 14, rect.width - 250)}px`;
  el.chartTooltip.style.top = `${Math.max(y - 88, 8)}px`;
  el.chartTooltip.classList.remove("hidden");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function investmentYears() {
  return Array.from({ length: state.investments.horizonYears }, (_, index) => INVESTMENT_START_YEAR + index);
}

function renderOptionList(select, options, selectedValue) {
  select.innerHTML = options.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`).join("");
  select.value = options.some((option) => option.value === selectedValue) ? selectedValue : options[0]?.value || "";
}

function renderInvestmentOptions() {
  el.investmentHorizon.value = String(state.investments.horizonYears);
  const years = investmentYears();
  const yearOptions = years.map((year) => ({ value: String(year), label: String(year) }));
  const monthOptions = INVESTMENT_MONTHS.map((month, index) => ({ value: String(index + 1), label: month }));

  renderOptionList(el.investmentStockMonth, monthOptions, el.investmentStockMonth.value || "1");
  renderOptionList(el.investmentRdpuMonth, monthOptions, el.investmentRdpuMonth.value || "1");
  renderOptionList(el.investmentStockYear, yearOptions, el.investmentStockYear.value || String(years[0]));
  renderOptionList(el.investmentRdpuYear, yearOptions, el.investmentRdpuYear.value || String(years[0]));
  renderOptionList(
    el.investmentStockTicker,
    state.investments.tickers.map((ticker) => ({ value: ticker, label: ticker })),
    el.investmentStockTicker.value || state.investments.tickers[0],
  );
  renderOptionList(
    el.investmentInfoTickerFilter,
    [{ value: "all", label: "Semua Saham" }, ...state.investments.tickers.map((ticker) => ({ value: ticker, label: ticker }))],
    el.investmentInfoTickerFilter.value || "all",
  );
  renderOptionList(
    el.investmentInfoYearFilter,
    [{ value: "all", label: "Semua Tahun" }, ...yearOptions],
    el.investmentInfoYearFilter.value || "all",
  );
  renderOptionList(
    el.investmentStockChartTickerFilter,
    [{ value: "all", label: "Semua Saham" }, ...state.investments.tickers.map((ticker) => ({ value: ticker, label: ticker }))],
    el.investmentStockChartTickerFilter.value || "all",
  );
  renderOptionList(
    el.investmentStockChartYearFilter,
    [{ value: "all", label: "Semua Tahun" }, ...yearOptions],
    el.investmentStockChartYearFilter.value || "all",
  );
}

function renderInvestmentTickers() {
  el.investmentTickerList.innerHTML = state.investments.tickers
    .map((ticker) => {
      const locked = ticker === "BMRI" || ticker === "ASII";
      return `
        <span class="ticker-chip">
          ${escapeHtml(ticker)}
          ${locked ? "" : `<button data-delete-investment-ticker="${ticker}" type="button" aria-label="Hapus ${ticker}">x</button>`}
        </span>
      `;
    })
    .join("");
}

function readMonthlyStrategyInputs() {
  return {
    deposit: parseNumberInput(el.monthlyStrategyDeposit.value),
    bmriPrice: parseNumberInput(el.monthlyStrategyBmriPrice.value),
    asiiPrice: parseNumberInput(el.monthlyStrategyAsiiPrice.value),
    bmriBaseLots: readWholeLots(el.monthlyStrategyBmriBaseLots, 2),
    asiiBaseLots: readWholeLots(el.monthlyStrategyAsiiBaseLots, 1),
    bmriExtraLotPrice: parseNumberInput(el.monthlyStrategyBmriExtraAmount.value),
    bmriAveragePrice: parseNumberInput(el.monthlyStrategyBmriAveragePrice.value),
    bmriCurrentPrice: parseNumberInput(el.monthlyStrategyBmriCurrentPrice.value),
    dividendAmount: parseNumberInput(el.monthlyStrategyDividendAmount.value),
    useIndicator: el.monthlyStrategyUseIndicator.checked,
    useExtra: el.monthlyStrategyUseExtra.checked,
    useDividend: el.monthlyStrategyUseDividend.checked,
    syncSimulator: el.monthlyStrategySyncSimulator.checked,
  };
}

function bmriExtraLotDecision(changePercent) {
  if (changePercent <= -10) return "Lebih layak tambah 1 lot atau lebih";
  if (changePercent <= -5) return "Boleh pertimbangkan tambah 1 lot";
  return "Belum perlu tambah lot";
}

const DIVIDEND_TARGET_BMRI_RATIO = 2;
const DIVIDEND_TARGET_ASII_RATIO = 1;
const MAX_DIVIDEND_BMRI_LOTS_AFTER_BALANCE = 3;

function recommendDividendLots(dividendAmount, bmriLotsBeforeDividend, asiiLotsBeforeDividend, bmriLotPrice, asiiLotPrice) {
  let cash = dividendAmount;
  let bmriLots = 0;
  let asiiLots = 0;

  while (cash >= Math.min(bmriLotPrice, asiiLotPrice)) {
    const projectedBmri = bmriLotsBeforeDividend + bmriLots;
    const projectedAsii = asiiLotsBeforeDividend + asiiLots;
    const needsAsii = projectedBmri > projectedAsii * DIVIDEND_TARGET_BMRI_RATIO;

    if (needsAsii && cash >= asiiLotPrice) {
      asiiLots += 1;
      cash -= asiiLotPrice;
      continue;
    }

    if (needsAsii && cash < asiiLotPrice) break;
    if (bmriLots >= MAX_DIVIDEND_BMRI_LOTS_AFTER_BALANCE || cash < bmriLotPrice) break;

    bmriLots += 1;
    cash -= bmriLotPrice;
  }

  return {
    bmriLots,
    asiiLots,
    leftover: cash,
    stockCost: bmriLots * bmriLotPrice + asiiLots * asiiLotPrice,
  };
}

function dividendRecommendationBasis(
  dividendAmount,
  asiiLotPrice,
  bmriLotPrice,
  asiiLots,
  bmriLots,
  leftover,
  bmriLotsBeforeDividend,
  asiiLotsBeforeDividend,
) {
  if (dividendAmount <= 0) {
    return "Isi dividen. Dasar: rasio bulan ini BMRI:ASII = 2:1.";
  }

  const beforeRatio =
    `Sebelum: BMRI ${bmriLotsBeforeDividend.toLocaleString("id-ID")} lot, ASII ${asiiLotsBeforeDividend.toLocaleString("id-ID")} lot.`;
  const purchaseSummary = `Beli: ASII ${asiiLots.toLocaleString("id-ID")} lot + BMRI ${bmriLots.toLocaleString("id-ID")} lot.`;

  if (asiiLots + bmriLots > 0) {
    return `${beforeRatio} Target 2:1. ${purchaseSummary} Sisa ${formatMoney(leftover)} ke RDPU.`;
  }

  return `${beforeRatio} Belum cukup beli lot sesuai target 2:1. Semua dividen ke RDPU.`;
}

function updateSimulatorSyncUi(active, message = "Strategi bulanan sedang mengendalikan input simulator.") {
  el.investmentSimulatorForm.classList.toggle("simulator-linked", active);
  el.simulatorSyncBanner.classList.toggle("hidden", !active);
  el.monthlyStrategySyncStatus.classList.toggle("active", active);
  if (active) {
    el.simulatorSyncBannerText.textContent = message;
  }
}

function disconnectMonthlyStrategySync(message = "Sync dimatikan karena input strategi di simulator diubah langsung.") {
  if (!el.monthlyStrategySyncSimulator.checked) return;
  el.monthlyStrategySyncSimulator.checked = false;
  updateSimulatorSyncUi(false);
  el.monthlyStrategySyncStatus.textContent = message;
}

function isSimulatorStrategyInput(target) {
  return [
    el.simMonthlyDeposit,
    el.simStockAllocation,
    el.simStockAllocationNumber,
    el.simPurchaseMode,
    el.simReinvestCustomDividends,
    el.simBmriMonthlyLots,
    el.simAsiiMonthlyLots,
    el.simBmriPrice,
    el.simAsiiPrice,
  ].includes(target);
}

function maybeDisconnectMonthlyStrategySync(target) {
  if (isSimulatorStrategyInput(target)) {
    disconnectMonthlyStrategySync();
  }
}

function applyMonthlyStrategyToSimulator(inputs, extraBmriLots = 0, bmriSimulatorPrice = inputs.bmriPrice, priceMode = "harga base") {
  const bmriSimulatorLots = inputs.bmriBaseLots + extraBmriLots;
  const asiiSimulatorLots = inputs.asiiBaseLots;
  const syncMessage =
    `Setoran ${formatMoney(inputs.deposit)}, BMRI ${bmriSimulatorLots.toLocaleString("id-ID")} lot/bulan, ` +
    `ASII ${asiiSimulatorLots.toLocaleString("id-ID")} lot/bulan. ` +
    `Harga BMRI simulator ${formatMoney(bmriSimulatorPrice)} (${priceMode}).`;

  el.simMonthlyDeposit.value = String(inputs.deposit);
  el.simBmriPrice.value = formatSimulatorPriceInput(bmriSimulatorPrice);
  el.simAsiiPrice.value = String(inputs.asiiPrice);
  el.simPurchaseMode.value = "custom";
  el.simBmriMonthlyLots.value = String(bmriSimulatorLots);
  el.simAsiiMonthlyLots.value = String(asiiSimulatorLots);
  updateInvestmentSimulator();
  updateSimulatorSyncUi(true, syncMessage);

  el.monthlyStrategySyncStatus.textContent =
    `Aktif: simulator memakai BMRI ${bmriSimulatorLots.toLocaleString("id-ID")} lot/bulan dan ASII ${asiiSimulatorLots.toLocaleString("id-ID")} lot/bulan. ` +
    `Harga BMRI simulator ${formatMoney(bmriSimulatorPrice)} (${priceMode}). ` +
    `Dividen cair tidak dikirim ke simulator karena hanya terjadi pada bulan tertentu dan nominalnya berubah.`;
}

function updateMonthlyStrategyCalculator() {
  const inputs = readMonthlyStrategyInputs();
  el.monthlyStrategyIndicatorPanel.classList.toggle("hidden", !inputs.useIndicator);
  el.monthlyStrategyExtraPanel.classList.toggle("hidden", !inputs.useExtra);
  el.monthlyStrategyIndicatorResults.forEach((item) => item.classList.toggle("hidden", !inputs.useIndicator));
  el.monthlyStrategyExtraResults.forEach((item) => item.classList.toggle("hidden", !inputs.useExtra));
  el.monthlyStrategyDividendResults.forEach((item) => item.classList.toggle("hidden", !inputs.useDividend));

  const bmriBaseLotPrice = inputs.bmriPrice * LOT_SIZE;
  const asiiLotPrice = inputs.asiiPrice * LOT_SIZE;
  const basePurchase = buyAffordableCustomLots(
    inputs.deposit,
    bmriBaseLotPrice,
    asiiLotPrice,
    inputs.bmriBaseLots,
    inputs.asiiBaseLots,
  );
  const boughtBmriBaseLots = basePurchase.bmriBought;
  const boughtAsiiBaseLots = basePurchase.asiiBought;
  const bmriBaseAmount = boughtBmriBaseLots * bmriBaseLotPrice;
  const asiiBaseAmount = boughtAsiiBaseLots * asiiLotPrice;
  const baseStockAmount = bmriBaseAmount + asiiBaseAmount;
  const targetBaseAmount = inputs.bmriBaseLots * bmriBaseLotPrice + inputs.asiiBaseLots * asiiLotPrice;
  const grossRdpu = basePurchase.leftoverCash;
  const baseTargetReached = boughtBmriBaseLots === inputs.bmriBaseLots && boughtAsiiBaseLots === inputs.asiiBaseLots;
  let totalStockAmount = baseStockAmount;
  const bmriChangePercent =
    inputs.bmriAveragePrice > 0 ? ((inputs.bmriCurrentPrice - inputs.bmriAveragePrice) / inputs.bmriAveragePrice) * 100 : 0;
  const bmriFormula =
    inputs.bmriAveragePrice > 0
      ? `(${inputs.bmriCurrentPrice.toLocaleString("id-ID")} - ${inputs.bmriAveragePrice.toLocaleString("id-ID")}) / ${inputs.bmriAveragePrice.toLocaleString("id-ID")} x 100%`
      : "Isi avg price BMRI";
  const dividendAmount = inputs.useDividend ? inputs.dividendAmount : 0;
  const bmriSignalLotPrice = inputs.useIndicator && inputs.bmriCurrentPrice > 0 ? inputs.bmriCurrentPrice * LOT_SIZE : bmriBaseLotPrice;
  const bmriExtraLotPrice = inputs.useExtra && inputs.bmriExtraLotPrice > 0 ? inputs.bmriExtraLotPrice : bmriSignalLotPrice;
  const extraBmriLots = inputs.useExtra && inputs.bmriExtraLotPrice > 0 ? 1 : 0;
  const extraBmriCost = extraBmriLots * bmriExtraLotPrice;
  const bridgeAmount = inputs.useExtra ? extraBmriCost : 0;
  const rdpuRedeemAmount = Math.min(grossRdpu, extraBmriCost);
  const netRdpu = grossRdpu - rdpuRedeemAmount;
  const unreimbursedBridge = Math.max(0, extraBmriCost - grossRdpu);
  const bmriLotsBeforeDividend = boughtBmriBaseLots + extraBmriLots;
  const asiiLotsBeforeDividend = boughtAsiiBaseLots;
  const dividendRecommendation = recommendDividendLots(
    dividendAmount,
    bmriLotsBeforeDividend,
    asiiLotsBeforeDividend,
    bmriExtraLotPrice,
    asiiLotPrice,
  );
  const dividendAsiiLots = dividendRecommendation.asiiLots;
  const dividendBmriLots = dividendRecommendation.bmriLots;
  const dividendStockCost = dividendRecommendation.stockCost;
  const extraLeftoverToRdpu = Math.max(0, dividendRecommendation.leftover);
  const totalRdpuThisMonth = netRdpu + extraLeftoverToRdpu;
  const totalBmriLots = boughtBmriBaseLots + extraBmriLots + dividendBmriLots;
  const totalAsiiLots = boughtAsiiBaseLots + dividendAsiiLots;
  totalStockAmount = baseStockAmount + extraBmriCost + dividendStockCost;

  el.monthlyStrategyDividendPanel.classList.toggle("hidden", !inputs.useDividend);

  el.monthlyStrategyBmriBaseResult.textContent = formatLotPurchase(boughtBmriBaseLots, bmriBaseAmount);
  el.monthlyStrategyAsiiBaseResult.textContent = formatLotPurchase(boughtAsiiBaseLots, asiiBaseAmount);
  el.monthlyStrategyBaseStockResult.textContent = formatMoney(baseStockAmount);
  el.monthlyStrategyGrossRdpuResult.textContent = formatMoney(grossRdpu);
  el.monthlyStrategyExtraBmriResult.textContent = `${extraBmriLots.toLocaleString("id-ID")} lot - ${formatMoney(extraBmriCost)}`;
  el.monthlyStrategyRdpuRedeemResult.textContent = formatMoney(rdpuRedeemAmount);
  el.monthlyStrategyNetRdpuResult.textContent = formatMoney(netRdpu);
  el.monthlyStrategyBridgeResult.textContent = formatMoney(bridgeAmount);
  el.monthlyStrategyTotalStockResult.textContent = formatMoney(totalStockAmount);
  el.monthlyStrategyDividendResult.textContent = formatMoney(dividendAmount);
  el.monthlyStrategyExtraPoolResult.textContent = formatMoney(dividendStockCost);
  el.monthlyStrategySuggestedLotsResult.textContent =
    `ASII ${dividendAsiiLots.toLocaleString("id-ID")} lot + BMRI ${dividendBmriLots.toLocaleString("id-ID")} lot`;
  el.monthlyStrategyDividendBasisResult.textContent = dividendRecommendationBasis(
    dividendAmount,
    asiiLotPrice,
    bmriExtraLotPrice,
    dividendAsiiLots,
    dividendBmriLots,
    dividendRecommendation.leftover,
    bmriLotsBeforeDividend,
    asiiLotsBeforeDividend,
  );
  el.monthlyStrategyExtraLeftoverResult.textContent = formatMoney(extraLeftoverToRdpu);
  el.monthlyStrategyTotalBmriLotsResult.textContent = `${totalBmriLots.toLocaleString("id-ID")} lot`;
  el.monthlyStrategyTotalAsiiLotsResult.textContent = `${totalAsiiLots.toLocaleString("id-ID")} lot`;
  el.monthlyStrategyTotalRdpuResult.textContent = formatMoney(totalRdpuThisMonth);
  el.monthlyStrategyBmriDiscountResult.textContent = `${decimal.format(bmriChangePercent)}%`;
  el.monthlyStrategyBmriFormulaResult.textContent = bmriFormula;
  el.monthlyStrategyBmriDecisionResult.textContent = bmriExtraLotDecision(bmriChangePercent);

  if (inputs.syncSimulator) {
    const recurringBmriLots = boughtBmriBaseLots + extraBmriLots;
    const recurringBmriCost = bmriBaseAmount + extraBmriCost;
    const bmriSimulatorPrice = recurringBmriLots > 0 ? recurringBmriCost / (recurringBmriLots * LOT_SIZE) : inputs.bmriPrice;
    const bmriPriceMode = extraBmriLots > 0 ? "rata-rata base + ekstra" : "harga base";
    applyMonthlyStrategyToSimulator({ ...inputs, bmriBaseLots: boughtBmriBaseLots, asiiBaseLots: boughtAsiiBaseLots }, extraBmriLots, bmriSimulatorPrice, bmriPriceMode);
  } else {
    updateSimulatorSyncUi(false);
    el.monthlyStrategySyncStatus.textContent = "Strategi belum dikirim ke simulator.";
  }

  if (!baseTargetReached) {
    el.monthlyStrategyNote.textContent =
      `Target base ${inputs.bmriBaseLots.toLocaleString("id-ID")} BMRI + ${inputs.asiiBaseLots.toLocaleString("id-ID")} ASII butuh ${formatMoney(targetBaseAmount)}. ` +
      `Setoran hanya cukup beli ${boughtBmriBaseLots.toLocaleString("id-ID")} BMRI + ${boughtAsiiBaseLots.toLocaleString("id-ID")} ASII.`;
  } else if (extraBmriCost > 0) {
    const bridgeTail = unreimbursedBridge > 0 ? ` Ada ${formatMoney(unreimbursedBridge)} talangan yang belum terganti dari RDPU.` : "";
    el.monthlyStrategyNote.textContent =
      `Talangi ekstra BMRI ${formatMoney(bridgeAmount)}, cairkan RDPU ${formatMoney(rdpuRedeemAmount)}, ` +
      `sisa RDPU setelah cair ${formatMoney(netRdpu)}.${bridgeTail}`;
  } else if (extraBmriLots + dividendBmriLots + dividendAsiiLots > 0) {
    el.monthlyStrategyNote.textContent =
      `Silakan tambah BMRI ${(extraBmriLots + dividendBmriLots).toLocaleString("id-ID")} lot dan ASII ${dividendAsiiLots.toLocaleString("id-ID")} lot. ` +
      `Total RDPU bulan ini ${formatMoney(totalRdpuThisMonth)} dari sisa setoran dan sisa dividen.`;
  } else if (!inputs.useExtra && dividendAmount <= 0) {
    el.monthlyStrategyNote.textContent = `Beli base, lalu sisa ${formatMoney(grossRdpu)} masuk RDPU.`;
  } else if (unreimbursedBridge > 0) {
    el.monthlyStrategyNote.textContent =
      `Dana ekstra dan dividen belum cukup untuk tambahan lot. ` +
      `Masukkan ${formatMoney(extraLeftoverToRdpu)} ke RDPU atau tambah nominal ekstra.`;
  } else {
    el.monthlyStrategyNote.textContent = `Tidak ada tambahan lot. Total RDPU bulan ini ${formatMoney(totalRdpuThisMonth)}.`;
  }
}

function calculateInvestmentSummary() {
  const stockTotal = state.investments.stockPurchases.reduce((total, purchase) => total + investmentValue(purchase), 0);
  const lotTotal = state.investments.stockPurchases.reduce((total, purchase) => total + purchase.lots, 0);
  const rdpuTotal = state.investments.rdpuPurchases.reduce((total, purchase) => total + purchase.amount, 0);
  const rows = investmentYears().map((year) => {
    const yearStocks = state.investments.stockPurchases.filter((purchase) => purchase.year === year);
    const yearRdpu = state.investments.rdpuPurchases.filter((purchase) => purchase.year === year);
    const yearStockTotal = yearStocks.reduce((total, purchase) => total + investmentValue(purchase), 0);
    const yearLotTotal = yearStocks.reduce((total, purchase) => total + purchase.lots, 0);
    const yearRdpuTotal = yearRdpu.reduce((total, purchase) => total + purchase.amount, 0);

    return {
      year,
      stockTotal: yearStockTotal,
      lotTotal: yearLotTotal,
      rdpuTotal: yearRdpuTotal,
      portfolioTotal: yearStockTotal + yearRdpuTotal,
    };
  });

  return {
    stockTotal,
    lotTotal,
    rdpuTotal,
    portfolioTotal: stockTotal + rdpuTotal,
    rows,
  };
}

function renderInvestmentTables() {
  const stockRows = [...state.investments.stockPurchases].sort((a, b) => investmentTimestamp(a) - investmentTimestamp(b));
  const rdpuRows = [...state.investments.rdpuPurchases].sort((a, b) => investmentTimestamp(a) - investmentTimestamp(b));

  el.investmentStockTable.innerHTML = stockRows.length
    ? stockRows
        .map(
          (purchase) => `
            <tr>
              <td>${formatInvestmentDate(purchase)}</td>
              <td><strong>${escapeHtml(purchase.ticker)}</strong></td>
              <td>${formatMoney(purchase.lotPrice)}</td>
              <td>${purchase.lots.toLocaleString("id-ID")} lot</td>
              <td><strong>${formatMoney(investmentValue(purchase))}</strong></td>
              <td><button class="icon-button delete" data-delete-stock-purchase="${purchase.id}" type="button">Hapus</button></td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="6"><div class="empty-state">Belum ada pembelian saham.</div></td></tr>`;

  el.investmentRdpuTable.innerHTML = rdpuRows.length
    ? rdpuRows
        .map(
          (purchase) => `
            <tr>
              <td>${formatInvestmentDate(purchase)}</td>
              <td><strong>${formatMoney(purchase.amount)}</strong></td>
              <td><button class="icon-button delete" data-delete-rdpu-purchase="${purchase.id}" type="button">Hapus</button></td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3"><div class="empty-state">Belum ada pembelian RDPU.</div></td></tr>`;
}

function renderInvestmentSummary() {
  const summary = calculateInvestmentSummary();
  el.investmentStockTotal.textContent = formatMoney(summary.stockTotal);
  el.investmentLotTotal.textContent = `${summary.lotTotal.toLocaleString("id-ID")} lot`;
  el.investmentRdpuTotal.textContent = formatMoney(summary.rdpuTotal);
  el.investmentPortfolioTotal.textContent = formatMoney(summary.portfolioTotal);
  el.investmentSummaryTable.innerHTML = summary.rows
    .map(
      (row) => `
        <tr>
          <td><strong>${row.year}</strong></td>
          <td>${formatMoney(row.stockTotal)}</td>
          <td>${row.lotTotal.toLocaleString("id-ID")} lot</td>
          <td>${formatMoney(row.rdpuTotal)}</td>
          <td><strong>${formatMoney(row.portfolioTotal)}</strong></td>
        </tr>
      `,
    )
    .join("");
}

function currentActualMonthDate() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function renderCurrentActualSummary(inputs = readSimulationInputs()) {
  if (!el.investmentActualMonthTitle) return;
  const { month, year } = currentActualMonthDate();
  const actualInvestment = actualInvestmentForSimulationMonth(month, year);
  const inSimulation = isMonthInSimulationRange(month, year, inputs);
  const totalActual = actualInvestment.contribution;
  let programStatus = "Belum ada data aktual";

  if (actualInvestment.hasActual && inSimulation) {
    programStatus = "Ya";
  } else if (actualInvestment.hasActual) {
    programStatus = "Tidak, di luar rentang";
  }

  el.investmentActualMonthTitle.textContent = `Aktual ${investmentMonthLabel(month)} ${year}`;
  el.investmentActualMonthMeta.textContent = actualInvestment.hasActual
    ? "BMRI, ASII, dan RDPU aktual bulan ini dibaca langsung oleh proyeksi jika periodenya cocok."
    : "Belum ada catatan BMRI, ASII, atau RDPU untuk bulan ini.";
  el.investmentActualBmri.textContent = `${actualInvestment.bmriLots.toLocaleString("id-ID")} lot - ${formatMoney(actualInvestment.bmriAmount)}`;
  el.investmentActualAsii.textContent = `${actualInvestment.asiiLots.toLocaleString("id-ID")} lot - ${formatMoney(actualInvestment.asiiAmount)}`;
  el.investmentActualRdpu.textContent = formatMoney(actualInvestment.rdpuAmount);
  el.investmentActualTotal.textContent = formatMoney(totalActual);
  el.investmentActualUsed.textContent = programStatus;
  el.investmentActualUsed.classList.toggle("positive", actualInvestment.hasActual && inSimulation);
  el.investmentActualUsed.classList.toggle("negative", actualInvestment.hasActual && !inSimulation);
}

function investmentSaveFeedbackMessage(purchase, type) {
  const inputs = readSimulationInputs();
  const dateLabel = formatInvestmentDate(purchase);
  const inSimulation = isMonthInSimulationRange(purchase.month, purchase.year, inputs);
  const isProgramStock = type === "stock" && ["BMRI", "ASII"].includes(purchase.ticker);
  const isProgramRdpu = type === "rdpu";

  if ((isProgramStock || isProgramRdpu) && inSimulation) {
    return `Tersimpan. Simulator 120 Bulan diperbarui memakai data ${dateLabel}.`;
  }

  if (type === "stock" && !isProgramStock) {
    return `Tersimpan. ${purchase.ticker} masuk Catatan Aktual, tetapi Program 1 hanya memakai BMRI, ASII, dan RDPU.`;
  }

  return `Tersimpan. Data ${dateLabel} belum masuk Program 1 karena di luar rentang simulasi saat ini.`;
}

function showInvestmentSaveFeedback(purchase, type) {
  if (!el.investmentSaveFeedback) return;
  el.investmentSaveFeedback.textContent = investmentSaveFeedbackMessage(purchase, type);
  el.investmentSaveFeedback.classList.remove("hidden");
}

function setupInvestmentTabs() {
  const stack = document.querySelector(".investment-stack");
  if (!stack || stack.dataset.investmentTabsReady === "true") return;
  stack.dataset.investmentTabsReady = "true";

  const simulatorPanel = document.createElement("div");
  const actualPanel = document.createElement("div");
  const analysisPanel = document.createElement("div");
  simulatorPanel.id = "investmentTabSimulator";
  actualPanel.id = "investmentTabActual";
  analysisPanel.id = "investmentTabAnalysis";
  simulatorPanel.className = "investment-tab-panel active";
  actualPanel.className = "investment-tab-panel";
  analysisPanel.className = "investment-tab-panel";
  simulatorPanel.dataset.investmentTabPanel = "simulator";
  actualPanel.dataset.investmentTabPanel = "actual";
  analysisPanel.dataset.investmentTabPanel = "analysis";

  const tabs = document.createElement("nav");
  tabs.className = "investment-subtabs";
  tabs.setAttribute("aria-label", "Sub-tab investasi");
  tabs.innerHTML = `
    <button class="active" data-investment-tab-button="simulator" type="button" aria-controls="investmentTabSimulator" aria-selected="true">
      Program 1: Proyeksi 120 Bulan
    </button>
    <button data-investment-tab-button="actual" type="button" aria-controls="investmentTabActual" aria-selected="false">
      Catatan Aktual
    </button>
    <button data-investment-tab-button="analysis" type="button" aria-controls="investmentTabAnalysis" aria-selected="false">
      Analisis Pembelian
    </button>
  `;

  const actualSyncBanner = document.createElement("section");
  actualSyncBanner.className = "program-sync-banner";
  actualSyncBanner.id = "programActualSyncBanner";
  actualSyncBanner.setAttribute("aria-live", "polite");
  actualSyncBanner.innerHTML = `
    <div>
      <strong id="programActualSyncTitle">Sinkron Program 2 aktif</strong>
      <span id="programActualSyncText">Data aktual Program 2 akan dipakai saat periodenya cocok.</span>
    </div>
    <small id="programActualSyncMeta">Bulan kosong berikutnya memakai konfigurasi simulator.</small>
  `;

  const actualMonthSummary = document.createElement("section");
  actualMonthSummary.className = "actual-month-summary";
  actualMonthSummary.id = "investmentActualMonthSummary";
  actualMonthSummary.setAttribute("aria-live", "polite");
  actualMonthSummary.innerHTML = `
    <div class="actual-month-head">
      <div>
        <span>Aktual bulan ini</span>
        <strong id="investmentActualMonthTitle">Aktual bulan ini</strong>
        <small id="investmentActualMonthMeta">Belum ada catatan aktual untuk bulan ini.</small>
      </div>
      <article>
        <span>Dipakai oleh Program 1</span>
        <strong id="investmentActualUsed">Belum ada data aktual</strong>
      </article>
    </div>
    <div class="actual-month-grid">
      <article>
        <span>BMRI</span>
        <strong id="investmentActualBmri">0 lot - Rp0</strong>
      </article>
      <article>
        <span>ASII</span>
        <strong id="investmentActualAsii">0 lot - Rp0</strong>
      </article>
      <article>
        <span>RDPU</span>
        <strong id="investmentActualRdpu">Rp0</strong>
      </article>
      <article>
        <span>Total Aktual</span>
        <strong id="investmentActualTotal">Rp0</strong>
      </article>
    </div>
  `;

  const saveFeedback = document.createElement("p");
  saveFeedback.className = "investment-save-feedback hidden";
  saveFeedback.id = "investmentSaveFeedback";
  saveFeedback.setAttribute("aria-live", "polite");

  const simulatorGrid = stack.querySelector(".investment-simulator-grid");
  const historySurface = el.simHistoryTable?.closest(".surface");
  const dividendSurface = el.simDividendPurchaseTableWrap?.closest(".surface");
  const divider = stack.querySelector(".investment-section-divider");
  const strategySurface = document.querySelector(".monthly-strategy-calculator")?.closest(".surface");
  const recordsSurface = document.querySelector(".investment-records-surface");
  stack.insertBefore(tabs, stack.firstElementChild);
  stack.append(simulatorPanel, actualPanel, analysisPanel);
  simulatorPanel.append(actualSyncBanner);
  [simulatorGrid, historySurface, dividendSurface].filter(Boolean).forEach((node) => simulatorPanel.append(node));
  divider?.remove();
  if (recordsSurface) {
    const recordsHead = recordsSurface.firstElementChild;
    recordsHead?.after(actualMonthSummary, saveFeedback);
    actualPanel.append(recordsSurface);
  }
  if (strategySurface) {
    analysisPanel.append(strategySurface);
  }

  el.programActualSyncBanner = document.querySelector("#programActualSyncBanner");
  el.programActualSyncTitle = document.querySelector("#programActualSyncTitle");
  el.programActualSyncText = document.querySelector("#programActualSyncText");
  el.programActualSyncMeta = document.querySelector("#programActualSyncMeta");
  el.investmentActualMonthTitle = document.querySelector("#investmentActualMonthTitle");
  el.investmentActualMonthMeta = document.querySelector("#investmentActualMonthMeta");
  el.investmentActualBmri = document.querySelector("#investmentActualBmri");
  el.investmentActualAsii = document.querySelector("#investmentActualAsii");
  el.investmentActualRdpu = document.querySelector("#investmentActualRdpu");
  el.investmentActualTotal = document.querySelector("#investmentActualTotal");
  el.investmentActualUsed = document.querySelector("#investmentActualUsed");
  el.investmentSaveFeedback = document.querySelector("#investmentSaveFeedback");

  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-investment-tab-button]");
    if (!button) return;
    switchInvestmentTab(button.dataset.investmentTabButton);
  });
}

function switchInvestmentTab(tab) {
  activeInvestmentTab = ["simulator", "actual", "analysis"].includes(tab) ? tab : "simulator";
  document.querySelectorAll("[data-investment-tab-button]").forEach((button) => {
    const active = button.dataset.investmentTabButton === activeInvestmentTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-investment-tab-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.investmentTabPanel === activeInvestmentTab);
  });

  if (activeInvestmentTab === "simulator" && investmentGrowthChart) {
    investmentGrowthChart.resize();
    investmentGrowthChart.update();
  }
  if (activeInvestmentTab === "actual") {
    if (investmentStockChart) {
      investmentStockChart.resize();
      investmentStockChart.update();
    }
    updateInvestmentInfo();
    updateInvestmentStockChart();
  }
}

function filteredInvestmentInfoStocks() {
  const ticker = el.investmentInfoTickerFilter.value || "all";
  const year = el.investmentInfoYearFilter.value || "all";
  return state.investments.stockPurchases
    .filter((purchase) => ticker === "all" || purchase.ticker === ticker)
    .filter((purchase) => year === "all" || purchase.year === Number(year));
}

function filteredInvestmentInfoRdpu() {
  const year = el.investmentInfoYearFilter.value || "all";
  return state.investments.rdpuPurchases.filter((purchase) => year === "all" || purchase.year === Number(year));
}

function findInvestmentByMetric(purchases, metric, direction) {
  if (!purchases.length) return null;
  return purchases.reduce((selected, purchase) => {
    if (direction === "min") return purchase[metric] < selected[metric] ? purchase : selected;
    return purchase[metric] > selected[metric] ? purchase : selected;
  }, purchases[0]);
}

function findInvestmentByValue(purchases, direction) {
  if (!purchases.length) return null;
  return purchases.reduce((selected, purchase) => {
    const selectedValue = investmentValue(selected);
    const purchaseValue = investmentValue(purchase);
    if (direction === "min") return purchaseValue < selectedValue ? purchase : selected;
    return purchaseValue > selectedValue ? purchase : selected;
  }, purchases[0]);
}

function formatInvestmentPurchaseMeta(purchase) {
  return purchase
    ? `${purchase.ticker} - ${formatInvestmentDate(purchase)} - ${formatMoney(purchase.lotPrice)} / lot x ${purchase.lots.toLocaleString("id-ID")} lot`
    : "-";
}

function updateInvestmentInfo() {
  const stockRows = filteredInvestmentInfoStocks();
  const rdpuRows = filteredInvestmentInfoRdpu();
  const minPrice = findInvestmentByValue(stockRows, "min");
  const maxPrice = findInvestmentByValue(stockRows, "max");
  const minLots = findInvestmentByMetric(stockRows, "lots", "min");
  const maxLots = findInvestmentByMetric(stockRows, "lots", "max");
  const minRdpu = findInvestmentByMetric(rdpuRows, "amount", "min");
  const maxRdpu = findInvestmentByMetric(rdpuRows, "amount", "max");

  el.investmentMinPrice.textContent = minPrice ? formatMoney(investmentValue(minPrice)) : "-";
  el.investmentMinPriceMeta.textContent = formatInvestmentPurchaseMeta(minPrice);
  el.investmentMaxPrice.textContent = maxPrice ? formatMoney(investmentValue(maxPrice)) : "-";
  el.investmentMaxPriceMeta.textContent = formatInvestmentPurchaseMeta(maxPrice);
  el.investmentMinLots.textContent = minLots ? `${minLots.lots.toLocaleString("id-ID")} lot` : "-";
  el.investmentMinLotsMeta.textContent = minLots
    ? `${minLots.ticker} - ${formatInvestmentDate(minLots)} - ${formatMoney(investmentValue(minLots))} total`
    : "-";
  el.investmentMaxLots.textContent = maxLots ? `${maxLots.lots.toLocaleString("id-ID")} lot` : "-";
  el.investmentMaxLotsMeta.textContent = maxLots
    ? `${maxLots.ticker} - ${formatInvestmentDate(maxLots)} - ${formatMoney(investmentValue(maxLots))} total`
    : "-";
  el.investmentMinRdpu.textContent = minRdpu ? formatMoney(minRdpu.amount) : "-";
  el.investmentMinRdpuMeta.textContent = minRdpu ? formatInvestmentDate(minRdpu) : "-";
  el.investmentMaxRdpu.textContent = maxRdpu ? formatMoney(maxRdpu.amount) : "-";
  el.investmentMaxRdpuMeta.textContent = maxRdpu ? formatInvestmentDate(maxRdpu) : "-";
}

function filteredInvestmentChartStocks() {
  const ticker = el.investmentStockChartTickerFilter.value || "all";
  const year = el.investmentStockChartYearFilter.value || "all";
  return state.investments.stockPurchases
    .filter((purchase) => ticker === "all" || purchase.ticker === ticker)
    .filter((purchase) => year === "all" || purchase.year === Number(year))
    .sort((a, b) => investmentTimestamp(a) - investmentTimestamp(b));
}

function updateInvestmentStockChart() {
  const purchases = filteredInvestmentChartStocks();
  investmentStockChartPurchases = purchases;
  el.investmentStockChartEmpty.classList.toggle("hidden", purchases.length > 0);

  if (!investmentStockChart) return;
  investmentStockChart.data.labels = purchases.map((purchase) => `${purchase.ticker} - ${formatInvestmentDate(purchase)}`);
  investmentStockChart.data.datasets[0].data = purchases.map((purchase) => purchase.lotPrice);
  investmentStockChart.data.datasets[1].data = purchases.map((purchase) => purchase.lots);
  investmentStockChart.update();
}

function renderInvestments() {
  state.investments = normalizeInvestments(state.investments);
  applySimulatorConfigToForm(state.investments.simulatorConfig);
  updateInvestmentSimulator({ persistConfig: false });
  renderInvestmentOptions();
  renderInvestmentTickers();
  updateMonthlyStrategyCalculator();
  renderInvestmentTables();
  renderInvestmentSummary();
  updateInvestmentInfo();
  updateInvestmentStockChart();
  investmentsDirty = false;
}

function markInvestmentsDirty() {
  investmentsDirty = true;
}

function renderInvestmentsIfActive(force = false) {
  if (activeView !== "investments") {
    markInvestmentsDirty();
    return;
  }
  if (!force && !investmentsDirty) return;
  renderInvestments();
}

function switchView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((node) => node.classList.toggle("active", node.dataset.view === view));
  el.pageTitle.textContent = {
    dashboard: "Dashboard",
    transactions: "Transaksi",
    categories: "Tab & Jenis",
    investments: "Investasi",
    tools: "Tools",
  }[view];
  if (view === "investments") {
    renderInvestmentsIfActive(true);
  }
}


function initSidebarToggle() {
  const btn = document.querySelector("#sidebarToggle");
  const shell = document.querySelector(".app-shell");
  if (!btn || !shell) return;

  // Pulihkan state tersimpan
  if (localStorage.getItem("sidebar-collapsed") === "1") {
    shell.classList.add("sidebar-collapsed");
  }

  btn.addEventListener("click", () => {
    const isCollapsed = shell.classList.toggle("sidebar-collapsed");
    localStorage.setItem("sidebar-collapsed", isCollapsed ? "1" : "0");
  });
}

function resetTransactionForm() {
  el.editingTransactionId.value = "";
  el.transactionFormTitle.textContent = "Tambah Transaksi";
  el.transactionForm.reset();
  el.transactionDate.value = new Date().toISOString().slice(0, 10);
  el.transactionType.value = "income";
  renderCategoryOptions();
}

function showSavedTransaction(transaction) {
  el.monthFilter.value = transaction.date.slice(0, 7);
  el.searchInput.value = "";
  el.typeFilter.value = "all";
  el.categoryFilter.value = "all";
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function initEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelector("#quickAddButton").addEventListener("click", () => {
    switchView("transactions");
    el.transactionTitle.focus();
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      activeChartType = button.dataset.chartType;
      document.querySelectorAll(".segment").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      renderDashboard();
    });
  });

  el.monthFilter.addEventListener("change", renderAll);
  el.transactionType.addEventListener("change", renderCategoryOptions);
  el.searchInput.addEventListener("input", renderTransactions);
  el.typeFilter.addEventListener("change", renderTransactions);
  el.categoryFilter.addEventListener("change", renderTransactions);
  el.allMonthsFilter.addEventListener("change", renderTransactions);
  el.toggleSelectionButton.addEventListener("click", () => {
    transactionSelectionMode = !transactionSelectionMode;
    selectedTransactionIds.clear();
    renderTransactions();
  });
  window.addEventListener("resize", () => renderChart(monthTransactions()));
  el.categoryChart.addEventListener("mousemove", showChartTooltip);
  el.categoryChart.addEventListener("mouseleave", () => el.chartTooltip.classList.add("hidden"));

  el.transactionAmount.addEventListener("input", () => {
    el.transactionAmount.value = formatNumberInput(el.transactionAmount.value);
  });

  el.investmentSimulatorForm.addEventListener("submit", (event) => event.preventDefault());
  el.simStockAllocation.addEventListener("input", () => {
    maybeDisconnectMonthlyStrategySync(el.simStockAllocation);
    el.simStockAllocationNumber.value = el.simStockAllocation.value;
    updateInvestmentSimulator();
  });
  el.simStockAllocationNumber.addEventListener("input", () => {
    maybeDisconnectMonthlyStrategySync(el.simStockAllocationNumber);
    updateInvestmentSimulator();
  });
  el.simStartMonth.addEventListener("change", updateInvestmentSimulator);
  el.simPurchaseMode.addEventListener("change", () => {
    maybeDisconnectMonthlyStrategySync(el.simPurchaseMode);
    updateInvestmentSimulator();
  });
  el.investmentSimulatorForm.addEventListener("input", (event) => {
    if (event.target !== el.simStockAllocation && event.target !== el.simStockAllocationNumber) {
      maybeDisconnectMonthlyStrategySync(event.target);
      updateInvestmentSimulator();
    }
  });
  el.simEnablePriceChange.addEventListener("change", updateInvestmentSimulator);
  [el.simBmriPriceChange, el.simAsiiPriceChange].forEach((input) => {
    input.addEventListener("blur", () => {
      input.value = String(clampNumber(readNumber(input, 5), -99, 1000));
      updateInvestmentSimulator();
    });
  });
  [el.simBmriMonthlyLots, el.simAsiiMonthlyLots].forEach((input) => {
    input.addEventListener("blur", () => {
      maybeDisconnectMonthlyStrategySync(input);
      input.value = String(readWholeLots(input, 0));
      updateInvestmentSimulator();
    });
  });
  document.querySelectorAll("[data-sim-lot-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const [bmriLots, asiiLots] = button.dataset.simLotPreset.split("-").map((value) => Number(value));
      maybeDisconnectMonthlyStrategySync(el.simBmriMonthlyLots);
      el.simBmriMonthlyLots.value = String(bmriLots);
      el.simAsiiMonthlyLots.value = String(asiiLots);
      updateInvestmentSimulator();
    });
  });

  el.investmentStockLotPrice.addEventListener("input", () => {
    el.investmentStockLotPrice.value = formatNumberInput(el.investmentStockLotPrice.value);
  });

  el.investmentRdpuAmount.addEventListener("input", () => {
    el.investmentRdpuAmount.value = formatNumberInput(el.investmentRdpuAmount.value);
  });

  [
    el.monthlyStrategyDeposit,
    el.monthlyStrategyBmriPrice,
    el.monthlyStrategyAsiiPrice,
    el.monthlyStrategyBmriExtraAmount,
    el.monthlyStrategyDividendAmount,
    el.monthlyStrategyBmriAveragePrice,
    el.monthlyStrategyBmriCurrentPrice,
  ].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatNumberInput(input.value);
      updateMonthlyStrategyCalculator();
    });
  });
  [el.monthlyStrategyBmriBaseLots, el.monthlyStrategyAsiiBaseLots].forEach((input) => {
    input.addEventListener("input", updateMonthlyStrategyCalculator);
    input.addEventListener("blur", () => {
      input.value = String(readWholeLots(input, 0));
      updateMonthlyStrategyCalculator();
    });
  });
  el.monthlyStrategyUseExtra.addEventListener("change", updateMonthlyStrategyCalculator);
  el.monthlyStrategyUseIndicator.addEventListener("change", updateMonthlyStrategyCalculator);
  el.monthlyStrategyUseDividend.addEventListener("change", updateMonthlyStrategyCalculator);
  el.monthlyStrategySyncSimulator.addEventListener("change", updateMonthlyStrategyCalculator);

  el.investmentHorizon.addEventListener("change", async () => {
    state.investments.horizonYears = clampNumber(Math.round(Number(el.investmentHorizon.value) || 11), 1, 50);
    renderInvestments();
    try {
      await persistInvestmentSettings();
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan investasi cloud gagal", "error");
    }
  });

  el.addInvestmentYearButton.addEventListener("click", async () => {
    state.investments.horizonYears = clampNumber(state.investments.horizonYears + 1, 1, 50);
    renderInvestments();
    try {
      await persistInvestmentSettings();
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan investasi cloud gagal", "error");
    }
  });

  el.investmentInfoTickerFilter.addEventListener("change", updateInvestmentInfo);
  el.investmentInfoYearFilter.addEventListener("change", updateInvestmentInfo);
  el.investmentStockChartTickerFilter.addEventListener("change", updateInvestmentStockChart);
  el.investmentStockChartYearFilter.addEventListener("change", updateInvestmentStockChart);

  el.investmentTickerInput.addEventListener("input", () => {
    el.investmentTickerInput.value = sanitizeTicker(el.investmentTickerInput.value);
  });

  el.investmentTickerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const ticker = sanitizeTicker(el.investmentTickerInput.value);
    if (!ticker || state.investments.tickers.includes(ticker)) return;

    state.investments.tickers.push(ticker);
    el.investmentTickerInput.value = "";
    renderInvestments();
    el.investmentStockTicker.value = ticker;
    try {
      await persistInvestmentTicker(ticker);
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan saham cloud gagal", "error");
    }
  });

  el.investmentTickerList.addEventListener("click", async (event) => {
    const ticker = event.target.dataset.deleteInvestmentTicker;
    if (!ticker) return;

    state.investments.tickers = state.investments.tickers.filter((item) => item !== ticker);
    state.investments.stockPurchases = state.investments.stockPurchases.filter((purchase) => purchase.ticker !== ticker);
    renderInvestments();
    try {
      await deleteInvestmentTickerRemote(ticker);
      await syncInvestmentsToRemote();
    } catch (error) {
      console.error(error);
      setSyncStatus("Hapus saham cloud gagal", "error");
    }
  });

  el.investmentStockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lotPrice = parseNumberInput(el.investmentStockLotPrice.value);
    const lots = Math.floor(Number(el.investmentStockLots.value) || 0);
    if (!el.investmentStockTicker.value || lotPrice <= 0 || lots <= 0) {
      alert("Harga per lot dan jumlah lot harus lebih dari 0.");
      return;
    }

    const purchase = {
      id: uid("stock"),
      ticker: el.investmentStockTicker.value,
      month: Number(el.investmentStockMonth.value),
      year: Number(el.investmentStockYear.value),
      lotPrice,
      lots,
      createdAt: new Date().toISOString(),
    };

    state.investments.stockPurchases.push(purchase);
    el.investmentStockLotPrice.value = "";
    el.investmentStockLots.value = "";
    renderInvestments();
    showInvestmentSaveFeedback(purchase, "stock");
    try {
      await persistStockPurchase(purchase);
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan pembelian saham cloud gagal", "error");
    }
  });

  el.investmentRdpuForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = parseNumberInput(el.investmentRdpuAmount.value);
    if (amount <= 0) {
      alert("Nominal RDPU harus lebih dari 0.");
      return;
    }

    const purchase = {
      id: uid("rdpu"),
      month: Number(el.investmentRdpuMonth.value),
      year: Number(el.investmentRdpuYear.value),
      amount,
      createdAt: new Date().toISOString(),
    };

    state.investments.rdpuPurchases.push(purchase);
    el.investmentRdpuAmount.value = "";
    renderInvestments();
    showInvestmentSaveFeedback(purchase, "rdpu");
    try {
      await persistRdpuPurchase(purchase);
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan RDPU cloud gagal", "error");
    }
  });

  el.investmentStockTable.addEventListener("click", async (event) => {
    const id = event.target.dataset.deleteStockPurchase;
    if (!id) return;

    state.investments.stockPurchases = state.investments.stockPurchases.filter((purchase) => purchase.id !== id);
    renderInvestments();
    try {
      await deleteStockPurchaseRemote(id);
    } catch (error) {
      console.error(error);
      setSyncStatus("Hapus saham cloud gagal", "error");
    }
  });

  el.investmentRdpuTable.addEventListener("click", async (event) => {
    const id = event.target.dataset.deleteRdpuPurchase;
    if (!id) return;

    state.investments.rdpuPurchases = state.investments.rdpuPurchases.filter((purchase) => purchase.id !== id);
    renderInvestments();
    try {
      await deleteRdpuPurchaseRemote(id);
    } catch (error) {
      console.error(error);
      setSyncStatus("Hapus RDPU cloud gagal", "error");
    }
  });

  el.transactionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!el.transactionCategory.value) {
      alert("Buat tab untuk tipe transaksi ini terlebih dahulu.");
      return;
    }

    const selectedCategory = categoryById(el.transactionCategory.value);
    if (!selectedCategory || selectedCategory.type !== el.transactionType.value) {
      alert("Tab/Jenis tidak valid. Pilih ulang tab transaksi.");
      renderCategoryOptions();
      return;
    }

    const payload = {
      type: el.transactionType.value,
      categoryId: el.transactionCategory.value,
      title: el.transactionTitle.value.trim(),
      amount: parseNumberInput(el.transactionAmount.value),
      date: el.transactionDate.value,
      note: el.transactionNote.value.trim(),
    };

    if (payload.amount <= 0) {
      alert("Nominal harus lebih dari 0.");
      return;
    }

    const editingId = el.editingTransactionId.value;
    let savedTransaction;
    if (editingId) {
      const existingTransaction = state.transactions.find((item) => item.id === editingId);
      savedTransaction = {
        id: editingId,
        createdAt: transactionCreatedAt(existingTransaction || { id: editingId, ...payload }),
        ...payload,
      };
      state.transactions = state.transactions.map((item) => (item.id === editingId ? savedTransaction : item));
    } else {
      savedTransaction = { id: uid("trx"), createdAt: new Date().toISOString(), ...payload };
      state.transactions.push(savedTransaction);
    }

    showSavedTransaction(savedTransaction);
    resetTransactionForm();
    renderAll();

    try {
      await persistTransaction(savedTransaction);
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan cloud gagal", "error");
      renderAll();
      alert(`Transaksi tersimpan lokal, tapi gagal sync ke cloud: ${error.message}`);
    }
  });

  el.cancelEditButton.addEventListener("click", resetTransactionForm);

  el.transactionTable.addEventListener("change", (event) => {
    const selectedId = event.target.dataset.selectTransaction;
    if (!selectedId) return;

    if (event.target.checked) {
      selectedTransactionIds.add(selectedId);
    } else {
      selectedTransactionIds.delete(selectedId);
    }
    renderTransactions();
  });

  el.transactionTable.addEventListener("click", async (event) => {
    const editId = event.target.dataset.edit;
    const deleteId = event.target.dataset.delete;

    if (editId) {
      const item = state.transactions.find((transaction) => transaction.id === editId);
      if (!item) return;
      el.transactionFormTitle.textContent = "Edit Transaksi";
      el.editingTransactionId.value = item.id;
      el.transactionType.value = item.type;
      renderCategoryOptions();
      el.transactionCategory.value = item.categoryId;
      el.transactionTitle.value = item.title;
      el.transactionAmount.value = formatNumberInput(item.amount);
      el.transactionDate.value = item.date;
      el.transactionNote.value = item.note;
      el.transactionTitle.focus();
    }

    if (deleteId && confirm("Hapus transaksi ini?")) {
      state.transactions = state.transactions.filter((transaction) => transaction.id !== deleteId);
      selectedTransactionIds.delete(deleteId);
      try {
        await deleteTransactionRemote(deleteId);
        renderAll();
      } catch (error) {
        console.error(error);
        setSyncStatus("Hapus cloud gagal", "error");
        alert(`Gagal menghapus di cloud: ${error.message}`);
      }
    }
  });

  el.categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = el.categoryName.value.trim();
    if (!name) return;

    const category = {
      id: uid("cat"),
      type: el.categoryType.value,
      name,
      color: el.categoryColor.value,
    };

    state.categories.push(category);
    try {
      await persistCategory(category);
      el.categoryForm.reset();
      el.categoryColor.value = "#2563eb";
      renderAll();
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan cloud gagal", "error");
      alert(`Gagal menyimpan tab ke cloud: ${error.message}`);
    }
  });

  el.categoryBoard.addEventListener("click", async (event) => {
    const renameId = event.target.dataset.renameCategory;
    const deleteId = event.target.dataset.deleteCategory;

    if (renameId) {
      const category = categoryById(renameId);
      const nextName = prompt("Nama tab baru:", category.name);
      if (nextName?.trim()) {
        const previousName = category.name;
        category.name = nextName.trim();
        saveState();
        renderAll();
        try {
          await persistCategory(category);
        } catch (error) {
          console.error(error);
          category.name = previousName;
          saveState();
          renderAll();
          setSyncStatus("Update cloud gagal", "error");
          alert(`Gagal mengubah tab di cloud: ${error.message}`);
        }
      }
    }

    if (deleteId) {
      const used = countTransactions(deleteId);
      if (used > 0) {
        alert("Tab ini masih dipakai transaksi. Pindahkan atau hapus transaksinya dulu.");
        return;
      }
      if (confirm("Hapus tab ini?")) {
        state.categories = state.categories.filter((category) => category.id !== deleteId);
        try {
          await deleteCategoryRemote(deleteId);
          renderAll();
        } catch (error) {
          console.error(error);
          setSyncStatus("Hapus cloud gagal", "error");
          alert(`Gagal menghapus tab di cloud: ${error.message}`);
        }
      }
    }
  });

  el.exportJsonButton.addEventListener("click", () => {
    download(`catatan-kas-${el.monthFilter.value}.json`, JSON.stringify(state, null, 2), "application/json");
  });

  el.exportCsvButton.addEventListener("click", () => {
    const header = ["tanggal", "tipe", "tab", "judul", "nominal", "catatan"];
    const rows = state.transactions.map((item) =>
      [item.date, typeLabel(item.type), categoryName(item.categoryId), item.title, item.amount, item.note]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    download(`transaksi-${el.monthFilter.value}.csv`, [header.join(","), ...rows].join("\n"), "text/csv");
  });

  el.importFile.addEventListener("change", async () => {
    const file = el.importFile.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      if (!Array.isArray(imported.categories) || !Array.isArray(imported.transactions)) {
        throw new Error("Format tidak sesuai.");
      }
      state = normalizeState(imported);
      saveState();
      if (remoteStore.enabled) {
        await remoteStore.client.from("categories").upsert(state.categories.map(toDbCategory));
        await remoteStore.client.from("transactions").upsert(state.transactions.map(toDbTransaction));
        await syncInvestmentsToRemote();
      }
      renderAll();
      alert("Import berhasil.");
    } catch (error) {
      alert(`Import gagal: ${error.message}`);
    } finally {
      el.importFile.value = "";
    }
  });

  el.resetButton.addEventListener("click", async () => {
    if (confirm("Reset semua data? Aksi ini tidak bisa dibatalkan.")) {
      state = normalizeState(structuredClone(defaultState));
      try {
        await resetRemoteData();
        renderAll();
      } catch (error) {
        console.error(error);
        setSyncStatus("Reset cloud gagal", "error");
        alert(`Gagal reset data cloud: ${error.message}`);
      }
    }
  });
}

el.monthFilter.value = currentMonth();
el.transactionDate.value = new Date().toISOString().slice(0, 10);
el.allMonthsFilter.checked = true;
setupInvestmentTabs();
initEvents();
initInvestmentCharts();
initSidebarToggle();
renderAll();
initRemoteStore().then(renderAll);
