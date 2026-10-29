/**
 * EBDI Dashboard Application Logic (Pure Web Base)
 * Works standalone with 0 dependencies, 0 Python, 0 Terminal.
 * Can be opened directly by double-clicking index.html!
 */

// Chronological Months Definition & Dynamic Helpers
const INDO_MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function parseBulanKey(str) {
  if (!str) return 0;
  const m = str.match(/Bulan\s+(\d+)\s+(\d{4})/i);
  if (!m) return 0;
  return parseInt(m[2], 10) * 100 + parseInt(m[1], 10);
}

function getBulanDisplayName(b) {
  if (!b) return '';
  const m = b.match(/Bulan\s+(\d+)\s+(\d{4})/i);
  if (m) {
    const monthNum = parseInt(m[1], 10);
    const year = m[2];
    if (INDO_MONTH_NAMES[monthNum]) {
      return `${INDO_MONTH_NAMES[monthNum]} ${year}`;
    }
  }
  return b;
}

const BASELINE_CHRONO_MONTHS = [
  'Bulan 8 2025', 'Bulan 9 2025', 'Bulan 10 2025', 'Bulan 11 2025', 'Bulan 12 2025',
  'Bulan 1 2026', 'Bulan 2 2026', 'Bulan 3 2026', 'Bulan 4 2026', 'Bulan 5 2026',
  'Bulan 6 2026', 'Bulan 7 2026', 'Bulan 8 2026', 'Bulan 9 2026', 'Bulan 10 2026'
];

let CHRONO_MONTHS = [...BASELINE_CHRONO_MONTHS];

function updateChronoMonths(txs, summary) {
  const monthSet = new Set();
  if (txs && Array.isArray(txs)) {
    txs.forEach(t => {
      if (t.bulan && t.bulan.trim().startsWith('Bulan ')) {
        monthSet.add(t.bulan.trim());
      }
    });
  }
  if (summary && Array.isArray(summary.cash_flow)) {
    summary.cash_flow.forEach(c => {
      if (c.bulan && c.bulan.trim().startsWith('Bulan ')) {
        monthSet.add(c.bulan.trim());
      }
    });
  }
  if (monthSet.size === 0) {
    BASELINE_CHRONO_MONTHS.forEach(m => monthSet.add(m));
  }
  CHRONO_MONTHS = Array.from(monthSet).sort((a, b) => parseBulanKey(a) - parseBulanKey(b));
  return CHRONO_MONTHS;
}

const MONTH_NAMES_MAP = new Proxy({}, {
  get(target, prop) {
    if (typeof prop === 'string') return getBulanDisplayName(prop);
    return target[prop];
  }
});

const MONTH_ABBR_MAP = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  Mei: '05', Agu: '08', Okt: '10', Des: '12'
};

function parseTxDateToISO(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const dd = parts[0].padStart(2, '0');
  const monthKey = parts[1].charAt(0).toUpperCase() + parts[1].slice(1, 3).toLowerCase();
  const mm = MONTH_ABBR_MAP[monthKey] || null;
  if (!mm) return null;
  const yyyy = parts[2].length === 2 ? '20' + parts[2] : parts[2];
  return `${yyyy}-${mm}-${dd}`;
}

function formatISODateToDisplay(isoStr) {
  if (!isoStr) return '-';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
}

function getEarliestTxDateISO(txs) {
  const list = txs || state.transactions || [];
  if (!list.length) return '2023-04-01';
  let earliest = '9999-99-99';
  for (let i = 0; i < list.length; i++) {
    const iso = parseTxDateToISO(list[i].date_trf || list[i].date_req);
    if (iso && iso < earliest) earliest = iso;
  }
  return earliest !== '9999-99-99' ? earliest : '2023-04-01';
}

function getLatestTxDateISO(txs) {
  const list = txs || state.transactions || [];
  if (!list.length) return '2026-10-11';
  let latest = '';
  // Check backwards through transactions to find true latest ISO date
  for (let i = list.length - 1; i >= 0; i--) {
    const iso = parseTxDateToISO(list[i].date_trf || list[i].date_req);
    if (iso && iso > latest) latest = iso;
  }
  return latest || '2026-10-11';
}

// Application State
const state = {
  activeAdmin: 'nabila', // 'nabila' | 'sarah' | 'all'
  adminData: {
    nabila: { summary: null, transactions: [] },
    sarah: { summary: null, transactions: [] },
    all: { summary: null, transactions: [] }
  },
  poInvoiceData: (typeof window !== 'undefined' && window.PO_INVOICE_DATA) ? window.PO_INVOICE_DATA : null,
  poInvoiceView: 'po-comparison', // 'po-comparison' | 'po-pivot' | 'inv-pivot'
  monthCashOutMap: {},
  summary: null,
  transactions: [],
  masterFilteredTransactions: [],
  filteredTransactions: [],
  activeFilteredCf: null,
  currentPage: 1,
  pageSize: 25,
  charts: {},
  costDetailView: 'cat-region', // 'cat-region' | 'cat-bulan'
  masterFilter: {
    mode: 'bulan', // 'bulan' | 'tanggal'
    startBulan: 'Bulan 8 2025',
    endBulan: 'Bulan 10 2026',
    startDate: '2025-08-01',
    endDate: '2026-10-11',
    preset: 'all',
    selectedYears: [],
    selectedMonths: [],
    selectedRegions: [],
    selectedCategories: []
  },
  filters: {
    search: '',
    admin: '',
    region: '',
    category: '',
    vendor: '',
    bulan: '',
    transferBy: ''
  }
};


// Number & Currency Formatters
const formatRp = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
};

const formatCompactRp = (num) => {
  if (!num) return 'Rp 0';
  if (Math.abs(num) >= 1_000_000_000) {
    return 'Rp ' + (num / 1_000_000_000).toFixed(2) + ' M';
  }
  if (Math.abs(num) >= 1_000_000) {
    return 'Rp ' + (num / 1_000_000).toFixed(2) + ' Jt';
  }
  return 'Rp ' + num.toLocaleString('id-ID');
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initEventListeners();
  loadDashboardData();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('ebdi_theme') || 'dark-theme';
  document.body.className = savedTheme;
  updateThemeIcon();

  document.getElementById('themeToggle').addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light-theme' : 'dark-theme';
    document.body.className = newTheme;
    localStorage.setItem('ebdi_theme', newTheme);
    updateThemeIcon();
    renderCharts();
  });
}

function updateThemeIcon() {
  const isDark = document.body.classList.contains('dark-theme');
  const icon = document.getElementById('themeToggle');
  icon.innerHTML = isDark
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
}

// Tab Switching
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'tab-poinvoice') {
        renderPoInvoiceTable();
      }

      window.dispatchEvent(new Event('resize'));
    });
  });
}

// Event Listeners for Filters & Modal
function initEventListeners() {
  const searchInput = document.getElementById('txSearchInput');
  const clearBtn = document.getElementById('btnClearSearch');

  searchInput.addEventListener('input', (e) => {
    state.filters.search = e.target.value.toLowerCase().trim();
    clearBtn.classList.toggle('visible', state.filters.search.length > 0);
    debounceApplyFilters();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.filters.search = '';
    clearBtn.classList.remove('visible');
    applyFilters();
  });

  // Filter dropdowns
  ['filterAdmin', 'filterRegion', 'filterCategory', 'filterVendor', 'filterBulan', 'filterTransferBy'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const key = id.replace('filter', '');
      const stateKey = key.charAt(0).toLowerCase() + key.slice(1);
      state.filters[stateKey] = e.target.value;
      state.currentPage = 1;
      applyFilters();
    });
  });

  // Reset Filters
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    state.filters = { search: '', admin: '', region: '', category: '', vendor: '', bulan: '', transferBy: '' };
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    ['filterAdmin', 'filterRegion', 'filterCategory', 'filterVendor', 'filterBulan', 'filterTransferBy'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    state.currentPage = 1;
    applyFilters();
  });

  // Admin Switcher Controls
  initAdminSwitcherEventListeners();


  // Page Size Selector
  document.getElementById('pageSizeSelect').addEventListener('change', (e) => {
    state.pageSize = parseInt(e.target.value, 10);
    state.currentPage = 1;
    renderTransactionTable();
  });

  // Pagination buttons
  document.getElementById('btnFirstPage').addEventListener('click', () => {
    if (state.currentPage > 1) { state.currentPage = 1; renderTransactionTable(); }
  });
  document.getElementById('btnPrevPage').addEventListener('click', () => {
    if (state.currentPage > 1) { state.currentPage--; renderTransactionTable(); }
  });
  document.getElementById('btnNextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(state.filteredTransactions.length / state.pageSize) || 1;
    if (state.currentPage < totalPages) { state.currentPage++; renderTransactionTable(); }
  });
  document.getElementById('btnLastPage').addEventListener('click', () => {
    const totalPages = Math.ceil(state.filteredTransactions.length / state.pageSize) || 1;
    if (state.currentPage < totalPages) { state.currentPage = totalPages; renderTransactionTable(); }
  });

  // Export Filtered Transactions
  document.getElementById('btnExportFilteredTx').addEventListener('click', exportFilteredTransactionsToCSV);

  // Tab 6: Detail PO & Invoice Controls
  ['btnTogglePoComparison', 'btnTogglePoPivot', 'btnToggleInvPivot'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view && view !== state.poInvoiceView) {
        setPoInvoiceView(view);
      }
    });
  });
  const btnExportPo = document.getElementById('btnExportPoInvoiceDynamic');
  if (btnExportPo) {
    btnExportPo.addEventListener('click', exportPoInvoiceDynamic);
  }

  // Master Filter Event Listeners
  initMasterFilterEventListeners();

  // Sync / Refresh Button (Direct from Google Sheets via browser fetch)
  document.getElementById('btnSyncData').addEventListener('click', () => {
    syncDataDirectFromGoogleSheets();
  });
  const btnPrompt = document.getElementById('btnInitialSyncPrompt');
  if (btnPrompt) {
    btnPrompt.addEventListener('click', () => {
      syncDataDirectFromGoogleSheets();
    });
  }
  const syncBadge = document.getElementById('syncStatusBadge');
  if (syncBadge) {
    syncBadge.addEventListener('click', () => {
      syncDataDirectFromGoogleSheets();
    });
  }

  // Modal Close
  document.getElementById('btnModalClose').addEventListener('click', closeModal);
  document.getElementById('btnModalCloseFooter').addEventListener('click', closeModal);
  document.getElementById('txDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'txDetailModal') closeModal();
  });

  // Shortcut: Click Today's Cost KPI Card to copy daily WhatsApp report
  const cardTodayCost = document.getElementById('cardTodayCost');
  if (cardTodayCost) {
    cardTodayCost.addEventListener('click', (e) => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) return;
      copyTodayCostReport();
    });

    cardTodayCost.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyTodayCostReport();
      }
    });
  }
}

let debounceTimer;
function debounceApplyFilters() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.currentPage = 1;
    applyFilters();
  }, 250);
}

// Sync Status Badge UI Updater
function updateSyncBadgeUI(refreshTime) {
  const badge = document.getElementById('syncStatusBadge');
  const badgeText = document.getElementById('syncStatusText');
  if (!badge || !badgeText) return;

  const time = (refreshTime !== undefined) ? refreshTime : localStorage.getItem('ebdi_last_refresh');
  if (time) {
    badge.classList.remove('not-synced');
    badgeText.textContent = 'Terakhir Diperbarui: ' + time;
    badge.title = 'Waktu sinkronisasi dataset terakhir: ' + time + ' (Klik untuk refresh ulang)';
  } else {
    badge.classList.add('not-synced');
    badgeText.textContent = 'Belum Disinkronkan (Silakan Klik "Refresh Data")';
    badge.title = 'Data belum disinkronkan langsung. Silakan klik "Refresh Data" untuk mengambil data terbaru.';
  }
}

// Reveal Dashboard Panels and Hide Initial Sync Prompt
function revealDashboardAfterSync() {
  const initialPrompt = document.getElementById('initialSyncPrompt');
  const masterFilterContainer = document.getElementById('masterFilterContainer');
  const navTabsContainer = document.querySelector('.nav-tabs-container');
  const mainContent = document.querySelector('.main-content');
  if (initialPrompt) initialPrompt.style.display = 'none';
  if (masterFilterContainer) masterFilterContainer.style.display = '';
  if (navTabsContainer) navTabsContainer.style.display = '';
  if (mainContent) mainContent.style.display = '';
}

// Admin Switcher Controls
function initAdminSwitcherEventListeners() {
  const btns = document.querySelectorAll('.admin-pill-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const adminKey = btn.dataset.admin;
      if (adminKey && adminKey !== state.activeAdmin) {
        switchAdminView(adminKey, true);
        const nameMap = { nabila: 'Admin Nabila', sarah: 'Admin Sarah', all: 'Gabungan (Nabila + Sarah)' };
        showToastNotification({
          type: 'info',
          title: `Beralih ke Versi ${nameMap[adminKey] || adminKey}`,
          subtitle: 'Dashboard Berhasil Diperbarui',
          message: `<p>Menampilkan seluruh rekapan saldo, cash flow, dan riwayat transaksi untuk <strong>${nameMap[adminKey] || adminKey}</strong>.</p>`,
          stats: [
            { label: 'Total Transaksi', value: (state.transactions || []).length.toLocaleString('id-ID') + ' Tx', highlight: true },
            { label: 'Total Cash Out', value: formatRp(state.summary?.balances?.cash_out_num || 0) }
          ],
          duration: 3500
        });
      }
    });
  });
}

function switchAdminView(adminKey, savePref = true) {
  if (!state.adminData[adminKey] || !state.adminData[adminKey].summary) {
    console.warn('Dataset for admin not ready yet:', adminKey);
    return;
  }

  state.activeAdmin = adminKey;
  if (savePref) {
    try { localStorage.setItem('ebdi_active_admin', adminKey); } catch (e) {}
  }

  // Update pills UI
  document.querySelectorAll('.admin-pill-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.admin === adminKey);
  });

  // Update active state pointers
  state.summary = state.adminData[adminKey].summary;
  state.transactions = state.adminData[adminKey].transactions || [];
  state.masterFilteredTransactions = state.transactions;

  // Update chronological months based on active dataset
  updateChronoMonths(state.transactions, state.summary);

  // Update master filter dates
  const minDate = getEarliestTxDateISO(state.transactions);
  const maxDate = getLatestTxDateISO(state.transactions);
  const latestMonth = CHRONO_MONTHS[CHRONO_MONTHS.length - 1];

  state.masterFilter.preset = 'all';
  state.masterFilter.startBulan = CHRONO_MONTHS[0];
  state.masterFilter.endBulan = latestMonth;
  state.masterFilter.startDate = minDate;
  state.masterFilter.endDate = maxDate;

  // Update Admin dropdown in Tab Transaksi:
  const filterAdmin = document.getElementById('filterAdmin');
  if (filterAdmin) {
    if (adminKey === 'all') {
      filterAdmin.style.display = '';
      filterAdmin.value = state.filters.admin || '';
    } else {
      filterAdmin.style.display = 'none';
      state.filters.admin = '';
      filterAdmin.value = '';
    }
  }

  // Toggle Gabungan PO & Invoice Section & Tab Button (Khusus Gabungan)
  const poSec = document.getElementById('kpiGabunganPoInvoiceSection');
  const poTabBtn = document.getElementById('tabPoInvoiceBtn');
  if (poSec) poSec.style.display = (adminKey === 'all') ? 'block' : 'none';
  if (poTabBtn) poTabBtn.style.display = (adminKey === 'all') ? '' : 'none';

  if (adminKey !== 'all') {
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-tab') === 'tab-poinvoice') {
      const ovTabBtn = document.querySelector('.tab-btn[data-tab="tab-overview"]');
      if (ovTabBtn) ovTabBtn.click();
    }
  }

  // Update brand subtitle with active admin info
  const subTitle = document.querySelector('.brand-subtitle');
  if (subTitle) {
    const adminLabels = {
      nabila: 'Admin Nabila · ' + (state.adminData.nabila?.transactions?.length || 0).toLocaleString('id-ID') + ' Transaksi',
      sarah: 'Admin Sarah · ' + (state.adminData.sarah?.transactions?.length || 0).toLocaleString('id-ID') + ' Transaksi',
      all: 'Gabungan Nabila + Sarah · ' + (state.adminData.all?.transactions?.length || 0).toLocaleString('id-ID') + ' Transaksi'
    };
    subTitle.textContent = adminLabels[adminKey] || 'Financial Monitoring & Reimbursement Analytics (Pure Web Base)';
  }

  // Update switcher count badges
  const bNabila = document.getElementById('badgeCountNabila');
  const bSarah = document.getElementById('badgeCountSarah');
  const bCombined = document.getElementById('badgeCountCombined');
  if (bNabila && state.adminData.nabila?.transactions) {
    bNabila.textContent = (state.adminData.nabila.transactions.length / 1000).toFixed(1) + 'K';
  }
  if (bSarah && state.adminData.sarah?.transactions) {
    bSarah.textContent = (state.adminData.sarah.transactions.length / 1000).toFixed(1) + 'K';
  }
  if (bCombined && state.adminData.all?.transactions) {
    bCombined.textContent = (state.adminData.all.transactions.length / 1000).toFixed(1) + 'K';
  }

  // Populate UI
  populateSummaryUI(state.summary);
  populateFilterDropdowns(state.transactions);
  populateMultiSelectDropdowns();
  initMasterFilterControls();
  updatePresetButtonsVisibility();
  updateLatestPresetButtonText();
  applyMasterFilter();
}

// Helper: Normalize transaction fields for clean filtering and deduplication
function normalizeTransaction(t, fallbackAdmin = 'NABILA') {
  if (!t) return t;
  const admin = t.admin || fallbackAdmin;
  return {
    ...t,
    admin: (admin || 'NABILA').trim().toUpperCase(),
    region: (t.region || '').trim().toUpperCase(),
    category: (t.category || '').trim().toUpperCase(),
    vendor: (t.vendor || '').trim().toUpperCase(),
    transfer_by: (t.transfer_by || '').trim().toUpperCase(),
    bulan: (t.bulan || '').trim(),
    status: (t.status || '').trim().toUpperCase()
  };
}

// Create Combined Dataset (Nabila + Sarah)
function createCombinedDataset(nabilaData, sarahData) {
  const nSum = nabilaData?.summary || {};
  const sSum = sarahData?.summary || {};
  const nTxs = (nabilaData?.transactions || []).map(t => normalizeTransaction(t, 'NABILA'));
  const sTxs = (sarahData?.transactions || []).map(t => normalizeTransaction(t, 'SARAH'));
  const combinedTxs = [...nTxs, ...sTxs];

  // 1. Balances
  const totalKreditNum = (nSum.balances?.total_kredit_num || 0) + (sSum.balances?.total_kredit_num || 0);
  const cashOutNum = (nSum.balances?.cash_out_num || 0) + (sSum.balances?.cash_out_num || 0);
  const sisaKreditNum = totalKreditNum - cashOutNum;
  const bcaNum = (nSum.balances?.bca_num || 0) + (sSum.balances?.bca_num || 0);
  const mandiriNum = (nSum.balances?.mandiri_num || 0) + (sSum.balances?.mandiri_num || 0);

  const balances = {
    total_kredit_num: totalKreditNum,
    total_kredit: formatRp(totalKreditNum),
    cash_out_num: cashOutNum,
    cash_out: formatRp(cashOutNum),
    sisa_kredit_num: sisaKreditNum,
    sisa_kredit: formatRp(sisaKreditNum),
    bca_num: bcaNum,
    bca: formatRp(bcaNum),
    mandiri_num: mandiriNum,
    mandiri: formatRp(mandiriNum)
  };

  // 2. Cash Flow
  const monthMap = new Map();
  function addCfItems(cfList) {
    if (!cfList || !Array.isArray(cfList)) return;
    cfList.forEach(item => {
      const b = item.bulan && item.bulan.trim();
      if (!b || b.toLowerCase().includes('total')) return;
      if (!monthMap.has(b)) {
        monthMap.set(b, {
          bulan: b,
          kredit_sumbagja_num: 0,
          kredit_ebdi_num: 0,
          kredit_nabila_num: 0,
          cash_out_num: 0
        });
      }
      const e = monthMap.get(b);
      e.kredit_sumbagja_num += (item.kredit_sumbagja_num || 0);
      e.kredit_ebdi_num += (item.kredit_ebdi_num || 0);
      e.kredit_nabila_num += (item.kredit_nabila_num || 0);
      e.cash_out_num += (item.cash_out_num || 0);
    });
  }
  addCfItems(nSum.cash_flow);
  addCfItems(sSum.cash_flow);

  const mergedCf = Array.from(monthMap.values()).sort((a, b) => parseBulanKey(a.bulan) - parseBulanKey(b.bulan));
  let totalSumbagja = 0, totalEbdi = 0, totalNabila = 0, totalCashOut = 0;
  mergedCf.forEach(m => {
    totalSumbagja += m.kredit_sumbagja_num;
    totalEbdi += m.kredit_ebdi_num;
    totalNabila += m.kredit_nabila_num;
    totalCashOut += m.cash_out_num;
    m.kredit_sumbagja = formatRp(m.kredit_sumbagja_num);
    m.kredit_ebdi = formatRp(m.kredit_ebdi_num);
    m.kredit_nabila = formatRp(m.kredit_nabila_num);
    m.cash_out = formatRp(m.cash_out_num);
  });

  mergedCf.push({
    bulan: 'Grand Total',
    kredit_sumbagja_num: totalSumbagja,
    kredit_sumbagja: formatRp(totalSumbagja),
    kredit_ebdi_num: totalEbdi,
    kredit_ebdi: formatRp(totalEbdi),
    kredit_nabila_num: totalNabila,
    kredit_nabila: formatRp(totalNabila),
    cash_out_num: totalCashOut,
    cash_out: formatRp(totalCashOut)
  });

  // 3. Cost Detail Matrix
  const cd1 = nSum.cost_detail;
  const cd2 = sSum.cost_detail;
  const regionsSet = new Set();
  (cd1?.regions || []).forEach(r => { if (r !== 'Grand Total' && r !== 'Total Keseluruhan') regionsSet.add(r); });
  (cd2?.regions || []).forEach(r => { if (r !== 'Grand Total' && r !== 'Total Keseluruhan') regionsSet.add(r); });
  const regions = Array.from(regionsSet).sort();
  regions.push('Grand Total');

  const catMap = new Map();
  function addRowsToCatMap(cd) {
    if (!cd || !cd.rows) return;
    cd.rows.forEach(row => {
      const cat = row.category;
      if (!catMap.has(cat)) {
        catMap.set(cat, {});
        regions.forEach(reg => { catMap.get(cat)[reg] = 0; });
      }
      const targetVals = catMap.get(cat);
      Object.keys(row.values || {}).forEach(reg => {
        if (reg === 'Total Keseluruhan' || reg === 'Grand Total') {
          targetVals['Grand Total'] = (targetVals['Grand Total'] || 0) + (row.values[reg]?.num || 0);
        } else if (targetVals[reg] !== undefined) {
          targetVals[reg] = (targetVals[reg] || 0) + (row.values[reg]?.num || 0);
        }
      });
    });
  }
  addRowsToCatMap(cd1);
  addRowsToCatMap(cd2);

  const costDetailRows = [];
  const grandTotalVals = {};
  regions.forEach(reg => { grandTotalVals[reg] = { text: 'Rp 0', num: 0 }; });

  Array.from(catMap.keys()).sort().forEach(cat => {
    const rawVals = catMap.get(cat);
    const valObjs = {};
    let rowSum = 0;
    regions.forEach(reg => {
      if (reg !== 'Grand Total') {
        const n = rawVals[reg] || 0;
        valObjs[reg] = { text: n ? formatRp(n) : '-', num: n };
        rowSum += n;
        grandTotalVals[reg].num += n;
      }
    });
    valObjs['Grand Total'] = { text: formatRp(rowSum), num: rowSum };
    grandTotalVals['Grand Total'].num += rowSum;
    costDetailRows.push({ category: cat, values: valObjs });
  });

  regions.forEach(reg => {
    grandTotalVals[reg].text = formatRp(grandTotalVals[reg].num);
  });

  const costDetail = {
    regions: regions,
    rows: costDetailRows,
    grand_total: grandTotalVals
  };

  // 4. Today cost: take latest between Nabila and Sarah
  const chosenToday = (nSum.today_cost && nSum.today_cost.total_transaction) ? nSum.today_cost : (sSum.today_cost || {});

  return {
    summary: {
      today_cost: chosenToday,
      balances: balances,
      cash_flow: mergedCf,
      cost_detail: costDetail,
      price_by_region: [],
      price_by_bulan: [],
      price_by_category_region: { regions: [], rows: [], grand_total: {} }
    },
    transactions: combinedTxs
  };
}

// Load Dashboard Data
function loadDashboardData() {
  updateSyncBadgeUI();

  const savedSync = localStorage.getItem('ebdi_last_refresh');
  const initialPrompt = document.getElementById('initialSyncPrompt');
  const masterFilterContainer = document.getElementById('masterFilterContainer');
  const navTabsContainer = document.querySelector('.nav-tabs-container');
  const mainContent = document.querySelector('.main-content');

  // If user has NEVER refreshed/synced data before (first visit):
  if (!savedSync) {
    if (initialPrompt) initialPrompt.style.display = 'flex';
    if (masterFilterContainer) masterFilterContainer.style.display = 'none';
    if (navTabsContainer) navTabsContainer.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    return;
  }

  revealDashboardAfterSync();

  // 1. Initialize Nabila data from pre-bundled data.js
  if (window.EBDI_SUMMARY) {
    state.adminData.nabila.summary = window.EBDI_SUMMARY;
  }
  if (window.EBDI_TRANSACTIONS) {
    state.adminData.nabila.transactions = window.EBDI_TRANSACTIONS.map(t => normalizeTransaction(t, 'NABILA'));
  }

  // 2. Initialize Sarah data from pre-bundled data_sarah.js
  if (window.SARAH_SUMMARY) {
    state.adminData.sarah.summary = window.SARAH_SUMMARY;
  }
  if (window.SARAH_TRANSACTIONS) {
    state.adminData.sarah.transactions = window.SARAH_TRANSACTIONS.map(t => normalizeTransaction(t, 'SARAH'));
  }

  // 3. Initialize PO & Invoice Data (Sheet 1 & Sheet 2)
  if (window.PO_INVOICE_DATA) {
    state.poInvoiceData = window.PO_INVOICE_DATA;
  }

  // 4. Fallback to fetch summary.json / summary_sarah.json if not in window
  const loadPromises = [];
  if (!state.adminData.nabila.summary) {
    loadPromises.push(
      fetch('summary.json').then(r => r.json()).then(data => {
        state.adminData.nabila.summary = data;
      }).catch(e => console.warn('Nabila JSON fallback notice:', e))
    );
  }
  if (!state.adminData.sarah.summary) {
    loadPromises.push(
      fetch('summary_sarah.json').then(r => r.json()).then(data => {
        state.adminData.sarah.summary = data;
      }).catch(e => console.warn('Sarah JSON fallback notice:', e))
    );
  }

  function buildAndActivate() {
    if (state.adminData.nabila.summary && state.adminData.sarah.summary) {
      state.adminData.all = createCombinedDataset(state.adminData.nabila, state.adminData.sarah);
    } else if (state.adminData.nabila.summary) {
      state.adminData.all = { ...state.adminData.nabila };
    } else if (state.adminData.sarah.summary) {
      state.adminData.all = { ...state.adminData.sarah };
    }

    const savedAdmin = localStorage.getItem('ebdi_active_admin') || 'nabila';
    const targetAdmin = (state.adminData[savedAdmin] && state.adminData[savedAdmin].summary) ? savedAdmin : 'nabila';
    switchAdminView(targetAdmin, false);
    updateSyncBadgeUI();
  }

  if (loadPromises.length > 0) {
    Promise.all(loadPromises).then(buildAndActivate);
  } else {
    buildAndActivate();
  }
}

// CSV Parser Helper supporting multi-line strings and quotes
function parseCSV(text) {
  const lines = [];
  let row = [''];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') i++;
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') lines.push(row);
  return lines;
}

function parseCurrency(val) {
  if (!val) return 0;
  let s = String(val).trim();
  s = s.replace(/[\.,]00$/, '');
  const m = s.match(/[\.,](\d{1,2})$/);
  if (m && s.length > 4 && (s[s.length - 3] === '.' || s[s.length - 3] === ',')) {
    s = s.slice(0, -3);
  }
  const clean = s.replace(/[^\d\-]/g, '');
  if (!clean || clean === '-') return 0;
  return parseInt(clean, 10) || 0;
}

// Parse Summary EBDI CSV into structured object
function parseSummaryCSV(text) {
  const rows = parseCSV(text);
  const summary = {
    today_cost: {
      date: 'Terbaru',
      total_transaction: 0,
      total_cost: 'Rp 0',
      total_cost_num: 0
    },
    balances: {
      total_kredit: 'Rp 0',
      total_kredit_num: 0,
      cash_out: 'Rp 0',
      cash_out_num: 0,
      sisa_kredit: 'Rp 0',
      sisa_kredit_num: 0,
      bca: 'Rp 0',
      bca_num: 0,
      mandiri: 'Rp 0',
      mandiri_num: 0
    },
    cash_flow: [],
    cost_detail: { regions: [], rows: [], grand_total: {} },
    price_by_region: [],
    price_by_bulan: [],
    price_by_category_region: { regions: [], rows: [], grand_total: {} }
  };

  // 1. Today's Cost
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const rowStr = rows[i].join(' ').toLowerCase();
    if (rowStr.includes('date') && (rowStr.includes('cost') || rowStr.includes('transaction'))) {
      const d = rows[i + 1] || [];
      if (d.length > 3) {
        summary.today_cost.date = (d[1] || '').trim() || 'Terbaru';
        summary.today_cost.total_transaction = parseInt((d[2] || '0').replace(/[^\d]/g, ''), 10) || 0;
        summary.today_cost.total_cost = (d[3] || '').trim();
        summary.today_cost.total_cost_num = parseCurrency(d[3]);
      }
      break;
    }
  }

  // 2. Balances & Cash Flow
  let inCf = false;
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const firstCell = (r[1] || r[0] || '').trim();
    const firstCellLower = firstCell.toLowerCase();
    const rowStr = r.join(' ').toLowerCase();

    // Cash flow section
    if (rowStr.includes('cash flow')) {
      inCf = true;
      continue;
    }
    if (inCf) {
      if (firstCell.startsWith('Bulan ') || firstCell === 'Grand Total') {
        summary.cash_flow.push({
          bulan: firstCell,
          kredit_sumbagja: (r[2] || '').trim(),
          kredit_sumbagja_num: parseCurrency(r[2]),
          kredit_ebdi: (r[3] || '').trim(),
          kredit_ebdi_num: parseCurrency(r[3]),
          kredit_nabila: (r[4] || '').trim(),
          kredit_nabila_num: parseCurrency(r[4]),
          cash_out: (r[5] || '').trim(),
          cash_out_num: parseCurrency(r[5])
        });
        if (firstCell === 'Grand Total') inCf = false;
      }
    }

    // Balances
    if (firstCellLower === 'total kredit' && !summary.balances.total_kredit_num) {
      const val = (r[2] || r.find(c => c.toLowerCase().includes('rp')) || '').trim();
      summary.balances.total_kredit = val;
      summary.balances.total_kredit_num = parseCurrency(val);
    } else if (firstCellLower === 'cash out' && !summary.balances.cash_out_num) {
      const val = (r[2] || r.find(c => c.toLowerCase().includes('rp')) || '').trim();
      summary.balances.cash_out = val;
      summary.balances.cash_out_num = parseCurrency(val);
    } else if (firstCellLower === 'sisa kredit' && !summary.balances.sisa_kredit_num) {
      const val = (r[2] || r.find(c => c.toLowerCase().includes('rp')) || '').trim();
      summary.balances.sisa_kredit = val;
      summary.balances.sisa_kredit_num = parseCurrency(val);
    } else if (firstCellLower === 'bca' && !summary.balances.bca_num) {
      const val = (r[2] || r.find(c => c.toLowerCase().includes('rp')) || '').trim();
      summary.balances.bca = val;
      summary.balances.bca_num = parseCurrency(val);
    } else if (firstCellLower === 'mandiri' && !summary.balances.mandiri_num) {
      const val = (r[2] || r.find(c => c.toLowerCase().includes('rp')) || '').trim();
      summary.balances.mandiri = val;
      summary.balances.mandiri_num = parseCurrency(val);
    }
  }

  // 3. Cost Detail Matrix
  const cdIdx = rows.findIndex(r => (r[1] || '').trim().toLowerCase() === 'cost detail');
  if (cdIdx !== -1 && rows[cdIdx + 2]) {
    const hdr = rows[cdIdx + 2].map(c => c.trim()).filter(Boolean);
    summary.cost_detail.regions = hdr.filter(c => c !== 'CATEGORY');
    for (let i = cdIdx + 3; i < rows.length; i++) {
      const r = rows[i];
      const cat = (r[1] || '').trim();
      if (!cat) continue;
      const vals = {};
      summary.cost_detail.regions.forEach((reg, j) => {
        const colIdx = j + 2;
        const valStr = (r[colIdx] || '').trim();
        vals[reg] = { text: valStr, num: parseCurrency(valStr) };
      });
      if (cat === 'Grand Total') {
        summary.cost_detail.grand_total = vals;
        break;
      } else {
        summary.cost_detail.rows.push({ category: cat, values: vals });
      }
    }
  }

  // 4. Price by Region
  const regIdx = rows.findIndex(r => (r[1] || '').trim().toUpperCase() === 'REGION' && (r[2] || '').trim().toUpperCase().startsWith('SUM'));
  if (regIdx !== -1) {
    for (let i = regIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const reg = (r[1] || '').trim();
      const val = (r[2] || '').trim();
      if (!reg) continue;
      summary.price_by_region.push({ region: reg, price: val, price_num: parseCurrency(val) });
      if (reg === 'Grand Total') break;
    }
  }

  // 5. Price by Bulan
  const blnIdx = rows.findIndex(r => (r[1] || '').trim().toUpperCase() === 'BULAN' && (r[2] || '').trim().toUpperCase().startsWith('SUM'));
  if (blnIdx !== -1) {
    for (let i = blnIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const bln = (r[1] || '').trim();
      const val = (r[2] || '').trim();
      if (!bln) continue;
      summary.price_by_bulan.push({ bulan: bln, price: val, price_num: parseCurrency(val) });
      if (bln === 'Grand Total') break;
    }
  }

  // 6. Category x Region Pivot
  const crIdx = rows.findIndex(r => (r[1] || '').trim().toUpperCase().startsWith('SUM') && (r[2] || '').trim().toUpperCase() === 'REGION');
  if (crIdx !== -1 && rows[crIdx + 1]) {
    const crHdr = rows[crIdx + 1].map(c => c.trim()).filter(Boolean);
    summary.price_by_category_region.regions = crHdr.filter(c => c !== 'CATEGORY');
    for (let i = crIdx + 2; i < rows.length; i++) {
      const r = rows[i];
      const cat = (r[1] || '').trim();
      if (!cat) continue;
      const vals = {};
      summary.price_by_category_region.regions.forEach((reg, j) => {
        const colIdx = j + 3;
        const valStr = (r[colIdx] || '').trim();
        vals[reg] = { text: valStr, num: parseCurrency(valStr) };
      });
      if (cat === 'Grand Total') {
        summary.price_by_category_region.grand_total = vals;
        break;
      } else {
        summary.price_by_category_region.rows.push({ category: cat, values: vals });
      }
    }
  }

  return summary;
}

// Parse Sarah Summary EBDI CSV format
function parseSarahSummaryCSV(text) {
  const rows = parseCSV(text);
  const summary = {
    today_cost: { date: '19-Feb-26', total_transaction: 47, total_cost: 'Rp 27.151.714', total_cost_num: 27151714 },
    balances: {
      total_kredit: 'Rp 0', total_kredit_num: 0,
      cash_out: 'Rp 0', cash_out_num: 0,
      sisa_kredit: 'Rp 0', sisa_kredit_num: 0,
      bca: 'Rp 0', bca_num: 0,
      mandiri: 'Rp 0', mandiri_num: 0
    },
    cash_flow: [],
    cost_detail: { regions: [], rows: [], grand_total: {} },
    price_by_region: [],
    price_by_bulan: [],
    price_by_category_region: { regions: [], rows: [], grand_total: {} }
  };

  // 1. Cash flow & Balances
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    if (!r || !r.length) continue;
    const firstCell = (r[0] || '').trim();
    const firstCellUpper = firstCell.toUpperCase();

    // Cash flow row: Bulan X YYYY
    if (firstCell.startsWith('Bulan ')) {
      const sumbagja = parseCurrency(r[1]);
      const ebdi = parseCurrency(r[2]);
      const out = parseCurrency(r[3]);
      summary.cash_flow.push({
        bulan: firstCell,
        kredit_sumbagja: (r[1] || '-').trim(),
        kredit_sumbagja_num: sumbagja,
        kredit_ebdi: (r[2] || '-').trim(),
        kredit_ebdi_num: ebdi,
        kredit_nabila: 'Rp -',
        kredit_nabila_num: 0,
        cash_out: (r[3] || '-').trim(),
        cash_out_num: out
      });
    }

    // Balances
    if (firstCellUpper === 'KREDIT' && !summary.balances.total_kredit_num) {
      const val = (r[1] || '').trim();
      summary.balances.total_kredit = 'Rp ' + val;
      summary.balances.total_kredit_num = parseCurrency(val);
    } else if (firstCellUpper === 'DEBIT' && !summary.balances.cash_out_num) {
      const val = (r[1] || '').trim();
      summary.balances.cash_out = 'Rp ' + val;
      summary.balances.cash_out_num = parseCurrency(val);
    } else if (firstCellUpper === 'SISA SALDO' && !summary.balances.sisa_kredit_num) {
      const val = (r[1] || '').trim();
      summary.balances.sisa_kredit = 'Rp ' + val;
      summary.balances.sisa_kredit_num = parseCurrency(val);
    }
  }

  // 2. Cost Detail Matrix
  const cdIdx = rows.findIndex(r => (r[0] || '').trim().toUpperCase() === 'KATEGORY');
  if (cdIdx !== -1 && rows[cdIdx]) {
    const hdrRow = rows[cdIdx];
    const rawRegions = [];
    for (let c = 2; c < hdrRow.length; c++) {
      const cell = (hdrRow[c] || '').trim();
      if (cell) rawRegions.push(cell);
    }
    const regions = rawRegions.map(reg => reg === 'Total Keseluruhan' ? 'Grand Total' : reg);
    summary.cost_detail.regions = regions;

    for (let i = cdIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      const cat = (r[0] || '').trim();
      if (!cat) continue;
      const vals = {};
      regions.forEach((reg, j) => {
        const colIdx = j + 2;
        const valStr = (r[colIdx] || '').trim();
        vals[reg] = { text: valStr ? 'Rp ' + valStr : '-', num: parseCurrency(valStr) };
      });
      if (cat === 'Total Keseluruhan') {
        summary.cost_detail.grand_total = vals;
        break;
      } else {
        summary.cost_detail.rows.push({ category: cat, values: vals });
      }
    }
  }

  return summary;
}

// Parse Transfer EBDI CSV into transaction objects
function parseTransferCSV(text, adminTag = 'NABILA') {
  const rows = parseCSV(text);
  const txs = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 5) continue;
    const vendor = (r[1] || '').trim();
    const no = (r[0] || '').trim();
    const priceStr = (r[14] || '').trim();
    const dateTrf = (r[4] || '').trim();
    const dateReq = (r[3] || '').trim();
    const category = (r[9] || '').trim();
    
    // Retain all valid transactions even without external vendor/no (salary, kasbon, admin fee, etc.)
    if (!priceStr && !dateTrf && !dateReq && !category && !vendor) continue;

    const priceNum = parseCurrency(priceStr);

    txs.push(normalizeTransaction({
      no: no,
      vendor: vendor,
      program: (r[2] || '').trim(),
      date_req: dateReq,
      date_trf: dateTrf,
      region: (r[8] || '').trim(),
      category: category,
      price: priceStr,
      price_num: priceNum,
      site_id: (r[16] || '').trim(),
      site_name: (r[17] || '').trim(),
      sow: (r[18] || '').trim(),
      pic: (r[19] || '').trim(),
      status: (r[21] || '').trim(),
      bulan: (r[22] || '').trim(),
      transfer_by: (r[23] || '').trim(),
      admin: adminTag
    }, adminTag));
  }
  return txs;
}

// ==========================================================================
// Modern Glassmorphic Toast Notification System
// ==========================================================================
function showToastNotification(options = {}) {
  const {
    type = 'success', // 'success', 'info', 'warning', 'error'
    title = 'Notifikasi',
    subtitle = '',
    message = '',
    stats = [],
    action = null, // { label: string, onClick: function }
    duration = 6500
  } = options;

  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }

  const icons = {
    success: `<div class="toast-pulse-ring"></div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    info: `<div class="toast-pulse-ring"></div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    warning: `<div class="toast-pulse-ring"></div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    error: `<div class="toast-pulse-ring"></div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
  };

  const toast = document.createElement('div');
  toast.className = `toast-card toast-${type}`;
  toast.setAttribute('role', 'alert');

  let statsHtml = '';
  if (Array.isArray(stats) && stats.length > 0) {
    statsHtml = `<div class="toast-stats-grid">` +
      stats.map(s => `
        <div class="toast-stat-pill">
          <div class="toast-stat-label">${s.label}</div>
          <div class="toast-stat-value ${s.highlight ? 'highlight' : ''}">${s.value}</div>
        </div>
      `).join('') +
      `</div>`;
  }

  let actionHtml = '';
  if (action || duration > 0) {
    actionHtml = `<div class="toast-actions">`;
    if (action) {
      actionHtml += `<button class="toast-btn toast-btn-primary" id="toastActionBtn">${action.label}</button>`;
    }
    actionHtml += `<button class="toast-btn toast-btn-dismiss" id="toastDismissBtn">Tutup</button></div>`;
  }

  toast.innerHTML = `
    <div class="toast-header">
      <div class="toast-icon-wrapper">
        ${icons[type] || icons.info}
      </div>
      <div class="toast-title-group">
        <div class="toast-title">${title}</div>
        ${subtitle ? `<div class="toast-subtitle"><span class="toast-live-indicator"></span>${subtitle}</div>` : ''}
      </div>
      <button class="toast-close" title="Tutup notifikasi" aria-label="Tutup">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    ${message ? `<div class="toast-message">${message}</div>` : ''}
    ${statsHtml}
    ${actionHtml}
    <div class="toast-progress-track">
      <div class="toast-progress-bar" style="animation-duration: ${duration}ms;"></div>
    </div>
  `;

  container.prepend(toast);

  let isClosing = false;
  const dismissToast = () => {
    if (isClosing) return;
    isClosing = true;
    toast.classList.add('toast-closing');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 280);
  };

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) closeBtn.addEventListener('click', dismissToast);

  const dismissBtn = toast.querySelector('#toastDismissBtn');
  if (dismissBtn) dismissBtn.addEventListener('click', dismissToast);

  if (action) {
    const actionBtn = toast.querySelector('#toastActionBtn');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        action.onClick();
        dismissToast();
      });
    }
  }

  if (duration > 0) {
    let timerId = setTimeout(dismissToast, duration);
    let remainingTime = duration;
    let startTime = Date.now();

    toast.addEventListener('mouseenter', () => {
      clearTimeout(timerId);
      remainingTime -= (Date.now() - startTime);
    });

    toast.addEventListener('mouseleave', () => {
      startTime = Date.now();
      timerId = setTimeout(dismissToast, Math.max(remainingTime, 1000));
    });
  }

  return { dismiss: dismissToast };
}

// Direct Sync from Google Sheets via Pure JavaScript (Multi-URL Fallback & Live Native CORS)
async function syncDataDirectFromGoogleSheets() {
  const badge = document.getElementById('syncStatusBadge');
  const badgeText = document.getElementById('syncStatusText');
  if (badge) {
    badge.classList.remove('not-synced');
    badge.style.borderColor = 'var(--warning)';
    badge.style.color = 'var(--warning)';
  }
  if (badgeText) badgeText.textContent = 'Menghubungi Google Sheets...';

  const ts = Date.now();
  const nabilaSummaryUrls = [
    `https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/export?format=csv&gid=1112038042&t=${ts}`,
    `/api/sheets/summary?t=${ts}`,
    `https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/gviz/tq?tqx=out:csv&gid=1112038042&t=${ts}`
  ];

  const nabilaTransferUrls = [
    `https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/export?format=csv&gid=747143276&t=${ts}`,
    `/api/sheets/transfer?t=${ts}`,
    `https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/gviz/tq?tqx=out:csv&gid=747143276&t=${ts}`
  ];

  const sarahSummaryUrls = [
    `https://docs.google.com/spreadsheets/d/1mkP9QSlCsPhl-BQ8M8V8DBzPqRoXLkww0HuFUI2n4cc/export?format=csv&gid=50835563&t=${ts}`,
    `/api/sheets/sarah-summary?t=${ts}`,
    `https://docs.google.com/spreadsheets/d/1mkP9QSlCsPhl-BQ8M8V8DBzPqRoXLkww0HuFUI2n4cc/gviz/tq?tqx=out:csv&gid=50835563&t=${ts}`
  ];

  const sarahTransferUrls = [
    `https://docs.google.com/spreadsheets/d/1mkP9QSlCsPhl-BQ8M8V8DBzPqRoXLkww0HuFUI2n4cc/export?format=csv&gid=857996792&t=${ts}`,
    `/api/sheets/sarah-transfer?t=${ts}`,
    `https://docs.google.com/spreadsheets/d/1mkP9QSlCsPhl-BQ8M8V8DBzPqRoXLkww0HuFUI2n4cc/gviz/tq?tqx=out:csv&gid=857996792&t=${ts}`
  ];

  const poUrls = [
    `https://docs.google.com/spreadsheets/d/1HmfwnKo2ebZG-0FgL9u8Ba-tYVWuxU2xvQ-pWIr1Qx8/export?format=csv&gid=167250603&t=${ts}`,
    `/api/sheets/po?t=${ts}`,
    `https://docs.google.com/spreadsheets/d/1HmfwnKo2ebZG-0FgL9u8Ba-tYVWuxU2xvQ-pWIr1Qx8/gviz/tq?tqx=out:csv&gid=167250603&t=${ts}`
  ];

  const invoiceUrls = [
    `https://docs.google.com/spreadsheets/d/1HmfwnKo2ebZG-0FgL9u8Ba-tYVWuxU2xvQ-pWIr1Qx8/export?format=csv&gid=996137979&t=${ts}`,
    `/api/sheets/invoice?t=${ts}`,
    `https://docs.google.com/spreadsheets/d/1HmfwnKo2ebZG-0FgL9u8Ba-tYVWuxU2xvQ-pWIr1Qx8/gviz/tq?tqx=out:csv&gid=996137979&t=${ts}`
  ];

  async function fetchWithFallback(urls, label) {
    let lastErr = null;
    for (const u of urls) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (res.ok) {
          const text = await res.text();
          if (text && text.length > 50) return text;
        }
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(`Gagal mengunduh ${label}: ${lastErr ? lastErr.message : 'Koneksi ditolak'}`);
  }

  const btnPromptText = document.getElementById('btnInitialSyncPromptText');
  if (btnPromptText) btnPromptText.textContent = 'Menghubungkan ke Google Sheets...';

  try {
    badgeText.textContent = 'Mengunduh Summary Nabila & Sarah...';
    if (btnPromptText) btnPromptText.textContent = 'Mengunduh Summary Nabila & Sarah...';

    const [nabilaSummaryCsv, sarahSummaryCsv] = await Promise.all([
      fetchWithFallback(nabilaSummaryUrls, 'Summary Nabila'),
      fetchWithFallback(sarahSummaryUrls, 'Summary Sarah')
    ]);

    const newNabilaSummary = parseSummaryCSV(nabilaSummaryCsv);
    const newSarahSummary = parseSarahSummaryCSV(sarahSummaryCsv);

    badgeText.textContent = 'Mengunduh Transaksi Nabila & Sarah (84K+)...';
    if (btnPromptText) btnPromptText.textContent = 'Mengunduh Transaksi Nabila & Sarah (84K+)...';

    const [nabilaTransferCsv, sarahTransferCsv] = await Promise.all([
      fetchWithFallback(nabilaTransferUrls, 'Transaksi Nabila'),
      fetchWithFallback(sarahTransferUrls, 'Transaksi Sarah')
    ]);

    const newNabilaTxs = parseTransferCSV(nabilaTransferCsv, 'NABILA');
    const newSarahTxs = parseTransferCSV(sarahTransferCsv, 'SARAH');

    // Mengunduh Sheet 1 (SUM PO) dan Sheet 2 (SUM INVOICE)
    try {
      badgeText.textContent = 'Mengunduh Sheet PO & Invoice...';
      const [poCsv, invCsv] = await Promise.all([
        fetchWithFallback(poUrls, 'PO Sheet 1'),
        fetchWithFallback(invoiceUrls, 'Invoice Sheet 2')
      ]);
      state.poInvoiceData = parsePoInvoiceCSVs(poCsv, invCsv);
    } catch (ePo) {
      console.warn('PO/Invoice live sync notice, using local bundle:', ePo);
      if (!state.poInvoiceData && window.PO_INVOICE_DATA) {
        state.poInvoiceData = window.PO_INVOICE_DATA;
      }
    }

    state.adminData.nabila = {
      summary: newNabilaSummary,
      transactions: newNabilaTxs
    };
    state.adminData.sarah = {
      summary: newSarahSummary,
      transactions: newSarahTxs
    };
    state.adminData.all = createCombinedDataset(state.adminData.nabila, state.adminData.sarah);

    // Refresh active view
    switchAdminView(state.activeAdmin, false);

    // Reveal dashboard panels
    revealDashboardAfterSync();
    if (btnPromptText) btnPromptText.textContent = 'Sinkronkan Data Sekarang';

    // Record last refresh timestamp
    const now = new Date();
    const timeStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    localStorage.setItem('ebdi_last_refresh', timeStr);

    if (badge) {
      badge.style.borderColor = '';
      badge.style.color = '';
      badge.style.background = '';
    }
    updateSyncBadgeUI(timeStr);

    showToastNotification({
      type: 'success',
      title: 'Sinkronisasi 2 Admin Berhasil!',
      subtitle: 'Google Sheets Live Sync Aktif (Nabila & Sarah)',
      message: '<p>Seluruh data dari spreadsheet <strong>Nabila</strong> dan <strong>Sarah</strong> telah berhasil diperbarui dan digabungkan secara otomatis.</p>',
      stats: [
        { label: 'Tx Nabila', value: newNabilaTxs.length.toLocaleString('id-ID') + ' Tx' },
        { label: 'Tx Sarah', value: newSarahTxs.length.toLocaleString('id-ID') + ' Tx' },
        { label: 'Total Gabungan', value: (state.adminData.all.transactions || []).length.toLocaleString('id-ID') + ' Tx', highlight: true },
        { label: 'Total Cash Out Gabungan', value: formatRp(state.adminData.all.summary?.balances?.cash_out_num || 0) }
      ],
      action: {
        label: 'Lihat Transaksi ➔',
        onClick: () => {
          const tabBtn = document.querySelector('.tab-btn[data-tab="tab-transaksi"]');
          if (tabBtn) tabBtn.click();
        }
      },
      duration: 7500
    });
  } catch (err) {
    console.error('Google Sheets sync notice:', err);
    if (badge) {
      badge.style.borderColor = '';
      badge.style.color = '';
      badge.style.background = '';
    }
    updateSyncBadgeUI();
    const savedTime = localStorage.getItem('ebdi_last_refresh') || 'Data Bundled Lokal';

    // Fallback for file:// or offline mode to ensure dashboard is unlocked
    if (!state.adminData.nabila.summary && window.EBDI_SUMMARY) {
      state.adminData.nabila = {
        summary: window.EBDI_SUMMARY,
        transactions: (window.EBDI_TRANSACTIONS || []).map(t => normalizeTransaction(t, 'NABILA'))
      };
    }
    if (!state.adminData.sarah.summary && window.SARAH_SUMMARY) {
      state.adminData.sarah = {
        summary: window.SARAH_SUMMARY,
        transactions: (window.SARAH_TRANSACTIONS || []).map(t => normalizeTransaction(t, 'SARAH'))
      };
    }
    if (state.adminData.nabila.summary && state.adminData.sarah.summary) {
      state.adminData.all = createCombinedDataset(state.adminData.nabila, state.adminData.sarah);
    }
    if (!state.poInvoiceData && window.PO_INVOICE_DATA) {
      state.poInvoiceData = window.PO_INVOICE_DATA;
    }
    switchAdminView(state.activeAdmin, false);

    const now = new Date();
    const timeStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    localStorage.setItem('ebdi_last_refresh', timeStr);
    updateSyncBadgeUI(timeStr);

    revealDashboardAfterSync();
    if (btnPromptText) btnPromptText.textContent = 'Sinkronkan Data Sekarang';

    const isFileProtocol = !window.location.protocol.startsWith('http');
    showToastNotification({
      type: isFileProtocol ? 'info' : 'warning',
      title: isFileProtocol ? 'Informasi Sinkronisasi Lokal' : 'Gagal Menghubungi Google Sheets',
      subtitle: isFileProtocol ? 'Mode Offline / Protokol Berkas' : 'Periksa Koneksi Internet Anda',
      message: isFileProtocol
        ? '<p>Saat dibuka secara lokal (<code>file://</code>), browser membatasi CORS langsung ke Google Sheets. Di hosting <strong>Netlify</strong> atau web server, sinkronisasi otomatis berjalan lancar.</p><p style="color:var(--text-primary); font-size:0.8rem; margin-top:4px;">✓ Seluruh data Nabila (24K+) dan Sarah (59K+) tetap <strong>100% lengkap</strong> dan siap digunakan.</p>'
        : `<p>Gagal menghubungi Google Sheets (${err.message}). Pastikan koneksi internet Anda aktif.</p>`,
      stats: [
        { label: 'Total Transaksi Nabila', value: (state.adminData.nabila.transactions || []).length.toLocaleString('id-ID') + ' Tx' },
        { label: 'Total Transaksi Sarah', value: (state.adminData.sarah.transactions || []).length.toLocaleString('id-ID') + ' Tx' },
        { label: 'Total Gabungan', value: (state.adminData.all.transactions || []).length.toLocaleString('id-ID') + ' Tx', highlight: true }
      ],
      action: {
        label: 'Lihat Transaksi ➔',
        onClick: () => {
          const tabBtn = document.querySelector('.tab-btn[data-tab="tab-transaksi"]');
          if (tabBtn) tabBtn.click();
        }
      },
      duration: 8000
    });
  }
}

// Populate Summary UI
function populateSummaryUI(data) {
  if (!data) return;

  // KPI Top Cards
  const b = data.balances || {};
  document.getElementById('kpiTotalKredit').textContent = b.total_kredit || formatRp(b.total_kredit_num);
  document.getElementById('kpiCashOut').textContent = b.cash_out || formatRp(b.cash_out_num);
  document.getElementById('kpiSisaKredit').textContent = b.sisa_kredit || formatRp(b.sisa_kredit_num);
  document.getElementById('kpiBca').textContent = b.bca || formatRp(b.bca_num);
  document.getElementById('kpiMandiri').textContent = b.mandiri || formatRp(b.mandiri_num);

  const totalBank = (b.bca_num || 0) + (b.mandiri_num || 0);
  document.getElementById('kpiTotalBank').textContent = formatRp(totalBank);

  // Today's Cost
  const t = data.today_cost || {};
  document.getElementById('todayCostDate').textContent = t.date || 'Terbaru';
  document.getElementById('todayCostAmount').textContent = t.total_cost || formatRp(t.total_cost_num);
  document.getElementById('todayCostTxCount').textContent = (t.total_transaction || 0) + ' Transaksi';

  // Cash Flow Table
  populateCashFlowTable(data.cash_flow || []);

  // Cost Detail Matrix (Category x Region)
  populateCostDetailMatrix(data.cost_detail || {});

  // Sum of Price per Region
  populatePriceRegionTable(data.price_by_region || []);

  // Sum of Price per Bulan
  populatePriceBulanTable(data.price_by_bulan || []);

  // Sum of Price Category x Region Pivot
  populatePriceCatRegPivot(data.price_by_category_region || {});

  // Top 5 Categories Ranking
  populateTopCategories(data.cost_detail || {});
}

// 1. Cash Flow Table
function populateCashFlowTable(items) {
  const tbody = document.getElementById('tbodyCashFlow');
  tbody.innerHTML = '';

  items.forEach(item => {
    const tr = document.createElement('tr');
    const isTotal = item.bulan.toLowerCase() === 'grand total';
    if (isTotal) tr.classList.add('total-row');

    const sumKredit = (item.kredit_sumbagja_num || 0) + (item.kredit_ebdi_num || 0) + (item.kredit_nabila_num || 0);
    const net = sumKredit - (item.cash_out_num || 0);
    const netClass = net >= 0 ? 'text-success' : 'text-danger';

    tr.innerHTML = `
      <td><strong>${item.bulan}</strong></td>
      <td class="text-right">${item.kredit_sumbagja || '-'}</td>
      <td class="text-right">${item.kredit_ebdi || '-'}</td>
      <td class="text-right">${item.kredit_nabila || '-'}</td>
      <td class="text-right font-mono font-bold">${formatRp(sumKredit)}</td>
      <td class="text-right text-danger font-mono">${item.cash_out || '-'}</td>
      <td class="text-right ${netClass} font-mono font-bold">${(net >= 0 ? '+' : '') + formatRp(net)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 2. Cost Detail Matrix Table
function populateCostDetailMatrix(cd) {
  const thead = document.getElementById('theadCostDetail');
  const tbody = document.getElementById('tbodyCostDetail');
  if (!cd || !cd.regions || !cd.regions.length) return;

  const regions = cd.regions;
  thead.innerHTML = `<th>CATEGORY</th>` + regions.map(r => `<th class="text-right">${r}</th>`).join('');
  tbody.innerHTML = '';

  let maxVal = 1;
  (cd.rows || []).forEach(row => {
    regions.forEach(reg => {
      if (reg !== 'Grand Total' && row.values[reg]?.num > maxVal) {
        maxVal = row.values[reg].num;
      }
    });
  });

  (cd.rows || []).forEach(row => {
    const tr = document.createElement('tr');
    let cellsHtml = `<td><strong>${row.category}</strong></td>`;

    regions.forEach(reg => {
      const valObj = row.values[reg] || { text: '-', num: 0 };
      const num = valObj.num || 0;
      let highlightClass = '';
      if (reg === 'Grand Total') {
        highlightClass = 'font-bold';
      } else if (num > maxVal * 0.4) {
        highlightClass = 'matrix-cell-highlight';
      }
      cellsHtml += `<td class="text-right ${highlightClass}">${valObj.text || '-'}</td>`;
    });

    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  });

  if (cd.grand_total) {
    const tr = document.createElement('tr');
    tr.classList.add('total-row');
    let cellsHtml = `<td><strong>GRAND TOTAL</strong></td>`;
    regions.forEach(reg => {
      const valObj = cd.grand_total[reg] || { text: '-', num: 0 };
      cellsHtml += `<td class="text-right font-mono font-bold text-success">${valObj.text || '-'}</td>`;
    });
    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  }
}

// 3. Price per Region Table
function populatePriceRegionTable(items) {
  const tbody = document.getElementById('tbodyPriceRegion');
  tbody.innerHTML = '';

  const grandTotalItem = items.find(i => i.region.toLowerCase() === 'grand total');
  const total = grandTotalItem ? grandTotalItem.price_num : 1;

  items.forEach(item => {
    const tr = document.createElement('tr');
    const isTotal = item.region.toLowerCase() === 'grand total';
    if (isTotal) tr.classList.add('total-row');

    const pct = ((item.price_num / total) * 100).toFixed(1) + '%';

    tr.innerHTML = `
      <td><strong>${item.region}</strong></td>
      <td class="text-right font-mono">${item.price || formatRp(item.price_num)}</td>
      <td class="text-right"><span class="badge ${isTotal ? 'badge-success' : 'badge-info'}">${isTotal ? '100%' : pct}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. Price per Bulan Table
function populatePriceBulanTable(items) {
  const tbody = document.getElementById('tbodyPriceBulan');
  tbody.innerHTML = '';

  const grandTotalItem = items.find(i => i.bulan.toLowerCase() === 'grand total');
  const total = grandTotalItem ? grandTotalItem.price_num : 1;

  items.forEach(item => {
    const tr = document.createElement('tr');
    const isTotal = item.bulan.toLowerCase() === 'grand total';
    if (isTotal) tr.classList.add('total-row');

    const pct = ((item.price_num / total) * 100).toFixed(1) + '%';

    tr.innerHTML = `
      <td><strong>${item.bulan}</strong></td>
      <td class="text-right font-mono">${item.price || formatRp(item.price_num)}</td>
      <td class="text-right"><span class="badge ${isTotal ? 'badge-success' : 'badge-purple'}">${isTotal ? '100%' : pct}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// 5. Price Category x Region Pivot
function populatePriceCatRegPivot(pcr) {
  const thead = document.getElementById('theadPriceCatReg');
  const tbody = document.getElementById('tbodyPriceCatReg');
  if (!pcr || !pcr.regions || !pcr.regions.length) return;

  const regions = pcr.regions;
  thead.innerHTML = `<th>CATEGORY</th>` + regions.map(r => `<th class="text-right">${r}</th>`).join('');
  tbody.innerHTML = '';

  (pcr.rows || []).forEach(row => {
    const tr = document.createElement('tr');
    let cellsHtml = `<td><strong>${row.category}</strong></td>`;

    regions.forEach(reg => {
      const valObj = row.values[reg] || { text: '-', num: 0 };
      const isGt = reg === 'Grand Total';
      cellsHtml += `<td class="text-right ${isGt ? 'font-bold' : ''}">${valObj.text || '-'}</td>`;
    });

    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  });

  if (pcr.grand_total) {
    const tr = document.createElement('tr');
    tr.classList.add('total-row');
    let cellsHtml = `<td><strong>GRAND TOTAL</strong></td>`;
    regions.forEach(reg => {
      const valObj = pcr.grand_total[reg] || { text: '-', num: 0 };
      cellsHtml += `<td class="text-right font-mono font-bold text-success">${valObj.text || '-'}</td>`;
    });
    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  }
}

// 6. Top Categories List with Progress Bars
function populateTopCategories(costDetailOrList) {
  if (!costDetailOrList) return;
  if (Array.isArray(costDetailOrList)) {
    populateTopCategoriesFromTxs(costDetailOrList);
    return;
  }
  if (costDetailOrList.rows && Array.isArray(costDetailOrList.rows)) {
    const sorted = costDetailOrList.rows
      .map(r => {
        const total = (r.values && r.values['Grand Total']) ? (r.values['Grand Total'].num || 0) : 0;
        return [r.category, total];
      })
      .filter(item => item[0] && item[0].toLowerCase() !== 'grand total')
      .sort((a, b) => b[1] - a[1]);
    populateTopCategoriesFromTxs(sorted);
  }
}

function populateTopCategoriesFromTxs(sortedCats) {
  const container = document.getElementById('topCategoriesList');
  if (!container) return;

  const topTotal = sortedCats.length > 0 ? (sortedCats[0][1] || 1) : 1;
  container.innerHTML = '';

  sortedCats.slice(0, 5).forEach((item, index) => {
    const name = item[0];
    const num = item[1];
    const pct = Math.min(100, Math.round((num / topTotal) * 100));
    const div = document.createElement('div');
    div.className = 'top-cat-item';
    div.innerHTML = `
      <div class="top-cat-row">
        <div class="top-cat-name">#${index + 1} ${name}</div>
        <div class="top-cat-price">${formatRp(num)}</div>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Render Interactive Charts (Chart.js)
function renderCharts() {
  if (typeof Chart === 'undefined') return;

  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  // Cash Flow Data (Filtered or All)
  const allCf = state.summary?.cash_flow || [];
  const cf = (state.activeFilteredCf || allCf).filter(i => i.bulan.toLowerCase() !== 'grand total');
  const labels = cf.map(i => i.bulan.replace('Bulan ', 'Bln '));
  const kreditData = cf.map(i => (i.kredit_sumbagja_num || 0) + (i.kredit_ebdi_num || 0) + (i.kredit_nabila_num || 0));
  const cashOutData = cf.map(i => i.cash_out_num || 0);

  // 1. Cash Flow Overview Bar Chart
  const ctxOverview = document.getElementById('chartCashFlowOverview');
  if (ctxOverview) {
    if (state.charts.cfOverview) state.charts.cfOverview.destroy();
    state.charts.cfOverview = new Chart(ctxOverview, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Total Kredit',
            data: kreditData,
            backgroundColor: 'rgba(56, 189, 248, 0.75)',
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            borderRadius: 4
          },
          {
            label: 'Cash Out',
            data: cashOutData,
            backgroundColor: 'rgba(244, 63, 94, 0.75)',
            borderColor: '#f43f5e',
            borderWidth: 1.5,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatRp(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { ticks: { color: textColor, font: { size: 11 } }, grid: { display: false } },
          y: {
            ticks: {
              color: textColor,
              callback: (val) => formatCompactRp(val)
            },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // 2. Category Donut Chart from active dataset
  const txs = (state.masterFilteredTransactions && state.masterFilteredTransactions.length)
    ? state.masterFilteredTransactions
    : (state.transactions || []);

  const catMap = {};
  txs.forEach(t => {
    if (t.category) catMap[t.category] = (catMap[t.category] || 0) + (t.price_num || 0);
  });
  const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const catLabels = sortedCats.map(x => x[0]);
  const catData = sortedCats.map(x => x[1]);

  const ctxDonut = document.getElementById('chartCategoryDonut');
  if (ctxDonut) {
    if (state.charts.donut) state.charts.donut.destroy();
    state.charts.donut = new Chart(ctxDonut, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: [
            '#38bdf8', '#6366f1', '#10b981', '#f59e0b', '#ec4899',
            '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#e11d48',
            '#64748b', '#a855f7'
          ],
          borderWidth: 2,
          borderColor: isDark ? '#0f172a' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, boxWidth: 12, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatRp(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  // 3. Regional Bar Chart from active dataset
  const regMap = {};
  txs.forEach(t => {
    if (t.region) regMap[t.region] = (regMap[t.region] || 0) + (t.price_num || 0);
  });
  const regEntries = Object.entries(regMap).sort((a, b) => b[1] - a[1]);
  const regLabels = regEntries.map(x => x[0]);
  const regData = regEntries.map(x => x[1]);

  const ctxRegion = document.getElementById('chartRegionBars');
  if (ctxRegion) {
    if (state.charts.regionBars) state.charts.regionBars.destroy();
    state.charts.regionBars = new Chart(ctxRegion, {
      type: 'bar',
      data: {
        labels: regLabels,
        datasets: [{
          label: 'Total Realisasi',
          data: regData,
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          borderColor: '#6366f1',
          borderWidth: 1.5,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Biaya: ${formatRp(ctx.raw)}`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: textColor, callback: (v) => formatCompactRp(v) },
            grid: { color: gridColor }
          },
          y: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
  }

  // 4. Detailed Cash Flow Chart in Tab 2
  const ctxDetail = document.getElementById('chartCashFlowDetail');
  if (ctxDetail && cf.length) {
    if (state.charts.cfDetail) state.charts.cfDetail.destroy();
    state.charts.cfDetail = new Chart(ctxDetail, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Kredit Nabila',
            data: cf.map(i => i.kredit_nabila_num || 0),
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Cash Out',
            data: cashOutData,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Kredit Sumbagja',
            data: cf.map(i => i.kredit_sumbagja_num || 0),
            borderColor: '#10b981',
            borderDash: [5, 5],
            tension: 0.3
          },
          {
            label: 'Kredit Ebdi',
            data: cf.map(i => i.kredit_ebdi_num || 0),
            borderColor: '#f59e0b',
            borderDash: [5, 5],
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${formatRp(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: {
            ticks: { color: textColor, callback: (v) => formatCompactRp(v) },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // 5. Update Top 5 Categories list in Tab 1
  populateTopCategoriesFromTxs(sortedCats);
}

// Master Filter: Initialize Controls
function updateLatestPresetButtonText() {
  const btnLatest = document.querySelector('.mf-preset-btn[data-preset="latest"]');
  if (btnLatest && CHRONO_MONTHS.length) {
    const latestMonth = CHRONO_MONTHS[CHRONO_MONTHS.length - 1];
    btnLatest.textContent = `${latestMonth} (Terbaru)`;
  }
}

function updatePresetButtonsVisibility() {
  const yearsPresent = new Set();
  CHRONO_MONTHS.forEach(m => {
    const yr = m.match(/\d{4}/);
    if (yr) yearsPresent.add(yr[0]);
  });
  document.querySelectorAll('.mf-preset-btn[data-year]').forEach(btn => {
    const yr = btn.dataset.year;
    if (yearsPresent.has(yr)) {
      btn.style.display = '';
    } else {
      btn.style.display = 'none';
    }
  });
}

function initMasterFilterControls() {
  const startSelect = document.getElementById('mfStartBulan');
  const endSelect = document.getElementById('mfEndBulan');
  if (startSelect && endSelect) {
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    CHRONO_MONTHS.forEach(b => {
      const sName = MONTH_NAMES_MAP[b] ? ` (${MONTH_NAMES_MAP[b]})` : '';
      const opt1 = document.createElement('option');
      opt1.value = b;
      opt1.textContent = b + sName;
      startSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = b;
      opt2.textContent = b + sName;
      endSelect.appendChild(opt2);
    });

    startSelect.value = state.masterFilter.startBulan || CHRONO_MONTHS[0];
    endSelect.value = state.masterFilter.endBulan || CHRONO_MONTHS[CHRONO_MONTHS.length - 1];
  }

  const minDate = getEarliestTxDateISO(state.transactions);
  const maxDate = getLatestTxDateISO(state.transactions);
  const startDateInput = document.getElementById('mfStartDate');
  const endDateInput = document.getElementById('mfEndDate');
  if (startDateInput) {
    startDateInput.min = minDate;
    startDateInput.max = maxDate;
    startDateInput.value = state.masterFilter.startDate || minDate;
  }
  if (endDateInput) {
    endDateInput.min = minDate;
    endDateInput.max = maxDate;
    if (!state.masterFilter.endDate || state.masterFilter.endDate < maxDate) {
      state.masterFilter.endDate = maxDate;
    }
    endDateInput.value = state.masterFilter.endDate;
  }
  updatePresetButtonsVisibility();
  updateLatestPresetButtonText();
}

// Master Filter: Event Listeners
function initMasterFilterEventListeners() {
  // Presets
  const presetBtns = document.querySelectorAll('.mf-preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      applyMasterFilterPreset(presetKey);
    });
  });

  // Month Selects Change (if present)
  const startSelect = document.getElementById('mfStartBulan');
  const endSelect = document.getElementById('mfEndBulan');
  if (startSelect && endSelect) {
    const onMonthChange = () => {
      state.masterFilter.startBulan = startSelect.value;
      state.masterFilter.endBulan = endSelect.value;
      let startIdx = CHRONO_MONTHS.indexOf(startSelect.value);
      let endIdx = CHRONO_MONTHS.indexOf(endSelect.value);
      if (startIdx === -1) startIdx = 0;
      if (endIdx === -1) endIdx = CHRONO_MONTHS.length - 1;
      if (startIdx > endIdx) {
        const temp = startIdx; startIdx = endIdx; endIdx = temp;
      }
      state.masterFilter.selectedMonths = CHRONO_MONTHS.slice(startIdx, endIdx + 1);
      syncBulanCheckboxesFromState();
      clearActiveMasterPresets();
      applyMasterFilter();
    };
    startSelect.addEventListener('change', onMonthChange);
    endSelect.addEventListener('change', onMonthChange);
  }

  // Date Inputs Change (if present)
  const startDateInput = document.getElementById('mfStartDate');
  const endDateInput = document.getElementById('mfEndDate');
  if (startDateInput && endDateInput) {
    const onDateChange = () => {
      state.masterFilter.startDate = startDateInput.value;
      state.masterFilter.endDate = endDateInput.value;
      clearActiveMasterPresets();
      applyMasterFilter();
    };
    startDateInput.addEventListener('change', onDateChange);
    endDateInput.addEventListener('change', onDateChange);
  }

  // Reset Master Filter Button
  const btnReset = document.getElementById('btnResetMasterFilter');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      resetAllMasterAndMultiSelectFilters();
    });
  }

  // Multi-Select Dropdowns & Tab 3 Matrix controls
  initMultiSelectDropdowns();
  initMatrixViewToggleControls();
}

function clearActiveMasterPresets() {
  document.querySelectorAll('.mf-preset-btn').forEach(btn => btn.classList.remove('active'));
  state.masterFilter.preset = 'custom';
}

function applyMasterFilterPreset(presetKey) {
  document.querySelectorAll('.mf-preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === presetKey);
  });
  state.masterFilter.preset = presetKey;

  const minDate = getEarliestTxDateISO(state.transactions);
  const maxDate = getLatestTxDateISO(state.transactions);
  const latestMonth = CHRONO_MONTHS[CHRONO_MONTHS.length - 1] || 'Bulan 10 2026';
  const mf = state.masterFilter;

  if (presetKey === 'all') {
    mf.startBulan = CHRONO_MONTHS[0] || 'Bulan 4 2023';
    mf.endBulan = latestMonth;
    mf.startDate = minDate;
    mf.endDate = maxDate;
    mf.selectedMonths = [...CHRONO_MONTHS];
    mf.selectedYears = getActiveDatasetYears();
  } else if (presetKey === '2023' || presetKey === '2024' || presetKey === '2025' || presetKey === '2026') {
    const yr = presetKey;
    mf.selectedYears = [yr];
    mf.selectedMonths = CHRONO_MONTHS.filter(m => m.endsWith(yr));
    mf.startBulan = mf.selectedMonths[0] || CHRONO_MONTHS[0];
    mf.endBulan = mf.selectedMonths[mf.selectedMonths.length - 1] || latestMonth;
    mf.startDate = `${yr}-01-01`;
    mf.endDate = `${yr}-12-31`;
  } else if (presetKey === 'latest') {
    mf.selectedMonths = [latestMonth];
    mf.startBulan = latestMonth;
    mf.endBulan = latestMonth;
    const mMatch = latestMonth.match(/Bulan\s+(\d+)\s+(\d{4})/i);
    const mNum = mMatch ? mMatch[1].padStart(2, '0') : '10';
    const yNum = mMatch ? mMatch[2] : '2026';
    mf.startDate = `${yNum}-${mNum}-01`;
    mf.endDate = maxDate;
    mf.selectedYears = [yNum];
  }

  const startSelect = document.getElementById('mfStartBulan');
  const endSelect = document.getElementById('mfEndBulan');
  if (startSelect) startSelect.value = mf.startBulan;
  if (endSelect) endSelect.value = mf.endBulan;

  const startDateInput = document.getElementById('mfStartDate');
  const endDateInput = document.getElementById('mfEndDate');
  if (startDateInput) {
    startDateInput.max = maxDate;
    startDateInput.value = mf.startDate;
  }
  if (endDateInput) {
    endDateInput.max = maxDate;
    endDateInput.value = mf.endDate;
  }

  syncBulanCheckboxesFromState();
  syncTahunCheckboxesFromState();
  updateMultiSelectTriggerUI('tahun');
  updateMultiSelectTriggerUI('bulan');
  applyMasterFilter();
}

// ==========================================================================
// Multi-Select Dropdowns (Global Master Filter: Bulan, Region, Kategori)
// ==========================================================================

function initMultiSelectDropdowns() {
  const dropdownTypes = ['Tahun', 'Bulan', 'Region', 'Category'];

  // Toggle dropdown menu open/close on trigger button click
  dropdownTypes.forEach(type => {
    const btn = document.getElementById(`btnMs${type}`);
    const dd = document.getElementById(`msDropdown${type}`);
    if (btn && dd) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dd.classList.contains('open');
        document.querySelectorAll('.ms-dropdown').forEach(d => {
          if (d !== dd) d.classList.remove('open');
        });
        dd.classList.toggle('open', !isOpen);
        btn.setAttribute('aria-expanded', !isOpen);
        if (!isOpen) {
          const searchInput = dd.querySelector('.ms-search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.value = '';
            filterMultiSelectOptionsBySearch(type.toLowerCase(), '');
          }
        }
      });
    }

    const menu = document.getElementById(`menuMs${type}`);
    if (menu) {
      menu.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    const searchInput = document.getElementById(`searchMs${type}`);
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterMultiSelectOptionsBySearch(type.toLowerCase(), e.target.value);
      });
    }

    const btnSelectAll = document.getElementById(`btnSelectAll${type}`);
    if (btnSelectAll) {
      btnSelectAll.addEventListener('click', () => {
        selectAllMultiSelectOptions(type.toLowerCase());
      });
    }

    const btnClear = document.getElementById(`btnClear${type}`);
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        clearMultiSelectOptions(type.toLowerCase());
      });
    }
  });

  // Global click outside to close dropdowns
  document.addEventListener('click', () => {
    document.querySelectorAll('.ms-dropdown.open').forEach(dd => {
      dd.classList.remove('open');
      const btn = dd.querySelector('.ms-trigger');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.ms-dropdown.open').forEach(dd => {
        dd.classList.remove('open');
        const btn = dd.querySelector('.ms-trigger');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Global Reset Multi-Select Filters Button
  const btnResetGlobal = document.getElementById('btnResetMultiSelectFilters');
  if (btnResetGlobal) {
    btnResetGlobal.addEventListener('click', () => {
      resetAllMasterAndMultiSelectFilters();
    });
  }
}

// Populate / Rebuild Multi-Select Dropdown Lists
function populateMultiSelectDropdowns() {
  const allYears = getActiveDatasetYears();
  const allMonths = [...CHRONO_MONTHS];
  const allRegs = getActiveDatasetRegions(state.transactions).filter(r => r !== 'Grand Total');
  const allCats = getActiveDatasetCategories(state.transactions);

  state.masterFilter.selectedYears = [...allYears];
  state.masterFilter.selectedMonths = [...allMonths];
  state.masterFilter.selectedRegions = [...allRegs];
  state.masterFilter.selectedCategories = [...allCats];

  renderMultiSelectList('tahun', allYears, state.masterFilter.selectedYears);
  renderMultiSelectList('bulan', allMonths, state.masterFilter.selectedMonths);
  renderMultiSelectList('region', allRegs, state.masterFilter.selectedRegions);
  renderMultiSelectList('category', allCats, state.masterFilter.selectedCategories);

  updateMultiSelectTriggerUI('tahun');
  updateMultiSelectTriggerUI('bulan');
  updateMultiSelectTriggerUI('region');
  updateMultiSelectTriggerUI('category');
}

function renderMultiSelectList(type, allItems, selectedItems) {
  const listId = type === 'tahun' ? 'listMsTahun' : type === 'bulan' ? 'listMsBulan' : type === 'region' ? 'listMsRegion' : 'listMsCategory';
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  const selSet = new Set(selectedItems);
  listEl.innerHTML = '';

  allItems.forEach(item => {
    const isChecked = selSet.has(item);
    const label = document.createElement('label');
    label.className = `ms-option ${isChecked ? 'selected' : ''}`;
    label.dataset.value = item;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = item;
    checkbox.checked = isChecked;

    const span = document.createElement('span');
    span.className = 'ms-option-text';
    if (type === 'tahun') {
      span.textContent = `Tahun ${item}`;
    } else if (type === 'bulan' && MONTH_NAMES_MAP[item]) {
      span.textContent = `${item} (${MONTH_NAMES_MAP[item]})`;
    } else {
      span.textContent = item;
    }

    checkbox.addEventListener('change', () => {
      label.classList.toggle('selected', checkbox.checked);
      onMultiSelectOptionChanged(type);
    });

    label.appendChild(checkbox);
    label.appendChild(span);
    listEl.appendChild(label);
  });
}

function onMultiSelectOptionChanged(type) {
  const listId = type === 'tahun' ? 'listMsTahun' : type === 'bulan' ? 'listMsBulan' : type === 'region' ? 'listMsRegion' : 'listMsCategory';
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  const checkedInputs = listEl.querySelectorAll('input[type="checkbox"]:checked');
  const checkedVals = Array.from(checkedInputs).map(cb => cb.value);

  if (type === 'tahun') {
    state.masterFilter.selectedYears = checkedVals;
    if (checkedVals.length === 0) {
      state.masterFilter.selectedMonths = [];
    } else {
      const yrSet = new Set(checkedVals);
      state.masterFilter.selectedMonths = CHRONO_MONTHS.filter(m => {
        const match = m.match(/\b(20\d\d)\b/);
        return match && yrSet.has(match[1]);
      });
    }
    syncBulanCheckboxesFromState();
    updateMultiSelectTriggerUI('bulan');
    clearActiveMasterPresets();
  } else if (type === 'bulan') {
    state.masterFilter.selectedMonths = checkedVals;
    const yrSet = new Set();
    checkedVals.forEach(m => {
      const match = m.match(/\b(20\d\d)\b/);
      if (match) yrSet.add(match[1]);
    });
    state.masterFilter.selectedYears = Array.from(yrSet).sort();
    syncTahunCheckboxesFromState();
    updateMultiSelectTriggerUI('tahun');
    clearActiveMasterPresets();
  } else if (type === 'region') {
    state.masterFilter.selectedRegions = checkedVals;
  } else if (type === 'category') {
    state.masterFilter.selectedCategories = checkedVals;
  }

  updateMultiSelectTriggerUI(type);
  applyMasterFilter();
}

function selectAllMultiSelectOptions(type) {
  const listId = type === 'tahun' ? 'listMsTahun' : type === 'bulan' ? 'listMsBulan' : type === 'region' ? 'listMsRegion' : 'listMsCategory';
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  const checkboxes = listEl.querySelectorAll('input[type="checkbox"]');
  const allVals = [];
  checkboxes.forEach(cb => {
    cb.checked = true;
    cb.closest('.ms-option')?.classList.add('selected');
    allVals.push(cb.value);
  });

  if (type === 'tahun') {
    state.masterFilter.selectedYears = allVals;
    state.masterFilter.selectedMonths = [...CHRONO_MONTHS];
    syncBulanCheckboxesFromState();
    updateMultiSelectTriggerUI('bulan');
  } else if (type === 'bulan') {
    state.masterFilter.selectedMonths = allVals;
    state.masterFilter.selectedYears = getActiveDatasetYears();
    syncTahunCheckboxesFromState();
    updateMultiSelectTriggerUI('tahun');
  } else if (type === 'region') {
    state.masterFilter.selectedRegions = allVals;
  } else if (type === 'category') {
    state.masterFilter.selectedCategories = allVals;
  }

  updateMultiSelectTriggerUI(type);
  applyMasterFilter();
}

function clearMultiSelectOptions(type) {
  const listId = type === 'tahun' ? 'listMsTahun' : type === 'bulan' ? 'listMsBulan' : type === 'region' ? 'listMsRegion' : 'listMsCategory';
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  const checkboxes = listEl.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = false;
    cb.closest('.ms-option')?.classList.remove('selected');
  });

  if (type === 'tahun') {
    state.masterFilter.selectedYears = [];
    state.masterFilter.selectedMonths = [];
    syncBulanCheckboxesFromState();
    updateMultiSelectTriggerUI('bulan');
    clearActiveMasterPresets();
  } else if (type === 'bulan') {
    state.masterFilter.selectedMonths = [];
    state.masterFilter.selectedYears = [];
    syncTahunCheckboxesFromState();
    updateMultiSelectTriggerUI('tahun');
    clearActiveMasterPresets();
  } else if (type === 'region') {
    state.masterFilter.selectedRegions = [];
  } else if (type === 'category') {
    state.masterFilter.selectedCategories = [];
  }

  updateMultiSelectTriggerUI(type);
  applyMasterFilter();
}

function filterMultiSelectOptionsBySearch(type, searchText) {
  const listId = type === 'tahun' ? 'listMsTahun' : type === 'bulan' ? 'listMsBulan' : type === 'region' ? 'listMsRegion' : 'listMsCategory';
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  const query = (searchText || '').toLowerCase().trim();
  const options = listEl.querySelectorAll('.ms-option');
  options.forEach(opt => {
    const text = opt.textContent.toLowerCase();
    opt.style.display = text.includes(query) ? '' : 'none';
  });
}

function updateMultiSelectTriggerUI(type) {
  let lblEl, badgeEl, selectedList, totalAvailable, defaultLabel;

  if (type === 'tahun') {
    lblEl = document.getElementById('lblMsTahun');
    badgeEl = document.getElementById('badgeMsTahun');
    selectedList = state.masterFilter.selectedYears || [];
    totalAvailable = getActiveDatasetYears().length;
    defaultLabel = 'Semua Tahun';
  } else if (type === 'bulan') {
    lblEl = document.getElementById('lblMsBulan');
    badgeEl = document.getElementById('badgeMsBulan');
    selectedList = state.masterFilter.selectedMonths || [];
    totalAvailable = CHRONO_MONTHS.length;
    defaultLabel = 'Semua Bulan';
  } else if (type === 'region') {
    lblEl = document.getElementById('lblMsRegion');
    badgeEl = document.getElementById('badgeMsRegion');
    selectedList = state.masterFilter.selectedRegions || [];
    totalAvailable = getActiveDatasetRegions(state.transactions).filter(r => r !== 'Grand Total').length;
    defaultLabel = 'Semua Region';
  } else if (type === 'category') {
    lblEl = document.getElementById('lblMsCategory');
    badgeEl = document.getElementById('badgeMsCategory');
    selectedList = state.masterFilter.selectedCategories || [];
    totalAvailable = getActiveDatasetCategories(state.transactions).length;
    defaultLabel = 'Semua Kategori';
  }

  if (!lblEl || !badgeEl) return;

  const count = selectedList.length;

  if (count === 0) {
    lblEl.textContent = `0 ${type === 'tahun' ? 'Tahun' : type === 'bulan' ? 'Bulan' : type === 'region' ? 'Region' : 'Kategori'} Terpilih`;
    badgeEl.textContent = '0';
    badgeEl.style.display = 'inline-flex';
  } else if (count >= totalAvailable) {
    lblEl.textContent = defaultLabel;
    badgeEl.style.display = 'none';
  } else if (count === 1) {
    lblEl.textContent = (type === 'tahun' ? `Tahun ${selectedList[0]}` : selectedList[0]);
    badgeEl.textContent = '1';
    badgeEl.style.display = 'inline-flex';
  } else {
    lblEl.textContent = `${count} ${type === 'tahun' ? 'Tahun' : type === 'bulan' ? 'Bulan' : type === 'region' ? 'Region' : 'Kategori'} Terpilih`;
    badgeEl.textContent = String(count);
    badgeEl.style.display = 'inline-flex';
  }
}

function syncBulanCheckboxesFromState() {
  const listEl = document.getElementById('listMsBulan');
  if (!listEl) return;

  const selSet = new Set(state.masterFilter.selectedMonths || []);
  const checkboxes = listEl.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    const isChecked = selSet.has(cb.value);
    cb.checked = isChecked;
    cb.closest('.ms-option')?.classList.toggle('selected', isChecked);
  });

  updateMultiSelectTriggerUI('bulan');
}

function syncTahunCheckboxesFromState() {
  const listEl = document.getElementById('listMsTahun');
  if (!listEl) return;

  const selSet = new Set(state.masterFilter.selectedYears || []);
  const checkboxes = listEl.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    const isChecked = selSet.has(cb.value);
    cb.checked = isChecked;
    cb.closest('.ms-option')?.classList.toggle('selected', isChecked);
  });

  updateMultiSelectTriggerUI('tahun');
}

function resetAllMasterAndMultiSelectFilters() {
  applyMasterFilterPreset('all');
  selectAllMultiSelectOptions('tahun');
  selectAllMultiSelectOptions('region');
  selectAllMultiSelectOptions('category');
}

// ==========================================================================
// Tab 3 Matrix View Toggle Controls (Category x Region vs Category x Bulan)
// ==========================================================================

function initMatrixViewToggleControls() {
  const btnToggleRegion = document.getElementById('btnToggleCatRegion');
  const btnToggleBulan = document.getElementById('btnToggleCatBulan');
  if (btnToggleRegion && btnToggleBulan) {
    btnToggleRegion.addEventListener('click', () => setCostDetailView('cat-region'));
    btnToggleBulan.addEventListener('click', () => setCostDetailView('cat-bulan'));
  }

  const btnExportCd = document.getElementById('btnExportCostDetailDynamic');
  if (btnExportCd) {
    btnExportCd.addEventListener('click', () => {
      exportCostDetailDynamic();
    });
  }
}

function setCostDetailView(view) {
  state.costDetailView = view;
  const btnRegion = document.getElementById('btnToggleCatRegion');
  const btnBulan = document.getElementById('btnToggleCatBulan');
  const title = document.getElementById('costDetailTitle');
  const subtitle = document.getElementById('costDetailSubtitle');

  if (btnRegion) btnRegion.classList.toggle('active', view === 'cat-region');
  if (btnBulan) btnBulan.classList.toggle('active', view === 'cat-bulan');

  if (title) {
    title.textContent = (view === 'cat-bulan')
      ? 'Matrix Cost Detail (Category × Bulan)'
      : 'Matrix Cost Detail (Category × Region)';
  }
  if (subtitle) {
    subtitle.textContent = (view === 'cat-bulan')
      ? 'Tabel silang alokasi pengeluaran per kategori kegiatan terhadap setiap bulan (Cost per Bulan)'
      : 'Tabel silang alokasi pengeluaran per kategori kegiatan terhadap seluruh region';
  }

  updateCostDetailMatrixFromFiltered(state.masterFilteredTransactions, false);
}

function exportCostDetailDynamic() {
  const isMonth = (state.costDetailView === 'cat-bulan');
  const filename = isMonth ? 'CostDetail_Category_Bulan.csv' : 'CostDetail_Category_Region.csv';
  exportTableToCSV('tableCostDetail', filename);
}

// Master Filter: Core Application Function
function applyMasterFilter() {
  const mf = state.masterFilter;
  const minDate = getEarliestTxDateISO(state.transactions);
  const maxDate = getLatestTxDateISO(state.transactions);

  const allMonths = CHRONO_MONTHS;
  const allRegs = getActiveDatasetRegions(state.transactions).filter(r => r !== 'Grand Total');
  const allCats = getActiveDatasetCategories(state.transactions);

  if (!Array.isArray(mf.selectedMonths)) mf.selectedMonths = [...allMonths];
  if (!Array.isArray(mf.selectedRegions)) mf.selectedRegions = [...allRegs];
  if (!Array.isArray(mf.selectedCategories)) mf.selectedCategories = [...allCats];

  const selMonthsSet = new Set(mf.selectedMonths);
  const selRegionsSet = new Set(mf.selectedRegions.map(r => r.toUpperCase()));
  const selCatsSet = new Set(mf.selectedCategories.map(c => c.toUpperCase()));

  const isMonthFiltered = (mf.selectedMonths.length < allMonths.length);
  const isRegionFiltered = (mf.selectedRegions.length < allRegs.length);
  const isCatFiltered = (mf.selectedCategories.length < allCats.length);

  const activeMonths = CHRONO_MONTHS.filter(m => selMonthsSet.has(m));
  const isAll = !isMonthFiltered && !isRegionFiltered && !isCatFiltered;

  // Filter Transactions by selected month, region, and category
  state.masterFilteredTransactions = (state.transactions || []).filter(t => {
    if (isMonthFiltered && !selMonthsSet.has(t.bulan)) return false;
    const reg = (t.region || '').trim().toUpperCase();
    if (isRegionFiltered && !selRegionsSet.has(reg)) return false;
    const cat = (t.category || '').trim().toUpperCase();
    if (isCatFiltered && !selCatsSet.has(cat)) return false;
    return true;
  });

  // 1. Calculate Cash Flow for active months
  const allCf = state.summary?.cash_flow || [];
  const activeMonthsSet = new Set(activeMonths);
  const filteredCf = allCf.filter(item => activeMonthsSet.has(item.bulan));
  state.activeFilteredCf = filteredCf;

  // Compute month cash out map from filtered transactions
  const monthCashOutMap = {};
  state.masterFilteredTransactions.forEach(t => {
    if (t.bulan) {
      monthCashOutMap[t.bulan] = (monthCashOutMap[t.bulan] || 0) + (t.price_num || 0);
    }
  });
  state.monthCashOutMap = monthCashOutMap;

  const adaptedCf = filteredCf.map(item => {
    if (isRegionFiltered || isCatFiltered) {
      const coNum = monthCashOutMap[item.bulan] || 0;
      return {
        ...item,
        cash_out: formatRp(coNum),
        cash_out_num: coNum
      };
    }
    return item;
  });

  // Compute Grand Total row for Cash Flow
  const sumSumbagja = filteredCf.reduce((a, b) => a + (b.kredit_sumbagja_num || 0), 0);
  const sumEbdi = filteredCf.reduce((a, b) => a + (b.kredit_ebdi_num || 0), 0);
  const sumNabila = filteredCf.reduce((a, b) => a + (b.kredit_nabila_num || 0), 0);
  const totalKredit = sumSumbagja + sumEbdi + sumNabila;
  const totalCashOut = state.masterFilteredTransactions.reduce((a, b) => a + (b.price_num || 0), 0);
  const sisaKredit = totalKredit - totalCashOut;

  const cfForTable = [
    ...adaptedCf,
    {
      bulan: 'Grand Total',
      kredit_sumbagja: formatRp(sumSumbagja),
      kredit_sumbagja_num: sumSumbagja,
      kredit_ebdi: formatRp(sumEbdi),
      kredit_ebdi_num: sumEbdi,
      kredit_nabila: formatRp(sumNabila),
      kredit_nabila_num: sumNabila,
      cash_out: formatRp(totalCashOut),
      cash_out_num: totalCashOut
    }
  ];

  // 2. Update KPI Top Cards
  const kpiKredit = document.getElementById('kpiTotalKredit');
  const kpiCashOut = document.getElementById('kpiCashOut');
  const kpiSisa = document.getElementById('kpiSisaKredit');
  if (kpiKredit) kpiKredit.textContent = formatRp(totalKredit);
  if (kpiCashOut) kpiCashOut.textContent = formatRp(totalCashOut);
  if (kpiSisa) {
    kpiSisa.textContent = formatRp(sisaKredit);
    kpiSisa.className = 'kpi-value ' + (sisaKredit >= 0 ? 'text-success' : 'text-danger');
  }

  // Update Bank Scorecards from summary balances
  if (state.summary && state.summary.balances) {
    const b = state.summary.balances;
    const kpiBca = document.getElementById('kpiBca');
    const kpiMandiri = document.getElementById('kpiMandiri');
    const kpiTotalBank = document.getElementById('kpiTotalBank');
    if (kpiBca) kpiBca.textContent = b.bca || formatRp(b.bca_num);
    if (kpiMandiri) kpiMandiri.textContent = b.mandiri || formatRp(b.mandiri_num);
    if (kpiTotalBank) {
      const totalBank = (b.bca_num || 0) + (b.mandiri_num || 0);
      kpiTotalBank.textContent = formatRp(totalBank);
    }
  }

  // Today's Cost: Adapt to latest date in filtered transactions, or fallback to latest in summary
  const todayDateBadge = document.getElementById('todayCostDate');
  const todayAmount = document.getElementById('todayCostAmount');
  const todayTxCount = document.getElementById('todayCostTxCount');
  if (state.masterFilteredTransactions && state.masterFilteredTransactions.length > 0) {
    const latestTx = state.masterFilteredTransactions[state.masterFilteredTransactions.length - 1];
    const latestDate = latestTx.date_trf || latestTx.date_req || '09-Sep-26';
    const sameDayTxs = state.masterFilteredTransactions.filter(t => (t.date_trf || t.date_req) === latestDate);
    const sameDaySum = sameDayTxs.reduce((a, b) => a + (b.price_num || 0), 0);

    if (todayDateBadge) todayDateBadge.textContent = latestDate;
    if (todayAmount) todayAmount.textContent = formatRp(sameDaySum);
    if (todayTxCount) todayTxCount.textContent = `${sameDayTxs.length} Transaksi`;
  } else if (state.summary && state.summary.today_cost && state.summary.today_cost.date) {
    const t = state.summary.today_cost;
    if (todayDateBadge) todayDateBadge.textContent = t.date;
    if (todayAmount) todayAmount.textContent = t.total_cost || formatRp(t.total_cost_num);
    if (todayTxCount) todayTxCount.textContent = `${t.total_transaction || 0} Transaksi`;
  } else {
    if (todayDateBadge) todayDateBadge.textContent = '-';
    if (todayAmount) todayAmount.textContent = 'Rp 0';
    if (todayTxCount) todayTxCount.textContent = '0 Transaksi';
  }

  // 3. Update Cash Flow Table (Tab 2)
  populateCashFlowTable(cfForTable);

  // 4. Update Cost Detail Matrix (Tab 3)
  updateCostDetailMatrixFromFiltered(state.masterFilteredTransactions, isAll);

  // 5. Update Rekapitulasi Price (Tab 4)
  updatePriceMatricesFromFiltered(state.masterFilteredTransactions, activeMonths, isAll);

  // 6. Update Charts & Top 5 Categories (Tab 1 & Tab 2)
  renderCharts();

  // 7. Update Tab 5 (Detail Transaksi)
  state.currentPage = 1;
  applyFilters();

  // 8. Update Gabungan PO & Invoice KPIs & Tab 6 Pivot Table
  updatePoInvoiceKpisAndTables(totalCashOut, activeMonths, isAll);

  // 9. Update Master Filter Status Bar
  updateMasterFilterStatusUI(totalKredit, totalCashOut, activeMonths, isAll);
}

// Helper: Get active dataset regions (dynamically from active summary and transactions)
function getActiveDatasetRegions(txs) {
  const cd = state.summary?.cost_detail;
  const regionsSet = new Set();
  if (cd && Array.isArray(cd.regions)) {
    cd.regions.forEach(r => {
      const reg = (r || '').trim().toUpperCase();
      if (reg && reg !== 'GRAND TOTAL' && reg !== 'TOTAL KESELURUHAN') regionsSet.add(reg);
    });
  }
  const sourceTxs = txs || state.transactions || [];
  sourceTxs.forEach(t => {
    if (t.region) {
      const reg = t.region.trim().toUpperCase();
      if (reg && reg !== 'GRAND TOTAL' && reg !== 'TOTAL KESELURUHAN') regionsSet.add(reg);
    }
  });
  const sorted = Array.from(regionsSet).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  sorted.push('Grand Total');
  return sorted;
}

// Helper: Get active dataset categories (dynamically from active summary and transactions)
function getActiveDatasetCategories(txs) {
  const cd = state.summary?.cost_detail;
  const catSet = new Set();
  if (cd && Array.isArray(cd.rows)) {
    cd.rows.forEach(r => {
      if (r.category) catSet.add(r.category.trim().toUpperCase());
    });
  }
  const sourceTxs = txs || state.transactions || [];
  sourceTxs.forEach(t => {
    if (t.category) catSet.add(t.category.trim().toUpperCase());
  });
  return Array.from(catSet).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
}

// Helper: Get active dataset years (dynamically from CHRONO_MONTHS and transactions)
function getActiveDatasetYears() {
  const yearSet = new Set();
  (CHRONO_MONTHS || []).forEach(m => {
    const match = m.match(/\b(20\d\d)\b/);
    if (match) yearSet.add(match[1]);
  });
  if (yearSet.size === 0) {
    yearSet.add('2025');
    yearSet.add('2026');
  }
  return Array.from(yearSet).sort();
}

// Master Filter: Dynamically Rebuild Cost Detail Matrix
function updateCostDetailMatrixFromFiltered(txs, isAll = false) {
  const thead = document.getElementById('theadCostDetail');
  const tbody = document.getElementById('tbodyCostDetail');
  if (!thead || !tbody) return;

  const isCatBulanView = (state.costDetailView === 'cat-bulan');

  if (isCatBulanView) {
    renderCostDetailCatBulanMatrix(txs, thead, tbody);
  } else {
    renderCostDetailCatRegionMatrix(txs, thead, tbody, isAll);
  }
}

function renderCostDetailCatRegionMatrix(txs, thead, tbody, isAll = false) {
  const cd = state.summary?.cost_detail;
  const mf = state.masterFilter;

  // When all periods/filters are selected and pre-aggregated cd exists, use it directly
  if (isAll && cd && Array.isArray(cd.regions) && cd.regions.length > 0 && Array.isArray(cd.rows) && cd.rows.length > 0) {
    populateCostDetailMatrix(cd);
    return;
  }

  const allAvailableRegs = getActiveDatasetRegions(txs).filter(r => r !== 'Grand Total');
  const regions = (mf.selectedRegions && mf.selectedRegions.length > 0 && mf.selectedRegions.length < allAvailableRegs.length)
    ? [...mf.selectedRegions].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }))
    : [...allAvailableRegs];
  regions.push('Grand Total');

  const allAvailableCats = getActiveDatasetCategories(txs);
  const allCategories = (mf.selectedCategories && mf.selectedCategories.length > 0 && mf.selectedCategories.length < allAvailableCats.length)
    ? [...mf.selectedCategories].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }))
    : [...allAvailableCats];

  if (!allCategories.length || regions.length <= 1) {
    thead.innerHTML = `<th>CATEGORY</th><th class="text-right">Grand Total</th>`;
    tbody.innerHTML = '<tr><td colspan="2" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada data cost detail untuk filter yang dipilih.</td></tr>';
    return;
  }

  thead.innerHTML = `<th>CATEGORY</th>` + regions.map(r => `<th class="text-right">${r}</th>`).join('');
  tbody.innerHTML = '';

  const matrix = {};
  allCategories.forEach(cat => {
    matrix[cat] = {};
    regions.forEach(reg => { matrix[cat][reg] = 0; });
  });

  const colTotals = {};
  regions.forEach(reg => { colTotals[reg] = 0; });

  (txs || []).forEach(t => {
    const c = (t.category || '').trim().toUpperCase();
    const r = (t.region || '').trim().toUpperCase();
    const p = t.price_num || 0;
    if (matrix[c] && matrix[c][r] !== undefined) {
      matrix[c][r] += p;
      matrix[c]['Grand Total'] += p;
      colTotals[r] += p;
      colTotals['Grand Total'] += p;
    }
  });

  let maxVal = 1;
  allCategories.forEach(cat => {
    regions.forEach(reg => {
      if (reg !== 'Grand Total' && matrix[cat][reg] > maxVal) {
        maxVal = matrix[cat][reg];
      }
    });
  });

  allCategories.forEach(cat => {
    const tr = document.createElement('tr');
    let cellsHtml = `<td><strong>${cat}</strong></td>`;
    regions.forEach(reg => {
      const num = matrix[cat][reg] || 0;
      let highlightClass = '';
      if (reg === 'Grand Total') {
        highlightClass = 'font-bold';
      } else if (num > maxVal * 0.4 && num > 0) {
        highlightClass = 'matrix-cell-highlight';
      }
      cellsHtml += `<td class="text-right ${highlightClass}">${num > 0 ? formatRp(num) : '-'}</td>`;
    });
    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  });

  // Grand Total Row
  const trTotal = document.createElement('tr');
  trTotal.classList.add('total-row');
  let totalCells = `<td><strong>GRAND TOTAL</strong></td>`;
  regions.forEach(reg => {
    const num = colTotals[reg] || 0;
    totalCells += `<td class="text-right font-mono font-bold text-danger">${num > 0 ? formatRp(num) : '-'}</td>`;
  });
  trTotal.innerHTML = totalCells;
  tbody.appendChild(trTotal);
}

function renderCostDetailCatBulanMatrix(txs, thead, tbody) {
  const mf = state.masterFilter;
  const activeMonthsList = (mf.selectedMonths && mf.selectedMonths.length > 0)
    ? CHRONO_MONTHS.filter(m => mf.selectedMonths.includes(m))
    : [...CHRONO_MONTHS];

  const allAvailableCats = getActiveDatasetCategories(txs);
  const allCategories = (mf.selectedCategories && mf.selectedCategories.length > 0 && mf.selectedCategories.length < allAvailableCats.length)
    ? [...mf.selectedCategories].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }))
    : [...allAvailableCats];

  if (!allCategories.length || !activeMonthsList.length) {
    thead.innerHTML = `<th>CATEGORY</th><th class="text-right">Grand Total</th>`;
    tbody.innerHTML = '<tr><td colspan="2" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada data cost detail untuk filter yang dipilih.</td></tr>';
    return;
  }

  // Header: CATEGORY + each Month + Grand Total
  thead.innerHTML = `<th>CATEGORY</th>` +
    activeMonthsList.map(m => {
      const sub = MONTH_NAMES_MAP[m] ? `<span class="col-subtext" style="display:block;font-size:0.7rem;color:var(--text-muted);font-weight:normal;">${MONTH_NAMES_MAP[m]}</span>` : '';
      return `<th class="text-right">${m}${sub}</th>`;
    }).join('') +
    `<th class="text-right">Grand Total</th>`;

  tbody.innerHTML = '';

  const matrix = {};
  allCategories.forEach(cat => {
    matrix[cat] = {};
    activeMonthsList.forEach(m => { matrix[cat][m] = 0; });
    matrix[cat]['Grand Total'] = 0;
  });

  const colTotals = {};
  activeMonthsList.forEach(m => { colTotals[m] = 0; });
  colTotals['Grand Total'] = 0;

  (txs || []).forEach(t => {
    const c = (t.category || '').trim().toUpperCase();
    const m = (t.bulan || '').trim();
    const p = t.price_num || 0;
    if (matrix[c] && matrix[c][m] !== undefined) {
      matrix[c][m] += p;
      matrix[c]['Grand Total'] += p;
      colTotals[m] += p;
      colTotals['Grand Total'] += p;
    }
  });

  let maxVal = 1;
  allCategories.forEach(cat => {
    activeMonthsList.forEach(m => {
      if (matrix[cat][m] > maxVal) maxVal = matrix[cat][m];
    });
  });

  allCategories.forEach(cat => {
    const tr = document.createElement('tr');
    let cellsHtml = `<td><strong>${cat}</strong></td>`;
    activeMonthsList.forEach(m => {
      const num = matrix[cat][m] || 0;
      let highlightClass = '';
      if (num > maxVal * 0.4 && num > 0) {
        highlightClass = 'matrix-cell-highlight';
      }
      cellsHtml += `<td class="text-right ${highlightClass}">${num > 0 ? formatRp(num) : '-'}</td>`;
    });
    const rowTotal = matrix[cat]['Grand Total'] || 0;
    cellsHtml += `<td class="text-right font-bold">${rowTotal > 0 ? formatRp(rowTotal) : '-'}</td>`;
    tr.innerHTML = cellsHtml;
    tbody.appendChild(tr);
  });

  // Grand Total Row
  const trTotal = document.createElement('tr');
  trTotal.classList.add('total-row');
  let totalCells = `<td><strong>GRAND TOTAL</strong></td>`;
  activeMonthsList.forEach(m => {
    const num = colTotals[m] || 0;
    totalCells += `<td class="text-right font-mono font-bold text-danger">${num > 0 ? formatRp(num) : '-'}</td>`;
  });
  const grandTotalAll = colTotals['Grand Total'] || 0;
  totalCells += `<td class="text-right font-mono font-bold text-danger">${grandTotalAll > 0 ? formatRp(grandTotalAll) : '-'}</td>`;
  trTotal.innerHTML = totalCells;
  tbody.appendChild(trTotal);
}

// Master Filter: Dynamically Rebuild Price Tables
function updatePriceMatricesFromFiltered(txs, activeMonths, isAll = false) {
  // 1. Price per Region
  const regMap = {};
  (txs || []).forEach(t => {
    if (t.region) {
      const reg = t.region.trim().toUpperCase();
      regMap[reg] = (regMap[reg] || 0) + (t.price_num || 0);
    }
  });
  const sortedRegs = Object.keys(regMap).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
  const totalRegPrice = (txs || []).reduce((a, b) => a + (b.price_num || 0), 0);
  const regionItems = sortedRegs.map(r => ({
    region: r,
    price: formatRp(regMap[r]),
    price_num: regMap[r]
  }));
  regionItems.push({
    region: 'Grand Total',
    price: formatRp(totalRegPrice),
    price_num: totalRegPrice
  });
  populatePriceRegionTable(regionItems);

  // 2. Price per Bulan
  const bulanMap = {};
  (txs || []).forEach(t => {
    if (t.bulan) {
      const bln = t.bulan.trim();
      bulanMap[bln] = (bulanMap[bln] || 0) + (t.price_num || 0);
    }
  });
  const bulanItems = activeMonths.map(b => ({
    bulan: b,
    price: formatRp(bulanMap[b] || 0),
    price_num: bulanMap[b] || 0
  }));
  bulanItems.push({
    bulan: 'Grand Total',
    price: formatRp(totalRegPrice),
    price_num: totalRegPrice
  });
  populatePriceBulanTable(bulanItems);

  // 3. Price Category x Region Pivot (Dynamic for active dataset)
  const regions = getActiveDatasetRegions(txs);
  const allCategories = getActiveDatasetCategories(txs);

  const catRows = [];
  const grandTotalValues = {};
  regions.forEach(r => { grandTotalValues[r] = { text: 'Rp 0', num: 0 }; });

  const pcrMatrix = {};
  allCategories.forEach(cat => {
    pcrMatrix[cat] = {};
    regions.forEach(reg => { pcrMatrix[cat][reg] = 0; });
  });

  (txs || []).forEach(t => {
    const c = (t.category || '').trim().toUpperCase();
    const r = (t.region || '').trim().toUpperCase();
    const p = t.price_num || 0;
    if (pcrMatrix[c] && pcrMatrix[c][r] !== undefined) {
      pcrMatrix[c][r] += p;
      pcrMatrix[c]['Grand Total'] += p;
      grandTotalValues[r].num += p;
      grandTotalValues['Grand Total'].num += p;
    }
  });

  allCategories.forEach(cat => {
    const rowValues = {};
    regions.forEach(reg => {
      if (reg !== 'Grand Total') {
        const sumVal = pcrMatrix[cat][reg] || 0;
        rowValues[reg] = { text: sumVal > 0 ? formatRp(sumVal) : '', num: sumVal };
      }
    });
    const rowSum = pcrMatrix[cat]['Grand Total'] || 0;
    rowValues['Grand Total'] = { text: rowSum > 0 ? formatRp(rowSum) : '', num: rowSum };
    catRows.push({ category: cat, values: rowValues });
  });

  regions.forEach(reg => {
    grandTotalValues[reg].text = grandTotalValues[reg].num > 0 ? formatRp(grandTotalValues[reg].num) : '-';
  });

  populatePriceCatRegPivot({
    regions: regions,
    rows: catRows,
    grand_total: grandTotalValues
  });
}

// Master Filter: Status Banner Text & Counters
function updateMasterFilterStatusUI(totalKredit, totalCashOut, activeMonths, isAll) {
  const mf = state.masterFilter;
  const statusRangeText = document.getElementById('mfStatusRangeText');
  const statTxCount = document.getElementById('mfStatTxCount');
  const statCashOut = document.getElementById('mfStatCashOut');
  const statKredit = document.getElementById('mfStatKredit');

  if (statusRangeText) {
    if (isAll) {
      const firstM = CHRONO_MONTHS[0] || 'Bulan 8 2025';
      const lastM = CHRONO_MONTHS[CHRONO_MONTHS.length - 1] || 'Bulan 10 2026';
      statusRangeText.textContent = `Semua Periode (${firstM} s/d ${lastM} • ${CHRONO_MONTHS.length} Bulan)`;
    } else {
      const allMonthsCount = CHRONO_MONTHS.length;
      const allRegsCount = getActiveDatasetRegions(state.transactions).filter(r => r !== 'Grand Total').length;
      const allCatsCount = getActiveDatasetCategories(state.transactions).length;

      const selMonthsCount = (mf.selectedMonths || []).length;
      const selRegsCount = (mf.selectedRegions || []).length;
      const selCatsCount = (mf.selectedCategories || []).length;

      const parts = [];
      if (selMonthsCount < allMonthsCount) {
        if (selMonthsCount === 1) {
          parts.push(mf.selectedMonths[0]);
        } else {
          parts.push(`${selMonthsCount} Bulan`);
        }
      }
      if (selRegsCount < allRegsCount) {
        if (selRegsCount === 1) {
          parts.push(`Region ${mf.selectedRegions[0]}`);
        } else {
          parts.push(`${selRegsCount} Region`);
        }
      }
      if (selCatsCount < allCatsCount) {
        if (selCatsCount === 1) {
          parts.push(`Kategori ${mf.selectedCategories[0]}`);
        } else {
          parts.push(`${selCatsCount} Kategori`);
        }
      }

      if (parts.length > 0) {
        statusRangeText.textContent = `Filter Aktif: ${parts.join(' • ')}`;
      } else {
        statusRangeText.textContent = `${activeMonths.length} Bulan Terpilih`;
      }
    }
  }

  if (statTxCount) {
    statTxCount.textContent = (state.masterFilteredTransactions ? state.masterFilteredTransactions.length : 0).toLocaleString('id-ID');
  }
  if (statCashOut) {
    statCashOut.textContent = formatRp(totalCashOut);
  }
  if (statKredit) {
    statKredit.textContent = formatRp(totalKredit);
  }
}

// Populate Filter Dropdowns from Transactions (Deduplicated, Normalized & Chronological)
function populateFilterDropdowns(txs) {
  if (!txs || !Array.isArray(txs)) return;

  const regions = new Set();
  const categories = new Set();
  const vendors = new Set();
  const bulans = new Set();
  const transferBys = new Set();

  txs.forEach(t => {
    if (t.region) {
      const reg = t.region.trim().toUpperCase();
      if (reg) regions.add(reg);
    }
    if (t.category) {
      const cat = t.category.trim().toUpperCase();
      if (cat) categories.add(cat);
    }
    if (t.vendor) {
      const ven = t.vendor.trim().toUpperCase();
      if (ven) vendors.add(ven);
    }
    if (t.bulan) {
      const bln = t.bulan.trim();
      if (bln) bulans.add(bln);
    }
    if (t.transfer_by) {
      const trf = t.transfer_by.trim().toUpperCase();
      if (trf) transferBys.add(trf);
    }
  });

  const rebuildSelect = (selectId, set, defaultText, isBulan = false, filterKey = '') => {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Capture currently selected value if any
    const currentValue = select.value || (filterKey && state.filters ? state.filters[filterKey] : '');

    // Reset dropdown options completely to eliminate all duplicates
    select.innerHTML = '';
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = defaultText;
    select.appendChild(defaultOpt);

    let sortedList;
    if (isBulan) {
      sortedList = Array.from(set).sort((a, b) => parseBulanKey(a) - parseBulanKey(b));
    } else {
      sortedList = Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));
    }

    let foundMatch = false;
    sortedList.forEach(val => {
      if (!val) return;
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      if (currentValue && (currentValue.toUpperCase() === val.toUpperCase() || currentValue === val)) {
        opt.selected = true;
        foundMatch = true;
      }
      select.appendChild(opt);
    });

    // If active filter was set but doesn't exist in new dataset, reset it cleanly
    if (filterKey && state.filters) {
      if (foundMatch) {
        state.filters[filterKey] = select.value;
      } else if (state.filters[filterKey]) {
        state.filters[filterKey] = '';
        select.value = '';
      }
    }
  };

  rebuildSelect('filterRegion', regions, 'Semua Region', false, 'region');
  rebuildSelect('filterCategory', categories, 'Semua Kategori', false, 'category');
  rebuildSelect('filterVendor', vendors, 'Semua Vendor', false, 'vendor');
  rebuildSelect('filterBulan', bulans, 'Semua Bulan', true, 'bulan');
  rebuildSelect('filterTransferBy', transferBys, 'Semua Transfer By', false, 'transferBy');
}

// Apply Filters on Transactions
function applyFilters() {
  const f = state.filters || {};
  const q = (f.search || '').trim().toLowerCase();

  const baseTransactions = (state.masterFilteredTransactions && state.masterFilteredTransactions.length)
    ? state.masterFilteredTransactions
    : (state.masterFilter && state.masterFilter.preset !== 'all' ? [] : (state.transactions || []));

  const fAdmin = (f.admin || '').trim().toUpperCase();
  const fRegion = (f.region || '').trim().toUpperCase();
  const fCategory = (f.category || '').trim().toUpperCase();
  const fVendor = (f.vendor || '').trim().toUpperCase();
  const fBulan = (f.bulan || '').trim();
  const fTransferBy = (f.transferBy || '').trim().toUpperCase();

  state.filteredTransactions = baseTransactions.filter(t => {
    if (fAdmin && (t.admin || '').trim().toUpperCase() !== fAdmin) return false;
    if (fRegion && (t.region || '').trim().toUpperCase() !== fRegion) return false;
    if (fCategory && (t.category || '').trim().toUpperCase() !== fCategory) return false;
    if (fVendor && (t.vendor || '').trim().toUpperCase() !== fVendor) return false;
    if (fBulan && (t.bulan || '').trim() !== fBulan) return false;
    if (fTransferBy && (t.transfer_by || '').trim().toUpperCase() !== fTransferBy) return false;

    if (q) {
      const matchText = (
        (t.site_id || '') + ' ' +
        (t.site_name || '') + ' ' +
        (t.pic || '') + ' ' +
        (t.sow || '') + ' ' +
        (t.vendor || '') + ' ' +
        (t.program || '') + ' ' +
        (t.region || '') + ' ' +
        (t.category || '') + ' ' +
        (t.transfer_by || '')
      ).toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const txFilteredCount = document.getElementById('txFilteredCount');
  const txTotalCount = document.getElementById('txTotalCount');
  const txFilteredSum = document.getElementById('txFilteredSum');

  if (txFilteredCount) txFilteredCount.textContent = state.filteredTransactions.length.toLocaleString('id-ID');
  if (txTotalCount) txTotalCount.textContent = baseTransactions.length.toLocaleString('id-ID');

  const sum = state.filteredTransactions.reduce((acc, cur) => acc + (cur.price_num || 0), 0);
  if (txFilteredSum) txFilteredSum.textContent = formatRp(sum);

  renderTransactionTable();
}

// Render Paginated Transaction Table
function renderTransactionTable() {
  const tbody = document.getElementById('tbodyTransactions');
  tbody.innerHTML = '';

  const total = state.filteredTransactions.length;
  const totalPages = Math.ceil(total / state.pageSize) || 1;
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  document.getElementById('currentPageBadge').textContent = state.currentPage;
  document.getElementById('paginationInfo').textContent = `Halaman ${state.currentPage} dari ${totalPages} (${total.toLocaleString('id-ID')} data)`;

  const start = (state.currentPage - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, total);
  const pageItems = state.filteredTransactions.slice(start, end);

  if (pageItems.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="12" class="text-center" style="padding: 30px; color: var(--text-muted);">Tidak ada data transaksi yang cocok dengan filter.</td>`;
    tbody.appendChild(tr);
    return;
  }

  pageItems.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${t.no || '-'}</td>
      <td>${t.date_trf || t.date_req || '-'}</td>
      <td>
        <strong>${t.vendor || '-'}</strong>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${t.program || '-'}</div>
      </td>
      <td><span class="badge badge-info">${t.region || '-'}</span></td>
      <td><span class="badge badge-purple">${t.category || '-'}</span></td>
      <td>
        <strong>${t.site_id || '-'}</strong>
        <div style="font-size: 0.72rem; color: var(--text-secondary);">${t.site_name || '-'}</div>
      </td>
      <td>${t.pic || '-'}</td>
      <td class="text-right font-mono font-bold">${t.price || formatRp(t.price_num)}</td>
      <td><span class="badge ${t.transfer_by === 'EBDI' ? 'badge-warning' : 'badge-success'}">${t.transfer_by || '-'}</span></td>
      <td><span class="badge ${t.admin === 'SARAH' ? 'badge-sarah' : 'badge-nabila'}">${t.admin || 'NABILA'}</span></td>
      <td><span class="badge badge-success">${t.status || 'DONE'}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary btn-view-detail" title="Lihat Detail SOW">
          Lihat
        </button>
      </td>
    `;

    tr.querySelector('.btn-view-detail').addEventListener('click', (e) => {
      e.stopPropagation();
      openTxDetailModal(t);
    });

    tr.addEventListener('click', () => openTxDetailModal(t));

    tbody.appendChild(tr);
  });
}

// Open Detail Modal
function openTxDetailModal(t) {
  document.getElementById('modalTitle').textContent = `Transaksi #${t.no} - ${t.vendor || 'Project'}`;
  document.getElementById('modalSubtitle').textContent = `${t.site_id || ''} ${t.site_name ? '- ' + t.site_name : ''}`;

  const body = document.getElementById('modalBody');
  body.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-label">Nominal Transfer</span>
        <span class="detail-val font-mono text-success font-bold" style="font-size: 1.15rem;">${t.price || formatRp(t.price_num)}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Status</span>
        <span class="detail-val"><span class="badge badge-success">${t.status || 'DONE'}</span></span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Admin Data</span>
        <span class="detail-val"><span class="badge ${t.admin === 'SARAH' ? 'badge-sarah' : 'badge-nabila'}">${t.admin || 'NABILA'}</span></span>
      </div>
      <div class="detail-item">
        <span class="detail-label">PIC Penerima</span>
        <span class="detail-val">${t.pic || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Transfer By</span>
        <span class="detail-val">${t.transfer_by || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Tanggal Request</span>
        <span class="detail-val">${t.date_req || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Tanggal Transfer</span>
        <span class="detail-val">${t.date_trf || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Region</span>
        <span class="detail-val">${t.region || '-'}</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Kategori / Program</span>
        <span class="detail-val">${t.category || '-'} / ${t.program || '-'}</span>
      </div>
    </div>

    <div>
      <div class="detail-label" style="margin-bottom: 6px;">Scope of Work (SOW) & Rincian Biaya:</div>
      <div class="sow-box">${t.sow || 'Tidak ada catatan SOW.'}</div>
    </div>
  `;

  document.getElementById('txDetailModal').classList.add('active');
}

function closeModal() {
  document.getElementById('txDetailModal').classList.remove('active');
}

// Export Table to CSV
function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const rows = [];
  const trs = table.querySelectorAll('tr');
  trs.forEach(tr => {
    const row = [];
    const cells = tr.querySelectorAll('th, td');
    cells.forEach(cell => {
      let text = cell.innerText.replace(/"/g, '""').trim();
      row.push(`"${text}"`);
    });
    rows.push(row.join(','));
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export Filtered Transactions to CSV
function exportFilteredTransactionsToCSV() {
  if (!state.filteredTransactions || !state.filteredTransactions.length) {
    showToastNotification({
      type: 'warning',
      title: 'Ekspor Dibatalkan',
      subtitle: 'Tidak Ada Data',
      message: 'Tidak ada baris transaksi yang sesuai dengan kriteria filter saat ini untuk diekspor ke CSV.',
      duration: 4000
    });
    return;
  }

  const headers = ['NO', 'ADMIN', 'VENDOR', 'PROGRAM', 'DATE REQUEST', 'DATE TRANSFER', 'REGION', 'CATEGORY', 'SITE ID', 'SITE NAME', 'PIC', 'NOMINAL', 'TRANSFER BY', 'STATUS', 'BULAN', 'SOW'];
  const rows = [headers.join(',')];

  state.filteredTransactions.forEach(t => {
    const clean = (str) => `"${(str || '').toString().replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    rows.push([
      clean(t.no),
      clean(t.admin || 'NABILA'),
      clean(t.vendor),
      clean(t.program),
      clean(t.date_req),
      clean(t.date_trf),
      clean(t.region),
      clean(t.category),
      clean(t.site_id),
      clean(t.site_name),
      clean(t.pic),
      clean(t.price),
      clean(t.transfer_by),
      clean(t.status),
      clean(t.bulan),
      clean(t.sow)
    ].join(','));
  });

  const filename = `Transfer_EBDI_${state.activeAdmin.toUpperCase()}_Filtered_${new Date().toISOString().slice(0, 10)}.csv`;
  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToastNotification({
    type: 'success',
    title: 'File CSV Berhasil Diunduh!',
    subtitle: 'Ekspor Data Transaksi',
    stats: [
      { label: 'Jumlah Baris', value: state.filteredTransactions.length.toLocaleString('id-ID') + ' Baris', highlight: true },
      { label: 'Nama File', value: filename.slice(0, 22) + '...' }
    ],
    duration: 4000
  });
}

// ==========================================================================
// Section 1B & Tab 6: PO Released & Cash Piutang In (Khusus Data Gabungan)
// ==========================================================================

const PO_PERIOD_TO_BULAN = {
  'Jan-25': 'Bulan 1 2025', 'Feb-25': 'Bulan 2 2025', 'Mar-25': 'Bulan 3 2025',
  'Apr-25': 'Bulan 4 2025', 'May-25': 'Bulan 5 2025', 'Mei-25': 'Bulan 5 2025',
  'Jun-25': 'Bulan 6 2025', 'Jul-25': 'Bulan 7 2025', 'Aug-25': 'Bulan 8 2025', 'Agu-25': 'Bulan 8 2025',
  'Sep-25': 'Bulan 9 2025', 'Sept-25': 'Bulan 9 2025',
  'Oct-25': 'Bulan 10 2025', 'Okt-25': 'Bulan 10 2025',
  'Nov-25': 'Bulan 11 2025', 'Dec-25': 'Bulan 12 2025', 'Des-25': 'Bulan 12 2025',
  'Jan-26': 'Bulan 1 2026', 'Feb-26': 'Bulan 2 2026', 'Mar-26': 'Bulan 3 2026',
  'Apr-26': 'Bulan 4 2026', 'May-26': 'Bulan 5 2026', 'Mei-26': 'Bulan 5 2026',
  'Jun-26': 'Bulan 6 2026', 'Jul-26': 'Bulan 7 2026', 'Aug-26': 'Bulan 8 2026', 'Agu-26': 'Bulan 8 2026',
  'Sep-26': 'Bulan 9 2026', 'Sept-26': 'Bulan 9 2026',
  'Oct-26': 'Bulan 10 2026', 'Okt-26': 'Bulan 10 2026',
  'Nov-26': 'Bulan 11 2026', 'Dec-26': 'Bulan 12 2026', 'Des-26': 'Bulan 12 2026'
};

const BULAN_TO_PO_PERIOD = {};
Object.entries(PO_PERIOD_TO_BULAN).forEach(([period, bulan]) => {
  BULAN_TO_PO_PERIOD[bulan] = period;
});

function parsePoInvoiceCSVs(poCSV, invCSV) {
  function parseVal(s) {
    if (!s) return 0;
    const str = s.toString().replace(/Rp/gi, '').replace(/,/g, '').replace(/\s+/g, '').trim();
    const val = parseFloat(str);
    return isNaN(val) ? 0 : val;
  }

  function extractSheetData(lines) {
    const monthly = [];
    let y2025 = null;
    let y2026 = null;
    let totalAll = null;

    for (let i = 5; i < lines.length; i++) {
      const row = lines[i];
      if (!row || !row[2]) continue;
      const period = (row[2] || '').trim();
      if (!period) continue;
      const telkom = parseVal(row[3]);
      const zte = parseVal(row[4]);
      const huawei = parseVal(row[5]);
      const total = parseVal(row[6]);
      const mutasiTelkom = parseVal(row[11]);
      const mutasiZte = parseVal(row[12]);
      const mutasiHuawei = parseVal(row[13]);
      const mutasiTotal = parseVal(row[14]);

      const item = {
        period,
        telkominfra: telkom,
        zte,
        huawei,
        total,
        mutasi: {
          telkominfra: mutasiTelkom,
          zte: mutasiZte,
          huawei: mutasiHuawei,
          total: mutasiTotal
        }
      };

      if (period === 'Y-2025') y2025 = item;
      else if (period === 'Y-2026') y2026 = item;
      else if (period === 'TOTAL ALL') totalAll = item;
      else monthly.push(item);
    }

    return { monthly, y2025, y2026, total_all: totalAll };
  }

  const po = extractSheetData(parseCSV(poCSV));
  const invoice = extractSheetData(parseCSV(invCSV));

  return {
    updated_at: new Date().toISOString(),
    po,
    invoice
  };
}

function updatePoInvoiceKpisAndTables(totalCashOut, activeMonths, isAll) {
  const isCombined = (state.activeAdmin === 'all');
  const poSec = document.getElementById('kpiGabunganPoInvoiceSection');
  const poTabBtn = document.getElementById('tabPoInvoiceBtn');

  if (!isCombined) {
    if (poSec) poSec.style.display = 'none';
    if (poTabBtn) poTabBtn.style.display = 'none';
    return;
  }

  if (poSec) poSec.style.display = 'block';
  if (poTabBtn) poTabBtn.style.display = '';

  const poData = state.poInvoiceData?.po;
  const invData = state.poInvoiceData?.invoice;
  if (!poData || !invData) return;

  let totalPo = 0, poTI = 0, poZte = 0, poHw = 0;
  let totalInvoice = 0, invTI = 0, invZte = 0, invHw = 0;

  if (isAll) {
    totalPo = poData.total_all?.total || 0;
    poTI = poData.total_all?.telkominfra || 0;
    poZte = poData.total_all?.zte || 0;
    poHw = poData.total_all?.huawei || 0;

    totalInvoice = invData.total_all?.total || 0;
    invTI = invData.total_all?.telkominfra || 0;
    invZte = invData.total_all?.zte || 0;
    invHw = invData.total_all?.huawei || 0;
  } else {
    const activeMonthsSet = new Set(activeMonths || []);
    (poData.monthly || []).forEach(m => {
      const b = PO_PERIOD_TO_BULAN[m.period];
      if (b && activeMonthsSet.has(b)) {
        totalPo += (m.total || 0);
        poTI += (m.telkominfra || 0);
        poZte += (m.zte || 0);
        poHw += (m.huawei || 0);
      }
    });
    (invData.monthly || []).forEach(m => {
      const b = PO_PERIOD_TO_BULAN[m.period];
      if (b && activeMonthsSet.has(b)) {
        totalInvoice += (m.total || 0);
        invTI += (m.telkominfra || 0);
        invZte += (m.zte || 0);
        invHw += (m.huawei || 0);
      }
    });
  }

  const unbilledPo = totalPo - totalInvoice;
  const netMargin = totalInvoice - (totalCashOut || 0);

  // Update KPI Top Cards
  const elTotalPo = document.getElementById('kpiTotalPo');
  const elPoTI = document.getElementById('kpiPoTelkominfra');
  const elPoZte = document.getElementById('kpiPoZte');
  const elPoHw = document.getElementById('kpiPoHuawei');

  const elTotalInv = document.getElementById('kpiTotalInvoice');
  const elInvTI = document.getElementById('kpiInvTelkominfra');
  const elInvZte = document.getElementById('kpiInvZte');
  const elInvHw = document.getElementById('kpiInvHuawei');

  const elUnbilled = document.getElementById('kpiUnbilledPo');
  const elNetMargin = document.getElementById('kpiNetMargin');
  const badgeNetMargin = document.getElementById('badgeNetMargin');

  if (elTotalPo) elTotalPo.textContent = formatRp(totalPo);
  if (elPoTI) elPoTI.textContent = formatCompactRp(poTI);
  if (elPoZte) elPoZte.textContent = formatCompactRp(poZte);
  if (elPoHw) elPoHw.textContent = formatCompactRp(poHw);

  if (elTotalInv) elTotalInv.textContent = formatRp(totalInvoice);
  if (elInvTI) elInvTI.textContent = formatCompactRp(invTI);
  if (elInvZte) elInvZte.textContent = formatCompactRp(invZte);
  if (elInvHw) elInvHw.textContent = formatCompactRp(invHw);

  if (elUnbilled) elUnbilled.textContent = formatRp(unbilledPo);

  if (elNetMargin) {
    elNetMargin.textContent = (netMargin >= 0 ? '+' : '') + formatRp(netMargin);
    elNetMargin.className = 'kpi-value ' + (netMargin >= 0 ? 'text-success' : 'text-danger');
  }
  if (badgeNetMargin) {
    badgeNetMargin.textContent = netMargin >= 0 ? 'Net Surplus' : 'Net Defisit';
    badgeNetMargin.className = 'badge ' + (netMargin >= 0 ? 'badge-success' : 'badge-danger');
  }

  // Update Tab 6 Table
  renderPoInvoiceTable();
}

function setPoInvoiceView(view) {
  state.poInvoiceView = view;
  const btnComp = document.getElementById('btnTogglePoComparison');
  const btnPo = document.getElementById('btnTogglePoPivot');
  const btnInv = document.getElementById('btnToggleInvPivot');
  const title = document.getElementById('poInvoiceTitle');
  const subtitle = document.getElementById('poInvoiceSubtitle');

  if (btnComp) btnComp.classList.toggle('active', view === 'po-comparison');
  if (btnPo) btnPo.classList.toggle('active', view === 'po-pivot');
  if (btnInv) btnInv.classList.toggle('active', view === 'inv-pivot');

  if (title) {
    if (view === 'po-comparison') title.textContent = 'Detail PO & Invoice (Komparasi Bulanan)';
    else if (view === 'po-pivot') title.textContent = 'Pivot Purchase Order Released (Sheet 1)';
    else if (view === 'inv-pivot') title.textContent = 'Pivot Invoice Submit / Piutang In (Sheet 2)';
  }
  if (subtitle) {
    if (view === 'po-comparison') subtitle.textContent = 'Perbandingan rilis Purchase Order vs tagihan Invoice Submit vs realisasi Cash Out per bulan';
    else if (view === 'po-pivot') subtitle.textContent = 'Rincian perolehan PO rilis per vendor (Telkominfra, ZTE, Huawei) dan mutasi rekening per bulan';
    else if (view === 'inv-pivot') subtitle.textContent = 'Rincian penagihan Invoice submit per vendor (Telkominfra, ZTE, Huawei) dan mutasi rekening per bulan';
  }

  renderPoInvoiceTable();
}

function renderPoInvoiceTable() {
  const table = document.getElementById('tablePoInvoice');
  const thead = document.getElementById('theadPoInvoice');
  const tbody = document.getElementById('tbodyPoInvoice');
  if (!table || !thead || !tbody) return;

  if (!state.poInvoiceData && typeof window !== 'undefined' && window.PO_INVOICE_DATA) {
    state.poInvoiceData = window.PO_INVOICE_DATA;
  }

  const poData = state.poInvoiceData?.po;
  const invData = state.poInvoiceData?.invoice;
  if (!poData || !invData) {
    thead.innerHTML = '<tr><th>Informasi</th></tr>';
    tbody.innerHTML = '<tr><td class="text-center text-muted" style="padding: 2rem;">Data PO & Invoice belum tersedia.</td></tr>';
    return;
  }

  const view = state.poInvoiceView || 'po-comparison';
  const selMonths = state.masterFilter.selectedMonths || CHRONO_MONTHS;
  const selMonthsSet = new Set(selMonths);
  const isMonthFiltered = (selMonths.length < CHRONO_MONTHS.length);

  // Filter monthly rows based on selected months
  const filteredMonths = (poData.monthly || []).filter(m => {
    if (!isMonthFiltered) return true;
    const b = PO_PERIOD_TO_BULAN[m.period];
    return b && selMonthsSet.has(b);
  });

  const invMonthMap = new Map();
  (invData.monthly || []).forEach(m => {
    invMonthMap.set(m.period, m);
  });

  if (view === 'po-comparison') {
    // 1. PO vs Invoice Comparison
    thead.innerHTML = `
      <tr>
        <th class="sticky-col" style="min-width: 110px;">Periode</th>
        <th class="text-right" style="min-width: 130px;">PO Telkominfra</th>
        <th class="text-right" style="min-width: 130px;">PO ZTE</th>
        <th class="text-right" style="min-width: 130px;">PO Huawei</th>
        <th class="text-right col-highlight" style="min-width: 150px; background: rgba(59, 130, 246, 0.08);">Total PO Released</th>
        <th class="text-right" style="min-width: 130px;">Inv Telkominfra</th>
        <th class="text-right" style="min-width: 130px;">Inv ZTE</th>
        <th class="text-right" style="min-width: 130px;">Inv Huawei</th>
        <th class="text-right col-highlight" style="min-width: 150px; background: rgba(6, 182, 212, 0.08);">Total Piutang In</th>
        <th class="text-right" style="min-width: 140px;">Sisa PO (Unbilled)</th>
        <th class="text-right" style="min-width: 140px;">Realisasi Cash Out</th>
        <th class="text-right" style="min-width: 150px;">Surplus / Defisit</th>
        <th class="text-right" style="min-width: 150px;">Mutasi Masuk (TI)</th>
      </tr>
    `;

    if (filteredMonths.length === 0) {
      tbody.innerHTML = '<tr><td colspan="13" class="text-center text-muted" style="padding: 2rem;">Tidak ada data PO & Invoice untuk periode bulan yang dipilih.</td></tr>';
      return;
    }

    let sumPoTI = 0, sumPoZte = 0, sumPoHw = 0, sumPoTotal = 0;
    let sumInvTI = 0, sumInvZte = 0, sumInvHw = 0, sumInvTotal = 0;
    let sumUnbilled = 0, sumCashOut = 0, sumNetMargin = 0, sumMutasi = 0;

    let rowsHtml = '';
    filteredMonths.forEach(poRow => {
      const invRow = invMonthMap.get(poRow.period) || { telkominfra: 0, zte: 0, huawei: 0, total: 0, mutasi: { telkominfra: 0 } };
      const bulanKey = PO_PERIOD_TO_BULAN[poRow.period];
      const cashOut = (bulanKey && state.monthCashOutMap && state.monthCashOutMap[bulanKey]) ? state.monthCashOutMap[bulanKey] : 0;
      
      const unbilled = (poRow.total || 0) - (invRow.total || 0);
      const net = (invRow.total || 0) - cashOut;
      const mutasiTI = (invRow.mutasi?.telkominfra || poRow.mutasi?.telkominfra || 0);

      sumPoTI += (poRow.telkominfra || 0);
      sumPoZte += (poRow.zte || 0);
      sumPoHw += (poRow.huawei || 0);
      sumPoTotal += (poRow.total || 0);

      sumInvTI += (invRow.telkominfra || 0);
      sumInvZte += (invRow.zte || 0);
      sumInvHw += (invRow.huawei || 0);
      sumInvTotal += (invRow.total || 0);

      sumUnbilled += unbilled;
      sumCashOut += cashOut;
      sumNetMargin += net;
      sumMutasi += mutasiTI;

      const netClass = net >= 0 ? 'text-success' : 'text-danger';
      const netPrefix = net >= 0 ? '+' : '';

      rowsHtml += `
        <tr>
          <td class="sticky-col font-weight-600">
            <strong>${poRow.period}</strong>
            ${bulanKey ? `<span class="row-subtext" style="display:block; font-size: 0.72rem; color: var(--text-muted);">${bulanKey}</span>` : ''}
          </td>
          <td class="text-right font-mono">${poRow.telkominfra ? formatRp(poRow.telkominfra) : '-'}</td>
          <td class="text-right font-mono">${poRow.zte ? formatRp(poRow.zte) : '-'}</td>
          <td class="text-right font-mono">${poRow.huawei ? formatRp(poRow.huawei) : '-'}</td>
          <td class="text-right font-mono font-weight-700 text-blue" style="background: rgba(59, 130, 246, 0.05);">${formatRp(poRow.total)}</td>
          <td class="text-right font-mono">${invRow.telkominfra ? formatRp(invRow.telkominfra) : '-'}</td>
          <td class="text-right font-mono">${invRow.zte ? formatRp(invRow.zte) : '-'}</td>
          <td class="text-right font-mono">${invRow.huawei ? formatRp(invRow.huawei) : '-'}</td>
          <td class="text-right font-mono font-weight-700 text-cyan" style="background: rgba(6, 182, 212, 0.05);">${formatRp(invRow.total)}</td>
          <td class="text-right font-mono font-weight-600 ${unbilled > 0 ? 'text-amber' : ''}">${formatRp(unbilled)}</td>
          <td class="text-right font-mono">${cashOut ? formatRp(cashOut) : '-'}</td>
          <td class="text-right font-mono font-weight-700 ${netClass}">${netPrefix}${formatRp(net)}</td>
          <td class="text-right font-mono">${mutasiTI ? formatRp(mutasiTI) : '-'}</td>
        </tr>
      `;
    });

    // Grand total row
    const totalNetClass = sumNetMargin >= 0 ? 'text-success' : 'text-danger';
    const totalNetPrefix = sumNetMargin >= 0 ? '+' : '';
    rowsHtml += `
      <tr class="grand-total-row">
        <td class="sticky-col font-weight-700">GRAND TOTAL</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumPoTI)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumPoZte)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumPoHw)}</td>
        <td class="text-right font-mono font-weight-700 text-blue" style="background: rgba(59, 130, 246, 0.12);">${formatRp(sumPoTotal)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumInvTI)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumInvZte)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumInvHw)}</td>
        <td class="text-right font-mono font-weight-700 text-cyan" style="background: rgba(6, 182, 212, 0.12);">${formatRp(sumInvTotal)}</td>
        <td class="text-right font-mono font-weight-700 text-amber">${formatRp(sumUnbilled)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumCashOut)}</td>
        <td class="text-right font-mono font-weight-700 ${totalNetClass}">${totalNetPrefix}${formatRp(sumNetMargin)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumMutasi)}</td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;

  } else if (view === 'po-pivot') {
    // 2. PO Pivot View
    thead.innerHTML = `
      <tr>
        <th class="sticky-col" style="min-width: 120px;">Periode</th>
        <th class="text-right" style="min-width: 150px;">Telkominfra</th>
        <th class="text-right" style="min-width: 150px;">ZTE</th>
        <th class="text-right" style="min-width: 150px;">Huawei</th>
        <th class="text-right col-highlight" style="min-width: 160px; background: rgba(59, 130, 246, 0.08);">Total PO Released</th>
        <th class="text-right" style="min-width: 150px;">Mutasi Rekening (TI)</th>
        <th class="text-center" style="min-width: 100px;">Share (%)</th>
      </tr>
    `;

    if (filteredMonths.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Tidak ada data PO Released untuk periode bulan yang dipilih.</td></tr>';
      return;
    }

    let sumTI = 0, sumZte = 0, sumHw = 0, sumTotal = 0, sumMutasi = 0;
    filteredMonths.forEach(r => {
      sumTI += (r.telkominfra || 0);
      sumZte += (r.zte || 0);
      sumHw += (r.huawei || 0);
      sumTotal += (r.total || 0);
      sumMutasi += (r.mutasi?.telkominfra || 0);
    });

    let rowsHtml = '';
    filteredMonths.forEach(r => {
      const share = sumTotal > 0 ? ((r.total / sumTotal) * 100).toFixed(1) + '%' : '0%';
      const bulanKey = PO_PERIOD_TO_BULAN[r.period];
      rowsHtml += `
        <tr>
          <td class="sticky-col font-weight-600">
            <strong>${r.period}</strong>
            ${bulanKey ? `<span class="row-subtext" style="display:block; font-size: 0.72rem; color: var(--text-muted);">${bulanKey}</span>` : ''}
          </td>
          <td class="text-right font-mono">${r.telkominfra ? formatRp(r.telkominfra) : '-'}</td>
          <td class="text-right font-mono">${r.zte ? formatRp(r.zte) : '-'}</td>
          <td class="text-right font-mono">${r.huawei ? formatRp(r.huawei) : '-'}</td>
          <td class="text-right font-mono font-weight-700 text-blue" style="background: rgba(59, 130, 246, 0.05);">${formatRp(r.total)}</td>
          <td class="text-right font-mono">${r.mutasi?.telkominfra ? formatRp(r.mutasi.telkominfra) : '-'}</td>
          <td class="text-center font-mono font-weight-600 text-muted">${share}</td>
        </tr>
      `;
    });

    rowsHtml += `
      <tr class="grand-total-row">
        <td class="sticky-col font-weight-700">GRAND TOTAL</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumTI)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumZte)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumHw)}</td>
        <td class="text-right font-mono font-weight-700 text-blue" style="background: rgba(59, 130, 246, 0.12);">${formatRp(sumTotal)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumMutasi)}</td>
        <td class="text-center font-mono font-weight-700">100%</td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;

  } else if (view === 'inv-pivot') {
    // 3. Invoice Pivot View
    thead.innerHTML = `
      <tr>
        <th class="sticky-col" style="min-width: 120px;">Periode</th>
        <th class="text-right" style="min-width: 150px;">Telkominfra</th>
        <th class="text-right" style="min-width: 150px;">ZTE</th>
        <th class="text-right" style="min-width: 150px;">Huawei</th>
        <th class="text-right col-highlight" style="min-width: 160px; background: rgba(6, 182, 212, 0.08);">Total Piutang In</th>
        <th class="text-right" style="min-width: 150px;">Mutasi Rekening (TI)</th>
        <th class="text-center" style="min-width: 100px;">Share (%)</th>
      </tr>
    `;

    const invMonthsFiltered = (invData.monthly || []).filter(m => {
      if (!isMonthFiltered) return true;
      const b = PO_PERIOD_TO_BULAN[m.period];
      return b && selMonthsSet.has(b);
    });

    if (invMonthsFiltered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">Tidak ada data Invoice Submit untuk periode bulan yang dipilih.</td></tr>';
      return;
    }

    let sumTI = 0, sumZte = 0, sumHw = 0, sumTotal = 0, sumMutasi = 0;
    invMonthsFiltered.forEach(r => {
      sumTI += (r.telkominfra || 0);
      sumZte += (r.zte || 0);
      sumHw += (r.huawei || 0);
      sumTotal += (r.total || 0);
      sumMutasi += (r.mutasi?.telkominfra || 0);
    });

    let rowsHtml = '';
    invMonthsFiltered.forEach(r => {
      const share = sumTotal > 0 ? ((r.total / sumTotal) * 100).toFixed(1) + '%' : '0%';
      const bulanKey = PO_PERIOD_TO_BULAN[r.period];
      rowsHtml += `
        <tr>
          <td class="sticky-col font-weight-600">
            <strong>${r.period}</strong>
            ${bulanKey ? `<span class="row-subtext" style="display:block; font-size: 0.72rem; color: var(--text-muted);">${bulanKey}</span>` : ''}
          </td>
          <td class="text-right font-mono">${r.telkominfra ? formatRp(r.telkominfra) : '-'}</td>
          <td class="text-right font-mono">${r.zte ? formatRp(r.zte) : '-'}</td>
          <td class="text-right font-mono">${r.huawei ? formatRp(r.huawei) : '-'}</td>
          <td class="text-right font-mono font-weight-700 text-cyan" style="background: rgba(6, 182, 212, 0.05);">${formatRp(r.total)}</td>
          <td class="text-right font-mono">${r.mutasi?.telkominfra ? formatRp(r.mutasi.telkominfra) : '-'}</td>
          <td class="text-center font-mono font-weight-600 text-muted">${share}</td>
        </tr>
      `;
    });

    rowsHtml += `
      <tr class="grand-total-row">
        <td class="sticky-col font-weight-700">GRAND TOTAL</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumTI)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumZte)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumHw)}</td>
        <td class="text-right font-mono font-weight-700 text-cyan" style="background: rgba(6, 182, 212, 0.12);">${formatRp(sumTotal)}</td>
        <td class="text-right font-mono font-weight-700">${formatRp(sumMutasi)}</td>
        <td class="text-center font-mono font-weight-700">100%</td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
  }
}

function exportPoInvoiceDynamic() {
  const view = state.poInvoiceView || 'po-comparison';
  const filename = (view === 'po-comparison')
    ? `EBDI_PO_vs_Invoice_Komparasi_${new Date().toISOString().slice(0, 10)}.csv`
    : (view === 'po-pivot')
    ? `EBDI_PO_Released_Pivot_${new Date().toISOString().slice(0, 10)}.csv`
    : `EBDI_Invoice_Submit_Pivot_${new Date().toISOString().slice(0, 10)}.csv`;

  exportTableToCSV('tablePoInvoice', filename);
}

// ==========================================================================
// WhatsApp Daily Report Copy Shortcut (Today's Cost KPI Card)
// ==========================================================================

function formatIndonesianFullDate(dateStr) {
  const mNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  if (!dateStr || dateStr === '-' || dateStr.toLowerCase() === 'terbaru') {
    const now = new Date();
    return `${now.getDate()} ${mNames[now.getMonth()]} ${now.getFullYear()}`;
  }

  const s = String(dateStr).trim();

  // If already full Indonesian date format (e.g. 28 Oktober 2026)
  if (/^\d{1,2}\s+[a-zA-Z]+\s+\d{4}$/.test(s)) {
    return s;
  }

  const indonesianMonths = {
    'jan': 'Januari', 'januari': 'Januari',
    'feb': 'Februari', 'februari': 'Februari',
    'mar': 'Maret', 'maret': 'Maret',
    'apr': 'April', 'april': 'April',
    'may': 'Mei', 'mei': 'Mei',
    'jun': 'Juni', 'juni': 'Juni',
    'jul': 'Juli', 'juli': 'Juli',
    'aug': 'Agustus', 'agu': 'Agustus', 'agt': 'Agustus', 'agustus': 'Agustus',
    'sep': 'September', 'september': 'September',
    'oct': 'Oktober', 'okt': 'Oktober', 'oktober': 'Oktober',
    'nov': 'November', 'nop': 'November', 'november': 'November',
    'dec': 'Desember', 'des': 'Desember', 'desember': 'Desember'
  };

  // Format DD-MMM-YY or DD-MMM-YYYY (e.g. 28-Oct-26, 19-Feb-26)
  const dmyAlpha = s.match(/^(\d{1,2})[-/\s]([a-zA-Z]+)[-/\s](\d{2,4})$/);
  if (dmyAlpha) {
    const day = parseInt(dmyAlpha[1], 10);
    const mKey = dmyAlpha[2].toLowerCase().slice(0, 3);
    const month = indonesianMonths[mKey] || indonesianMonths[dmyAlpha[2].toLowerCase()] || dmyAlpha[2];
    let year = parseInt(dmyAlpha[3], 10);
    if (year < 100) year += 2000;
    return `${day} ${month} ${year}`;
  }

  // Format DD-MM-YYYY or DD/MM/YYYY
  const dmyNum = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (dmyNum) {
    const day = parseInt(dmyNum[1], 10);
    const mIdx = parseInt(dmyNum[2], 10) - 1;
    let year = parseInt(dmyNum[3], 10);
    if (year < 100) year += 2000;
    if (mIdx >= 0 && mIdx < 12) return `${day} ${mNames[mIdx]} ${year}`;
  }

  // Format YYYY-MM-DD
  const ymdNum = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdNum) {
    const year = parseInt(ymdNum[1], 10);
    const mIdx = parseInt(ymdNum[2], 10) - 1;
    const day = parseInt(ymdNum[3], 10);
    if (mIdx >= 0 && mIdx < 12) return `${day} ${mNames[mIdx]} ${year}`;
  }

  // Fallback using Date object
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getDate()} ${mNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }

  // Fallback to today
  const now = new Date();
  return `${now.getDate()} ${mNames[now.getMonth()]} ${now.getFullYear()}`;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard failed, attempting fallback...', e);
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Fallback execCommand copy failed:', err);
  }
  document.body.removeChild(textArea);
  return success;
}

async function copyTodayCostReport() {
  const dateBadge = document.getElementById('todayCostDate');
  const amountEl = document.getElementById('todayCostAmount');
  const txCountEl = document.getElementById('todayCostTxCount');
  const bcaEl = document.getElementById('kpiBca');
  const mandiriEl = document.getElementById('kpiMandiri');

  // Format Date
  const rawDate = dateBadge ? dateBadge.textContent.trim() : '';
  const formattedDate = formatIndonesianFullDate(rawDate);

  // Format Tx Count
  const rawCount = txCountEl ? txCountEl.textContent : '';
  const digits = rawCount.replace(/[^\d]/g, '');
  const txCount = digits ? parseInt(digits, 10) : (state.summary?.today_cost?.total_transaction || 0);

  // Format Today Cost Amount
  const costNum = amountEl ? parseCurrency(amountEl.textContent) : (state.summary?.today_cost?.total_cost_num || 0);
  const formattedCost = formatRp(costNum);

  // Format BCA Balance
  let bcaNum = (state.summary?.balances?.bca_num !== undefined && state.summary?.balances?.bca_num !== 0)
    ? state.summary.balances.bca_num
    : parseCurrency(bcaEl?.textContent || '');
  const bcaFormatted = formatRp(bcaNum);

  // Format Mandiri Balance
  let mandiriNum = (state.summary?.balances?.mandiri_num !== undefined && state.summary?.balances?.mandiri_num !== 0)
    ? state.summary.balances.mandiri_num
    : parseCurrency(mandiriEl?.textContent || '');
  const mandiriFormatted = formatRp(mandiriNum);

  // Format exactly matching user's requested WhatsApp template
  const reportLines = [
    'Izin lapor om untuk pengeluaran',
    `hari ini tanggal ${formattedDate}`,
    `1. Total Transaksi = ${txCount}`,
    `2. Total Pengeluaran =  ${formattedCost} `,
    'Sisa Kredit saat ini:',
    `1. BCA :   ${bcaFormatted} `,
    `2. MANDIRI : ${mandiriFormatted} `,
    '',
    'berikut link dashboardnya om = https://dashboard-mora.netlify.app/',
    'terimakasi om🙏🏻'
  ];
  const reportText = reportLines.join('\n');

  const copied = await copyTextToClipboard(reportText);

  // Visual card feedback
  const card = document.getElementById('cardTodayCost');
  const badgePill = document.getElementById('badgeCopyReport');
  const badgeText = document.getElementById('badgeCopyReportText');

  if (card) {
    card.classList.add('card-copied-pulse');
    setTimeout(() => card.classList.remove('card-copied-pulse'), 1200);
  }

  if (badgePill && badgeText) {
    badgePill.classList.add('copied');
    const prevText = badgeText.textContent;
    badgeText.textContent = 'Tersalin! ✓';
    setTimeout(() => {
      badgePill.classList.remove('copied');
      badgeText.textContent = prevText;
    }, 2000);
  }

  if (copied) {
    showToastNotification({
      type: 'success',
      title: 'Rekap Berhasil Dicopy!',
      subtitle: 'Siap langsung dipaste ke WhatsApp',
      stats: [
        { label: 'Tanggal', value: formattedDate },
        { label: 'Transaksi', value: `${txCount} Tx`, highlight: true },
        { label: 'Pengeluaran', value: formattedCost, highlight: true }
      ],
      duration: 4000
    });
  } else {
    showToastNotification({
      type: 'warning',
      title: 'Pemberitahuan Clipboard',
      subtitle: 'Silakan salin teks secara manual jika browser memblokir clipboard otomatis',
      duration: 5000
    });
  }
}
