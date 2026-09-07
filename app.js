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
    tickers: ["BMRI", "ICBP", "BBRI"],
    activeStocks: ["BMRI", "ICBP", "BBRI"],
    stockPurchases: [],
    rdpuPurchases: [],
    dividendReceipts: [],
    marketPrices: {},
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
  icbpMonthlyLots: 1,
  bbriMonthlyLots: 1,
  bmriPrice: 4130,
  icbpPrice: 6700,
  bbriPrice: 4000,
  rdpuReturnAnnual: 4.14,
  dividendGrowthAnnual: 5,
  bmriDividendInitial: 206.5,
  icbpDividendInitial: 265,
  bbriDividendInitial: 235,
  priceChangeEnabled: false,
  bmriPriceChangeAnnual: 5,
  icbpPriceChangeAnnual: 5,
  bbriPriceChangeAnnual: 5,
  passiveIncomeTarget: 0,
  savedScenario: null,
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
let editingStockPurchaseId = null;
let editingRdpuPurchaseId = null;
let editingDividendReceiptId = null;
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
  simIcbpMonthlyLots: document.querySelector("#simIcbpMonthlyLots"),
  simBbriMonthlyLots: document.querySelector("#simBbriMonthlyLots"),
  simCustomBmriPurchase: document.querySelector("#simCustomBmriPurchase"),
  simCustomIcbpPurchase: document.querySelector("#simCustomIcbpPurchase"),
  simCustomBbriPurchase: document.querySelector("#simCustomBbriPurchase"),
  simCustomStockPurchase: document.querySelector("#simCustomStockPurchase"),
  simCustomRdpuPurchase: document.querySelector("#simCustomRdpuPurchase"),
  simCustomLotStatus: document.querySelector("#simCustomLotStatus"),
  simBmriPrice: document.querySelector("#simBmriPrice"),
  simIcbpPrice: document.querySelector("#simIcbpPrice"),
  simBbriPrice: document.querySelector("#simBbriPrice"),
  simEnablePriceChange: document.querySelector("#simEnablePriceChange"),
  simPriceChangePanel: document.querySelector("#simPriceChangePanel"),
  simPriceChangeToggle: document.querySelector("#simPriceChangeToggle"),
  simPriceChangeFields: document.querySelector("#simPriceChangeFields"),
  simPriceChangeStatus: document.querySelector("#simPriceChangeStatus"),
  simBmriPriceChange: document.querySelector("#simBmriPriceChange"),
  simIcbpPriceChange: document.querySelector("#simIcbpPriceChange"),
  simBbriPriceChange: document.querySelector("#simBbriPriceChange"),
  simRdpuReturn: document.querySelector("#simRdpuReturn"),
  simDividendGrowth: document.querySelector("#simDividendGrowth"),
  simBmriYield: document.querySelector("#simBmriYield"),
  simIcbpYield: document.querySelector("#simIcbpYield"),
  simBbriYield: document.querySelector("#simBbriYield"),
  simTotalContribution: document.querySelector("#simTotalContribution"),
  simFinalAsset: document.querySelector("#simFinalAsset"),
  simNetProfit: document.querySelector("#simNetProfit"),
  simPassiveIncome: document.querySelector("#simPassiveIncome"),
  simPassiveTarget: document.querySelector("#simPassiveTarget"),
  simPassiveTargetMeta: document.querySelector("#simPassiveTargetMeta"),
  simSaveScenarioA: document.querySelector("#simSaveScenarioA"),
  simClearScenarioA: document.querySelector("#simClearScenarioA"),
  simScenarioCompare: document.querySelector("#simScenarioCompare"),
  simAssetMultiple: document.querySelector("#simAssetMultiple"),
  simBmriLots: document.querySelector("#simBmriLots"),
  simIcbpLots: document.querySelector("#simIcbpLots"),
  simBbriLots: document.querySelector("#simBbriLots"),
  simBmriValue: document.querySelector("#simBmriValue"),
  simIcbpValue: document.querySelector("#simIcbpValue"),
  simBbriValue: document.querySelector("#simBbriValue"),
  simRdpuValue: document.querySelector("#simRdpuValue"),
  simRdpuShare: document.querySelector("#simRdpuShare"),
  simBmriBar: document.querySelector("#simBmriBar"),
  simIcbpBar: document.querySelector("#simIcbpBar"),
  simBbriBar: document.querySelector("#simBbriBar"),
  simRdpuBar: document.querySelector("#simRdpuBar"),
  simSellingFee: document.querySelector("#simSellingFee"),
  simTotalDividends: document.querySelector("#simTotalDividends"),
  simTotalRdpuContributions: document.querySelector("#simTotalRdpuContributions"),
  simRdpuReturnGain: document.querySelector("#simRdpuReturnGain"),
  simHistoryTable: document.querySelector("#simHistoryTable"),

  investmentGrowthChart: document.querySelector("#investmentGrowthChart"),
  investmentHorizon: document.querySelector("#investmentHorizon"),
  addInvestmentYearButton: document.querySelector("#addInvestmentYearButton"),
  monthlyStrategyDeposit: document.querySelector("#monthlyStrategyDeposit"),
  monthlyStrategyBmriPrice: document.querySelector("#monthlyStrategyBmriPrice"),
  monthlyStrategyIcbpPrice: document.querySelector("#monthlyStrategyIcbpPrice"),
  monthlyStrategyBbriPrice: document.querySelector("#monthlyStrategyBbriPrice"),
  monthlyStrategyBmriBaseLots: document.querySelector("#monthlyStrategyBmriBaseLots"),
  monthlyStrategyIcbpBaseLots: document.querySelector("#monthlyStrategyIcbpBaseLots"),
  monthlyStrategyBbriBaseLots: document.querySelector("#monthlyStrategyBbriBaseLots"),
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
  monthlyStrategyIcbpBaseResult: document.querySelector("#monthlyStrategyIcbpBaseResult"),
  monthlyStrategyBbriBaseResult: document.querySelector("#monthlyStrategyBbriBaseResult"),
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
  monthlyStrategyTotalIcbpLotsResult: document.querySelector("#monthlyStrategyTotalIcbpLotsResult"),
  monthlyStrategyTotalBbriLotsResult: document.querySelector("#monthlyStrategyTotalBbriLotsResult"),
  monthlyStrategyTotalRdpuResult: document.querySelector("#monthlyStrategyTotalRdpuResult"),
  monthlyStrategyBmriDiscountResult: document.querySelector("#monthlyStrategyBmriDiscountResult"),
  monthlyStrategyBmriFormulaResult: document.querySelector("#monthlyStrategyBmriFormulaResult"),
  monthlyStrategyBmriDecisionResult: document.querySelector("#monthlyStrategyBmriDecisionResult"),
  monthlyStrategySyncStatus: document.querySelector("#monthlyStrategySyncStatus"),
  monthlyStrategyNote: document.querySelector("#monthlyStrategyNote"),
  monthlyStrategySaveLedger: document.querySelector("#monthlyStrategySaveLedger"),
  monthlyStrategyLedgerFeedback: document.querySelector("#monthlyStrategyLedgerFeedback"),
  investmentStockTotal: document.querySelector("#investmentStockTotal"),
  investmentLotTotal: document.querySelector("#investmentLotTotal"),
  investmentRdpuTotal: document.querySelector("#investmentRdpuTotal"),
  investmentPortfolioTotal: document.querySelector("#investmentPortfolioTotal"),
  investmentPortfolioMeta: document.querySelector("#investmentPortfolioMeta"),
  investmentUnrealizedPnl: document.querySelector("#investmentUnrealizedPnl"),
  investmentUnrealizedPnlMeta: document.querySelector("#investmentUnrealizedPnlMeta"),
  investmentMarketPriceGrid: document.querySelector("#investmentMarketPriceGrid"),
  investmentMarkToMarketTable: document.querySelector("#investmentMarkToMarketTable"),
  investmentTickerForm: document.querySelector("#investmentTickerForm"),
  investmentTickerInput: document.querySelector("#investmentTickerInput"),
  investmentTickerList: document.querySelector("#investmentTickerList"),
  investmentStockForm: document.querySelector("#investmentStockForm"),
  investmentStockSubmit: document.querySelector("#investmentStockSubmit"),
  investmentStockCancelEdit: document.querySelector("#investmentStockCancelEdit"),
  investmentStockTicker: document.querySelector("#investmentStockTicker"),
  investmentStockMonth: document.querySelector("#investmentStockMonth"),
  investmentStockYear: document.querySelector("#investmentStockYear"),
  investmentStockLotPrice: document.querySelector("#investmentStockLotPrice"),
  investmentStockLots: document.querySelector("#investmentStockLots"),
  investmentStockTable: document.querySelector("#investmentStockTable"),
  investmentRdpuForm: document.querySelector("#investmentRdpuForm"),
  investmentRdpuSubmit: document.querySelector("#investmentRdpuSubmit"),
  investmentRdpuCancelEdit: document.querySelector("#investmentRdpuCancelEdit"),
  investmentRdpuMonth: document.querySelector("#investmentRdpuMonth"),
  investmentRdpuYear: document.querySelector("#investmentRdpuYear"),
  investmentRdpuAmount: document.querySelector("#investmentRdpuAmount"),
  investmentRdpuTable: document.querySelector("#investmentRdpuTable"),
  investmentDividendForm: document.querySelector("#investmentDividendForm"),
  investmentDividendSubmit: document.querySelector("#investmentDividendSubmit"),
  investmentDividendCancelEdit: document.querySelector("#investmentDividendCancelEdit"),
  investmentDividendMonth: document.querySelector("#investmentDividendMonth"),
  investmentDividendYear: document.querySelector("#investmentDividendYear"),
  investmentDividendAmount: document.querySelector("#investmentDividendAmount"),
  investmentDividendTable: document.querySelector("#investmentDividendTable"),
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
  const dividendReceipts = Array.isArray(investments.dividendReceipts)
    ? investments.dividendReceipts
        .map((receipt) => ({
          id: String(receipt.id || uid("div")),
          month: clampNumber(Math.round(Number(receipt.month) || 1), 1, 12),
          year: Math.round(Number(receipt.year) || INVESTMENT_START_YEAR),
          amount: positiveNumber(receipt.amount),
          createdAt: receipt.createdAt || receipt.created_at || new Date().toISOString(),
        }))
        .filter((receipt) => receipt.amount > 0)
    : [];
  const marketPrices = {};
  const rawMarketPrices =
    investments.marketPrices && typeof investments.marketPrices === "object"
      ? investments.marketPrices
      : investments.simulatorConfig?.marketPrices && typeof investments.simulatorConfig.marketPrices === "object"
        ? investments.simulatorConfig.marketPrices
        : {};
  Object.entries(rawMarketPrices).forEach(([ticker, price]) => {
    const symbol = sanitizeTicker(ticker);
    const numeric = Number(price);
    if (symbol && Number.isFinite(numeric) && numeric > 0) marketPrices[symbol] = numeric;
  });

  const CORE_STOCKS = ["BMRI", "ICBP", "BBRI"];
  const rawActive = Array.isArray(investments.activeStocks) ? investments.activeStocks : CORE_STOCKS;
  const activeStocks = CORE_STOCKS.filter((s) => rawActive.includes(s));
  const safeActiveStocks = activeStocks.length >= 1 ? activeStocks : ["BMRI"];

  return {
    horizonYears: clampNumber(Math.round(Number(investments.horizonYears) || 11), 1, 50),
    simulatorConfig: normalizeSimulatorConfig(investments.simulatorConfig || investments.simulator_config),
    tickers: [...new Set(["BMRI", "ICBP", "BBRI", ...tickers, ...stockPurchases.map((purchase) => purchase.ticker)])],
    activeStocks: safeActiveStocks,
    stockPurchases,
    rdpuPurchases,
    dividendReceipts,
    marketPrices,
  };
}

function normalizeSimulatorConfig(config = {}) {
  const numberOrDefault = (value, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const bmriPrice = Math.max(1, numberOrDefault(config.bmriPrice, DEFAULT_SIMULATOR_CONFIG.bmriPrice));
  const icbpPrice = Math.max(1, numberOrDefault(config.icbpPrice, DEFAULT_SIMULATOR_CONFIG.icbpPrice));
  const bbriPrice = Math.max(1, numberOrDefault(config.bbriPrice, DEFAULT_SIMULATOR_CONFIG.bbriPrice));
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
    icbpMonthlyLots: Math.max(0, Math.floor(numberOrDefault(config.icbpMonthlyLots, DEFAULT_SIMULATOR_CONFIG.icbpMonthlyLots))),
    bbriMonthlyLots: Math.max(0, Math.floor(numberOrDefault(config.bbriMonthlyLots, DEFAULT_SIMULATOR_CONFIG.bbriMonthlyLots))),
    bmriPrice,
    icbpPrice,
    bbriPrice,
    rdpuReturnAnnual: Math.max(0, numberOrDefault(config.rdpuReturnAnnual, DEFAULT_SIMULATOR_CONFIG.rdpuReturnAnnual)),
    dividendGrowthAnnual: Math.max(0, numberOrDefault(config.dividendGrowthAnnual, DEFAULT_SIMULATOR_CONFIG.dividendGrowthAnnual)),
    bmriDividendInitial: legacyDividendValue(
      config.bmriDividendInitial,
      config.bmriYieldInitial,
      bmriPrice,
      DEFAULT_SIMULATOR_CONFIG.bmriDividendInitial,
    ),
    icbpDividendInitial: legacyDividendValue(
      config.icbpDividendInitial,
      config.icbpYieldInitial,
      icbpPrice,
      DEFAULT_SIMULATOR_CONFIG.icbpDividendInitial,
    ),
    bbriDividendInitial: legacyDividendValue(
      config.bbriDividendInitial,
      config.bbriYieldInitial,
      bbriPrice,
      DEFAULT_SIMULATOR_CONFIG.bbriDividendInitial,
    ),
    priceChangeEnabled: Boolean(config.priceChangeEnabled),
    bmriPriceChangeAnnual: clampNumber(
      numberOrDefault(config.bmriPriceChangeAnnual, DEFAULT_SIMULATOR_CONFIG.bmriPriceChangeAnnual),
      -99,
      1000,
    ),
    icbpPriceChangeAnnual: clampNumber(
      numberOrDefault(config.icbpPriceChangeAnnual, DEFAULT_SIMULATOR_CONFIG.icbpPriceChangeAnnual),
      -99,
      1000,
    ),
      bbriPriceChangeAnnual: clampNumber(
      numberOrDefault(config.bbriPriceChangeAnnual, DEFAULT_SIMULATOR_CONFIG.bbriPriceChangeAnnual),
      -99,
      1000,
    ),
    passiveIncomeTarget: Math.max(0, numberOrDefault(config.passiveIncomeTarget, DEFAULT_SIMULATOR_CONFIG.passiveIncomeTarget)),
    savedScenario: config.savedScenario && typeof config.savedScenario === "object" ? config.savedScenario : null,
    activeStocks: (() => {
      const CORE = ["BMRI", "ICBP", "BBRI"];
      const raw = Array.isArray(config.activeStocks) ? config.activeStocks : CORE;
      const filtered = CORE.filter((s) => raw.includes(s));
      return filtered.length >= 1 ? filtered : ["BMRI"];
    })(),
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

function toDbDividendReceipt(receipt) {
  return {
    id: receipt.id,
    month: receipt.month,
    year: receipt.year,
    amount: receipt.amount,
    created_at: receipt.createdAt || new Date().toISOString(),
  };
}

function fromDbDividendReceipt(receipt) {
  return {
    id: receipt.id,
    month: Number(receipt.month),
    year: Number(receipt.year),
    amount: Number(receipt.amount),
    createdAt: receipt.created_at,
  };
}

function toDbInvestmentSettings(investments) {
  return {
    id: "default",
    horizon_years: clampNumber(Math.round(Number(investments.horizonYears) || 11), 1, 50),
    simulator_config: {
      ...normalizeSimulatorConfig(investments.simulatorConfig),
      marketPrices: investments.marketPrices || {},
    },
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
      .on("postgres_changes", { event: "*", schema: "public", table: "dividend_receipts" }, refreshFromRemote)
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
    const [settingsResult, tickersResult, stockResult, rdpuResult, dividendResult] = await Promise.all([
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
      remoteStore.client
        .from("dividend_receipts")
        .select("*")
        .order("year", { ascending: true })
        .order("month", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

    const dividendMissing = isMissingInvestmentTableError(dividendResult.error);
    const errors = [settingsResult.error, tickersResult.error, stockResult.error, rdpuResult.error].filter(Boolean);
    if (errors.length) throw errors[0];
    if (dividendResult.error && !dividendMissing) throw dividendResult.error;

    const remoteHasInvestmentData =
      Boolean(settingsResult.data) ||
      tickersResult.data.length > 0 ||
      stockResult.data.length > 0 ||
      rdpuResult.data.length > 0 ||
      (!dividendMissing && dividendResult.data?.length > 0);

    state.investments = remoteHasInvestmentData
      ? normalizeInvestments({
          horizonYears: Number(settingsResult.data?.horizon_years) || state.investments.horizonYears,
          simulatorConfig: settingsResult.data?.simulator_config || state.investments.simulatorConfig,
          activeStocks: (settingsResult.data?.simulator_config || state.investments.simulatorConfig)?.activeStocks
            || state.investments.activeStocks,
          tickers: tickersResult.data.map(fromDbInvestmentTicker),
          stockPurchases: stockResult.data.map(fromDbStockPurchase),
          rdpuPurchases: rdpuResult.data.map(fromDbRdpuPurchase),
          dividendReceipts: dividendMissing ? localInvestments.dividendReceipts : (dividendResult.data || []).map(fromDbDividendReceipt),
          marketPrices: settingsResult.data?.simulator_config?.marketPrices || localInvestments.marketPrices,
        })
      : normalizeInvestments(localInvestments);

    remoteStore.investmentsEnabled = true;

    const remoteTickers = new Set(tickersResult.data.map(fromDbInvestmentTicker));
    const hasMissingDefaultTicker = state.investments.tickers.some((ticker) => !remoteTickers.has(ticker));
    if (remoteHasInvestmentData && hasMissingDefaultTicker) {
      const tickerUpsert = await remoteStore.client
        .from("investment_tickers")
        .upsert(state.investments.tickers.map(toDbInvestmentTicker));
      if (tickerUpsert.error) throw tickerUpsert.error;
    }

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

  if (state.investments.dividendReceipts.length) {
    const dividendResult = await remoteStore.client
      .from("dividend_receipts")
      .upsert(state.investments.dividendReceipts.map(toDbDividendReceipt));
    if (dividendResult.error && !isMissingInvestmentTableError(dividendResult.error)) throw dividendResult.error;
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

async function persistDividendReceipt(receipt) {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("dividend_receipts").upsert(toDbDividendReceipt(receipt));
  if (error && !isMissingInvestmentTableError(error)) throw error;
}

async function deleteDividendReceiptRemote(id) {
  saveState();
  if (!remoteStore.enabled || !remoteStore.investmentsEnabled) return;
  const { error } = await remoteStore.client.from("dividend_receipts").delete().eq("id", id);
  if (error && !isMissingInvestmentTableError(error)) throw error;
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

    const dividendResult = await remoteStore.client.from("dividend_receipts").delete().neq("id", "__never__");
    if (dividendResult.error && !isMissingInvestmentTableError(dividendResult.error)) throw dividendResult.error;

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

function buildMonthlyLotPlan(bmriTarget, icbpTarget, bbriTarget = 0) {
  const plan = [];
  const maxTarget = Math.max(bmriTarget, icbpTarget, bbriTarget);
  for (let index = 0; index < maxTarget; index += 1) {
    if (index < bmriTarget) plan.push("BMRI");
    if (index < icbpTarget) plan.push("ICBP");
    if (index < bbriTarget) plan.push("BBRI");
  }
  return plan;
}

function lotPriceForTicker(ticker, bmriLotPrice, icbpLotPrice, bbriLotPrice) {
  if (ticker === "BMRI") return bmriLotPrice;
  if (ticker === "ICBP") return icbpLotPrice;
  return bbriLotPrice;
}

function buyAffordableCustomLots(availableCash, bmriLotPrice, icbpLotPrice, bbriLotPrice, bmriTarget, icbpTarget, bbriTarget = 0) {
  let cash = availableCash;
  let bmriBought = 0;
  let icbpBought = 0;
  let bbriBought = 0;

  buildMonthlyLotPlan(bmriTarget, icbpTarget, bbriTarget).forEach((ticker) => {
    const lotPrice = lotPriceForTicker(ticker, bmriLotPrice, icbpLotPrice, bbriLotPrice);
    if (cash < lotPrice) return;

    cash -= lotPrice;
    if (ticker === "BMRI") {
      bmriBought += 1;
    } else if (ticker === "ICBP") {
      icbpBought += 1;
    } else {
      bbriBought += 1;
    }
  });

  return {
    bmriBought,
    icbpBought,
    bbriBought,
    leftoverCash: cash,
  };
}

function buyRepeatingCustomLots(availableCash, bmriLotPrice, icbpLotPrice, bbriLotPrice, bmriTarget, icbpTarget, bbriTarget = 0) {
  const plan = buildMonthlyLotPlan(bmriTarget, icbpTarget, bbriTarget);
  let cash = availableCash;
  let bmriBought = 0;
  let icbpBought = 0;
  let bbriBought = 0;

  if (!plan.length) {
    return {
      bmriBought,
      icbpBought,
      bbriBought,
      leftoverCash: cash,
    };
  }

  const cheapestPlannedLot = Math.min(...plan.map((ticker) => lotPriceForTicker(ticker, bmriLotPrice, icbpLotPrice, bbriLotPrice)));
  while (cash >= cheapestPlannedLot) {
    let boughtThisRound = false;

    plan.forEach((ticker) => {
      const lotPrice = lotPriceForTicker(ticker, bmriLotPrice, icbpLotPrice, bbriLotPrice);
      if (cash < lotPrice) return;

      cash -= lotPrice;
      boughtThisRound = true;
      if (ticker === "BMRI") {
        bmriBought += 1;
      } else if (ticker === "ICBP") {
        icbpBought += 1;
      } else {
        bbriBought += 1;
      }
    });

    if (!boughtThisRound) break;
  }

  return {
    bmriBought,
    icbpBought,
    bbriBought,
    leftoverCash: cash,
  };
}

function buyCustomLotsWithDividendPolicy(
  monthlyDeposit,
  dividendCash,
  bmriLotPrice,
  icbpLotPrice,
  bbriLotPrice,
  bmriTarget,
  icbpTarget,
  bbriTarget,
  reinvestAfterTarget,
) {
  if (!reinvestAfterTarget) {
    const basePurchase = buyAffordableCustomLots(monthlyDeposit, bmriLotPrice, icbpLotPrice, bbriLotPrice, bmriTarget, icbpTarget, bbriTarget);
    const combinedPurchase = buyAffordableCustomLots(
      monthlyDeposit + dividendCash,
      bmriLotPrice,
      icbpLotPrice,
      bbriLotPrice,
      bmriTarget,
      icbpTarget,
      bbriTarget,
    );
    const stockCost =
      combinedPurchase.bmriBought * bmriLotPrice +
      combinedPurchase.icbpBought * icbpLotPrice +
      combinedPurchase.bbriBought * bbriLotPrice;

    return {
      ...combinedPurchase,
      dividendBmriBought: Math.max(0, combinedPurchase.bmriBought - basePurchase.bmriBought),
      dividendIcbpBought: Math.max(0, combinedPurchase.icbpBought - basePurchase.icbpBought),
      dividendBbriBought: Math.max(0, combinedPurchase.bbriBought - basePurchase.bbriBought),
      dividendStockCashUsed: Math.min(dividendCash, Math.max(0, stockCost - monthlyDeposit)),
    };
  }

  const basePurchase = buyAffordableCustomLots(monthlyDeposit, bmriLotPrice, icbpLotPrice, bbriLotPrice, bmriTarget, icbpTarget, bbriTarget);
  const missingBmriLots = Math.max(0, bmriTarget - basePurchase.bmriBought);
  const missingIcbpLots = Math.max(0, icbpTarget - basePurchase.icbpBought);
  const missingBbriLots = Math.max(0, bbriTarget - basePurchase.bbriBought);
  const targetDividendPurchase = buyAffordableCustomLots(
    dividendCash,
    bmriLotPrice,
    icbpLotPrice,
    bbriLotPrice,
    missingBmriLots,
    missingIcbpLots,
    missingBbriLots,
  );
  const extraDividendPurchase = buyRepeatingCustomLots(
    targetDividendPurchase.leftoverCash,
    bmriLotPrice,
    icbpLotPrice,
    bbriLotPrice,
    bmriTarget,
    icbpTarget,
    bbriTarget,
  );

  return {
    bmriBought: basePurchase.bmriBought + targetDividendPurchase.bmriBought + extraDividendPurchase.bmriBought,
    icbpBought: basePurchase.icbpBought + targetDividendPurchase.icbpBought + extraDividendPurchase.icbpBought,
    bbriBought: basePurchase.bbriBought + targetDividendPurchase.bbriBought + extraDividendPurchase.bbriBought,
    dividendBmriBought: targetDividendPurchase.bmriBought + extraDividendPurchase.bmriBought,
    dividendIcbpBought: targetDividendPurchase.icbpBought + extraDividendPurchase.icbpBought,
    dividendBbriBought: targetDividendPurchase.bbriBought + extraDividendPurchase.bbriBought,
    dividendStockCashUsed:
      targetDividendPurchase.bmriBought * bmriLotPrice +
      targetDividendPurchase.icbpBought * icbpLotPrice +
      targetDividendPurchase.bbriBought * bbriLotPrice +
      extraDividendPurchase.bmriBought * bmriLotPrice +
      extraDividendPurchase.icbpBought * icbpLotPrice +
      extraDividendPurchase.bbriBought * bbriLotPrice,
    leftoverCash: basePurchase.leftoverCash + extraDividendPurchase.leftoverCash,
  };
}

function formatDividendStockPurchase(row) {
  const totalLots = row.dividendBmriLots + row.dividendIcbpLots + row.dividendBbriLots;
  if (totalLots <= 0) return "-";

  return (
    `BMRI ${row.dividendBmriLots.toLocaleString("id-ID")} lot + ` +
    `ICBP ${row.dividendIcbpLots.toLocaleString("id-ID")} lot + ` +
    `BBRI ${row.dividendBbriLots.toLocaleString("id-ID")} lot`
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

function actualDividendForSimulationMonth(calendarMonth, calendarYear) {
  return (state.investments.dividendReceipts || [])
    .filter((receipt) => receipt.month === calendarMonth && receipt.year === calendarYear)
    .reduce((total, receipt) => total + receipt.amount, 0);
}

function actualInvestmentForSimulationMonth(calendarMonth, calendarYear) {
  const active = state.investments.activeStocks;
  const stockPurchases = state.investments.stockPurchases.filter(
    (purchase) => purchase.month === calendarMonth && purchase.year === calendarYear,
  );
  const rdpuPurchases = state.investments.rdpuPurchases.filter(
    (purchase) => purchase.month === calendarMonth && purchase.year === calendarYear,
  );
  const dividendAmount = actualDividendForSimulationMonth(calendarMonth, calendarYear);
  const bmriPurchases = active.includes("BMRI") ? stockPurchases.filter((p) => p.ticker === "BMRI") : [];
  const icbpPurchases = active.includes("ICBP") ? stockPurchases.filter((p) => p.ticker === "ICBP") : [];
  const bbriPurchases = active.includes("BBRI") ? stockPurchases.filter((p) => p.ticker === "BBRI") : [];
  const bmriLots = bmriPurchases.reduce((total, purchase) => total + purchase.lots, 0);
  const icbpLots = icbpPurchases.reduce((total, purchase) => total + purchase.lots, 0);
  const bbriLots = bbriPurchases.reduce((total, purchase) => total + purchase.lots, 0);
  const bmriAmount = bmriPurchases.reduce((total, purchase) => total + investmentValue(purchase), 0);
  const icbpAmount = icbpPurchases.reduce((total, purchase) => total + investmentValue(purchase), 0);
  const bbriAmount = bbriPurchases.reduce((total, purchase) => total + investmentValue(purchase), 0);
  const rdpuAmount = rdpuPurchases.reduce((total, purchase) => total + purchase.amount, 0);

  return {
    hasActual: bmriLots > 0 || icbpLots > 0 || bbriLots > 0 || rdpuAmount > 0,
    bmriLots,
    icbpLots,
    bbriLots,
    bmriAmount,
    icbpAmount,
    bbriAmount,
    stockAmount: bmriAmount + icbpAmount + bbriAmount,
    rdpuAmount,
    dividendAmount,
    contribution: bmriAmount + icbpAmount + bbriAmount + rdpuAmount,
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
    `ICBP ${actualInvestment.icbpLots.toLocaleString("id-ID")} lot${stockSuffix(actualInvestment.icbpAmount)}`,
    `BBRI ${actualInvestment.bbriLots.toLocaleString("id-ID")} lot${stockSuffix(actualInvestment.bbriAmount)}`,
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
    el.programActualSyncText.textContent = `Belum ada data aktual BMRI, ICBP, BBRI, atau RDPU dalam rentang ${summary.label}.`;
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
    `ICBP ${row.actualIcbpLots.toLocaleString("id-ID")} lot`,
    `BBRI ${row.actualBbriLots.toLocaleString("id-ID")} lot`,
    `RDPU ${formatMoney(row.actualRdpuContributions)}`,
  ];
  return `
    <div class="actual-sync-cell">
      <strong>${row.actualMonths.toLocaleString("id-ID")} bulan aktual</strong>
      <span>${parts.join(" · ")}</span>
      <small>Total ${formatMoney(row.actualContribution)}</small>
    </div>
  `;
}

function updateCustomLotSummary(inputs) {
  const active = state.investments.activeStocks;
  const bmriLotPrice = inputs.bmriPrice * LOT_SIZE;
  const icbpLotPrice = inputs.icbpPrice * LOT_SIZE;
  const bbriLotPrice = inputs.bbriPrice * LOT_SIZE;
  const purchase = buyAffordableCustomLots(
    inputs.monthlyDeposit,
    bmriLotPrice,
    icbpLotPrice,
    bbriLotPrice,
    active.includes("BMRI") ? inputs.bmriMonthlyLots : 0,
    active.includes("ICBP") ? inputs.icbpMonthlyLots : 0,
    active.includes("BBRI") ? inputs.bbriMonthlyLots : 0,
  );
  const bmriAmount = purchase.bmriBought * bmriLotPrice;
  const icbpAmount = purchase.icbpBought * icbpLotPrice;
  const bbriAmount = purchase.bbriBought * bbriLotPrice;
  const stockAmount = bmriAmount + icbpAmount + bbriAmount;
  const targetAmount =
    (active.includes("BMRI") ? inputs.bmriMonthlyLots : 0) * bmriLotPrice +
    (active.includes("ICBP") ? inputs.icbpMonthlyLots : 0) * icbpLotPrice +
    (active.includes("BBRI") ? inputs.bbriMonthlyLots : 0) * bbriLotPrice;
  const targetReached =
    purchase.bmriBought === (active.includes("BMRI") ? inputs.bmriMonthlyLots : 0) &&
    purchase.icbpBought === (active.includes("ICBP") ? inputs.icbpMonthlyLots : 0) &&
    purchase.bbriBought === (active.includes("BBRI") ? inputs.bbriMonthlyLots : 0);

  const nonaktifLabel = `<span class="badge-inactive" style="font-size:0.68rem">Nonaktif</span>`;
  el.simCustomBmriPurchase.innerHTML = active.includes("BMRI")
    ? formatLotPurchase(purchase.bmriBought, bmriAmount)
    : nonaktifLabel;
  el.simCustomIcbpPurchase.innerHTML = active.includes("ICBP")
    ? formatLotPurchase(purchase.icbpBought, icbpAmount)
    : nonaktifLabel;
  el.simCustomBbriPurchase.innerHTML = active.includes("BBRI")
    ? formatLotPurchase(purchase.bbriBought, bbriAmount)
    : nonaktifLabel;
  const monthlyDepositForPct = inputs.monthlyDeposit > 0 ? inputs.monthlyDeposit : 0;
  const stockPct = monthlyDepositForPct > 0 ? (stockAmount / monthlyDepositForPct) * 100 : 0;
  const rdpuPct = monthlyDepositForPct > 0 ? (purchase.leftoverCash / monthlyDepositForPct) * 100 : 0;
  el.simCustomStockPurchase.textContent = `${formatMoney(stockAmount)} (${stockPct.toFixed(2).replace(".", ",")}%)`;
  el.simCustomRdpuPurchase.textContent = `${formatMoney(purchase.leftoverCash)} (${rdpuPct.toFixed(2).replace(".", ",")}%)`;

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
    icbpMonthlyLots: readWholeLots(el.simIcbpMonthlyLots, 1),
    bbriMonthlyLots: readWholeLots(el.simBbriMonthlyLots, 1),
    bmriPrice: Math.max(1, readNumber(el.simBmriPrice, 4130)),
    icbpPrice: Math.max(1, readNumber(el.simIcbpPrice, 6700)),
    bbriPrice: Math.max(1, readNumber(el.simBbriPrice, 4000)),
    rdpuReturnAnnual: Math.max(0, readNumber(el.simRdpuReturn, 4.14)),
    dividendGrowthAnnual: Math.max(0, readNumber(el.simDividendGrowth, 5)),
    bmriDividendInitial: Math.max(0, parseDecimalInput(el.simBmriYield.value)),
    icbpDividendInitial: Math.max(0, parseDecimalInput(el.simIcbpYield.value)),
    bbriDividendInitial: Math.max(0, parseDecimalInput(el.simBbriYield.value)),
    passiveIncomeTarget: Math.max(0, parseNumberInput(el.simPassiveTarget?.value || "0")),
    priceChangeEnabled: el.simEnablePriceChange.checked,
    bmriPriceChangeAnnual: clampNumber(readNumber(el.simBmriPriceChange, 5), -99, 1000),
    icbpPriceChangeAnnual: clampNumber(readNumber(el.simIcbpPriceChange, 5), -99, 1000),
    bbriPriceChangeAnnual: clampNumber(readNumber(el.simBbriPriceChange, 5), -99, 1000),
    activeStocks: state.investments.activeStocks,
  };
}

function applyActiveStocksToForm() {
  const active = state.investments.activeStocks;
  const isCustom = el.simPurchaseMode ? el.simPurchaseMode.value === "custom" : false;
  const priceChangeOn = el.simEnablePriceChange ? el.simEnablePriceChange.checked : false;
  const stocks = { BMRI: "Bmri", ICBP: "Icbp", BBRI: "Bbri" };

  Object.entries(stocks).forEach(([ticker, t]) => {
    const isActive = active.includes(ticker);
    const fields = {
      [`sim${t}MonthlyLots`]: !isActive || !isCustom,
      [`sim${t}Price`]: !isActive,
      [`sim${t}PriceChange`]: !isActive || !priceChangeOn,
      [`sim${t}Yield`]: !isActive,
      [`simCustom${t}Purchase`]: !isActive,
    };
    Object.entries(fields).forEach(([id, shouldDisable]) => {
      const fieldEl = el[id];
      if (!fieldEl) return;
      fieldEl.disabled = shouldDisable;
      const wrapper = fieldEl.closest(".sim-field, .form-row, .price-change-field, .field-group, label") || fieldEl.parentElement;
      if (wrapper) wrapper.classList.toggle("stock-field-inactive", !isActive);
    });
  });
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
  el.simIcbpMonthlyLots.value = String(normalized.icbpMonthlyLots);
  el.simBbriMonthlyLots.value = String(normalized.bbriMonthlyLots);
  el.simBmriPrice.value = formatSimulatorPriceInput(normalized.bmriPrice);
  el.simIcbpPrice.value = formatSimulatorPriceInput(normalized.icbpPrice);
  el.simBbriPrice.value = formatSimulatorPriceInput(normalized.bbriPrice);
  el.simRdpuReturn.value = String(normalized.rdpuReturnAnnual);
  el.simDividendGrowth.value = String(normalized.dividendGrowthAnnual);
  el.simBmriYield.value = formatSimulatorPriceInput(normalized.bmriDividendInitial);
  el.simIcbpYield.value = formatSimulatorPriceInput(normalized.icbpDividendInitial);
  el.simBbriYield.value = formatSimulatorPriceInput(normalized.bbriDividendInitial);
  el.simEnablePriceChange.checked = normalized.priceChangeEnabled;
  el.simBmriPriceChange.value = String(normalized.bmriPriceChangeAnnual);
  el.simIcbpPriceChange.value = String(normalized.icbpPriceChangeAnnual);
  el.simBbriPriceChange.value = String(normalized.bbriPriceChangeAnnual);
  if (el.simPassiveTarget) el.simPassiveTarget.value = formatNumberInput(normalized.passiveIncomeTarget || 0);
  applyActiveStocksToForm();
}

function saveSimulatorConfigFromInputs() {
  const inputs = readSimulationInputs();
  state.investments.simulatorConfig = normalizeSimulatorConfig({
    ...inputs,
    activeStocks: state.investments.activeStocks,
    savedScenario: state.investments.simulatorConfig?.savedScenario || null,
  });
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
  let icbpLots = 0;
  let bbriLots = 0;
  let rdpuBalance = 0;
  let totalRdpuContributions = 0;
  let totalDividends = 0;
  let totalContribution = 0;
  let annualDividends = 0;
  let annualDividendBmriLots = 0;
  let annualDividendIcbpLots = 0;
  let annualDividendBbriLots = 0;
  let annualDividendStockCashUsed = 0;
  let annualActualRdpuContributions = 0;
  let annualActualBmriLots = 0;
  let annualActualIcbpLots = 0;
  let annualActualBbriLots = 0;
  let annualActualStockAmount = 0;
  let annualActualContribution = 0;
  let annualActualMonths = 0;
  let currentBmriPrice = inputs.bmriPrice;
  let currentIcbpPrice = inputs.icbpPrice;
  let currentBbriPrice = inputs.bbriPrice;
  const yearlyRows = [];
  const chartYears = [];
  const chartContributions = [];
  const chartAssets = [];
  const monthlyRdpuRate = inputs.rdpuReturnAnnual / 12 / 100;
  const monthlyStockBudget = (inputs.monthlyDeposit * inputs.stockAllocation) / 100;
  const monthlyRdpuBudget = (inputs.monthlyDeposit * inputs.rdpuAllocation) / 100;

  for (let month = 1; month <= SIMULATION_MONTHS; month += 1) {
    const year = Math.ceil(month / 12);
    const active = inputs.activeStocks;
    const activeCycle = active.filter((s) => ["BMRI", "ICBP", "BBRI"].includes(s));
    const stockTurnTicker = activeCycle[(month - 1) % activeCycle.length];
    const calendarMonth = simulationCalendarMonth(inputs, month);
    const calendarYear = simulationCalendarYear(inputs, month);
    const actualInvestment = actualInvestmentForSimulationMonth(calendarMonth, calendarYear);
    const isBmriDividendMonth = active.includes("BMRI") && calendarMonth === 5;
    const isIcbpDividendMonth = active.includes("ICBP") && calendarMonth === 7;
    const isBbriDividendMonth = active.includes("BBRI") && calendarMonth === 5;
    let monthlyContribution = inputs.monthlyDeposit;

    if (month > 1 && (month - 1) % 12 === 0) {
      currentBmriPrice = applyAnnualPriceChange(currentBmriPrice, inputs.bmriPriceChangeAnnual, inputs.priceChangeEnabled);
      currentIcbpPrice = applyAnnualPriceChange(currentIcbpPrice, inputs.icbpPriceChangeAnnual, inputs.priceChangeEnabled);
      currentBbriPrice = applyAnnualPriceChange(currentBbriPrice, inputs.bbriPriceChangeAnnual, inputs.priceChangeEnabled);
    }

    const bmriLotPrice = currentBmriPrice * LOT_SIZE;
    const icbpLotPrice = currentIcbpPrice * LOT_SIZE;
    const bbriLotPrice = currentBbriPrice * LOT_SIZE;
    const bmriDividend = !actualInvestment.hasActual && isBmriDividendMonth
      ? bmriLots * LOT_SIZE * dividendPerShare(inputs.bmriDividendInitial, inputs.dividendGrowthAnnual, year)
      : 0;
    const icbpDividend = !actualInvestment.hasActual && isIcbpDividendMonth
      ? icbpLots * LOT_SIZE * dividendPerShare(inputs.icbpDividendInitial, inputs.dividendGrowthAnnual, year)
      : 0;
    const bbriDividend = !actualInvestment.hasActual && isBbriDividendMonth
      ? bbriLots * LOT_SIZE * dividendPerShare(inputs.bbriDividendInitial, inputs.dividendGrowthAnnual, year)
      : 0;
    const simulatedDividend = bmriDividend + icbpDividend + bbriDividend;
    const dividendThisMonth = actualInvestment.hasActual
      ? 0
      : actualInvestment.dividendAmount > 0
        ? actualInvestment.dividendAmount
        : simulatedDividend;
    const recordedDividendThisMonth = actualInvestment.hasActual
      ? actualInvestment.dividendAmount
      : dividendThisMonth;
    let rdpuContribution = monthlyRdpuBudget;
    let dividendBmriBought = 0;
    let dividendIcbpBought = 0;
    let dividendBbriBought = 0;
    let dividendStockCashUsed = 0;

    if (actualInvestment.hasActual) {
      bmriLots += actualInvestment.bmriLots;
      icbpLots += actualInvestment.icbpLots;
      bbriLots += actualInvestment.bbriLots;
      rdpuContribution = actualInvestment.rdpuAmount;
      monthlyContribution = actualInvestment.contribution;
      annualActualBmriLots += actualInvestment.bmriLots;
      annualActualIcbpLots += actualInvestment.icbpLots;
      annualActualBbriLots += actualInvestment.bbriLots;
      annualActualStockAmount += actualInvestment.stockAmount;
      annualActualRdpuContributions += actualInvestment.rdpuAmount;
      annualActualContribution += actualInvestment.contribution;
      annualActualMonths += 1;
    } else if (inputs.purchaseMode === "custom") {
      const purchase = buyCustomLotsWithDividendPolicy(
        inputs.monthlyDeposit,
        dividendThisMonth,
        bmriLotPrice,
        icbpLotPrice,
        bbriLotPrice,
        active.includes("BMRI") ? inputs.bmriMonthlyLots : 0,
        active.includes("ICBP") ? inputs.icbpMonthlyLots : 0,
        active.includes("BBRI") ? inputs.bbriMonthlyLots : 0,
        inputs.reinvestCustomDividends,
      );

      bmriLots += purchase.bmriBought;
      icbpLots += purchase.icbpBought;
      bbriLots += purchase.bbriBought;
      dividendBmriBought = purchase.dividendBmriBought || 0;
      dividendIcbpBought = purchase.dividendIcbpBought || 0;
      dividendBbriBought = purchase.dividendBbriBought || 0;
      dividendStockCashUsed = purchase.dividendStockCashUsed || 0;
      rdpuContribution = purchase.leftoverCash;
    } else if (stockTurnTicker === "BMRI") {
      const stockCash = monthlyStockBudget + dividendThisMonth;
      const boughtLots = Math.floor(stockCash / bmriLotPrice);
      const depositOnlyLots = Math.floor(monthlyStockBudget / bmriLotPrice);
      const stockCost = boughtLots * bmriLotPrice;
      dividendBmriBought = Math.max(0, boughtLots - depositOnlyLots);
      dividendStockCashUsed = Math.min(dividendThisMonth, Math.max(0, stockCost - monthlyStockBudget));
      bmriLots += boughtLots;
      rdpuContribution += stockCash - boughtLots * bmriLotPrice;
    } else if (stockTurnTicker === "ICBP") {
      const stockCash = monthlyStockBudget + dividendThisMonth;
      const boughtLots = Math.floor(stockCash / icbpLotPrice);
      const depositOnlyLots = Math.floor(monthlyStockBudget / icbpLotPrice);
      const stockCost = boughtLots * icbpLotPrice;
      dividendIcbpBought = Math.max(0, boughtLots - depositOnlyLots);
      dividendStockCashUsed = Math.min(dividendThisMonth, Math.max(0, stockCost - monthlyStockBudget));
      icbpLots += boughtLots;
      rdpuContribution += stockCash - boughtLots * icbpLotPrice;
    } else {
      const stockCash = monthlyStockBudget + dividendThisMonth;
      const boughtLots = Math.floor(stockCash / bbriLotPrice);
      const depositOnlyLots = Math.floor(monthlyStockBudget / bbriLotPrice);
      const stockCost = boughtLots * bbriLotPrice;
      dividendBbriBought = Math.max(0, boughtLots - depositOnlyLots);
      dividendStockCashUsed = Math.min(dividendThisMonth, Math.max(0, stockCost - monthlyStockBudget));
      bbriLots += boughtLots;
      rdpuContribution += stockCash - boughtLots * bbriLotPrice;
    }

    totalDividends += recordedDividendThisMonth;
    totalContribution += monthlyContribution;
    annualDividends += recordedDividendThisMonth;
    annualDividendBmriLots += dividendBmriBought;
    annualDividendIcbpLots += dividendIcbpBought;
    annualDividendBbriLots += dividendBbriBought;
    annualDividendStockCashUsed += dividendStockCashUsed;
    totalRdpuContributions += rdpuContribution;
    rdpuBalance = (rdpuBalance + rdpuContribution) * (1 + monthlyRdpuRate);

    if (month % 12 === 0) {
      const bmriValue = bmriLots * LOT_SIZE * currentBmriPrice;
      const icbpValue = icbpLots * LOT_SIZE * currentIcbpPrice;
      const bbriValue = bbriLots * LOT_SIZE * currentBbriPrice;
      const portfolioValue = bmriValue + icbpValue + bbriValue + rdpuBalance;

      yearlyRows.push({
        year,
        periodLabel: simulationPeriodLabel(inputs, month - 11, month),
        actualMonths: annualActualMonths,
        actualBmriLots: annualActualBmriLots,
        actualIcbpLots: annualActualIcbpLots,
        actualBbriLots: annualActualBbriLots,
        actualStockAmount: annualActualStockAmount,
        actualContribution: annualActualContribution,
        totalContribution,
        bmriPrice: currentBmriPrice,
        bmriLots,
        icbpPrice: currentIcbpPrice,
        icbpLots,
        bbriPrice: currentBbriPrice,
        bbriLots,
        annualDividends,
        dividendBmriLots: annualDividendBmriLots,
        dividendIcbpLots: annualDividendIcbpLots,
        dividendBbriLots: annualDividendBbriLots,
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
      annualDividendIcbpLots = 0;
      annualDividendBbriLots = 0;
      annualDividendStockCashUsed = 0;
      annualActualRdpuContributions = 0;
      annualActualBmriLots = 0;
      annualActualIcbpLots = 0;
      annualActualBbriLots = 0;
      annualActualStockAmount = 0;
      annualActualContribution = 0;
      annualActualMonths = 0;
    }
  }

  const bmriValue = bmriLots * LOT_SIZE * currentBmriPrice;
  const icbpValue = icbpLots * LOT_SIZE * currentIcbpPrice;
  const bbriValue = bbriLots * LOT_SIZE * currentBbriPrice;
  const stockValue = bmriValue + icbpValue + bbriValue;
  const finalAsset = stockValue + rdpuBalance;
  const rdpuReturnGain = rdpuBalance - totalRdpuContributions;
  const sellingFee = stockValue * SELLING_FEE_RATE;
  const netProfit = finalAsset - sellingFee - totalContribution;
  const finalYear = Math.ceil(SIMULATION_MONTHS / 12);
  const passiveIncomeFinalYear =
    bmriLots * LOT_SIZE * dividendPerShare(inputs.bmriDividendInitial, inputs.dividendGrowthAnnual, finalYear) +
    icbpLots * LOT_SIZE * dividendPerShare(inputs.icbpDividendInitial, inputs.dividendGrowthAnnual, finalYear) +
    bbriLots * LOT_SIZE * dividendPerShare(inputs.bbriDividendInitial, inputs.dividendGrowthAnnual, finalYear);

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
    icbpLots,
    bbriLots,
    bmriValue,
    icbpValue,
    bbriValue,
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
  el.simPriceChangePanel.classList.toggle("active", inputs.priceChangeEnabled);
  el.simPriceChangeToggle.classList.toggle("active", inputs.priceChangeEnabled);
  el.simPriceChangeFields.classList.toggle("disabled", !inputs.priceChangeEnabled);
  el.simPriceChangeStatus.textContent = inputs.priceChangeEnabled
    ? "Aktif - persentase perubahan harga per tahun dipakai dalam simulasi."
    : "Mati - harga saham tetap memakai harga awal.";
  applyActiveStocksToForm();
  renderStockToggles();
  el.simRdpuAllocationLabel.textContent = isCustomPurchase ? "Sisa kas" : `${inputs.rdpuAllocation}%`;
  el.simStockAllocationAmount.textContent = isCustomPurchase
    ? `${inputs.bmriMonthlyLots.toLocaleString("id-ID")} lot BMRI + ${inputs.icbpMonthlyLots.toLocaleString("id-ID")} lot ICBP + ${inputs.bbriMonthlyLots.toLocaleString("id-ID")} lot BBRI`
    : formatMoney((inputs.monthlyDeposit * inputs.stockAllocation) / 100);
  el.simRdpuAllocationAmount.textContent = isCustomPurchase
    ? "Sisa setelah beli saham"
    : formatMoney((inputs.monthlyDeposit * inputs.rdpuAllocation) / 100);
  if (isCustomPurchase) {
    updateCustomLotSummary(inputs);
  }
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
  const icbpPct = (result.icbpValue / total) * 100;
  const bbriPct = (result.bbriValue / total) * 100;
  const rdpuPct = (result.rdpuBalance / total) * 100;

  el.simBmriLots.textContent = `${result.bmriLots.toLocaleString("id-ID")} lot`;
  el.simIcbpLots.textContent = `${result.icbpLots.toLocaleString("id-ID")} lot`;
  el.simBbriLots.textContent = `${result.bbriLots.toLocaleString("id-ID")} lot`;
  el.simBmriValue.textContent = formatMoney(result.bmriValue);
  el.simIcbpValue.textContent = formatMoney(result.icbpValue);
  el.simBbriValue.textContent = formatMoney(result.bbriValue);
  el.simRdpuValue.textContent = formatMoney(result.rdpuBalance);
  el.simRdpuShare.textContent = `${decimal.format(rdpuPct)}%`;
  el.simBmriBar.style.width = `${Math.min(bmriPct, 100)}%`;
  el.simIcbpBar.style.width = `${Math.min(icbpPct, 100)}%`;
  el.simBbriBar.style.width = `${Math.min(bbriPct, 100)}%`;
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
            <small>${row.periodLabel}${row.actualMonths ? ` - ${row.actualMonths} bulan aktual` : ""}</small>
          </td>
          <td>${formatAnnualActualPurchase(row)}</td>
          <td>${formatMoney(row.totalContribution)}</td>
          <td>${row.bmriLots.toLocaleString("id-ID")} lot</td>
          <td>${row.icbpLots.toLocaleString("id-ID")} lot</td>
          <td>${row.bbriLots.toLocaleString("id-ID")} lot</td>
          <td>${formatMoney(row.annualDividends)}</td>
          <td>${formatDividendStockPurchase(row)}</td>
          <td>${formatMoney(row.dividendLeftoverToRdpu)}</td>
          <td>${formatMoney(row.rdpuBalance)}</td>
          <td><strong>${formatMoney(row.portfolioValue)}</strong></td>
        </tr>
      `;
      },
    )
    .join("");
  renderPassiveIncomeTarget(result, inputs);
  renderScenarioCompare(result, inputs);

  if (investmentGrowthChart) {
    investmentGrowthChart.data.labels = result.chartYears;
    investmentGrowthChart.data.datasets[0].data = result.chartContributions;
    investmentGrowthChart.data.datasets[1].data = result.chartAssets;
    investmentGrowthChart.update();
  }
}

function renderPassiveIncomeTarget(result, inputs) {
  if (!el.simPassiveTargetMeta) return;
  const target = Math.max(0, Number(inputs.passiveIncomeTarget) || 0);
  if (target <= 0) {
    el.simPassiveTargetMeta.textContent = "estimasi dividen tahunan";
    return;
  }
  const gap = result.passiveIncomeFinalYear - target;
  const pct = target > 0 ? (result.passiveIncomeFinalYear / target) * 100 : 0;
  el.simPassiveTargetMeta.textContent =
    gap >= 0
      ? `target ${formatMoney(target)} terlampaui ${decimal.format(pct)}%`
      : `kurang ${formatMoney(Math.abs(gap))} dari target ${formatMoney(target)}`;
}

function scenarioSnapshot(result, inputs) {
  return {
    savedAt: new Date().toISOString(),
    monthlyDeposit: inputs.monthlyDeposit,
    purchaseMode: inputs.purchaseMode,
    totalContribution: result.totalContribution,
    finalAsset: result.finalAsset,
    netProfit: result.netProfit,
    passiveIncomeFinalYear: result.passiveIncomeFinalYear,
    multiple: result.finalAsset / Math.max(result.totalContribution, 1),
  };
}

function renderScenarioCompare(result, inputs) {
  if (!el.simScenarioCompare) return;
  const saved = state.investments.simulatorConfig?.savedScenario;
  if (!saved) {
    el.simScenarioCompare.innerHTML =
      '<p class="scenario-compare-empty">Simpan Skenario A untuk membandingkan asumsi tanpa menimpa input saat ini.</p>';
    return;
  }
  const current = scenarioSnapshot(result, inputs);
  const delta = (now, then) => now - then;
  const row = (label, now, then, money = true) => {
    const diff = delta(now, then);
    const cls = diff > 0 ? "positive" : diff < 0 ? "negative" : "";
    const format = (value) => (money ? formatMoney(value) : `${decimal.format(value)}x`);
    return `
      <article>
        <span>${label}</span>
        <strong>${format(now)}</strong>
        <small class="${cls}">A: ${format(then)} (${diff >= 0 ? "+" : ""}${format(diff)})</small>
      </article>
    `;
  };
  el.simScenarioCompare.innerHTML = `
    ${row("Aset akhir", current.finalAsset, saved.finalAsset)}
    ${row("Keuntungan bersih", current.netProfit, saved.netProfit)}
    ${row("Gaji pasif T15", current.passiveIncomeFinalYear, saved.passiveIncomeFinalYear)}
    ${row("Kelipatan modal", current.multiple, saved.multiple, false)}
  `;
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
  if (el.investmentDividendMonth) {
    renderOptionList(el.investmentDividendMonth, monthOptions, el.investmentDividendMonth.value || "1");
  }
  renderOptionList(el.investmentStockYear, yearOptions, el.investmentStockYear.value || String(years[0]));
  renderOptionList(el.investmentRdpuYear, yearOptions, el.investmentRdpuYear.value || String(years[0]));
  if (el.investmentDividendYear) {
    renderOptionList(el.investmentDividendYear, yearOptions, el.investmentDividendYear.value || String(years[0]));
  }
  renderOptionList(
    el.investmentStockTicker,
    state.investments.tickers.map((ticker) => ({ value: ticker, label: ticker })),
    el.investmentStockTicker.value || state.investments.tickers[0],
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
      const locked = ["BMRI", "ICBP", "BBRI"].includes(ticker);
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
    bbriPrice: parseNumberInput(el.monthlyStrategyBbriPrice.value),
    bmriBaseLots: readWholeLots(el.monthlyStrategyBmriBaseLots, 2),
    icbpBaseLots: readWholeLots(el.monthlyStrategyIcbpBaseLots, 1),
    bbriBaseLots: readWholeLots(el.monthlyStrategyBbriBaseLots, 1),
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
const DIVIDEND_TARGET_ICBP_RATIO = 1;
const DIVIDEND_TARGET_BBRI_RATIO = 1;
const MAX_DIVIDEND_BMRI_LOTS_AFTER_BALANCE = 3;

function recommendDividendLots(
  dividendAmount,
  bmriLotsBeforeDividend,
  icbpLotsBeforeDividend,
  bbriLotsBeforeDividend,
  bmriLotPrice,
  icbpLotPrice,
  bbriLotPrice,
  activeStocks = ["BMRI", "ICBP", "BBRI"],
) {
  const bmriActive = activeStocks.includes("BMRI");
  const icbpActive = activeStocks.includes("ICBP");
  const bbriActive = activeStocks.includes("BBRI");
  const minActive = [
    bmriActive ? bmriLotPrice : Infinity,
    icbpActive ? icbpLotPrice : Infinity,
    bbriActive ? bbriLotPrice : Infinity,
  ].filter((p) => p < Infinity);
  if (minActive.length === 0) return { bmriLots: 0, icbpLots: 0, bbriLots: 0, leftover: dividendAmount, stockCost: 0 };

  let cash = dividendAmount;
  let bmriLots = 0;
  let icbpLots = 0;
  let bbriLots = 0;

  while (cash >= Math.min(...minActive)) {
    const projectedBmri = bmriLotsBeforeDividend + bmriLots;
    const projectedIcbp = icbpLotsBeforeDividend + icbpLots;
    const projectedBbri = bbriLotsBeforeDividend + bbriLots;
    const needsIcbp = icbpActive && projectedBmri > projectedIcbp * DIVIDEND_TARGET_BMRI_RATIO;
    const needsBbri = bbriActive && !needsIcbp && projectedBmri > projectedBbri * DIVIDEND_TARGET_BMRI_RATIO;

    if (needsIcbp && cash >= icbpLotPrice) { icbpLots += 1; cash -= icbpLotPrice; continue; }
    if (needsIcbp && cash < icbpLotPrice) break;
    if (needsBbri && cash >= bbriLotPrice) { bbriLots += 1; cash -= bbriLotPrice; continue; }
    if (needsBbri && cash < bbriLotPrice) break;
    if (!bmriActive || bmriLots >= MAX_DIVIDEND_BMRI_LOTS_AFTER_BALANCE || cash < bmriLotPrice) break;
    bmriLots += 1;
    cash -= bmriLotPrice;
  }

  return {
    bmriLots,
    icbpLots,
    bbriLots,
    leftover: cash,
    stockCost: bmriLots * bmriLotPrice + icbpLots * icbpLotPrice + bbriLots * bbriLotPrice,
  };
}

function dividendRecommendationBasis(
  dividendAmount,
  icbpLotPrice,
  bmriLotPrice,
  bbriLotPrice,
  icbpLots,
  bmriLots,
  bbriLots,
  leftover,
  bmriLotsBeforeDividend,
  icbpLotsBeforeDividend,
  bbriLotsBeforeDividend,
) {
  if (dividendAmount <= 0) {
    return "Isi dividen. Dasar: rasio bulan ini BMRI:ICBP:BBRI = 2:1:1.";
  }

  const beforeRatio =
    `Sebelum: BMRI ${bmriLotsBeforeDividend.toLocaleString("id-ID")} lot, ICBP ${icbpLotsBeforeDividend.toLocaleString("id-ID")} lot, BBRI ${bbriLotsBeforeDividend.toLocaleString("id-ID")} lot.`;
  const purchaseSummary = `Beli: ICBP ${icbpLots.toLocaleString("id-ID")} lot + BBRI ${bbriLots.toLocaleString("id-ID")} lot + BMRI ${bmriLots.toLocaleString("id-ID")} lot.`;

  if (icbpLots + bmriLots + bbriLots > 0) {
    return `${beforeRatio} Target 2:1:1. ${purchaseSummary} Sisa ${formatMoney(leftover)} ke RDPU.`;
  }

  return `${beforeRatio} Belum cukup beli lot sesuai target 2:1:1. Semua dividen ke RDPU.`;
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
    el.simIcbpMonthlyLots,
    el.simBbriMonthlyLots,
    el.simBmriPrice,
    el.simIcbpPrice,
    el.simBbriPrice,
  ].includes(target);
}

function maybeDisconnectMonthlyStrategySync(target) {
  if (isSimulatorStrategyInput(target)) {
    disconnectMonthlyStrategySync();
  }
}

function applyMonthlyStrategyToSimulator(inputs, extraBmriLots = 0, bmriSimulatorPrice = inputs.bmriPrice, priceMode = "harga base") {
  const bmriSimulatorLots = inputs.bmriBaseLots + extraBmriLots;
  const icbpSimulatorLots = inputs.icbpBaseLots;
  const bbriSimulatorLots = inputs.bbriBaseLots;
  const syncMessage =
    `Setoran ${formatMoney(inputs.deposit)}, BMRI ${bmriSimulatorLots.toLocaleString("id-ID")} lot/bulan, ` +
    `ICBP ${icbpSimulatorLots.toLocaleString("id-ID")} lot/bulan, ` +
    `BBRI ${bbriSimulatorLots.toLocaleString("id-ID")} lot/bulan. ` +
    `Harga BMRI simulator ${formatMoney(bmriSimulatorPrice)} (${priceMode}).`;

  el.simMonthlyDeposit.value = String(inputs.deposit);
  el.simBmriPrice.value = formatSimulatorPriceInput(bmriSimulatorPrice);
  el.simIcbpPrice.value = String(inputs.icbpPrice);
  el.simBbriPrice.value = String(inputs.bbriPrice);
  el.simPurchaseMode.value = "custom";
  el.simBmriMonthlyLots.value = String(bmriSimulatorLots);
  el.simIcbpMonthlyLots.value = String(icbpSimulatorLots);
  el.simBbriMonthlyLots.value = String(bbriSimulatorLots);
  updateInvestmentSimulator();
  updateSimulatorSyncUi(true, syncMessage);

  el.monthlyStrategySyncStatus.textContent =
    `Aktif: simulator memakai BMRI ${bmriSimulatorLots.toLocaleString("id-ID")} lot/bulan, ICBP ${icbpSimulatorLots.toLocaleString("id-ID")} lot/bulan, dan BBRI ${bbriSimulatorLots.toLocaleString("id-ID")} lot/bulan. ` +
    `Harga BMRI simulator ${formatMoney(bmriSimulatorPrice)} (${priceMode}). ` +
    `Dividen cair tidak dikirim ke simulator karena hanya terjadi pada bulan tertentu dan nominalnya berubah.`;
}

function computeMonthlyStrategyPlan(inputs = readMonthlyStrategyInputs()) {
  const bmriBaseLotPrice = inputs.bmriPrice * LOT_SIZE;
  const icbpLotPrice = inputs.icbpPrice * LOT_SIZE;
  const bbriLotPrice = inputs.bbriPrice * LOT_SIZE;
  const active = state.investments.activeStocks;
  const basePurchase = buyAffordableCustomLots(
    inputs.deposit,
    bmriBaseLotPrice,
    icbpLotPrice,
    bbriLotPrice,
    active.includes("BMRI") ? inputs.bmriBaseLots : 0,
    active.includes("ICBP") ? inputs.icbpBaseLots : 0,
    active.includes("BBRI") ? inputs.bbriBaseLots : 0,
  );
  const boughtBmriBaseLots = basePurchase.bmriBought;
  const boughtIcbpBaseLots = basePurchase.icbpBought;
  const boughtBbriBaseLots = basePurchase.bbriBought;
  const bmriBaseAmount = boughtBmriBaseLots * bmriBaseLotPrice;
  const icbpBaseAmount = boughtIcbpBaseLots * icbpLotPrice;
  const bbriBaseAmount = boughtBbriBaseLots * bbriLotPrice;
  const baseStockAmount = bmriBaseAmount + icbpBaseAmount + bbriBaseAmount;
  const targetBaseAmount =
    inputs.bmriBaseLots * bmriBaseLotPrice +
    inputs.icbpBaseLots * icbpLotPrice +
    inputs.bbriBaseLots * bbriLotPrice;
  const grossRdpu = basePurchase.leftoverCash;
  const baseTargetReached =
    boughtBmriBaseLots === inputs.bmriBaseLots &&
    boughtIcbpBaseLots === inputs.icbpBaseLots &&
    boughtBbriBaseLots === inputs.bbriBaseLots;
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
  const icbpLotsBeforeDividend = boughtIcbpBaseLots;
  const bbriLotsBeforeDividend = boughtBbriBaseLots;
  const dividendRecommendation = recommendDividendLots(
    dividendAmount,
    bmriLotsBeforeDividend,
    icbpLotsBeforeDividend,
    bbriLotsBeforeDividend,
    bmriExtraLotPrice,
    icbpLotPrice,
    bbriLotPrice,
    active,
  );
  const extraLeftoverToRdpu = Math.max(0, dividendRecommendation.leftover);
  const totalRdpuThisMonth = netRdpu + extraLeftoverToRdpu;
  const totalBmriLots = boughtBmriBaseLots + extraBmriLots + dividendRecommendation.bmriLots;
  const totalIcbpLots = boughtIcbpBaseLots + dividendRecommendation.icbpLots;
  const totalBbriLots = boughtBbriBaseLots + dividendRecommendation.bbriLots;
  const totalStockAmount = baseStockAmount + extraBmriCost + dividendRecommendation.stockCost;
  const bmriLotPriceForLedger = totalBmriLots > 0
    ? (bmriBaseAmount + extraBmriCost + dividendRecommendation.bmriLots * bmriExtraLotPrice) / totalBmriLots
    : bmriBaseLotPrice;
  const icbpLotPriceForLedger = icbpLotPrice;
  const bbriLotPriceForLedger = bbriLotPrice;

  return {
    inputs,
    bmriBaseLotPrice,
    icbpLotPrice,
    bbriLotPrice,
    boughtBmriBaseLots,
    boughtIcbpBaseLots,
    boughtBbriBaseLots,
    bmriBaseAmount,
    icbpBaseAmount,
    bbriBaseAmount,
    baseStockAmount,
    targetBaseAmount,
    grossRdpu,
    baseTargetReached,
    bmriChangePercent,
    bmriFormula,
    dividendAmount,
    bmriExtraLotPrice,
    extraBmriLots,
    extraBmriCost,
    bridgeAmount,
    rdpuRedeemAmount,
    netRdpu,
    unreimbursedBridge,
    bmriLotsBeforeDividend,
    icbpLotsBeforeDividend,
    bbriLotsBeforeDividend,
    dividendRecommendation,
    dividendIcbpLots: dividendRecommendation.icbpLots,
    dividendBmriLots: dividendRecommendation.bmriLots,
    dividendBbriLots: dividendRecommendation.bbriLots,
    dividendStockCost: dividendRecommendation.stockCost,
    extraLeftoverToRdpu,
    totalRdpuThisMonth,
    totalBmriLots,
    totalIcbpLots,
    totalBbriLots,
    totalStockAmount,
    bmriLotPriceForLedger,
    icbpLotPriceForLedger,
    bbriLotPriceForLedger,
  };
}

function updateMonthlyStrategyCalculator() {
  const inputs = readMonthlyStrategyInputs();
  const plan = computeMonthlyStrategyPlan(inputs);
  el.monthlyStrategyIndicatorPanel.classList.toggle("hidden", !inputs.useIndicator);
  el.monthlyStrategyExtraPanel.classList.toggle("hidden", !inputs.useExtra);
  el.monthlyStrategyIndicatorResults.forEach((item) => item.classList.toggle("hidden", !inputs.useIndicator));
  el.monthlyStrategyExtraResults.forEach((item) => item.classList.toggle("hidden", !inputs.useExtra));
  el.monthlyStrategyDividendResults.forEach((item) => item.classList.toggle("hidden", !inputs.useDividend));
  const {
    boughtBmriBaseLots,
    boughtIcbpBaseLots,
    boughtBbriBaseLots,
    bmriBaseAmount,
    icbpBaseAmount,
    bbriBaseAmount,
    baseStockAmount,
    targetBaseAmount,
    grossRdpu,
    baseTargetReached,
    bmriChangePercent,
    bmriFormula,
    dividendAmount,
    extraBmriLots,
    extraBmriCost,
    bridgeAmount,
    rdpuRedeemAmount,
    netRdpu,
    unreimbursedBridge,
    bmriLotsBeforeDividend,
    icbpLotsBeforeDividend,
    bbriLotsBeforeDividend,
    dividendIcbpLots,
    dividendBmriLots,
    dividendBbriLots,
    dividendStockCost,
    extraLeftoverToRdpu,
    totalRdpuThisMonth,
    totalBmriLots,
    totalIcbpLots,
    totalBbriLots,
    totalStockAmount,
    icbpLotPrice,
    bbriLotPrice,
    bmriExtraLotPrice,
  } = plan;

  el.monthlyStrategyDividendPanel.classList.toggle("hidden", !inputs.useDividend);

  el.monthlyStrategyBmriBaseResult.textContent = formatLotPurchase(boughtBmriBaseLots, bmriBaseAmount);
  el.monthlyStrategyIcbpBaseResult.textContent = formatLotPurchase(boughtIcbpBaseLots, icbpBaseAmount);
  el.monthlyStrategyBbriBaseResult.textContent = formatLotPurchase(boughtBbriBaseLots, bbriBaseAmount);
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
    `ICBP ${dividendIcbpLots.toLocaleString("id-ID")} lot + BBRI ${dividendBbriLots.toLocaleString("id-ID")} lot + BMRI ${dividendBmriLots.toLocaleString("id-ID")} lot`;
  el.monthlyStrategyDividendBasisResult.textContent = dividendRecommendationBasis(
    dividendAmount,
    icbpLotPrice,
    bmriExtraLotPrice,
    bbriLotPrice,
    dividendIcbpLots,
    dividendBmriLots,
    dividendBbriLots,
    dividendRecommendation.leftover,
    bmriLotsBeforeDividend,
    icbpLotsBeforeDividend,
    bbriLotsBeforeDividend,
  );
  el.monthlyStrategyExtraLeftoverResult.textContent = formatMoney(extraLeftoverToRdpu);
  el.monthlyStrategyTotalBmriLotsResult.textContent = `${totalBmriLots.toLocaleString("id-ID")} lot`;
  el.monthlyStrategyTotalIcbpLotsResult.textContent = `${totalIcbpLots.toLocaleString("id-ID")} lot`;
  el.monthlyStrategyTotalBbriLotsResult.textContent = `${totalBbriLots.toLocaleString("id-ID")} lot`;
  el.monthlyStrategyTotalRdpuResult.textContent = formatMoney(totalRdpuThisMonth);
  el.monthlyStrategyBmriDiscountResult.textContent = `${decimal.format(bmriChangePercent)}%`;
  el.monthlyStrategyBmriFormulaResult.textContent = bmriFormula;
  el.monthlyStrategyBmriDecisionResult.textContent = bmriExtraLotDecision(bmriChangePercent);

  if (inputs.syncSimulator) {
    const recurringBmriLots = boughtBmriBaseLots + extraBmriLots;
    const recurringBmriCost = bmriBaseAmount + extraBmriCost;
    const bmriSimulatorPrice = recurringBmriLots > 0 ? recurringBmriCost / (recurringBmriLots * LOT_SIZE) : inputs.bmriPrice;
    const bmriPriceMode = extraBmriLots > 0 ? "rata-rata base + ekstra" : "harga base";
    applyMonthlyStrategyToSimulator(
      { ...inputs, bmriBaseLots: boughtBmriBaseLots, icbpBaseLots: boughtIcbpBaseLots, bbriBaseLots: boughtBbriBaseLots },
      extraBmriLots,
      bmriSimulatorPrice,
      bmriPriceMode,
    );
  } else {
    updateSimulatorSyncUi(false);
    el.monthlyStrategySyncStatus.textContent = "Strategi belum dikirim ke simulator.";
  }

  if (!baseTargetReached) {
    el.monthlyStrategyNote.textContent =
      `Target base ${inputs.bmriBaseLots.toLocaleString("id-ID")} BMRI + ${inputs.icbpBaseLots.toLocaleString("id-ID")} ICBP + ${inputs.bbriBaseLots.toLocaleString("id-ID")} BBRI butuh ${formatMoney(targetBaseAmount)}. ` +
      `Setoran hanya cukup beli ${boughtBmriBaseLots.toLocaleString("id-ID")} BMRI + ${boughtIcbpBaseLots.toLocaleString("id-ID")} ICBP + ${boughtBbriBaseLots.toLocaleString("id-ID")} BBRI.`;
  } else if (extraBmriCost > 0) {
    const bridgeTail = unreimbursedBridge > 0 ? ` Ada ${formatMoney(unreimbursedBridge)} talangan yang belum terganti dari RDPU.` : "";
    el.monthlyStrategyNote.textContent =
      `Talangi ekstra BMRI ${formatMoney(bridgeAmount)}, cairkan RDPU ${formatMoney(rdpuRedeemAmount)}, ` +
      `sisa RDPU setelah cair ${formatMoney(netRdpu)}.${bridgeTail}`;
  } else if (extraBmriLots + dividendBmriLots + dividendIcbpLots + dividendBbriLots > 0) {
    el.monthlyStrategyNote.textContent =
      `Silakan tambah BMRI ${(extraBmriLots + dividendBmriLots).toLocaleString("id-ID")} lot, ICBP ${dividendIcbpLots.toLocaleString("id-ID")} lot, dan BBRI ${dividendBbriLots.toLocaleString("id-ID")} lot. ` +
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

function monthlyStrategyLedgerEntries(plan, month, year) {
  const createdAt = new Date().toISOString();
  const stocks = [];
  if (plan.totalBmriLots > 0) {
    stocks.push({
      id: uid("stock"),
      ticker: "BMRI",
      month,
      year,
      lotPrice: plan.bmriLotPriceForLedger,
      lots: plan.totalBmriLots,
      createdAt,
    });
  }
  if (plan.totalIcbpLots > 0) {
    stocks.push({
      id: uid("stock"),
      ticker: "ICBP",
      month,
      year,
      lotPrice: plan.icbpLotPriceForLedger,
      lots: plan.totalIcbpLots,
      createdAt,
    });
  }
  if (plan.totalBbriLots > 0) {
    stocks.push({
      id: uid("stock"),
      ticker: "BBRI",
      month,
      year,
      lotPrice: plan.bbriLotPriceForLedger,
      lots: plan.totalBbriLots,
      createdAt,
    });
  }
  const rdpu = plan.totalRdpuThisMonth > 0
    ? {
        id: uid("rdpu"),
        month,
        year,
        amount: plan.totalRdpuThisMonth,
        createdAt,
      }
    : null;
  const dividend = plan.dividendAmount > 0
    ? {
        id: uid("div"),
        month,
        year,
        amount: plan.dividendAmount,
        createdAt,
      }
    : null;
  return { stocks, rdpu, dividend };
}

async function saveMonthlyStrategyToLedger() {
  const plan = computeMonthlyStrategyPlan();
  const { month, year } = currentActualMonthDate();
  const entries = monthlyStrategyLedgerEntries(plan, month, year);
  if (!entries.stocks.length && !entries.rdpu && !entries.dividend) {
    if (el.monthlyStrategyLedgerFeedback) {
      el.monthlyStrategyLedgerFeedback.textContent = "Tidak ada lot, RDPU, atau dividen untuk dicatat bulan ini.";
      el.monthlyStrategyLedgerFeedback.classList.remove("hidden");
    }
    return;
  }

  const existingLabel = [
    state.investments.stockPurchases.some((item) => item.month === month && item.year === year && ["BMRI", "ICBP", "BBRI"].includes(item.ticker)),
    state.investments.rdpuPurchases.some((item) => item.month === month && item.year === year),
    (state.investments.dividendReceipts || []).some((item) => item.month === month && item.year === year),
  ].some(Boolean);
  if (existingLabel && !confirm(`Sudah ada catatan ${investmentMonthLabel(month)} ${year}. Tambah hasil strategi sebagai baris baru?`)) {
    return;
  }

  entries.stocks.forEach((purchase) => state.investments.stockPurchases.push(purchase));
  if (entries.rdpu) state.investments.rdpuPurchases.push(entries.rdpu);
  if (entries.dividend) {
    state.investments.dividendReceipts = state.investments.dividendReceipts || [];
    state.investments.dividendReceipts.push(entries.dividend);
  }

  renderInvestments();
  const summary = [
    entries.stocks.length ? `${entries.stocks.map((item) => `${item.ticker} ${item.lots} lot`).join(", ")}` : null,
    entries.rdpu ? `RDPU ${formatMoney(entries.rdpu.amount)}` : null,
    entries.dividend ? `dividen ${formatMoney(entries.dividend.amount)}` : null,
  ].filter(Boolean).join(" · ");
  if (el.monthlyStrategyLedgerFeedback) {
    el.monthlyStrategyLedgerFeedback.textContent = `Tersimpan ke Catatan Aktual ${investmentMonthLabel(month)} ${year}: ${summary}.`;
    el.monthlyStrategyLedgerFeedback.classList.remove("hidden");
  }
  showInvestmentSaveFeedback({ month, year, ticker: "BMRI" }, entries.stocks.length ? "stock" : "rdpu");
  switchInvestmentTab("actual");

  try {
    for (const purchase of entries.stocks) await persistStockPurchase(purchase);
    if (entries.rdpu) await persistRdpuPurchase(entries.rdpu);
    if (entries.dividend) await persistDividendReceipt(entries.dividend);
  } catch (error) {
    console.error(error);
    setSyncStatus("Simpan ledger strategi cloud gagal", "error");
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
  const active = state.investments.activeStocks;
  const stockRows = [...state.investments.stockPurchases].sort((a, b) => investmentTimestamp(a) - investmentTimestamp(b));
  const rdpuRows = [...state.investments.rdpuPurchases].sort((a, b) => investmentTimestamp(a) - investmentTimestamp(b));

  el.investmentStockTable.innerHTML = stockRows.length
    ? stockRows
        .map(
          (purchase) => {
            const inactive = !active.includes(purchase.ticker);
            return `
            <tr class="${inactive ? "row-inactive" : ""}">
              <td>${formatInvestmentDate(purchase)}</td>
              <td>
                <strong>${escapeHtml(purchase.ticker)}</strong>
                ${inactive ? `<span class="badge-inactive">Nonaktif</span>` : ""}
              </td>
              <td>${formatMoney(purchase.lotPrice)}</td>
              <td>${purchase.lots.toLocaleString("id-ID")} lot</td>
              <td><strong>${formatMoney(investmentValue(purchase))}</strong></td>
              <td>
                <div class="table-actions">
                  <button class="icon-button" data-edit-stock-purchase="${purchase.id}" type="button">Edit</button>
                  <button class="icon-button delete" data-delete-stock-purchase="${purchase.id}" type="button">Hapus</button>
                </div>
              </td>
            </tr>
          `;
          },
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
              <td>
                <div class="table-actions">
                  <button class="icon-button" data-edit-rdpu-purchase="${purchase.id}" type="button">Edit</button>
                  <button class="icon-button delete" data-delete-rdpu-purchase="${purchase.id}" type="button">Hapus</button>
                </div>
              </td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3"><div class="empty-state">Belum ada pembelian RDPU.</div></td></tr>`;

  if (!el.investmentDividendTable) return;
  const dividendRows = [...(state.investments.dividendReceipts || [])].sort(
    (a, b) => investmentTimestamp(a) - investmentTimestamp(b),
  );
  el.investmentDividendTable.innerHTML = dividendRows.length
    ? dividendRows
        .map(
          (receipt) => `
            <tr>
              <td>${formatInvestmentDate(receipt)}</td>
              <td><strong>${formatMoney(receipt.amount)}</strong></td>
              <td>
                <div class="table-actions">
                  <button class="icon-button" data-edit-dividend-receipt="${receipt.id}" type="button">Edit</button>
                  <button class="icon-button delete" data-delete-dividend-receipt="${receipt.id}" type="button">Hapus</button>
                </div>
              </td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3"><div class="empty-state">Belum ada dividen aktual.</div></td></tr>`;
}

function calculateMarkToMarket() {
  const prices = state.investments.marketPrices || {};
  const grouped = {};
  state.investments.tickers.forEach((ticker) => {
    grouped[ticker] = { ticker, lots: 0, cost: 0, marketPrice: Number(prices[ticker]) || 0 };
  });
  state.investments.stockPurchases.forEach((purchase) => {
    if (!grouped[purchase.ticker]) {
      grouped[purchase.ticker] = { ticker: purchase.ticker, lots: 0, cost: 0, marketPrice: Number(prices[purchase.ticker]) || 0 };
    }
    grouped[purchase.ticker].lots += purchase.lots;
    grouped[purchase.ticker].cost += investmentValue(purchase);
  });
  return Object.values(grouped).map((row) => {
    const shares = row.lots * LOT_SIZE;
    const avgShare = shares > 0 ? row.cost / shares : 0;
    const marketValue = row.marketPrice > 0 ? shares * row.marketPrice : 0;
    const pnl = row.marketPrice > 0 ? marketValue - row.cost : 0;
    return { ...row, shares, avgShare, marketValue, pnl, hasMarket: row.marketPrice > 0 && row.lots > 0 };
  });
}

function renderMarkToMarket() {
  const rows = calculateMarkToMarket();
  const priced = rows.filter((row) => row.hasMarket);
  const marketStockValue = priced.reduce((total, row) => total + row.marketValue, 0);
  const pricedCost = priced.reduce((total, row) => total + row.cost, 0);
  const pnl = marketStockValue - pricedCost;
  const rdpuTotal = state.investments.rdpuPurchases.reduce((total, purchase) => total + purchase.amount, 0);
  const stockCost = rows.reduce((total, row) => total + row.cost, 0);
  const unpricedLots = rows.filter((row) => row.lots > 0 && !row.hasMarket).length;

  if (el.investmentMarketPriceGrid) {
    const existing = [...el.investmentMarketPriceGrid.querySelectorAll("[data-market-ticker]")].map((input) => input.dataset.marketTicker);
    const nextTickers = state.investments.tickers;
    const sameTickers = existing.length === nextTickers.length && nextTickers.every((ticker, index) => existing[index] === ticker);
    if (!sameTickers) {
      el.investmentMarketPriceGrid.innerHTML = nextTickers
        .map((ticker) => {
          const value = state.investments.marketPrices?.[ticker] || "";
          return `
            <label>
              Harga ${escapeHtml(ticker)} / lembar
              <input class="market-price-input" data-market-ticker="${escapeHtml(ticker)}" type="text" inputmode="numeric" value="${value ? formatNumberInput(value) : ""}" placeholder="0" />
            </label>
          `;
        })
        .join("");
    } else {
      nextTickers.forEach((ticker) => {
        const input = el.investmentMarketPriceGrid.querySelector(`[data-market-ticker="${ticker}"]`);
        if (!input || document.activeElement === input) return;
        const value = state.investments.marketPrices?.[ticker] || "";
        input.value = value ? formatNumberInput(value) : "";
      });
    }
  }

  if (el.investmentMarkToMarketTable) {
    const visible = rows.filter((row) => row.lots > 0);
    el.investmentMarkToMarketTable.innerHTML = visible.length
      ? visible
          .map((row) => {
            const pnlClass = !row.hasMarket ? "" : row.pnl >= 0 ? "positive" : "negative";
            return `
              <tr>
                <td><strong>${escapeHtml(row.ticker)}</strong></td>
                <td>${row.lots.toLocaleString("id-ID")} lot</td>
                <td>${formatMoney(row.cost)}</td>
                <td>${row.avgShare ? formatMoney(row.avgShare) : "-"}</td>
                <td>${row.marketPrice ? formatMoney(row.marketPrice) : "-"}</td>
                <td>${row.hasMarket ? formatMoney(row.marketValue) : "-"}</td>
                <td class="${pnlClass}">${row.hasMarket ? formatMoney(row.pnl) : "-"}</td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="7"><div class="empty-state">Belum ada pembelian saham.</div></td></tr>`;
  }

  if (el.investmentPortfolioTotal) {
    el.investmentPortfolioTotal.textContent = priced.length
      ? formatMoney(marketStockValue + rdpuTotal)
      : formatMoney(stockCost + rdpuTotal);
  }
  if (el.investmentPortfolioMeta) {
    el.investmentPortfolioMeta.textContent = priced.length
      ? unpricedLots
        ? `pasar + RDPU, ${unpricedLots} saham belum ada harga`
        : "pasar saham + modal RDPU"
      : "isi harga pasar untuk P/L";
  }
  if (el.investmentUnrealizedPnl) {
    el.investmentUnrealizedPnl.textContent = priced.length ? formatMoney(pnl) : "-";
    el.investmentUnrealizedPnl.classList.toggle("positive", priced.length > 0 && pnl >= 0);
    el.investmentUnrealizedPnl.classList.toggle("negative", priced.length > 0 && pnl < 0);
  }
  if (el.investmentUnrealizedPnlMeta) {
    el.investmentUnrealizedPnlMeta.textContent = priced.length ? "vs modal beli saham berharga pasar" : "vs modal beli saham";
  }
}

function renderInvestmentSummary() {
  const summary = calculateInvestmentSummary();
  el.investmentStockTotal.textContent = formatMoney(summary.stockTotal);
  el.investmentLotTotal.textContent = `${summary.lotTotal.toLocaleString("id-ID")} lot`;
  el.investmentRdpuTotal.textContent = formatMoney(summary.rdpuTotal);
  renderMarkToMarket();
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
    ? "BMRI, ICBP, BBRI, dan RDPU aktual bulan ini dibaca langsung oleh proyeksi jika periodenya cocok."
    : "Belum ada catatan BMRI, ICBP, BBRI, atau RDPU untuk bulan ini.";
  el.investmentActualBmri.textContent = `${actualInvestment.bmriLots.toLocaleString("id-ID")} lot - ${formatMoney(actualInvestment.bmriAmount)}`;
  el.investmentActualIcbp.textContent = `${actualInvestment.icbpLots.toLocaleString("id-ID")} lot - ${formatMoney(actualInvestment.icbpAmount)}`;
  el.investmentActualBbri.textContent = `${actualInvestment.bbriLots.toLocaleString("id-ID")} lot - ${formatMoney(actualInvestment.bbriAmount)}`;
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
  const isProgramStock = type === "stock" && ["BMRI", "ICBP", "BBRI"].includes(purchase.ticker);
  const isProgramRdpu = type === "rdpu";

  if ((isProgramStock || isProgramRdpu) && inSimulation) {
    return `Tersimpan. Simulator 180 Bulan diperbarui memakai data ${dateLabel}.`;
  }

  if (type === "stock" && !isProgramStock) {
    return `Tersimpan. ${purchase.ticker} masuk Catatan Aktual, tetapi Program 1 hanya memakai BMRI, ICBP, BBRI, dan RDPU.`;
  }

  return `Tersimpan. Data ${dateLabel} belum masuk Program 1 karena di luar rentang simulasi saat ini.`;
}

function showInvestmentSaveFeedback(purchase, type) {
  if (!el.investmentSaveFeedback) return;
  el.investmentSaveFeedback.textContent = investmentSaveFeedbackMessage(purchase, type);
  el.investmentSaveFeedback.classList.remove("hidden");
}


// ============================================================
// REBALANCING PORTFOLIO CALCULATOR
// ============================================================

function parseRibuanInput(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/\./g, "").replace(",", ".");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function formatRibuan(num) {
  if (!num && num !== 0) return "";
  return Math.floor(num).toLocaleString("id-ID");
}

// ============================================================
// SIMULATOR PERSENTASE ASET - LOGIKA & RENDER
// ============================================================

const AP_COLORS = ["#2563eb", "#0ea5e9", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#db2777", "#0f766e", "#ca8a04", "#4338ca"];
let apRowCounter = 0;

function apCreateRow(name = "", value = "") {
  apRowCounter += 1;
  const rowId = `ap-row-${apRowCounter}`;
  const row = document.createElement("div");
  row.className = "asetpersen-row";
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <input class="kalc-input ap-row-name" type="text" placeholder="Nama bagian (opsional)" value="${name}" />
    <input class="kalc-input ap-row-value" type="text" inputmode="numeric" placeholder="Nominal (Rp)" value="${value}" />
    <button class="ap-row-remove" type="button" aria-label="Hapus baris">&times;</button>
  `;
  return row;
}

function apAttachRowEvents(row) {
  const valueInput = row.querySelector(".ap-row-value");
  const removeBtn = row.querySelector(".ap-row-remove");
  valueInput.addEventListener("input", () => {
    const raw = parseRibuanInput(valueInput.value);
    const pos = valueInput.selectionStart;
    const oldLen = valueInput.value.length;
    if (raw > 0) {
      valueInput.value = formatRibuan(raw);
      const newLen = valueInput.value.length;
      valueInput.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
    } else {
      valueInput.value = "";
    }
  });
  removeBtn.addEventListener("click", () => {
    const rowsWrap = document.querySelector("#apRows");
    if (rowsWrap && rowsWrap.children.length > 1) {
      row.remove();
    } else {
      row.querySelector(".ap-row-name").value = "";
      row.querySelector(".ap-row-value").value = "";
    }
  });
}

function apAddRow(name = "", value = "") {
  const rowsWrap = document.querySelector("#apRows");
  if (!rowsWrap) return;
  const row = apCreateRow(name, value);
  rowsWrap.append(row);
  apAttachRowEvents(row);
}

function initAsetPersenSimulator() {
  const totalInput = document.querySelector("#apTotalAset");
  const addBtn = document.querySelector("#apAddRow");
  const hitungBtn = document.querySelector("#apHitung");
  if (!totalInput || !addBtn || !hitungBtn) return;

  totalInput.addEventListener("input", () => {
    const raw = parseRibuanInput(totalInput.value);
    const pos = totalInput.selectionStart;
    const oldLen = totalInput.value.length;
    if (raw > 0) {
      totalInput.value = formatRibuan(raw);
      const newLen = totalInput.value.length;
      totalInput.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
    } else {
      totalInput.value = "";
    }
  });

  addBtn.addEventListener("click", () => apAddRow());
  hitungBtn.addEventListener("click", () => renderAsetPersenSimulator());

  // Mulai dengan 2 baris kosong sebagai contoh input
  apAddRow();
  apAddRow();
}

function apFmtCurrency(val) {
  return val.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
}

function renderAsetPersenSimulator() {
  const output = document.querySelector("#apOutput");
  const totalInput = document.querySelector("#apTotalAset");
  if (!output || !totalInput) return;

  const totalAset = parseRibuanInput(totalInput.value);
  const rows = [...document.querySelectorAll("#apRows .asetpersen-row")]
    .map((row) => ({
      name: row.querySelector(".ap-row-name").value.trim(),
      value: parseRibuanInput(row.querySelector(".ap-row-value").value),
    }))
    .filter((item) => item.value > 0);

  if (totalAset <= 0 || rows.length === 0) {
    output.innerHTML = '<p class="kalc-empty">Masukkan Total Aset dan minimal satu nilai bagian, lalu klik "Hitung Persentase".</p>';
    return;
  }

  const withPct = rows.map((item, index) => ({
    ...item,
    displayName: item.name || `Bagian ${index + 1}`,
    color: AP_COLORS[index % AP_COLORS.length],
    pct: (item.value / totalAset) * 100,
  }));

  const sumValue = withPct.reduce((sum, item) => sum + item.value, 0);
  const sumPct = withPct.reduce((sum, item) => sum + item.pct, 0);
  const epsilon = 0.005; // toleransi pembulatan
  const selisihPct = sumPct - 100;
  const isPas = Math.abs(selisihPct) <= epsilon;

  let statusHtml;
  if (isPas) {
    statusHtml = `<div class="ap-status ap-status-ok">✓ Total sudah pas 100% dari Total Aset</div>`;
  } else if (selisihPct < 0) {
    statusHtml = `<div class="ap-status ap-status-warn">Belum pas — kurang <strong>${Math.abs(selisihPct).toFixed(2).replace(".", ",")}%</strong> (sisa belum dialokasikan: ${apFmtCurrency(Math.max(0, totalAset - sumValue))})</div>`;
  } else {
    statusHtml = `<div class="ap-status ap-status-warn">Belum pas — kelebihan <strong>${selisihPct.toFixed(2).replace(".", ",")}%</strong> (melebihi Total Aset sebesar ${apFmtCurrency(sumValue - totalAset)})</div>`;
  }

  // Grafik lingkaran sederhana pakai conic-gradient
  let cursor = 0;
  const gradientStops = withPct.map((item) => {
    const start = cursor;
    const end = cursor + Math.max(0, Math.min(item.pct, 100 - start));
    cursor = end;
    return `${item.color} ${start}% ${end}%`;
  });
  if (cursor < 100) {
    gradientStops.push(`#e2e8f0 ${cursor}% 100%`);
  }
  const pieStyle = `background: conic-gradient(${gradientStops.join(", ")});`;

  const legendHtml = withPct
    .map(
      (item) => `
      <div class="ap-legend-item">
        <span class="ap-swatch" style="background:${item.color}"></span>
        <span class="ap-legend-name">${item.displayName}</span>
      </div>`
    )
    .join("");

  const tableRowsHtml = withPct
    .map(
      (item) => `
      <tr>
        <td><span class="ap-swatch" style="background:${item.color}"></span>${item.displayName}</td>
        <td class="ap-num">${apFmtCurrency(item.value)}</td>
        <td class="ap-num">${item.pct.toFixed(2).replace(".", ",")}%</td>
      </tr>`
    )
    .join("");

  output.innerHTML = `
    <div class="ap-result-grid">
      <div class="ap-pie-wrap">
        <div class="ap-pie" style="${pieStyle}"></div>
        <div class="ap-legend">${legendHtml}</div>
      </div>
      <div class="ap-table-wrap">
        <table class="ap-table">
          <thead>
            <tr>
              <th>Bagian</th>
              <th class="ap-num">Nominal</th>
              <th class="ap-num">Persentase</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            <tr class="ap-table-total">
              <td>Total Bagian</td>
              <td class="ap-num">${apFmtCurrency(sumValue)}</td>
              <td class="ap-num">${sumPct.toFixed(2).replace(".", ",")}%</td>
            </tr>
          </tbody>
        </table>
        <p class="ap-total-aset-line">Total Aset: <strong>${apFmtCurrency(totalAset)}</strong></p>
        ${statusHtml}
      </div>
    </div>
  `;
}

// ============================================================
// SIMULATOR AVERAGE DOWN/UP SAHAM - LOGIKA & RENDER
// ============================================================

function avgSimCalcScenario(lotLama, avgLama, lotBaru, hargaBaru) {
  const totalLot = lotLama + lotBaru;
  const modalTambahan = lotBaru * 100 * hargaBaru;
  const avgBaru = (lotLama * avgLama + lotBaru * hargaBaru) / totalLot;
  const pctChange = avgLama > 0 ? ((avgBaru - avgLama) / avgLama) * 100 : 0;
  return { totalLot, modalTambahan, avgBaru, pctChange };
}

function avgSimRiskOpinion(pctChange, hargaBaru, avgLama) {
  const pctAbs = Math.abs(pctChange);
  if (pctChange <= 0) {
    return {
      level: "aman",
      label: "AVERAGE DOWN",
      text: `Average berhasil turun ${pctAbs.toFixed(2).replace(".", ",")}% dari avg lama — posisi makin sehat, harga beli baru (${formatMoney(hargaBaru)}) berada di bawah average lama (${formatMoney(avgLama)}).`,
    };
  }
  if (pctAbs <= 5) {
    return {
      level: "aman",
      label: "AVERAGE UP",
      text: `Average naik tipis (${pctAbs.toFixed(2).replace(".", ",")}%), masih dalam batas wajar dan relatif dekat dengan average lama.`,
    };
  }
  if (pctAbs <= 15) {
    return {
      level: "warn",
      label: "AVERAGE UP",
      text: `Average naik cukup signifikan (${pctAbs.toFixed(2).replace(".", ",")}%). Pertimbangkan apakah harga beli baru (${formatMoney(hargaBaru)}) masih berada di area support/resistance yang wajar sebelum menambah posisi.`,
    };
  }
  return {
    level: "danger",
    label: "AVERAGE UP",
    text: `Average naik cukup tinggi (${pctAbs.toFixed(2).replace(".", ",")}%), berisiko merusak keunggulan average bawah yang sudah Anda bangun. Pertimbangkan matang-matang sebelum eksekusi.`,
  };
}

function avgSimRenderResult(avgLama, lotLama, hargaBaru, lotBaru) {
  const modalAwal = lotLama * 100 * avgLama;
  const hasil = avgSimCalcScenario(lotLama, avgLama, lotBaru, hargaBaru);
  const risk = avgSimRiskOpinion(hasil.pctChange, hargaBaru, avgLama);

  return `
    <div class="avgsim-card">
      <div class="avgsim-card-head">
        <strong>Hasil Simulasi</strong>
        <span class="avgsim-badge avgsim-badge-${risk.level}">${risk.label}</span>
      </div>
      <div class="avgsim-scenario avgsim-scenario-base">
        <h5>1. Rekap Posisi Awal</h5>
        <div class="avgsim-metric-grid">
          <div><span>Avg Sekarang</span><strong>${formatMoney(avgLama)}</strong></div>
          <div><span>Total Lot Sekarang</span><strong>${lotLama.toLocaleString("id-ID")} Lot</strong></div>
          <div><span>Total Modal Saat Ini</span><strong>${formatMoney(modalAwal)}</strong></div>
        </div>
      </div>
      <div class="avgsim-scenario ${hasil.pctChange <= 0 ? "avgsim-scenario-down" : "avgsim-scenario-up"}">
        <h5>2. Hasil Perhitungan Average Baru</h5>
        <div class="avgsim-metric-grid">
          <div><span>Total Lot Baru</span><strong>${hasil.totalLot.toLocaleString("id-ID")} Lot</strong></div>
          <div><span>Modal Tambahan</span><strong>${formatMoney(hasil.modalTambahan)}</strong></div>
          <div><span>Avg Baru</span><strong>${formatMoney(hasil.avgBaru)}</strong></div>
          <div><span>Perubahan dari Avg Lama</span><strong class="${hasil.pctChange <= 0 ? "avgsim-pct-down" : "avgsim-pct-up"}">${hasil.pctChange >= 0 ? "+" : ""}${hasil.pctChange.toFixed(2).replace(".", ",")}%</strong></div>
        </div>
      </div>
      <div class="avgsim-scenario avgsim-scenario-risk">
        <h5>3. Analisis Keamanan Risiko</h5>
        <div class="avgsim-risk avgsim-risk-${risk.level}">${risk.text}</div>
        <p class="avgsim-disclaimer">Catatan: kalkulasi murni matematis berdasarkan rumus Weighted Average, bukan rekomendasi atau nasihat investasi.</p>
      </div>
    </div>
  `;
}

function avgSimBindRibuanInput(input) {
  input.addEventListener("input", () => {
    const raw = parseRibuanInput(input.value);
    const pos = input.selectionStart;
    const oldLen = input.value.length;
    if (raw > 0) {
      input.value = formatRibuan(raw);
      const newLen = input.value.length;
      input.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
    } else {
      input.value = "";
    }
  });
}

function initAvgDownUpSimulator() {
  const btn = document.querySelector("#avgSimHitung");
  const avgNowInput = document.querySelector("#avgSimAvgNow");
  const lotNowInput = document.querySelector("#avgSimLotNow");
  const hargaBaruInput = document.querySelector("#avgSimHargaBaru");
  const lotBaruInput = document.querySelector("#avgSimLotBaru");
  if (!btn || !avgNowInput || !lotNowInput || !hargaBaruInput || !lotBaruInput) return;

  [avgNowInput, lotNowInput, hargaBaruInput, lotBaruInput].forEach(avgSimBindRibuanInput);

  btn.addEventListener("click", () => {
    const output = document.querySelector("#avgSimOutput");
    const errorEl = document.querySelector("#avgSimError");
    if (!output || !errorEl) return;

    errorEl.classList.add("hidden");
    errorEl.textContent = "";

    const avgLama = parseRibuanInput(avgNowInput.value);
    const lotLama = parseRibuanInput(lotNowInput.value);
    const hargaBaru = parseRibuanInput(hargaBaruInput.value);
    const lotBaru = parseRibuanInput(lotBaruInput.value);

    if (avgLama <= 0 || lotLama <= 0 || hargaBaru <= 0 || lotBaru <= 0) {
      errorEl.textContent = "Isi semua kolom dengan angka lebih dari 0 terlebih dahulu.";
      errorEl.classList.remove("hidden");
      output.innerHTML = "";
      return;
    }

    output.innerHTML = avgSimRenderResult(avgLama, lotLama, hargaBaru, lotBaru);
  });
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

  const stockToggles = document.createElement("div");
  stockToggles.className = "stock-toggles";
  stockToggles.setAttribute("aria-label", "Saham aktif");
  stockToggles.innerHTML = `
    <span class="stock-toggles-label">Universe</span>
    <div class="stock-toggle-group" id="stockToggleGroup">
      <button class="stock-toggle-btn active" data-stock-toggle="BMRI" type="button" aria-pressed="true">BMRI</button>
      <button class="stock-toggle-btn active" data-stock-toggle="ICBP" type="button" aria-pressed="true">ICBP</button>
      <button class="stock-toggle-btn active" data-stock-toggle="BBRI" type="button" aria-pressed="true">BBRI</button>
    </div>
    <small class="stock-toggles-hint">Minimal 1 saham aktif. Data non-aktif tetap tersimpan.</small>
  `;

  const tabs = document.createElement("nav");
  tabs.className = "investment-subtabs";
  tabs.setAttribute("aria-label", "Sub-tab investasi");
  tabs.innerHTML = `
    <button class="active" data-investment-tab-button="simulator" type="button" aria-controls="investmentTabSimulator" aria-selected="true">
      <span class="subtab-kicker">Program 1</span>
      <strong>Proyeksi 180 Bulan</strong>
    </button>
    <button data-investment-tab-button="actual" type="button" aria-controls="investmentTabActual" aria-selected="false">
      <span class="subtab-kicker">Program 2</span>
      <strong>Catatan Aktual</strong>
    </button>
    <button data-investment-tab-button="analysis" type="button" aria-controls="investmentTabAnalysis" aria-selected="false">
      <span class="subtab-kicker">Tools</span>
      <strong>Analisis Portofolio</strong>
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
        <span>ICBP</span>
        <strong id="investmentActualIcbp">0 lot - Rp0</strong>
      </article>
      <article>
        <span>BBRI</span>
        <strong id="investmentActualBbri">0 lot - Rp0</strong>
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
  const divider = stack.querySelector(".investment-section-divider");
  const strategySurface = document.querySelector(".monthly-strategy-calculator")?.closest(".surface");
  const recordsSurface = document.querySelector(".investment-records-surface");
  stack.prepend(tabs, stockToggles);
  stack.append(simulatorPanel, actualPanel, analysisPanel);
  simulatorPanel.append(actualSyncBanner);
  [simulatorGrid, historySurface].filter(Boolean).forEach((node) => simulatorPanel.append(node));
  divider?.remove();
  if (recordsSurface) {
    const recordsHead = recordsSurface.firstElementChild;
    recordsHead?.after(actualMonthSummary, saveFeedback);
    actualPanel.append(recordsSurface);
  }
  if (strategySurface) {
    analysisPanel.append(strategySurface);
  }

  const asetPersenSurface = document.createElement("section");
  asetPersenSurface.className = "surface";
  asetPersenSurface.innerHTML = `
    <div class="section-head compact">
      <h3>Porsi portofolio</h3>
      <p>Bandingkan rincian nilai terhadap total aset, lengkap dengan status kecocokan 100%.</p>
    </div>
    <div class="asetpersen-layout">
      <div class="asetpersen-inputs">
        <label>
          Total Aset (Rp)
          <input class="kalc-input" id="apTotalAset" type="text" inputmode="numeric" placeholder="Contoh: 100.000.000" />
        </label>
        <div class="asetpersen-rows" id="apRows"></div>
        <div class="asetpersen-row-actions">
          <button class="ghost-button" id="apAddRow" type="button">+ Tambah Nilai</button>
        </div>
        <button class="primary-button asetpersen-calc-btn" id="apHitung" type="button">Hitung Persentase</button>
      </div>
      <div class="asetpersen-output" id="apOutput">
        <p class="kalc-empty">Masukkan Total Aset dan minimal satu nilai bagian, lalu klik "Hitung Persentase".</p>
      </div>
    </div>
  `;
  analysisPanel.append(asetPersenSurface);
  initAsetPersenSimulator();

  // Simulator Average Down/Up Saham (Weighted Average)
  const avgSimSurface = document.createElement("section");
  avgSimSurface.className = "surface";
  avgSimSurface.innerHTML = `
    <div class="section-head compact">
      <h3>Average down / up</h3>
      <p>Hitung avg baru (weighted average) dari posisi sekarang dan rencana pembelian.</p>
    </div>
    <div class="avgsim-layout">
      <div class="avgsim-inputs">
        <div class="avgsim-field-group">
          <span class="avgsim-field-label">1. Posisi Sekarang</span>
          <label>
            Avg Sekarang (Rp)
            <input class="kalc-input" id="avgSimAvgNow" type="text" inputmode="numeric" placeholder="Contoh: 2.697" />
          </label>
          <label>
            1.1. Total Lot Sekarang
            <input class="kalc-input" id="avgSimLotNow" type="text" inputmode="numeric" placeholder="Contoh: 10" />
          </label>
        </div>
        <div class="avgsim-field-group">
          <span class="avgsim-field-label">2. Rencana Pembelian Baru</span>
          <label>
            Harga Lot yang Ingin Dibeli Sekarang (Rp)
            <input class="kalc-input" id="avgSimHargaBaru" type="text" inputmode="numeric" placeholder="Contoh: 2.500" />
          </label>
          <label>
            2.1. Total Lot yang Ingin Dibeli Sekarang
            <input class="kalc-input" id="avgSimLotBaru" type="text" inputmode="numeric" placeholder="Contoh: 5" />
          </label>
        </div>
        <button class="primary-button asetpersen-calc-btn" id="avgSimHitung" type="button">Hitung Average Baru</button>
        <p class="avgsim-error hidden" id="avgSimError"></p>
      </div>
      <div class="avgsim-output" id="avgSimOutput">
        <p class="kalc-empty">Isi keempat kolom di atas, lalu klik "Hitung Average Baru".</p>
      </div>
    </div>
  `;
  analysisPanel.append(avgSimSurface);
  initAvgDownUpSimulator();

  el.programActualSyncBanner = document.querySelector("#programActualSyncBanner");
  el.programActualSyncTitle = document.querySelector("#programActualSyncTitle");
  el.programActualSyncText = document.querySelector("#programActualSyncText");
  el.programActualSyncMeta = document.querySelector("#programActualSyncMeta");
  el.investmentActualMonthTitle = document.querySelector("#investmentActualMonthTitle");
  el.investmentActualMonthMeta = document.querySelector("#investmentActualMonthMeta");
  el.investmentActualBmri = document.querySelector("#investmentActualBmri");
  el.investmentActualIcbp = document.querySelector("#investmentActualIcbp");
  el.investmentActualBbri = document.querySelector("#investmentActualBbri");
  el.investmentActualRdpu = document.querySelector("#investmentActualRdpu");
  el.investmentActualTotal = document.querySelector("#investmentActualTotal");
  el.investmentActualUsed = document.querySelector("#investmentActualUsed");
  el.investmentSaveFeedback = document.querySelector("#investmentSaveFeedback");

  tabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-investment-tab-button]");
    if (!button) return;
    switchInvestmentTab(button.dataset.investmentTabButton);
  });

  stockToggles.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-stock-toggle]");
    if (!btn) return;
    const ticker = btn.dataset.stockToggle;
    const current = [...state.investments.activeStocks];
    const isActive = current.includes(ticker);
    if (isActive && current.length <= 1) return; // jaga minimal 1
    const next = isActive ? current.filter((s) => s !== ticker) : [...current, ticker];
    state.investments.activeStocks = next;
    saveState();
    renderInvestments();
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
    renderMarkToMarket();
    updateInvestmentStockChart();
  }
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

function renderStockToggles() {
  const group = document.querySelector("#stockToggleGroup");
  if (!group) return;
  const active = state.investments.activeStocks;
  group.querySelectorAll("[data-stock-toggle]").forEach((btn) => {
    const ticker = btn.dataset.stockToggle;
    const isActive = active.includes(ticker);
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
}

function renderInvestments() {
  state.investments = normalizeInvestments(state.investments);
  applySimulatorConfigToForm(state.investments.simulatorConfig);
  renderStockToggles();
  updateInvestmentSimulator({ persistConfig: false });
  renderInvestmentOptions();
  renderInvestmentTickers();
  updateMonthlyStrategyCalculator();
  renderInvestmentTables();
  renderInvestmentSummary();
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
  const pageEyebrow = document.querySelector("#pageEyebrow");
  if (pageEyebrow) {
    pageEyebrow.textContent = {
      dashboard: "Ringkasan arus kas",
      transactions: "Ledger transaksi",
      categories: "Klasifikasi akun",
      investments: "Portofolio & proyeksi",
      tools: "Backup & pengaturan",
    }[view];
  }
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
  [el.simBmriPriceChange, el.simIcbpPriceChange, el.simBbriPriceChange].forEach((input) => {
    input.addEventListener("blur", () => {
      input.value = String(clampNumber(readNumber(input, 5), -99, 1000));
      updateInvestmentSimulator();
    });
  });
  [el.simBmriMonthlyLots, el.simIcbpMonthlyLots, el.simBbriMonthlyLots].forEach((input) => {
    input.addEventListener("blur", () => {
      maybeDisconnectMonthlyStrategySync(input);
      input.value = String(readWholeLots(input, 0));
      updateInvestmentSimulator();
    });
  });
  document.querySelectorAll("[data-sim-lot-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const [bmriLots, icbpLots, bbriLots = 0] = button.dataset.simLotPreset.split("-").map((value) => Number(value));
      maybeDisconnectMonthlyStrategySync(el.simBmriMonthlyLots);
      el.simBmriMonthlyLots.value = String(bmriLots);
      el.simIcbpMonthlyLots.value = String(icbpLots);
      el.simBbriMonthlyLots.value = String(bbriLots);
      updateInvestmentSimulator();
    });
  });
  if (el.simPassiveTarget) {
    el.simPassiveTarget.addEventListener("input", () => {
      el.simPassiveTarget.value = formatNumberInput(el.simPassiveTarget.value);
    });
  }
  el.simSaveScenarioA?.addEventListener("click", () => {
    const inputs = readSimulationInputs();
    const result = simulateInvestment(inputs);
    state.investments.simulatorConfig = {
      ...normalizeSimulatorConfig(state.investments.simulatorConfig),
      savedScenario: scenarioSnapshot(result, inputs),
    };
    saveState();
    schedulePersistInvestmentSettings();
    renderScenarioCompare(result, inputs);
  });
  el.simClearScenarioA?.addEventListener("click", () => {
    state.investments.simulatorConfig = {
      ...normalizeSimulatorConfig(state.investments.simulatorConfig),
      savedScenario: null,
    };
    saveState();
    schedulePersistInvestmentSettings();
    renderScenarioCompare(simulateInvestment(readSimulationInputs()), readSimulationInputs());
  });
  el.investmentMarketPriceGrid?.addEventListener("input", (event) => {
    const input = event.target.closest("[data-market-ticker]");
    if (!input) return;
    input.value = formatNumberInput(input.value);
    const ticker = sanitizeTicker(input.dataset.marketTicker);
    const price = parseNumberInput(input.value);
    state.investments.marketPrices = { ...(state.investments.marketPrices || {}) };
    if (price > 0) state.investments.marketPrices[ticker] = price;
    else delete state.investments.marketPrices[ticker];
    saveState();
    schedulePersistInvestmentSettings();
    renderMarkToMarket();
  });
  el.investmentDividendAmount?.addEventListener("input", () => {
    el.investmentDividendAmount.value = formatNumberInput(el.investmentDividendAmount.value);
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
    el.monthlyStrategyBbriPrice,
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
  [el.monthlyStrategyBmriBaseLots, el.monthlyStrategyIcbpBaseLots, el.monthlyStrategyBbriBaseLots].forEach((input) => {
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
  el.monthlyStrategySaveLedger?.addEventListener("click", () => {
    saveMonthlyStrategyToLedger();
  });

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

  function enterStockEditMode(purchase) {
    editingStockPurchaseId = purchase.id;
    el.investmentStockTicker.value = purchase.ticker;
    el.investmentStockMonth.value = String(purchase.month);
    el.investmentStockYear.value = String(purchase.year);
    el.investmentStockLotPrice.value = String(purchase.lotPrice);
    el.investmentStockLots.value = String(purchase.lots);
    el.investmentStockSubmit.textContent = "Update Saham";
    el.investmentStockCancelEdit.hidden = false;
    el.investmentStockForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function exitStockEditMode() {
    editingStockPurchaseId = null;
    el.investmentStockForm.reset();
    el.investmentStockSubmit.textContent = "Simpan Saham";
    el.investmentStockCancelEdit.hidden = true;
  }

  function enterRdpuEditMode(purchase) {
    editingRdpuPurchaseId = purchase.id;
    el.investmentRdpuMonth.value = String(purchase.month);
    el.investmentRdpuYear.value = String(purchase.year);
    el.investmentRdpuAmount.value = String(purchase.amount);
    el.investmentRdpuSubmit.textContent = "Update RDPU";
    el.investmentRdpuCancelEdit.hidden = false;
    el.investmentRdpuForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function exitRdpuEditMode() {
    editingRdpuPurchaseId = null;
    el.investmentRdpuForm.reset();
    el.investmentRdpuSubmit.textContent = "Simpan RDPU";
    el.investmentRdpuCancelEdit.hidden = true;
  }

  function enterDividendEditMode(receipt) {
    editingDividendReceiptId = receipt.id;
    el.investmentDividendMonth.value = String(receipt.month);
    el.investmentDividendYear.value = String(receipt.year);
    el.investmentDividendAmount.value = formatNumberInput(receipt.amount);
    el.investmentDividendSubmit.textContent = "Update Dividen";
    el.investmentDividendCancelEdit.hidden = false;
    el.investmentDividendForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function exitDividendEditMode() {
    editingDividendReceiptId = null;
    el.investmentDividendForm.reset();
    el.investmentDividendSubmit.textContent = "Simpan Dividen";
    el.investmentDividendCancelEdit.hidden = true;
  }

  el.investmentStockForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lotPrice = parseNumberInput(el.investmentStockLotPrice.value);
    const lots = Math.floor(Number(el.investmentStockLots.value) || 0);
    if (!el.investmentStockTicker.value || lotPrice <= 0 || lots <= 0) {
      alert("Harga per lot dan jumlah lot harus lebih dari 0.");
      return;
    }

    const isEditing = Boolean(editingStockPurchaseId);
    const existing = isEditing
      ? state.investments.stockPurchases.find((item) => item.id === editingStockPurchaseId)
      : null;

    const purchase = {
      id: isEditing ? editingStockPurchaseId : uid("stock"),
      ticker: el.investmentStockTicker.value,
      month: Number(el.investmentStockMonth.value),
      year: Number(el.investmentStockYear.value),
      lotPrice,
      lots,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };

    if (isEditing) {
      state.investments.stockPurchases = state.investments.stockPurchases.map((item) =>
        item.id === purchase.id ? purchase : item,
      );
    } else {
      state.investments.stockPurchases.push(purchase);
    }

    exitStockEditMode();
    renderInvestments();
    showInvestmentSaveFeedback(purchase, "stock");
    try {
      await persistStockPurchase(purchase);
    } catch (error) {
      console.error(error);
      setSyncStatus(isEditing ? "Update pembelian saham cloud gagal" : "Simpan pembelian saham cloud gagal", "error");
    }
  });

  el.investmentStockCancelEdit.addEventListener("click", () => {
    exitStockEditMode();
  });

  el.investmentRdpuForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = parseNumberInput(el.investmentRdpuAmount.value);
    if (amount <= 0) {
      alert("Nominal RDPU harus lebih dari 0.");
      return;
    }

    const isEditing = Boolean(editingRdpuPurchaseId);
    const existing = isEditing
      ? state.investments.rdpuPurchases.find((item) => item.id === editingRdpuPurchaseId)
      : null;

    const purchase = {
      id: isEditing ? editingRdpuPurchaseId : uid("rdpu"),
      month: Number(el.investmentRdpuMonth.value),
      year: Number(el.investmentRdpuYear.value),
      amount,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };

    if (isEditing) {
      state.investments.rdpuPurchases = state.investments.rdpuPurchases.map((item) =>
        item.id === purchase.id ? purchase : item,
      );
    } else {
      state.investments.rdpuPurchases.push(purchase);
    }

    exitRdpuEditMode();
    renderInvestments();
    showInvestmentSaveFeedback(purchase, "rdpu");
    try {
      await persistRdpuPurchase(purchase);
    } catch (error) {
      console.error(error);
      setSyncStatus(isEditing ? "Update RDPU cloud gagal" : "Simpan RDPU cloud gagal", "error");
    }
  });

  el.investmentRdpuCancelEdit.addEventListener("click", () => {
    exitRdpuEditMode();
  });

  el.investmentDividendForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const amount = parseNumberInput(el.investmentDividendAmount.value);
    if (amount <= 0) {
      alert("Nominal dividen harus lebih dari 0.");
      return;
    }
    const isEditing = Boolean(editingDividendReceiptId);
    const existing = isEditing
      ? state.investments.dividendReceipts.find((item) => item.id === editingDividendReceiptId)
      : null;
    const receipt = {
      id: isEditing ? editingDividendReceiptId : uid("div"),
      month: Number(el.investmentDividendMonth.value),
      year: Number(el.investmentDividendYear.value),
      amount,
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };
    if (isEditing) {
      state.investments.dividendReceipts = state.investments.dividendReceipts.map((item) =>
        item.id === receipt.id ? receipt : item,
      );
    } else {
      state.investments.dividendReceipts.push(receipt);
    }
    exitDividendEditMode();
    renderInvestments();
    showInvestmentSaveFeedback(receipt, "rdpu");
    try {
      await persistDividendReceipt(receipt);
    } catch (error) {
      console.error(error);
      setSyncStatus(isEditing ? "Update dividen cloud gagal" : "Simpan dividen cloud gagal", "error");
    }
  });

  el.investmentDividendCancelEdit?.addEventListener("click", () => {
    exitDividendEditMode();
  });

  el.investmentDividendTable?.addEventListener("click", async (event) => {
    const editId = event.target.dataset.editDividendReceipt;
    if (editId) {
      const receipt = state.investments.dividendReceipts.find((item) => item.id === editId);
      if (receipt) enterDividendEditMode(receipt);
      return;
    }
    const id = event.target.dataset.deleteDividendReceipt;
    if (!id) return;
    if (editingDividendReceiptId === id) exitDividendEditMode();
    state.investments.dividendReceipts = state.investments.dividendReceipts.filter((item) => item.id !== id);
    renderInvestments();
    try {
      await deleteDividendReceiptRemote(id);
    } catch (error) {
      console.error(error);
      setSyncStatus("Hapus dividen cloud gagal", "error");
    }
  });

  el.investmentStockTable.addEventListener("click", async (event) => {
    const editId = event.target.dataset.editStockPurchase;
    if (editId) {
      const purchase = state.investments.stockPurchases.find((item) => item.id === editId);
      if (purchase) enterStockEditMode(purchase);
      return;
    }

    const id = event.target.dataset.deleteStockPurchase;
    if (!id) return;

    if (editingStockPurchaseId === id) exitStockEditMode();
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
    const editId = event.target.dataset.editRdpuPurchase;
    if (editId) {
      const purchase = state.investments.rdpuPurchases.find((item) => item.id === editId);
      if (purchase) enterRdpuEditMode(purchase);
      return;
    }

    const id = event.target.dataset.deleteRdpuPurchase;
    if (!id) return;

    if (editingRdpuPurchaseId === id) exitRdpuEditMode();
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
