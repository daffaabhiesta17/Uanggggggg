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
  },
  taxTransactions: [],
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
  simDividendPurchaseTableWrap: document.querySelector("#simDividendPurchaseTableWrap"),
  simDividendPurchaseTable: document.querySelector("#simDividendPurchaseTable"),
  simDividendPurchaseEmpty: document.querySelector("#simDividendPurchaseEmpty"),
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
  investmentStockTotal: document.querySelector("#investmentStockTotal"),
  investmentLotTotal: document.querySelector("#investmentLotTotal"),
  investmentRdpuTotal: document.querySelector("#investmentRdpuTotal"),
  investmentPortfolioTotal: document.querySelector("#investmentPortfolioTotal"),
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
  taxForm: document.querySelector("#taxForm"),
  taxTahunPajak: document.querySelector("#taxTahunPajak"),
  taxJenis: document.querySelector("#taxJenis"),
  taxDynamicFields: document.querySelector("#taxDynamicFields"),
  taxDividenEmiten: document.querySelector("#taxDividenEmiten"),
  taxDividenBruto: document.querySelector("#taxDividenBruto"),
  taxDividenReinvest: document.querySelector("#taxDividenReinvest"),
  taxDividenReinvestField: document.querySelector("#taxDividenReinvestField"),
  taxDividenReinvestNominal: document.querySelector("#taxDividenReinvestNominal"),
  taxLNEtf: document.querySelector("#taxLNEtf"),
  taxLNBruto: document.querySelector("#taxLNBruto"),
  taxLNKurs: document.querySelector("#taxLNKurs"),
  taxLNReinvest: document.querySelector("#taxLNReinvest"),
  taxLNReinvestField: document.querySelector("#taxLNReinvestField"),
  taxLNReinvestNominal: document.querySelector("#taxLNReinvestNominal"),
  taxJualJenis: document.querySelector("#taxJualJenis"),
  taxJualAset: document.querySelector("#taxJualAset"),
  taxJualHargaBeli: document.querySelector("#taxJualHargaBeli"),
  taxJualHargaJual: document.querySelector("#taxJualHargaJual"),
  taxJualUnit: document.querySelector("#taxJualUnit"),
  taxJualKurs: document.querySelector("#taxJualKurs"),
  taxJualKursField: document.querySelector("#taxJualKursField"),
  taxResult: document.querySelector("#taxResult"),
  taxResultHeader: document.querySelector("#taxResultHeader"),
  taxResultBody: document.querySelector("#taxResultBody"),
  taxHistoryTable: document.querySelector("#taxHistoryTable"),
  taxHistoryEmpty: document.querySelector("#taxHistoryEmpty"),
  taxCalculatorSurface: document.querySelector("#taxCalculatorSurface"),
  taxReinvestList: document.querySelector("#taxReinvestList"),
  taxAddAllocation: document.querySelector("#taxAddAllocation"),
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
      taxTransactions: Array.isArray(parsed.taxTransactions) ? parsed.taxTransactions : [],
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
    taxTransactions: Array.isArray(snapshot.taxTransactions) ? snapshot.taxTransactions : [],
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
      .on("postgres_changes", { event: "*", schema: "public", table: "tax_transactions" }, refreshFromRemote)
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
    taxTransactions: state.taxTransactions,
  };
  await loadRemoteInvestments(localInvestments);
  await loadRemoteTax();
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
          activeStocks: (settingsResult.data?.simulator_config || state.investments.simulatorConfig)?.activeStocks
            || state.investments.activeStocks,
          tickers: tickersResult.data.map(fromDbInvestmentTicker),
          stockPurchases: stockResult.data.map(fromDbStockPurchase),
          rdpuPurchases: rdpuResult.data.map(fromDbRdpuPurchase),
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
  await syncTaxToRemote();
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

// ============================================================
// TAX TRANSACTIONS - SUPABASE HELPERS
// ============================================================

function toDbTaxTransaction(t) {
  return {
    id: t.id,
    transaction_type: t.transactionType,
    tahun_pajak: t.tahunPajak,
    data: t.data || {},
    hasil: t.hasil || {},
    created_at: t.createdAt || new Date().toISOString(),
  };
}

function fromDbTaxTransaction(t) {
  return {
    id: t.id,
    transactionType: t.transaction_type,
    tahunPajak: t.tahun_pajak,
    data: t.data || {},
    hasil: t.hasil || {},
    createdAt: t.created_at,
  };
}

async function persistTaxTransaction(transaction) {
  saveState();
  if (!remoteStore.enabled) return;
  const { error } = await remoteStore.client.from("tax_transactions").upsert(toDbTaxTransaction(transaction));
  if (error) throw error;
}

async function deleteTaxTransactionRemote(id) {
  saveState();
  if (!remoteStore.enabled) return;
  const { error } = await remoteStore.client.from("tax_transactions").delete().eq("id", id);
  if (error) throw error;
}

async function syncTaxToRemote() {
  saveState();
  if (!remoteStore.enabled) return;
  if (state.taxTransactions.length) {
    const { error } = await remoteStore.client
      .from("tax_transactions")
      .upsert(state.taxTransactions.map(toDbTaxTransaction));
    if (error) throw error;
  }
}

async function loadRemoteTax() {
  if (!remoteStore.enabled) return;
  try {
    const { data, error } = await remoteStore.client
      .from("tax_transactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const remoteTax = (data || []).map(fromDbTaxTransaction);
    if (remoteTax.length > 0) {
      state.taxTransactions = remoteTax;
      saveState();
    }
  } catch (error) {
    if (!isMissingInvestmentTableError(error)) {
      console.warn("Tax cloud sync disabled:", error);
    }
  }
}

async function resetTaxRemoteData() {
  saveState();
  if (!remoteStore.enabled) return;
  const { error } = await remoteStore.client.from("tax_transactions").delete().neq("id", "__never__");
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

  const taxResult = await remoteStore.client.from("tax_transactions").delete().neq("id", "__never__");
  if (taxResult.error) throw taxResult.error;

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

function actualInvestmentForSimulationMonth(calendarMonth, calendarYear) {
  const active = state.investments.activeStocks;
  const stockPurchases = state.investments.stockPurchases.filter(
    (purchase) => purchase.month === calendarMonth && purchase.year === calendarYear,
  );
  const rdpuPurchases = state.investments.rdpuPurchases.filter(
    (purchase) => purchase.month === calendarMonth && purchase.year === calendarYear,
  );
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
  applyActiveStocksToForm();
}

function saveSimulatorConfigFromInputs() {
  const inputs = readSimulationInputs();
  state.investments.simulatorConfig = normalizeSimulatorConfig({
    ...inputs,
    activeStocks: state.investments.activeStocks,
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
    const dividendThisMonth = bmriDividend + icbpDividend + bbriDividend;
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

    totalDividends += dividendThisMonth;
    totalContribution += monthlyContribution;
    annualDividends += dividendThisMonth;
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
            <small>${row.periodLabel}${row.actualMonths ? ` - ${row.actualMonths} bulan aktual Program 2` : ""}</small>
          </td>
          <td>${formatAnnualActualPurchase(row)}</td>
          <td>${formatMoney(row.totalContribution)}</td>
          <td>${formatMoney(row.bmriPrice)}</td>
          <td>${row.bmriLots.toLocaleString("id-ID")} lot</td>
          <td>${formatMoney(row.icbpPrice)}</td>
          <td>${row.icbpLots.toLocaleString("id-ID")} lot</td>
          <td>${formatMoney(row.bbriPrice)}</td>
          <td>${row.bbriLots.toLocaleString("id-ID")} lot</td>
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
    (row) => row.dividendBmriLots + row.dividendIcbpLots + row.dividendBbriLots > 0 || row.actualMonths > 0,
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
  renderTaxHistory();
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

function updateMonthlyStrategyCalculator() {
  const inputs = readMonthlyStrategyInputs();
  el.monthlyStrategyIndicatorPanel.classList.toggle("hidden", !inputs.useIndicator);
  el.monthlyStrategyExtraPanel.classList.toggle("hidden", !inputs.useExtra);
  el.monthlyStrategyIndicatorResults.forEach((item) => item.classList.toggle("hidden", !inputs.useIndicator));
  el.monthlyStrategyExtraResults.forEach((item) => item.classList.toggle("hidden", !inputs.useExtra));
  el.monthlyStrategyDividendResults.forEach((item) => item.classList.toggle("hidden", !inputs.useDividend));

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
  const dividendIcbpLots = dividendRecommendation.icbpLots;
  const dividendBmriLots = dividendRecommendation.bmriLots;
  const dividendBbriLots = dividendRecommendation.bbriLots;
  const dividendStockCost = dividendRecommendation.stockCost;
  const extraLeftoverToRdpu = Math.max(0, dividendRecommendation.leftover);
  const totalRdpuThisMonth = netRdpu + extraLeftoverToRdpu;
  const totalBmriLots = boughtBmriBaseLots + extraBmriLots + dividendBmriLots;
  const totalIcbpLots = boughtIcbpBaseLots + dividendIcbpLots;
  const totalBbriLots = boughtBbriBaseLots + dividendBbriLots;
  totalStockAmount = baseStockAmount + extraBmriCost + dividendStockCost;

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

function renderKalkulatorPorsi() {
  const sahamInput = document.querySelector("#kalcSaham");
  const etfInput   = document.querySelector("#kalcEtf");
  const output     = document.querySelector("#kalcOutput");
  if (!sahamInput || !etfInput || !output) return;

  const saham = parseRibuanInput(sahamInput.value);
  const etf   = parseRibuanInput(etfInput.value);
  const total = saham + etf;

  if (total <= 0) {
    output.innerHTML = '<p class="kalc-empty">Masukkan nilai untuk melihat hasil.</p>';
    return;
  }

  const sahamPct = (saham / total) * 100;
  const etfPct   = (etf   / total) * 100;

  function fmt(val) {
    return val.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
  }

  function fmtShort(val) {
    if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
    if (val >= 1_000_000)     return `Rp ${(val / 1_000_000).toFixed(0)} Juta`;
    if (val >= 1_000)         return `Rp ${(val / 1_000).toFixed(0)} Ribu`;
    return fmt(val);
  }

  const sahamShort = fmtShort(saham);
  const etfShort   = fmtShort(etf);
  const totalShort = fmtShort(total);

  output.innerHTML = `
    <div class="kalc-result-block">
      <p class="kalc-line">Nilai Saham&nbsp;&nbsp;&nbsp;: <strong>${fmt(saham)}</strong></p>
      <p class="kalc-line">Nilai ETF&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>${fmt(etf)}</strong></p>
      <p class="kalc-line kalc-total">Total Portofolio = <strong>${fmt(total)}</strong></p>
    </div>
    <div class="kalc-formula-block">
      <p class="kalc-formula-title">Rumus persentase:</p>
      <p class="kalc-formula">
        % Saham = (${sahamShort} / ${totalShort}) × 100%
        = <strong>${sahamPct.toFixed(2).replace(".", ",")}%</strong>
      </p>
      <p class="kalc-formula">
        % ETF = (${etfShort} / ${totalShort}) × 100%
        = <strong>${etfPct.toFixed(2).replace(".", ",")}%</strong>
      </p>
    </div>
    <div class="kalc-bar-section">
      <div class="kalc-bar-row">
        <span>Saham</span>
        <div class="kalc-track">
          <div class="kalc-fill kalc-fill-saham" style="width:${Math.min(sahamPct,100).toFixed(1)}%"></div>
        </div>
        <span class="kalc-pct">${sahamPct.toFixed(1).replace(".", ",")}%</span>
      </div>
      <div class="kalc-bar-row">
        <span>ETF</span>
        <div class="kalc-track">
          <div class="kalc-fill kalc-fill-etf" style="width:${Math.min(etfPct,100).toFixed(1)}%"></div>
        </div>
        <span class="kalc-pct">${etfPct.toFixed(1).replace(".", ",")}%</span>
      </div>
    </div>
  `;
}

function initKalkulatorPorsi() {
  const inputs = document.querySelectorAll(".kalc-input");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      // Format ribuan saat mengetik
      const raw = parseRibuanInput(input.value);
      const pos  = input.selectionStart;
      const oldLen = input.value.length;
      if (raw > 0) {
        input.value = formatRibuan(raw);
        // Jaga posisi cursor
        const newLen = input.value.length;
        input.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
      } else {
        input.value = "";
      }
      renderKalkulatorPorsi();
    });
  });
  renderKalkulatorPorsi();
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
// SIMULASI PAJAK - LOGIKA & RENDER
// ============================================================

function taxJenisLabel(jenis) {
  const labels = {
    dividen_domestik: "Dividen Saham Lokal (Stockbit - Rupiah)",
    dividen_ln: "Dividen ETF Luar Negeri (Pluang - USD)",
    penjualan: "Penjualan Saham/ETF (Capital Gain/Loss)",
  };
  return labels[jenis] || jenis;
}

function formatTaxDate(iso) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso));
}

function formatTaxCurrency(value) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);
}

function calculatePajakDividenDomestik(data) {
  const { emiten, bruto, reinvestYa, reinvestList } = data;
  const totalBruto = Math.max(0, bruto);
  const list = Array.isArray(reinvestList) ? reinvestList : [];
  const namaAsetDinamis = [];

  const totalReinvested = reinvestYa
    ? totalBruto
    : Math.min(list.reduce((sum, item) => {
        const nominal = Number(item.nominal) || 0;
        if (nominal > 0 && item.name && item.name.trim()) {
          namaAsetDinamis.push(item.name.trim());
        }
        return sum + nominal;
      }, 0), totalBruto);
  const sisaKenaPajak = Math.max(0, totalBruto - totalReinvested);
  const pajakTerutang = sisaKenaPajak * 0.1;

  const asetDisplay = reinvestYa
    ? emiten || "-"
    : namaAsetDinamis.length > 0
      ? namaAsetDinamis.join(', ')
      : emiten || "-";

  return {
    jenis: "dividen_domestik",
    aset: asetDisplay,
    namaAsetDinamis,
    aplikasi: "Stockbit",
    nominalAsli: totalBruto,
    mataUang: "IDR",
    bebasPajak: reinvestYa ? totalBruto : totalReinvested,
    kenaPajak: sisaKenaPajak,
    pajakTerutang,
    reinvestYa,
    reinvestList: list.filter((item) => item.nominal > 0),
    detail: {
      totalBruto,
      totalReinvested,
      sisaKenaPajak,
      pajakTerutang,
      reinvestList: list.filter((item) => item.nominal > 0),
      holdingUntil: reinvestYa ? `31 Desember ${(data.tahunPajak || new Date().getFullYear()) + 3}` : "-",
      kodeBilling: sisaKenaPajak > 0 ? "411128-419" : null,
    },
    panduan: {
      epelaporan: reinvestYa
        ? { jenisPenghasilan: "Dividen Dalam Negeri", pemberiPenghasilan: emiten || "Emiten", jumlahDiinvestasikan: totalBruto }
        : { jenisPenghasilan: "Dividen Dalam Negeri", pemberiPenghasilan: emiten || "Emiten", jumlahDiinvestasikan: totalReinvested },
      spt: reinvestYa
        ? { lampiran: "L-2 Bagian B", nominal: totalBruto }
        : { lampiran: "L-1", nominal: sisaKenaPajak },
      kodeBilling: sisaKenaPajak > 0 ? { kode: "411128-419", nominal: pajakTerutang } : null,
    },
  };
}

function calculatePajakDividenLN(data) {
  const { etf, brutoUsd, kursKmk, reinvestYa } = data;
  const totalBrutoUsd = Math.max(0, brutoUsd);
  const kurs = Math.max(0, kursKmk);
  const totalBrutoIdr = totalBrutoUsd * kurs;
  const pajakAS = totalBrutoUsd * 0.15;
  const pajakASIdr = pajakAS * kurs;
  const dividenBersihIdr = totalBrutoIdr - pajakASIdr;
  const netDividenIdr = Math.max(0, dividenBersihIdr);

  if (reinvestYa) {
    return {
      jenis: "dividen_ln",
      aset: etf || "ETF",
      aplikasi: "Pluang",
      nominalAsli: totalBrutoUsd,
      mataUang: "USD",
      bebasPajak: netDividenIdr,
      kenaPajak: 0,
      pajakTerutang: 0,
      reinvestYa: true,
      detail: {
        totalBrutoUsd,
        kurs,
        totalBrutoIdr,
        pajakAS,
        pajakASIdr,
        dividenBersihIdr: netDividenIdr,
        totalReinvested: netDividenIdr,
        kenaPajakNonFinal: 0,
        kreditPPh24: false,
        holdingUntil: `31 Desember ${(data.tahunPajak || new Date().getFullYear()) + 3}`,
      },
      panduan: {
        epelaporan: {
          jenisPenghasilan: "Dividen Luar Negeri",
          pemberiPenghasilan: `${etf || "Vanguard Information Technology ETF (VGT)"}`,
          jumlahDiinvestasikan: netDividenIdr,
        },
        spt: { lampiran: "L-2 Bagian B (Penghasilan Tidak Termasuk Objek Pajak)", nominal: netDividenIdr },
        kodeBilling: null,
        kreditPajak: null,
      },
    };
  }

  return {
    jenis: "dividen_ln",
    aset: etf || "ETF",
    aplikasi: "Pluang",
    nominalAsli: totalBrutoUsd,
    mataUang: "USD",
    bebasPajak: 0,
    kenaPajak: netDividenIdr,
    pajakTerutang: 0,
    reinvestYa: false,
    detail: {
      totalBrutoUsd,
      kurs,
      totalBrutoIdr,
      pajakAS,
      pajakASIdr,
      dividenBersihIdr: netDividenIdr,
      totalReinvested: 0,
      kenaPajakNonFinal: netDividenIdr,
      kreditPPh24: true,
      holdingUntil: "-",
    },
    panduan: {
      epelaporan: null,
      spt: { lampiran: "L-2 Bagian C (Penghasilan Neto Luar Negeri)", nominal: netDividenIdr },
      kodeBilling: null,
      kreditPajak: { jenis: "PPh Pasal 24", nominal: pajakASIdr },
    },
  };
}

function calculatePajakPenjualan(data) {
  const { jenisAset, namaAset, hargaBeli, hargaJual, unit, kursKmk } = data;
  const totalBeli = Math.max(0, hargaBeli) * Math.max(0, unit);
  const totalJual = Math.max(0, hargaJual) * Math.max(0, unit);
  const kurs = Math.max(0, kursKmk || 1);

  if (jenisAset === "saham_lokal") {
    const capitalGain = totalJual - totalBeli;
    const pajakFinal = totalJual * 0.001;

    return {
      jenis: "penjualan",
      aset: namaAset || "-",
      aplikasi: "Stockbit",
      nominalAsli: totalJual,
      mataUang: "IDR",
      bebasPajak: 0,
      kenaPajak: capitalGain,
      pajakTerutang: pajakFinal,
      reinvestYa: false,
      detail: {
        jenisAset: "Saham Lokal",
        totalBeli,
        totalJual,
        capitalGain,
        pajakFinal,
        keterangan: "PPh Final 0,1% langsung dipotong otomatis oleh sekuritas saat transaksi.",
        sudahDipungut: true,
      },
      panduan: {
        epelaporan: null,
        spt: { lampiran: "L-1 (Bersifat Final)", nominal: totalJual },
        kodeBilling: null,
      },
    };
  }

  const totalBeliIdr = totalBeli * kurs;
  const totalJualIdr = totalJual * kurs;
  const capitalGainIdr = totalJualIdr - totalBeliIdr;
  const isLoss = capitalGainIdr < 0;
  const lossAmount = isLoss ? Math.abs(capitalGainIdr) : 0;
  const capitalGainTaxable = isLoss ? 0 : capitalGainIdr;

  return {
    jenis: "penjualan",
    aset: namaAset || "-",
    aplikasi: "Pluang",
    nominalAsli: totalJual,
    mataUang: "USD",
    bebasPajak: 0,
    kenaPajak: capitalGainTaxable,
    pajakTerutang: 0,
    reinvestYa: false,
    detail: {
      jenisAset: "ETF Luar Negeri",
      totalBeli,
      totalJual,
      kurs,
      totalBeliIdr,
      totalJualIdr,
      capitalGainIdr,
      isLoss,
      lossAmount,
      capitalGainTaxable,
      keterangan: isLoss
        ? "Capital Loss (Rugi). Kerugian aset luar negeri tidak dikenakan pajak dan tidak dapat mengurangi penghasilan dalam negeri."
        : "Capital Gain Non-Final. Digabungkan ke Pendapatan Progresif PPh Pasal 17 di akhir tahun.",
    },
    panduan: {
      epelaporan: null,
      spt: isLoss
        ? { lampiran: "L-2 Bagian C", nominal: 0, skip: true, pesan: "Transaksi rugi ini TIDAK PERLU dimasukkan ke Lampiran L-2 Bagian C. Biarkan kolom Penghasilan Neto Luar Negeri bernilai Rp 0 (tidak perlu tambah baris baru)." }
        : { lampiran: "L-2 Bagian C", nominal: capitalGainTaxable },
      kodeBilling: null,
    },
  };
}

function calculateTax(formData) {
  switch (formData.jenis) {
    case "dividen_domestik":
      return calculatePajakDividenDomestik(formData);
    case "dividen_ln":
      return calculatePajakDividenLN(formData);
    case "penjualan":
      return calculatePajakPenjualan(formData);
    default:
      return null;
  }
}

function readTaxForm() {
  const jenis = el.taxJenis.value;
  const tahunPajak = Number(el.taxTahunPajak.value) || new Date().getFullYear();
  const base = { jenis, tahunPajak };

  if (jenis === "dividen_domestik") {
    const reinvestRows = el.taxReinvestList.querySelectorAll(".allocation-row");
    const reinvestList = [];
    reinvestRows.forEach((row) => {
      const name = row.querySelector(".alloc-name-input")?.value?.trim();
      const nominal = parseNumberInput(row.querySelector(".alloc-nominal-input")?.value);
      if (name || nominal > 0) {
        reinvestList.push({ name: name || "-", nominal });
      }
    });
    return {
      ...base,
      emiten: el.taxDividenEmiten.value.trim(),
      bruto: parseNumberInput(el.taxDividenBruto.value),
      reinvestYa: el.taxDividenReinvest.checked,
      reinvestList,
    };
  }

  if (jenis === "dividen_ln") {
    return {
      ...base,
      etf: el.taxLNEtf.value.trim(),
      brutoUsd: parseDecimalInput(el.taxLNBruto.value),
      kursKmk: parseDecimalInput(el.taxLNKurs.value),
      reinvestYa: el.taxLNReinvest.checked,
    };
  }

  if (jenis === "penjualan") {
    return {
      ...base,
      jenisAset: el.taxJualJenis.value,
      namaAset: el.taxJualAset.value.trim(),
      hargaBeli: parseNumberInput(el.taxJualHargaBeli.value),
      hargaJual: parseNumberInput(el.taxJualHargaJual.value),
      unit: Math.max(0, Math.floor(Number(el.taxJualUnit.value) || 0)),
      kursKmk: parseNumberInput(el.taxJualKurs.value),
    };
  }

  return base;
}

function renderTaxResult(hasil) {
  const tahun = hasil.data?.tahunPajak || new Date().getFullYear();
  const d = hasil.detail;
  const p = hasil.panduan;

  let headerText = `[HASIL SIMULASI PAJAK - TAHUN PAJAK ${tahun}]`;

  let bodyHtml = "";

  const asetDisplay = hasil.jenis === "dividen_domestik" && hasil.namaAsetDinamis?.length > 0
    ? hasil.namaAsetDinamis.join(', ')
    : hasil.aset;

  bodyHtml += `
    <div class="tax-result-section">
      <span class="tax-label">1. Rangkuman Transaksi</span>
      <div class="tax-note">
        <div><strong>Jenis Transaksi:</strong> ${taxJenisLabel(hasil.jenis)}</div>
        <div><strong>Aset & Aplikasi:</strong> ${asetDisplay} di ${hasil.aplikasi}</div>
        <div><strong>Nominal Asli:</strong> ${hasil.nominalAsli.toLocaleString("id-ID")} ${hasil.mataUang}</div>
      </div>
    </div>`;

  let statusHtml = `
    <div class="tax-result-section">
      <span class="tax-label">2. Status Pajak & Perhitungan</span>
      <div class="tax-note">`;

  if (hasil.jenis === "dividen_domestik") {
    const reinvestItems = d.reinvestList || [];
    statusHtml += `<div><strong>Total Dividen Bruto:</strong> ${formatTaxCurrency(d.totalBruto)}</div>`;
    if (d.reinvestYa) {
      statusHtml += `
        <div class="tax-success">Reinvestasi Seluruhnya (Bebas Pajak 0%): ${formatTaxCurrency(hasil.bebasPajak)}</div>
        <div class="tax-success">Tarif 0% (Bebas Pajak). Wajib ditahan 3 tahun s.d ${d.holdingUntil}.</div>
        <div class="tax-note">Lapor di Form LA.39-10 & SPT Tahunan Lampiran L-2 Bagian B.</div>`;
    } else {
      statusHtml += `<div class="tax-success">Rincian Reinvestasi (Bebas Pajak 0%):</div>`;
      if (reinvestItems.length > 0) {
        reinvestItems.forEach((item) => {
          statusHtml += `<div class="tax-note" style="margin-left: 1rem">* ${item.name}: ${formatTaxCurrency(item.nominal)}</div>`;
        });
      }
      statusHtml += `
        <div class="tax-success">Total Dana Terselamatkan: ${formatTaxCurrency(d.totalReinvested)}</div>`;
      if (d.sisaKenaPajak > 0) {
        statusHtml += `
          <div class="tax-warning">Porsi Tidak Direinvestasikan (Kena Pajak 10%): ${formatTaxCurrency(d.sisaKenaPajak)}</div>
          <div class="tax-warning">Pajak Terutang Mandiri (PPh Final 4 ayat 2): ${formatTaxCurrency(hasil.pajakTerutang)}</div>
          ${d.kodeBilling ? `<div class="tax-note">Bayar via kode billing <strong>${d.kodeBilling}</strong> sebesar ${formatTaxCurrency(hasil.pajakTerutang)}</div>` : ""}`;
      } else {
        statusHtml += `<div class="tax-success">Seluruh dividen dialokasikan, tidak ada sisa kena pajak.</div>`;
      }
    }
  } else if (hasil.jenis === "dividen_ln") {
    statusHtml += `
      <div><strong>Bruto:</strong> $${d.totalBrutoUsd.toFixed(2)} (${formatTaxCurrency(d.totalBrutoIdr)})</div>
      <div><strong>Withholding Tax AS 15%:</strong> $${d.pajakAS.toFixed(2)} (${formatTaxCurrency(d.pajakASIdr)})</div>`;
    if (d.reinvestYa) {
      statusHtml += `
        <div class="tax-success">Status Pajak: <strong>Bebas Pajak 0% (Fasilitas UU Cipta Kerja)</strong></div>
        <div class="tax-success">Pajak Terutang Indonesia: <strong>Rp 0</strong></div>
        <div class="tax-warning">Pajak AS 15% ($${d.pajakAS.toFixed(2)} / ${formatTaxCurrency(d.pajakASIdr)}) <strong>TIDAK DAPAT DIKREDITKAN</strong> sebagai PPh Pasal 24 karena dividen di NKRI sudah bebas pajak.</div>
        <div class="tax-note">Holding period s.d ${d.holdingUntil}.</div>`;
    } else {
      statusHtml += `
        <div class="tax-warning">Status Pajak: <strong>Objek Pajak Non-Final (Tarif Progresif PPh Pasal 17)</strong></div>
        <div class="tax-warning">Pajak Terutang Indonesia: Dihitung di akhir tahun digabung gaji</div>
        <div class="tax-success">Pajak AS 15% ($${d.pajakAS.toFixed(2)} / ${formatTaxCurrency(d.pajakASIdr)}) <strong>DAPAT DIKREDITKAN</strong> sebagai pengurang pajak PPh Pasal 24 di formulir induk.</div>`;
    }
  } else if (hasil.jenis === "penjualan") {
    if (d.jenisAset === "Saham Lokal") {
      statusHtml += `
        <div><strong>Total Jual:</strong> ${formatTaxCurrency(d.totalJual)}</div>
        <div><strong>Capital Gain:</strong> ${formatTaxCurrency(d.capitalGain)}</div>
        <div class="tax-warning">PPh Final 0,1%: ${formatTaxCurrency(d.pajakFinal)}</div>
        <div class="tax-note">${d.keterangan}</div>`;
    } else {
      statusHtml += `
        <div><strong>Total Jual (USD):</strong> $${d.totalJual.toFixed(2)}</div>
        <div><strong>Total Jual (IDR):</strong> ${formatTaxCurrency(d.totalJualIdr)} (kurs: ${d.kurs})</div>
        <div><strong>Total Beli (IDR):</strong> ${formatTaxCurrency(d.totalBeliIdr)}</div>`;
      if (d.isLoss) {
        statusHtml += `
        <div class="tax-warning">Status: Capital Loss (Rugi Bersih) sebesar ${formatTaxCurrency(d.lossAmount)}</div>
        <div class="tax-warning">Pajak Terutang di Indonesia: Rp 0</div>
        <div class="tax-note">${d.keterangan}</div>`;
      } else {
        statusHtml += `
        <div class="tax-warning">Capital Gain (Non-Final): ${formatTaxCurrency(d.capitalGainTaxable)}</div>
        <div class="tax-note">${d.keterangan}</div>`;
      }
    }
  }

  statusHtml += `</div></div>`;
  bodyHtml += statusHtml;

  let panduanHtml = `
    <div class="tax-result-section">
      <span class="tax-label">3. Panduan Pengisian di Coretax DJP</span>
      <div class="tax-note">`;

  const deadline = `31 Maret ${tahun + 1}`;

  if (hasil.jenis === "dividen_domestik" && !d.reinvestYa && d.reinvestList?.length > 0) {
    panduanHtml += `
      <div><strong>Menu Alur Kasus (e-Pelaporan - Sebelum ${deadline}):</strong></div>
      <div class="tax-warning">⚠ PENTING: Jangan gabungkan laporan! Di portal Coretax asli, buat baris permohonan baru satu per satu dengan mengklik "+ Tambah Data" untuk setiap emiten berikut:</div>`;
    d.reinvestList.forEach((item) => {
      const nama = item.name || "-";
      const nominal = Number(item.nominal) || 0;
      panduanHtml += `
      <div class="tax-note" style="margin-top: 4px">- Untuk Alokasi <strong>${escapeHtml(nama)}</strong>: Pilih Jenis Penghasilan "Dividen Dalam Negeri", isi kolom Pemberi Penghasilan dengan "<strong>${escapeHtml(nama)}</strong>", dan masukkan Jumlah Diinvestasikan sebesar <strong>${formatTaxCurrency(nominal)}</strong>.</div>`;
    });
    panduanHtml += `
      <div style="margin-top: 8px"><strong>Menu SPT Tahunan (Akhir Tahun):</strong></div>
      <div>Masukkan total <strong>${formatTaxCurrency(d.totalReinvested)}</strong> ke Lampiran L-2 Bagian B (Bebas Pajak).</div>`;
    if (d.sisaKenaPajak > 0) {
      panduanHtml += `
      <div>Masukkan nominal sisa <strong>${formatTaxCurrency(d.sisaKenaPajak)}</strong> ke Lampiran L-1 (Bersifat Final) dan lakukan pembayaran kode billing sebesar <strong>${formatTaxCurrency(d.pajakTerutang)}</strong>.</div>`;
    }
  } else if (hasil.jenis === "dividen_domestik") {
    if (p.epelaporan) {
      panduanHtml += `
      <div><strong>Menu Alur Kasus (e-Pelaporan - Sebelum ${deadline}):</strong></div>
      <div>Pilih Jenis Penghasilan: ${p.epelaporan.jenisPenghasilan}</div>
      <div>Pemberi Penghasilan: ${p.epelaporan.pemberiPenghasilan}</div>
      <div>Jumlah Diinvestasikan: ${formatTaxCurrency(p.epelaporan.jumlahDiinvestasikan)}</div>`;
    }
    if (p.spt) {
      panduanHtml += `
      <div style="margin-top: 6px"><strong>Menu SPT Tahunan (Akhir Tahun):</strong></div>
      <div>Masukkan ${formatTaxCurrency(p.spt.nominal)} ke Lampiran ${p.spt.lampiran}.</div>`;
    }
    if (p.kodeBilling) {
      panduanHtml += `
      <div style="margin-top: 6px"><strong>Status Kode Billing:</strong></div>
      <div>Gunakan Kode ${p.kodeBilling.kode} sebesar ${formatTaxCurrency(p.kodeBilling.nominal)}.</div>`;
    }
  } else if (hasil.jenis === "dividen_ln") {
    if (d.reinvestYa) {
      panduanHtml += `
      <div><strong>Menu Alur Kasus (e-Pelaporan - Sebelum ${deadline}):</strong></div>
      <div>- Pilih Jenis Penghasilan: Dividen Luar Negeri</div>
      <div>- Pemberi Penghasilan: ${p.epelaporan.pemberiPenghasilan}</div>
      <div>- Jumlah Diinvestasikan: Rp ${formatTaxCurrency(p.epelaporan.jumlahDiinvestasikan).replace('Rp ', '')}</div>
      <div style="margin-top: 6px"><strong>Menu SPT Tahunan (Akhir Tahun):</strong></div>
      <div>- Masukkan Rp ${formatTaxCurrency(p.spt.nominal).replace('Rp ', '')} ke Lampiran ${p.spt.lampiran}.</div>`;
    } else {
      panduanHtml += `
      <div><strong>Menu Alur Kasus (e-Pelaporan):</strong> Tidak perlu lapor (tidak direinvestasikan).</div>
      <div style="margin-top: 6px"><strong>Menu SPT Tahunan (Akhir Tahun):</strong></div>
      <div>- Masukkan Rp ${formatTaxCurrency(p.spt.nominal).replace('Rp ', '')} ke Lampiran ${p.spt.lampiran}.</div>
      <div>- Masukkan Kredit Pajak PPh Pasal 24 sebesar Rp ${formatTaxCurrency(p.kreditPajak.nominal).replace('Rp ', '')} pada Formulir Induk Bagian PPh Setor Sendiri.</div>`;
    }
  } else if (hasil.jenis === "penjualan" && d.isLoss) {
    panduanHtml += `
      <div><strong>Menu Alur Kasus (e-Pelaporan):</strong> Tidak perlu lapor realisasi (bukan dividen).</div>
      <div style="margin-top: 6px"><strong>Menu SPT Tahunan (Akhir Tahun):</strong></div>
      <div>${p.spt.pesan || "Transaksi tidak perlu dilaporkan."}</div>`;
  } else if (hasil.jenis === "penjualan") {
    panduanHtml += `
      <div><strong>Menu Alur Kasus (e-Pelaporan):</strong> Tidak perlu lapor realisasi (bukan dividen).</div>`;
    if (p.spt) {
      panduanHtml += `
      <div style="margin-top: 6px"><strong>Menu SPT Tahunan (Akhir Tahun):</strong></div>
      <div>Masukkan ${formatTaxCurrency(p.spt.nominal)} ke Lampiran ${p.spt.lampiran}.</div>`;
    }
  }

  if (p.kodeBilling && hasil.jenis !== "dividen_domestik") {
    panduanHtml += `
      <div style="margin-top: 6px"><strong>Status Kode Billing:</strong></div>
      <div>Gunakan Kode ${p.kodeBilling.kode} sebesar ${formatTaxCurrency(p.kodeBilling.nominal)}.</div>`;
  }

  panduanHtml += `</div></div>`;
  bodyHtml += panduanHtml;

  el.taxResultHeader.textContent = headerText;
  el.taxResultBody.innerHTML = bodyHtml;
  el.taxResult.classList.remove("hidden");
}

function renderTaxHistory() {
  const rows = state.taxTransactions || [];
  el.taxHistoryEmpty.classList.toggle("hidden", rows.length > 0);
  el.taxHistoryTable.innerHTML = rows
    .map(
      (t) => `
        <tr>
          <td>${formatTaxDate(t.createdAt)}</td>
          <td>${t.tahunPajak}</td>
          <td>${taxJenisLabel(t.transactionType)}</td>
          <td>${t.data?.aset || t.hasil?.aset || "-"}</td>
          <td>${formatTaxCurrency(t.hasil?.pajakTerutang || 0)}</td>
          <td>
            <div class="table-actions">
              <button class="icon-button" data-tax-view="${t.id}" type="button">Lihat</button>
              <button class="icon-button delete" data-tax-delete="${t.id}" type="button">Hapus</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function showTaxResultFromHistory(id) {
  const t = state.taxTransactions.find((item) => item.id === id);
  if (!t) return;
  renderTaxResult(t.hasil);
  el.taxResult.scrollIntoView({ behavior: "smooth", block: "center" });
}

function updateTaxFormVisibility() {
  const jenis = el.taxJenis.value;
  el.taxDynamicFields.querySelectorAll("[data-tax-group]").forEach((group) => {
    group.classList.toggle("hidden", group.dataset.taxGroup !== jenis);
  });
  el.taxDividenReinvestField.classList.toggle("hidden", !el.taxDividenReinvest.checked);
  el.taxLNReinvestField.classList.toggle("hidden", !el.taxLNReinvest.checked);
  el.taxJualKursField.classList.toggle("hidden", el.taxJualJenis.value !== "etf_ln");
  if (el.taxReinvestList) {
    el.taxReinvestList.innerHTML = "";
  }
}

function initTaxForm() {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => 2026 + i);
  el.taxTahunPajak.innerHTML = years.map((y) => `<option value="${y}" ${y === currentYear ? "selected" : ""}>${y}</option>`).join("");
  updateTaxFormVisibility();
  renderTaxHistory();
}

function setupTaxEvents() {
  el.taxJenis.addEventListener("change", updateTaxFormVisibility);
  el.taxDividenReinvest.addEventListener("change", () => {
    el.taxDividenReinvestField.classList.toggle("hidden", !el.taxDividenReinvest.checked);
  });
  el.taxLNReinvest.addEventListener("change", () => {
    el.taxLNReinvestField.classList.toggle("hidden", !el.taxLNReinvest.checked);
  });
  el.taxJualJenis.addEventListener("change", updateTaxFormVisibility);

  el.taxForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = readTaxForm();
    const hasil = calculateTax(formData);
    if (!hasil) {
      alert("Data transaksi tidak lengkap. Periksa kembali input Anda.");
      return;
    }
    hasil.data = formData;
    renderTaxResult(hasil);

    const transaction = {
      id: uid("tax"),
      transactionType: formData.jenis,
      tahunPajak: formData.tahunPajak,
      data: formData,
      hasil,
      createdAt: new Date().toISOString(),
    };

    state.taxTransactions.unshift(transaction);
    saveState();
    renderTaxHistory();

    try {
      await persistTaxTransaction(transaction);
    } catch (error) {
      console.error(error);
      setSyncStatus("Simpan pajak cloud gagal", "error");
    }
  });

  el.taxHistoryTable.addEventListener("click", async (event) => {
    const viewId = event.target.dataset.taxView;
    const deleteId = event.target.dataset.taxDelete;

    if (viewId) {
      showTaxResultFromHistory(viewId);
      return;
    }

    if (deleteId && confirm("Hapus simulasi pajak ini?")) {
      state.taxTransactions = state.taxTransactions.filter((t) => t.id !== deleteId);
      saveState();
      renderTaxHistory();
      try {
        await deleteTaxTransactionRemote(deleteId);
      } catch (error) {
        console.error(error);
        setSyncStatus("Hapus pajak cloud gagal", "error");
      }
    }
  });

  function createAllocationRow(nameVal, nominalVal) {
    const row = document.createElement("div");
    row.className = "allocation-row";
    row.innerHTML = `
      <label>
        Nama Instrumen/Aplikasi
        <input class="alloc-name-input" type="text" placeholder="Contoh: Beli saham lagi, ETF, Reksa Dana" value="${escapeHtml(nameVal || "")}" />
      </label>
      <label>
        Nominal (Rp)
        <input class="alloc-nominal-input" type="text" inputmode="numeric" placeholder="0" value="${nominalVal || ""}" />
      </label>
      <button class="icon-button alloc-delete-btn" type="button" title="Hapus alokasi">&times;</button>
    `;
    row.querySelector(".alloc-delete-btn").addEventListener("click", () => row.remove());
    row.querySelector(".alloc-nominal-input").addEventListener("input", function () {
      this.value = formatNumberInput(this.value);
    });
    return row;
  }

  el.taxAddAllocation.addEventListener("click", () => {
    const row = createAllocationRow("", "");
    el.taxReinvestList.append(row);
  });

  el.taxDividenBruto.addEventListener("input", () => {
    el.taxDividenBruto.value = formatNumberInput(el.taxDividenBruto.value);
  });
  el.taxLNReinvestNominal.addEventListener("input", () => {
    el.taxLNReinvestNominal.value = formatNumberInput(el.taxLNReinvestNominal.value);
  });
  el.taxJualHargaBeli.addEventListener("input", () => {
    el.taxJualHargaBeli.value = formatNumberInput(el.taxJualHargaBeli.value);
  });
  el.taxJualHargaJual.addEventListener("input", () => {
    el.taxJualHargaJual.value = formatNumberInput(el.taxJualHargaJual.value);
  });
  el.taxJualKurs.addEventListener("input", () => {
    el.taxJualKurs.value = formatNumberInput(el.taxJualKurs.value);
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
    <span class="stock-toggles-label">Saham Aktif</span>
    <div class="stock-toggle-group" id="stockToggleGroup">
      <button class="stock-toggle-btn active" data-stock-toggle="BMRI" type="button" aria-pressed="true">BMRI</button>
      <button class="stock-toggle-btn active" data-stock-toggle="ICBP" type="button" aria-pressed="true">ICBP</button>
      <button class="stock-toggle-btn active" data-stock-toggle="BBRI" type="button" aria-pressed="true">BBRI</button>
    </div>
    <small class="stock-toggles-hint">Minimal 1 saham aktif. Data saham non-aktif tetap tersimpan.</small>
  `;

  stack.insertBefore(stockToggles, stack.firstChild);

  const pajakPanel = document.createElement("div");
  pajakPanel.id = "investmentTabPajak";
  pajakPanel.className = "investment-tab-panel";
  pajakPanel.dataset.investmentTabPanel = "pajak";
  if (el.taxCalculatorSurface) {
    el.taxCalculatorSurface.classList.remove("hidden");
    pajakPanel.append(el.taxCalculatorSurface);
  }

  const tabs = document.createElement("nav");
  tabs.className = "investment-tabs";
  tabs.setAttribute("aria-label", "Sub-tab investasi");
  tabs.innerHTML = `
    <button class="active" data-investment-tab-button="simulator" type="button" aria-controls="investmentTabSimulator" aria-selected="true">
      Program 1: Proyeksi 180 Bulan
    </button>
    <button data-investment-tab-button="actual" type="button" aria-controls="investmentTabActual" aria-selected="false">
      Catatan Aktual
    </button>
    <button data-investment-tab-button="analysis" type="button" aria-controls="investmentTabAnalysis" aria-selected="false">
      Analisis Pembelian
    </button>
    <button data-investment-tab-button="pajak" type="button" aria-controls="investmentTabPajak" aria-selected="false">
      Simulasi Pajak
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
  const dividendSurface = el.simDividendPurchaseTableWrap?.closest(".surface");
  const divider = stack.querySelector(".investment-section-divider");
  const strategySurface = document.querySelector(".monthly-strategy-calculator")?.closest(".surface");
  const recordsSurface = document.querySelector(".investment-records-surface");
  stack.insertBefore(tabs, stack.firstElementChild);
  stack.append(simulatorPanel, actualPanel, analysisPanel, pajakPanel);
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

  // Rebalancing Calculator
  const rebalancingSurface = document.createElement("section");
  rebalancingSurface.className = "surface";
  rebalancingSurface.innerHTML = `
    <div class="surface-head">
      <div>
        <small>Analisis Portofolio</small>
        <strong>Kalkulator Komposisi Portofolio</strong>
      </div>
    </div>
    <p class="kalc-desc">Masukkan nilai saham dan ETF Anda untuk melihat total portofolio dan persentase masing-masing.</p>
    <div class="kalc-layout">
      <div class="kalc-inputs">
        <label>
          Nilai Saham (Rp)
          <input class="kalc-input" id="kalcSaham" type="text" inputmode="numeric" placeholder="Contoh: 40.000.000" />
        </label>
        <label>
          Nilai ETF (Rp)
          <input class="kalc-input" id="kalcEtf" type="text" inputmode="numeric" placeholder="Contoh: 60.000.000" />
        </label>
      </div>
      <div class="kalc-output" id="kalcOutput">
        <p class="kalc-empty">Masukkan nilai untuk melihat hasil.</p>
      </div>
    </div>
  `;
  analysisPanel.append(rebalancingSurface);
  initKalkulatorPorsi();

  // Simulator Persentase Aset
  const asetPersenSurface = document.createElement("section");
  asetPersenSurface.className = "surface";
  asetPersenSurface.innerHTML = `
    <div class="surface-head">
      <div>
        <small>Analisis Portofolio</small>
        <strong>Simulator Persentase Aset</strong>
      </div>
    </div>
    <p class="kalc-desc">Masukkan Total Aset dan rincian nilai per bagian untuk melihat persentase masing-masing terhadap total, lengkap dengan status kecocokan 100%.</p>
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
  activeInvestmentTab = ["simulator", "actual", "analysis", "pajak"].includes(tab) ? tab : "simulator";
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
  if (activeInvestmentTab === "pajak") {
    renderTaxHistory();
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
        await syncTaxToRemote();
      }
      initTaxForm();
      renderAll();
      alert("Import berhasil.");
    } catch (error) {
      alert(`Import gagal: ${error.message}`);
    } finally {
      el.importFile.value = "";
    }
  });

  setupTaxEvents();

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
initTaxForm();
renderAll();
initRemoteStore().then(renderAll);
