const STORAGE_KEY = "catatan-kas-v1";

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
      note: "Data contoh bisa dihapus.",
    },
    {
      id: "trx_demo_2",
      type: "expense",
      categoryId: "cat_food",
      title: "Contoh pengeluaran",
      amount: 125000,
      date: new Date().toISOString().slice(0, 10),
      note: "",
    },
  ],
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

let state = loadState();
let activeView = "dashboard";
let activeChartType = "income";
let transactionSelectionMode = false;
let selectedTransactionIds = new Set();
let chartBars = [];
let remoteStore = {
  enabled: false,
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
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed.categories) ? parsed.categories : defaultState.categories,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
    note: transaction.note || "",
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
      .subscribe();
  } catch (error) {
    console.error(error);
    remoteStore.enabled = false;
    setSyncStatus("Cloud gagal, mode lokal", "error");
  }
}

async function loadRemoteState() {
  const [categoriesResult, transactionsResult] = await Promise.all([
    remoteStore.client.from("categories").select("*").order("created_at", { ascending: true }),
    remoteStore.client.from("transactions").select("*").order("date", { ascending: false }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  state = {
    categories: categoriesResult.data.map(fromDbCategory),
    transactions: transactionsResult.data.map(fromDbTransaction),
  };
  saveState();
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

  saveState();
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
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
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
    .sort((a, b) => b.date.localeCompare(a.date));

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

function sortedTransactionsAscending() {
  return [...state.transactions].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.id.localeCompare(b.id);
  });
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

function switchView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((node) => node.classList.toggle("active", node.dataset.view === view));
  el.pageTitle.textContent = {
    dashboard: "Dashboard",
    transactions: "Transaksi",
    categories: "Tab & Jenis",
    tools: "Tools",
  }[view];
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
      savedTransaction = { id: editingId, ...payload };
      state.transactions = state.transactions.map((item) => (item.id === editingId ? savedTransaction : item));
    } else {
      savedTransaction = { id: uid("trx"), ...payload };
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
      state = imported;
      saveState();
      if (remoteStore.enabled) {
        await remoteStore.client.from("categories").upsert(state.categories.map(toDbCategory));
        await remoteStore.client.from("transactions").upsert(state.transactions.map(toDbTransaction));
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
      state = structuredClone(defaultState);
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
initEvents();
renderAll();
initRemoteStore().then(renderAll);
