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
    tickers: ["BMRI", "ICBP"],
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
const SIMULATION_MONTHS = 120;
const LOT_SIZE = 100;
const SELLING_FEE_RATE = 0.0035;

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
let investmentGrowthChart = null;
let investmentStockChart = null;
let investmentStockChartPurchases = [];
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
  simStockAllocation: document.querySelector("#simStockAllocation"),
  simStockAllocationNumber: document.querySelector("#simStockAllocationNumber"),
  simRdpuAllocationLabel: document.querySelector("#simRdpuAllocationLabel"),
  simStockAllocationAmount: document.querySelector("#simStockAllocationAmount"),
  simRdpuAllocationAmount: document.querySelector("#simRdpuAllocationAmount"),
  simPurchaseMode: document.querySelector("#simPurchaseMode"),
  simCustomLotPanel: document.querySelector("#simCustomLotPanel"),
  simBmriMonthlyLots: document.querySelector("#simBmriMonthlyLots"),
  simIcbpMonthlyLots: document.querySelector("#simIcbpMonthlyLots"),
  simCustomBmriPurchase: document.querySelector("#simCustomBmriPurchase"),
  simCustomIcbpPurchase: document.querySelector("#simCustomIcbpPurchase"),
  simCustomStockPurchase: document.querySelector("#simCustomStockPurchase"),
  simCustomRdpuPurchase: document.querySelector("#simCustomRdpuPurchase"),
  simCustomLotStatus: document.querySelector("#simCustomLotStatus"),
  simBmriPrice: document.querySelector("#simBmriPrice"),
  simIcbpPrice: document.querySelector("#simIcbpPrice"),
  simEnablePriceChange: document.querySelector("#simEnablePriceChange"),
  simPriceChangePanel: document.querySelector("#simPriceChangePanel"),
  simPriceChangeToggle: document.querySelector("#simPriceChangeToggle"),
  simPriceChangeFields: document.querySelector("#simPriceChangeFields"),
  simPriceChangeStatus: document.querySelector("#simPriceChangeStatus"),
  simBmriPriceChange: document.querySelector("#simBmriPriceChange"),
  simIcbpPriceChange: document.querySelector("#simIcbpPriceChange"),
  simRdpuReturn: document.querySelector("#simRdpuReturn"),
  simDividendGrowth: document.querySelector("#simDividendGrowth"),
  simBmriYield: document.querySelector("#simBmriYield"),
  simIcbpYield: document.querySelector("#simIcbpYield"),
  simTotalContribution: document.querySelector("#simTotalContribution"),
  simFinalAsset: document.querySelector("#simFinalAsset"),
  simNetProfit: document.querySelector("#simNetProfit"),
  simPassiveIncome: document.querySelector("#simPassiveIncome"),
  simAssetMultiple: document.querySelector("#simAssetMultiple"),
  simBmriLots: document.querySelector("#simBmriLots"),
  simIcbpLots: document.querySelector("#simIcbpLots"),
  simBmriValue: document.querySelector("#simBmriValue"),
  simIcbpValue: document.querySelector("#simIcbpValue"),
  simRdpuValue: document.querySelector("#simRdpuValue"),
  simRdpuShare: document.querySelector("#simRdpuShare"),
  simBmriBar: document.querySelector("#simBmriBar"),
  simIcbpBar: document.querySelector("#simIcbpBar"),
  simRdpuBar: document.querySelector("#simRdpuBar"),
  simSellingFee: document.querySelector("#simSellingFee"),
  simTotalDividends: document.querySelector("#simTotalDividends"),
  simHistoryTable: document.querySelector("#simHistoryTable"),
  investmentGrowthChart: document.querySelector("#investmentGrowthChart"),
  investmentHorizon: document.querySelector("#investmentHorizon"),
  addInvestmentYearButton: document.querySelector("#addInvestmentYearButton"),
  monthlyStrategyDeposit: document.querySelector("#monthlyStrategyDeposit"),
  monthlyStrategyBmriPrice: document.querySelector("#monthlyStrategyBmriPrice"),
  monthlyStrategyIcbpPrice: document.querySelector("#monthlyStrategyIcbpPrice"),
  monthlyStrategyBmriBaseLots: document.querySelector("#monthlyStrategyBmriBaseLots"),
  monthlyStrategyIcbpBaseLots: document.querySelector("#monthlyStrategyIcbpBaseLots"),
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
  monthlyStrategyIndicatorResults: document.querySelectorAll(".monthly-indicator-result"),
  monthlyStrategyExtraResults: document.querySelectorAll(".monthly-extra-result"),
  monthlyStrategyBmriBaseResult: document.querySelector("#monthlyStrategyBmriBaseResult"),
  monthlyStrategyIcbpBaseResult: document.querySelector("#monthlyStrategyIcbpBaseResult"),
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
    tickers: [...new Set(["BMRI", "ICBP", ...tickers, ...stockPurchases.map((purchase) => purchase.ticker)])],
    stockPurchases,
    rdpuPurchases,
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
    horizon_years: investments.horizonYears,
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

function dividendPerShare(price, initialYieldPercent, growthPercent, year) {
  const initialDividend = price * (initialYieldPercent / 100);
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

function buildMonthlyLotPlan(bmriTarget, icbpTarget) {
  const plan = [];
  const maxTarget = Math.max(bmriTarget, icbpTarget);
  for (let index = 0; index < maxTarget; index += 1) {
    if (index < bmriTarget) plan.push("BMRI");
    if (index < icbpTarget) plan.push("ICBP");
  }
  return plan;
}

function buyAffordableCustomLots(availableCash, bmriLotPrice, icbpLotPrice, bmriTarget, icbpTarget) {
  let cash = availableCash;
  let bmriBought = 0;
  let icbpBought = 0;

  buildMonthlyLotPlan(bmriTarget, icbpTarget).forEach((ticker) => {
    const lotPrice = ticker === "BMRI" ? bmriLotPrice : icbpLotPrice;
    if (cash < lotPrice) return;

    cash -= lotPrice;
    if (ticker === "BMRI") {
      bmriBought += 1;
    } else {
      icbpBought += 1;
    }
  });

  return {
    bmriBought,
    icbpBought,
    leftoverCash: cash,
  };
}

function formatLotPurchase(lots, amount) {
  return `${lots.toLocaleString("id-ID")} lot - ${formatMoney(amount)}`;
}

function updateCustomLotSummary(inputs) {
  const bmriLotPrice = inputs.bmriPrice * LOT_SIZE;
  const icbpLotPrice = inputs.icbpPrice * LOT_SIZE;
  const purchase = buyAffordableCustomLots(
    inputs.monthlyDeposit,
    bmriLotPrice,
    icbpLotPrice,
    inputs.bmriMonthlyLots,
    inputs.icbpMonthlyLots,
  );
  const bmriAmount = purchase.bmriBought * bmriLotPrice;
  const icbpAmount = purchase.icbpBought * icbpLotPrice;
  const stockAmount = bmriAmount + icbpAmount;
  const targetAmount = inputs.bmriMonthlyLots * bmriLotPrice + inputs.icbpMonthlyLots * icbpLotPrice;
  const targetReached = purchase.bmriBought === inputs.bmriMonthlyLots && purchase.icbpBought === inputs.icbpMonthlyLots;

  el.simCustomBmriPurchase.textContent = formatLotPurchase(purchase.bmriBought, bmriAmount);
  el.simCustomIcbpPurchase.textContent = formatLotPurchase(purchase.icbpBought, icbpAmount);
  el.simCustomStockPurchase.textContent = formatMoney(stockAmount);
  el.simCustomRdpuPurchase.textContent = formatMoney(purchase.leftoverCash);

  if (targetAmount <= 0) {
    el.simCustomLotStatus.textContent = "Tidak ada target saham, seluruh setoran bulan normal masuk RDPU.";
  } else if (targetReached) {
    el.simCustomLotStatus.textContent = `Target penuh. Kebutuhan saham ${formatMoney(targetAmount)}, sisa masuk RDPU ${formatMoney(purchase.leftoverCash)}.`;
  } else {
    el.simCustomLotStatus.textContent = `Kas belum cukup untuk target ${formatMoney(targetAmount)}. Simulator membeli lot yang terjangkau, lalu sisa masuk RDPU.`;
  }
}

function readSimulationInputs() {
  const stockAllocation = clampNumber(Math.round(readNumber(el.simStockAllocationNumber, 80)), 0, 100);
  return {
    monthlyDeposit: Math.max(0, readNumber(el.simMonthlyDeposit, 1100000)),
    stockAllocation,
    rdpuAllocation: 100 - stockAllocation,
    purchaseMode: el.simPurchaseMode.value === "custom" ? "custom" : "alternating",
    bmriMonthlyLots: readWholeLots(el.simBmriMonthlyLots, 1),
    icbpMonthlyLots: readWholeLots(el.simIcbpMonthlyLots, 1),
    bmriPrice: Math.max(1, readNumber(el.simBmriPrice, 4130)),
    icbpPrice: Math.max(1, readNumber(el.simIcbpPrice, 6875)),
    rdpuReturnAnnual: Math.max(0, readNumber(el.simRdpuReturn, 4.14)),
    dividendGrowthAnnual: Math.max(0, readNumber(el.simDividendGrowth, 5)),
    bmriYieldInitial: Math.max(0, readNumber(el.simBmriYield, 5)),
    icbpYieldInitial: Math.max(0, readNumber(el.simIcbpYield, 4)),
    priceChangeEnabled: el.simEnablePriceChange.checked,
    bmriPriceChangeAnnual: clampNumber(readNumber(el.simBmriPriceChange, 5), -99, 1000),
    icbpPriceChangeAnnual: clampNumber(readNumber(el.simIcbpPriceChange, 5), -99, 1000),
  };
}

function simulateInvestment(inputs) {
  let bmriLots = 0;
  let icbpLots = 0;
  let rdpuBalance = 0;
  let totalDividends = 0;
  let annualDividends = 0;
  let currentBmriPrice = inputs.bmriPrice;
  let currentIcbpPrice = inputs.icbpPrice;
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
    const isBmriDividendMonth = month % 12 === 11;
    const isIcbpDividendMonth = month % 12 === 0;

    if (month > 1 && (month - 1) % 12 === 0) {
      currentBmriPrice = applyAnnualPriceChange(currentBmriPrice, inputs.bmriPriceChangeAnnual, inputs.priceChangeEnabled);
      currentIcbpPrice = applyAnnualPriceChange(currentIcbpPrice, inputs.icbpPriceChangeAnnual, inputs.priceChangeEnabled);
    }

    const bmriLotPrice = currentBmriPrice * LOT_SIZE;
    const icbpLotPrice = currentIcbpPrice * LOT_SIZE;
    let dividendThisMonth = 0;
    let rdpuContribution = monthlyRdpuBudget;

    if (inputs.purchaseMode === "custom") {
      const bmriDividend = isBmriDividendMonth
        ? bmriLots * LOT_SIZE * dividendPerShare(inputs.bmriPrice, inputs.bmriYieldInitial, inputs.dividendGrowthAnnual, year)
        : 0;
      const icbpDividend = isIcbpDividendMonth
        ? icbpLots * LOT_SIZE * dividendPerShare(inputs.icbpPrice, inputs.icbpYieldInitial, inputs.dividendGrowthAnnual, year)
        : 0;
      dividendThisMonth = bmriDividend + icbpDividend;

      const purchase = buyAffordableCustomLots(
        inputs.monthlyDeposit + dividendThisMonth,
        bmriLotPrice,
        icbpLotPrice,
        inputs.bmriMonthlyLots,
        inputs.icbpMonthlyLots,
      );

      bmriLots += purchase.bmriBought;
      icbpLots += purchase.icbpBought;
      rdpuContribution = purchase.leftoverCash;
    } else if (isOddMonth) {
      const bmriDividend = isBmriDividendMonth
        ? bmriLots * LOT_SIZE * dividendPerShare(inputs.bmriPrice, inputs.bmriYieldInitial, inputs.dividendGrowthAnnual, year)
        : 0;
      const stockCash = monthlyStockBudget + bmriDividend;
      const boughtLots = Math.floor(stockCash / bmriLotPrice);
      bmriLots += boughtLots;
      rdpuContribution += stockCash - boughtLots * bmriLotPrice;
      dividendThisMonth = bmriDividend;
    } else {
      const icbpDividend = isIcbpDividendMonth
        ? icbpLots * LOT_SIZE * dividendPerShare(inputs.icbpPrice, inputs.icbpYieldInitial, inputs.dividendGrowthAnnual, year)
        : 0;
      const stockCash = monthlyStockBudget + icbpDividend;
      const boughtLots = Math.floor(stockCash / icbpLotPrice);
      icbpLots += boughtLots;
      rdpuContribution += stockCash - boughtLots * icbpLotPrice;
      dividendThisMonth = icbpDividend;
    }

    totalDividends += dividendThisMonth;
    annualDividends += dividendThisMonth;
    rdpuBalance = (rdpuBalance + rdpuContribution) * (1 + monthlyRdpuRate);

    if (month % 12 === 0) {
      const totalContribution = inputs.monthlyDeposit * month;
      const bmriValue = bmriLots * LOT_SIZE * currentBmriPrice;
      const icbpValue = icbpLots * LOT_SIZE * currentIcbpPrice;
      const portfolioValue = bmriValue + icbpValue + rdpuBalance;

      yearlyRows.push({
        year,
        totalContribution,
        bmriPrice: currentBmriPrice,
        bmriLots,
        icbpPrice: currentIcbpPrice,
        icbpLots,
        annualDividends,
        rdpuBalance,
        portfolioValue,
      });

      chartYears.push(`Tahun ${year}`);
      chartContributions.push(Math.round(totalContribution));
      chartAssets.push(Math.round(portfolioValue));
      annualDividends = 0;
    }
  }

  const bmriValue = bmriLots * LOT_SIZE * currentBmriPrice;
  const icbpValue = icbpLots * LOT_SIZE * currentIcbpPrice;
  const stockValue = bmriValue + icbpValue;
  const finalAsset = stockValue + rdpuBalance;
  const totalContribution = inputs.monthlyDeposit * SIMULATION_MONTHS;
  const sellingFee = stockValue * SELLING_FEE_RATE;
  const netProfit = finalAsset - sellingFee - totalContribution;
  const passiveIncomeYear10 =
    bmriLots * LOT_SIZE * dividendPerShare(inputs.bmriPrice, inputs.bmriYieldInitial, inputs.dividendGrowthAnnual, 10) +
    icbpLots * LOT_SIZE * dividendPerShare(inputs.icbpPrice, inputs.icbpYieldInitial, inputs.dividendGrowthAnnual, 10);

  return {
    totalContribution,
    finalAsset,
    netProfit,
    passiveIncomeYear10,
    sellingFee,
    totalDividends,
    bmriLots,
    icbpLots,
    bmriValue,
    icbpValue,
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

function updateInvestmentSimulator() {
  const inputs = readSimulationInputs();
  const isCustomPurchase = inputs.purchaseMode === "custom";
  el.simStockAllocation.value = String(inputs.stockAllocation);
  el.simStockAllocationNumber.value = String(inputs.stockAllocation);
  el.simStockAllocation.disabled = isCustomPurchase;
  el.simStockAllocationNumber.disabled = isCustomPurchase;
  el.simCustomLotPanel.classList.toggle("hidden", !isCustomPurchase);
  el.simBmriMonthlyLots.disabled = !isCustomPurchase;
  el.simIcbpMonthlyLots.disabled = !isCustomPurchase;
  el.simRdpuAllocationLabel.textContent = isCustomPurchase ? "Sisa kas" : `${inputs.rdpuAllocation}%`;
  el.simStockAllocationAmount.textContent = isCustomPurchase
    ? `${inputs.bmriMonthlyLots.toLocaleString("id-ID")} lot BMRI + ${inputs.icbpMonthlyLots.toLocaleString("id-ID")} lot ICBP`
    : formatMoney((inputs.monthlyDeposit * inputs.stockAllocation) / 100);
  el.simRdpuAllocationAmount.textContent = isCustomPurchase
    ? "Sisa setelah beli saham"
    : formatMoney((inputs.monthlyDeposit * inputs.rdpuAllocation) / 100);
  if (isCustomPurchase) {
    updateCustomLotSummary(inputs);
  }
  el.simBmriPriceChange.disabled = !inputs.priceChangeEnabled;
  el.simIcbpPriceChange.disabled = !inputs.priceChangeEnabled;
  el.simPriceChangePanel.classList.toggle("active", inputs.priceChangeEnabled);
  el.simPriceChangeToggle.classList.toggle("active", inputs.priceChangeEnabled);
  el.simPriceChangeFields.classList.toggle("disabled", !inputs.priceChangeEnabled);
  el.simPriceChangeStatus.textContent = inputs.priceChangeEnabled
    ? "Aktif - persentase perubahan harga per tahun dipakai dalam simulasi."
    : "Mati - harga saham tetap memakai harga awal.";

  const result = simulateInvestment(inputs);
  el.simTotalContribution.textContent = formatMoney(result.totalContribution);
  el.simFinalAsset.textContent = formatMoney(result.finalAsset);
  el.simNetProfit.textContent = formatMoney(result.netProfit);
  el.simNetProfit.classList.toggle("negative", result.netProfit < 0);
  el.simNetProfit.classList.toggle("positive", result.netProfit >= 0);
  el.simPassiveIncome.textContent = formatMoney(result.passiveIncomeYear10);
  el.simSellingFee.textContent = formatMoney(result.sellingFee);
  el.simTotalDividends.textContent = formatMoney(result.totalDividends);
  el.simAssetMultiple.textContent = `${decimal.format(result.finalAsset / Math.max(result.totalContribution, 1))}x modal`;

  const total = Math.max(result.finalAsset, 1);
  const bmriPct = (result.bmriValue / total) * 100;
  const icbpPct = (result.icbpValue / total) * 100;
  const rdpuPct = (result.rdpuBalance / total) * 100;

  el.simBmriLots.textContent = `${result.bmriLots.toLocaleString("id-ID")} lot`;
  el.simIcbpLots.textContent = `${result.icbpLots.toLocaleString("id-ID")} lot`;
  el.simBmriValue.textContent = formatMoney(result.bmriValue);
  el.simIcbpValue.textContent = formatMoney(result.icbpValue);
  el.simRdpuValue.textContent = formatMoney(result.rdpuBalance);
  el.simRdpuShare.textContent = `${decimal.format(rdpuPct)}%`;
  el.simBmriBar.style.width = `${Math.min(bmriPct, 100)}%`;
  el.simIcbpBar.style.width = `${Math.min(icbpPct, 100)}%`;
  el.simRdpuBar.style.width = `${Math.min(rdpuPct, 100)}%`;

  el.simHistoryTable.innerHTML = result.yearlyRows
    .map(
      (row) => `
        <tr>
          <td><strong>${row.year}</strong></td>
          <td>${formatMoney(row.totalContribution)}</td>
          <td>${formatMoney(row.bmriPrice)}</td>
          <td>${row.bmriLots.toLocaleString("id-ID")} lot</td>
          <td>${formatMoney(row.icbpPrice)}</td>
          <td>${row.icbpLots.toLocaleString("id-ID")} lot</td>
          <td>${formatMoney(row.annualDividends)}</td>
          <td>${formatMoney(row.rdpuBalance)}</td>
          <td><strong>${formatMoney(row.portfolioValue)}</strong></td>
        </tr>
      `,
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
      const locked = ticker === "BMRI" || ticker === "ICBP";
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
    icbpPrice: parseNumberInput(el.monthlyStrategyIcbpPrice.value),
    bmriBaseLots: readWholeLots(el.monthlyStrategyBmriBaseLots, 2),
    icbpBaseLots: readWholeLots(el.monthlyStrategyIcbpBaseLots, 1),
    bmriExtraAmount: parseNumberInput(el.monthlyStrategyBmriExtraAmount.value),
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

function updateSimulatorSyncUi(active, message = "Strategi bulanan sedang mengendalikan input simulator.") {
  el.investmentSimulatorForm.classList.toggle("simulator-linked", active);
  el.simulatorSyncBanner.classList.toggle("hidden", !active);
  el.monthlyStrategySyncStatus.classList.toggle("active", active);
  if (active) {
    el.simulatorSyncBannerText.textContent = message;
  }
}

function applyMonthlyStrategyToSimulator(inputs, extraBmriLots = 0) {
  const bmriSimulatorLots = inputs.bmriBaseLots + extraBmriLots;
  const icbpSimulatorLots = inputs.icbpBaseLots;
  const syncMessage =
    `Setoran ${formatMoney(inputs.deposit)}, BMRI ${bmriSimulatorLots.toLocaleString("id-ID")} lot/bulan, ` +
    `ICBP ${icbpSimulatorLots.toLocaleString("id-ID")} lot/bulan.`;

  el.simMonthlyDeposit.value = String(inputs.deposit);
  el.simBmriPrice.value = String(inputs.bmriPrice);
  el.simIcbpPrice.value = String(inputs.icbpPrice);
  el.simPurchaseMode.value = "custom";
  el.simBmriMonthlyLots.value = String(bmriSimulatorLots);
  el.simIcbpMonthlyLots.value = String(icbpSimulatorLots);
  updateInvestmentSimulator();
  updateSimulatorSyncUi(true, syncMessage);

  el.monthlyStrategySyncStatus.textContent =
    `Aktif: simulator memakai BMRI ${bmriSimulatorLots.toLocaleString("id-ID")} lot/bulan dan ICBP ${icbpSimulatorLots.toLocaleString("id-ID")} lot/bulan. ` +
    `Dividen cair tidak dikirim ke simulator karena hanya terjadi pada bulan tertentu dan nominalnya berubah.`;
}

function updateMonthlyStrategyCalculator() {
  const inputs = readMonthlyStrategyInputs();
  el.monthlyStrategyIndicatorPanel.classList.toggle("hidden", !inputs.useIndicator);
  el.monthlyStrategyExtraPanel.classList.toggle("hidden", !inputs.useExtra);
  el.monthlyStrategyIndicatorResults.forEach((item) => item.classList.toggle("hidden", !inputs.useIndicator));
  el.monthlyStrategyExtraResults.forEach((item) => item.classList.toggle("hidden", !inputs.useExtra));

  const bmriLotPrice = inputs.bmriPrice * LOT_SIZE;
  const icbpLotPrice = inputs.icbpPrice * LOT_SIZE;
  const bmriBaseAmount = inputs.bmriBaseLots * bmriLotPrice;
  const icbpBaseAmount = inputs.icbpBaseLots * icbpLotPrice;
  const baseStockAmount = bmriBaseAmount + icbpBaseAmount;
  const grossRdpu = Math.max(0, inputs.deposit - baseStockAmount);
  const baseShortfall = Math.max(0, baseStockAmount - inputs.deposit);
  const extraAmount = inputs.useExtra ? inputs.bmriExtraAmount : 0;
  const bridgeAmount = baseShortfall;
  let totalStockAmount = baseStockAmount + extraAmount;
  const bmriChangePercent =
    inputs.bmriAveragePrice > 0 ? ((inputs.bmriCurrentPrice - inputs.bmriAveragePrice) / inputs.bmriAveragePrice) * 100 : 0;
  const bmriFormula =
    inputs.bmriAveragePrice > 0
      ? `(${inputs.bmriCurrentPrice.toLocaleString("id-ID")} - ${inputs.bmriAveragePrice.toLocaleString("id-ID")}) / ${inputs.bmriAveragePrice.toLocaleString("id-ID")} x 100%`
      : "Isi avg price BMRI";
  const dividendAmount = inputs.useDividend ? inputs.dividendAmount : 0;
  const bmriExtraLotPrice = inputs.useIndicator && inputs.bmriCurrentPrice > 0 ? inputs.bmriCurrentPrice * LOT_SIZE : bmriLotPrice;
  const extraBmriLots = inputs.useExtra && bmriExtraLotPrice > 0 ? Math.floor(extraAmount / bmriExtraLotPrice) : 0;
  const extraBmriCost = extraBmriLots * bmriExtraLotPrice;
  const extraUnusedCash = Math.max(0, extraAmount - extraBmriCost);
  const rdpuRedeemAmount = Math.min(grossRdpu, extraBmriCost);
  const netRdpu = grossRdpu - rdpuRedeemAmount;
  const unreimbursedBridge = Math.max(0, extraBmriCost - grossRdpu);
  let dividendCash = dividendAmount;
  let dividendIcbpLots = 0;
  let dividendBmriLots = 0;

  if (dividendCash >= icbpLotPrice) {
    dividendIcbpLots = 1;
    dividendCash -= icbpLotPrice;
    if (dividendCash >= bmriExtraLotPrice) {
      dividendBmriLots = 1;
      dividendCash -= bmriExtraLotPrice;
    }
  } else if (dividendCash >= bmriExtraLotPrice) {
    dividendBmriLots = 1;
    dividendCash -= bmriExtraLotPrice;
  }

  const dividendStockCost = dividendIcbpLots * icbpLotPrice + dividendBmriLots * bmriExtraLotPrice;
  const extraLeftoverToRdpu = Math.max(0, dividendCash + extraUnusedCash);
  const totalRdpuThisMonth = netRdpu + extraLeftoverToRdpu;
  totalStockAmount = baseStockAmount + extraBmriCost + dividendStockCost;

  el.monthlyStrategyDividendPanel.classList.toggle("hidden", !inputs.useDividend);

  el.monthlyStrategyBmriBaseResult.textContent = formatLotPurchase(inputs.bmriBaseLots, bmriBaseAmount);
  el.monthlyStrategyIcbpBaseResult.textContent = formatLotPurchase(inputs.icbpBaseLots, icbpBaseAmount);
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
    `ICBP ${dividendIcbpLots.toLocaleString("id-ID")} lot + BMRI ${dividendBmriLots.toLocaleString("id-ID")} lot`;
  el.monthlyStrategyExtraLeftoverResult.textContent = formatMoney(extraLeftoverToRdpu);
  el.monthlyStrategyTotalRdpuResult.textContent = formatMoney(totalRdpuThisMonth);
  el.monthlyStrategyBmriDiscountResult.textContent = `${decimal.format(bmriChangePercent)}%`;
  el.monthlyStrategyBmriFormulaResult.textContent = bmriFormula;
  el.monthlyStrategyBmriDecisionResult.textContent = bmriExtraLotDecision(bmriChangePercent);

  if (inputs.syncSimulator) {
    applyMonthlyStrategyToSimulator(inputs, extraBmriLots);
  } else {
    updateSimulatorSyncUi(false);
    el.monthlyStrategySyncStatus.textContent = "Strategi belum dikirim ke simulator.";
  }

  if (baseShortfall > 0) {
    el.monthlyStrategyNote.textContent = `Setoran kurang ${formatMoney(baseShortfall)} untuk beli base. Kurangi lot atau pakai cash/RDPU lama.`;
  } else if (extraBmriLots + dividendBmriLots + dividendIcbpLots > 0) {
    el.monthlyStrategyNote.textContent =
      `Silakan tambah BMRI ${(extraBmriLots + dividendBmriLots).toLocaleString("id-ID")} lot dan ICBP ${dividendIcbpLots.toLocaleString("id-ID")} lot. ` +
      `Total RDPU bulan ini ${formatMoney(totalRdpuThisMonth)} dari sisa setoran dan sisa dividen/ekstra.`;
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
  updateInvestmentSimulator();
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
    el.simStockAllocationNumber.value = el.simStockAllocation.value;
    updateInvestmentSimulator();
  });
  el.simStockAllocationNumber.addEventListener("input", updateInvestmentSimulator);
  el.simPurchaseMode.addEventListener("change", updateInvestmentSimulator);
  el.investmentSimulatorForm.addEventListener("input", (event) => {
    if (event.target !== el.simStockAllocation && event.target !== el.simStockAllocationNumber) {
      updateInvestmentSimulator();
    }
  });
  el.simEnablePriceChange.addEventListener("change", updateInvestmentSimulator);
  [el.simBmriPriceChange, el.simIcbpPriceChange].forEach((input) => {
    input.addEventListener("blur", () => {
      input.value = String(clampNumber(readNumber(input, 5), -99, 1000));
      updateInvestmentSimulator();
    });
  });
  [el.simBmriMonthlyLots, el.simIcbpMonthlyLots].forEach((input) => {
    input.addEventListener("blur", () => {
      input.value = String(readWholeLots(input, 0));
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
    el.monthlyStrategyIcbpPrice,
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
  [el.monthlyStrategyBmriBaseLots, el.monthlyStrategyIcbpBaseLots].forEach((input) => {
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
initEvents();
initInvestmentCharts();
renderAll();
initRemoteStore().then(renderAll);
