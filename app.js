/**
 * EBDI Dashboard Application Logic (Pure Web Base)
 * Works standalone with 0 dependencies, 0 Python, 0 Terminal.
 * Can be opened directly by double-clicking index.html!
 */

// Chronological Months Definition & Helper Maps
const CHRONO_MONTHS = [
  'Bulan 8 2025', 'Bulan 9 2025', 'Bulan 10 2025', 'Bulan 11 2025', 'Bulan 12 2025',
  'Bulan 1 2026', 'Bulan 2 2026', 'Bulan 3 2026', 'Bulan 4 2026', 'Bulan 5 2026',
  'Bulan 6 2026', 'Bulan 7 2026', 'Bulan 8 2026', 'Bulan 9 2026'
];

const MONTH_NAMES_MAP = {
  'Bulan 8 2025': 'Agustus 2025',
  'Bulan 9 2025': 'September 2025',
  'Bulan 10 2025': 'Oktober 2025',
  'Bulan 11 2025': 'November 2025',
  'Bulan 12 2025': 'Desember 2025',
  'Bulan 1 2026': 'Januari 2026',
  'Bulan 2 2026': 'Februari 2026',
  'Bulan 3 2026': 'Maret 2026',
  'Bulan 4 2026': 'April 2026',
  'Bulan 5 2026': 'Mei 2026',
  'Bulan 6 2026': 'Juni 2026',
  'Bulan 7 2026': 'Juli 2026',
  'Bulan 8 2026': 'Agustus 2026',
  'Bulan 9 2026': 'September 2026'
};

const MONTH_ABBR_MAP = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
};

function parseTxDateToISO(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return null;
  const dd = parts[0].padStart(2, '0');
  const mm = MONTH_ABBR_MAP[parts[1]] || null;
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

function getLatestTxDateISO(txs) {
  const list = txs || state.transactions || [];
  if (!list.length) return '2026-09-07';
  let latest = '';
  // Check from the end of the array since transactions are predominantly chronological
  const checkCount = Math.min(list.length, 300);
  for (let i = list.length - 1; i >= list.length - checkCount; i--) {
    const iso = parseTxDateToISO(list[i].date_trf || list[i].date_req);
    if (iso && iso > latest) latest = iso;
  }
  return latest || '2026-09-07';
}

// Application State
const state = {
  summary: null,
  transactions: [],
  masterFilteredTransactions: [],
  filteredTransactions: [],
  activeFilteredCf: null,
  currentPage: 1,
  pageSize: 25,
  charts: {},
  masterFilter: {
    mode: 'bulan', // 'bulan' | 'tanggal'
    startBulan: 'Bulan 8 2025',
    endBulan: 'Bulan 9 2026',
    startDate: '2025-08-01',
    endDate: '2026-09-07',
    preset: 'all'
  },
  filters: {
    search: '',
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
  ['filterRegion', 'filterCategory', 'filterVendor', 'filterBulan', 'filterTransferBy'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const key = id.replace('filter', '');
      const stateKey = key.charAt(0).toLowerCase() + key.slice(1);
      state.filters[stateKey] = e.target.value;
      state.currentPage = 1;
      applyFilters();
    });
  });

  // Reset Filters
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    state.filters = { search: '', region: '', category: '', vendor: '', bulan: '', transferBy: '' };
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    ['filterRegion', 'filterCategory', 'filterVendor', 'filterBulan', 'filterTransferBy'].forEach(id => {
      document.getElementById(id).value = '';
    });
    state.currentPage = 1;
    applyFilters();
  });

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

  // Master Filter Event Listeners
  initMasterFilterEventListeners();

  // Sync / Refresh Button (Direct from Google Sheets via browser fetch)
  document.getElementById('btnSyncData').addEventListener('click', () => {
    syncDataDirectFromGoogleSheets();
  });

  // Modal Close
  document.getElementById('btnModalClose').addEventListener('click', closeModal);
  document.getElementById('btnModalCloseFooter').addEventListener('click', closeModal);
  document.getElementById('txDetailModal').addEventListener('click', (e) => {
    if (e.target.id === 'txDetailModal') closeModal();
  });
}

let debounceTimer;
function debounceApplyFilters() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    state.currentPage = 1;
    applyFilters();
  }, 250);
}

// Load Dashboard Data (Prefers bundled data.js for instant offline loading)
function loadDashboardData() {
  const badge = document.getElementById('syncStatusBadge');
  const badgeText = document.getElementById('syncStatusText');

  const savedRefreshTime = localStorage.getItem('ebdi_last_refresh') || '08 Sep 2026, 14:45 WIB';

  // Check if localStorage has newer cached data from a live sync
  try {
    const cachedSummary = localStorage.getItem('ebdi_cached_summary');
    const cachedTxs = localStorage.getItem('ebdi_cached_txs');
    if (cachedSummary && cachedTxs) {
      const parsedSum = JSON.parse(cachedSummary);
      const parsedTxs = JSON.parse(cachedTxs);
      if (parsedSum && parsedTxs && parsedTxs.length >= 23600) {
        state.summary = parsedSum;
        state.transactions = parsedTxs;
        state.masterFilteredTransactions = parsedTxs;
        populateFilterDropdowns(state.transactions);
        populateSummaryUI(state.summary);
        initMasterFilterControls();
        applyMasterFilter();
        badgeText.textContent = 'Terakhir Diperbarui: ' + savedRefreshTime;
        return;
      }
    }
  } catch (e) {
    console.warn('Local cache check notice:', e);
  }

  // Check if data is already available via data.js (Pure Web, No Python / Server needed)
  if (window.EBDI_SUMMARY) {
    state.summary = window.EBDI_SUMMARY;

    if (window.EBDI_TRANSACTIONS && window.EBDI_TRANSACTIONS.length) {
      state.transactions = window.EBDI_TRANSACTIONS;
      state.masterFilteredTransactions = window.EBDI_TRANSACTIONS;
      populateFilterDropdowns(state.transactions);
    }

    populateSummaryUI(state.summary);
    initMasterFilterControls();
    applyMasterFilter();
    badgeText.textContent = 'Terakhir Diperbarui: ' + savedRefreshTime;
    return;
  }

  // Fallback: If hosted on a server, try fetch
  badgeText.textContent = 'Memuat data...';
  fetch('summary.json')
    .then(res => res.json())
    .then(data => {
      state.summary = data;
      populateSummaryUI(state.summary);
      initMasterFilterControls();
      applyMasterFilter();
      badgeText.textContent = 'Terakhir Diperbarui: ' + savedRefreshTime;
    })
    .catch(err => {
      console.warn('Local JSON load fallback error:', err);
      badgeText.textContent = 'Data Standby';
    });
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

// Parse Transfer EBDI CSV into transaction objects
function parseTransferCSV(text) {
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

    txs.push({
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
      transfer_by: (r[23] || '').trim()
    });
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
  badgeText.textContent = 'Menghubungi Google Sheets...';
  badge.style.borderColor = 'var(--warning)';
  badge.style.color = 'var(--warning)';

  const ts = Date.now();
  const summaryUrls = [
    `https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/export?format=csv&gid=1112038042&t=${ts}`,
    `/api/sheets/summary?t=${ts}`,
    `https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/gviz/tq?tqx=out:csv&gid=1112038042&t=${ts}`
  ];

  const transferUrls = [
    `https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/export?format=csv&gid=747143276&t=${ts}`,
    `/api/sheets/transfer?t=${ts}`,
    `https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/gviz/tq?tqx=out:csv&gid=747143276&t=${ts}`
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

  try {
    badgeText.textContent = 'Mengunduh Summary EBDI...';
    const summaryCsv = await fetchWithFallback(summaryUrls, 'Summary EBDI');
    const newSummary = parseSummaryCSV(summaryCsv);
    if (newSummary && newSummary.cash_flow && newSummary.cash_flow.length) {
      state.summary = newSummary;
      populateSummaryUI(state.summary);
    }

    badgeText.textContent = 'Mengunduh Transaksi EBDI (23.6K+)...';
    const transferCsv = await fetchWithFallback(transferUrls, 'Transaksi EBDI');
    const newTxs = parseTransferCSV(transferCsv);
    if (newTxs && newTxs.length) {
      state.transactions = newTxs;
      state.masterFilteredTransactions = newTxs;
      populateFilterDropdowns(state.transactions);

      // Dynamically update max date of master filter
      const latestISO = getLatestTxDateISO(newTxs);
      const endDateInput = document.getElementById('mfEndDate');
      if (endDateInput) {
        endDateInput.max = latestISO;
        if (state.masterFilter.endDate <= '2026-09-06' || state.masterFilter.preset === 'all' || state.masterFilter.preset === 'latest') {
          state.masterFilter.endDate = latestISO;
          endDateInput.value = latestISO;
        }
      }
    }

    // Re-apply Master Filter
    applyMasterFilter();

    // Record last refresh timestamp
    const now = new Date();
    const timeStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    localStorage.setItem('ebdi_last_refresh', timeStr);

    // Save to localStorage cache for offline persistence
    try {
      localStorage.setItem('ebdi_cached_summary', JSON.stringify(state.summary));
      localStorage.setItem('ebdi_cached_txs', JSON.stringify(state.transactions));
    } catch (e) {
      console.warn('Storage cache notice:', e);
    }

    badgeText.textContent = 'Terakhir Diperbarui: ' + timeStr;
    badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    badge.style.color = '#10b981';

    // Show sleek glassmorphic Toast notification
    showToastNotification({
      type: 'success',
      title: 'Data Berhasil Disinkronkan!',
      subtitle: 'Google Sheets Live Sync Aktif',
      message: '<p>Seluruh metrik kalkulasi keuangan, saldo bank, dan data transaksi telah diperbarui secara langsung ke versi terbaru.</p>',
      stats: [
        { label: 'Total Transaksi', value: (state.transactions || []).length.toLocaleString('id-ID') + ' Tx', highlight: true },
        { label: 'Waktu Refresh', value: timeStr },
        { label: 'Total Cash Out', value: formatRp(state.summary?.balances?.cash_out_num || 0) },
        { label: 'Status Data', value: '100% Up to Date' }
      ],
      action: {
        label: 'Lihat Transaksi ➔',
        onClick: () => {
          const tabBtn = document.querySelector('.tab-btn[data-tab="tab-transaksi"]');
          if (tabBtn) tabBtn.click();
        }
      },
      duration: 6500
    });
  } catch (err) {
    console.error('Google Sheets sync notice:', err);
    const savedTime = localStorage.getItem('ebdi_last_refresh') || '08 Sep 2026, 14:45 WIB';
    badgeText.textContent = 'Terakhir Diperbarui: ' + savedTime;
    badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    badge.style.color = '#10b981';

    const isFileProtocol = !window.location.protocol.startsWith('http');
    showToastNotification({
      type: isFileProtocol ? 'info' : 'warning',
      title: isFileProtocol ? 'Informasi Sinkronisasi Lokal' : 'Gagal Menghubungi Google Sheets',
      subtitle: isFileProtocol ? 'Mode Offline / Protokol Berkas' : 'Periksa Koneksi Internet Anda',
      message: isFileProtocol
        ? '<p>Saat dibuka secara lokal (<code>file://</code>), browser membatasi CORS langsung ke Google Sheets. Di hosting <strong>Netlify</strong> atau web server, sinkronisasi otomatis berjalan lancar.</p><p style="color:var(--text-primary); font-size:0.8rem; margin-top:4px;">✓ Data lokal Anda tetap <strong>100% lengkap</strong> dan siap digunakan.</p>'
        : `<p>Gagal menghubungi Google Sheets (${err.message}). Pastikan koneksi internet Anda aktif.</p>`,
      stats: [
        { label: 'Transaksi Tersedia', value: (state.transactions || []).length.toLocaleString('id-ID') + ' Tx', highlight: true },
        { label: 'Data Terakhir', value: savedTime }
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
function initMasterFilterControls() {
  const startSelect = document.getElementById('mfStartBulan');
  const endSelect = document.getElementById('mfEndBulan');
  if (!startSelect || !endSelect) return;

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

  const maxDate = getLatestTxDateISO(state.transactions);
  const startDateInput = document.getElementById('mfStartDate');
  const endDateInput = document.getElementById('mfEndDate');
  if (startDateInput) {
    startDateInput.min = '2025-08-01';
    startDateInput.max = maxDate;
    startDateInput.value = state.masterFilter.startDate || '2025-08-01';
  }
  if (endDateInput) {
    endDateInput.min = '2025-08-01';
    endDateInput.max = maxDate;
    if (!state.masterFilter.endDate || state.masterFilter.endDate <= '2026-09-06') {
      state.masterFilter.endDate = maxDate;
    }
    endDateInput.value = state.masterFilter.endDate;
  }
}

// Master Filter: Event Listeners
function initMasterFilterEventListeners() {
  const modeBulanBtn = document.getElementById('mfModeBulanBtn');
  const modeTanggalBtn = document.getElementById('mfModeTanggalBtn');
  const bulanGroup = document.getElementById('mfBulanGroup');
  const tanggalGroup = document.getElementById('mfTanggalGroup');

  if (modeBulanBtn && modeTanggalBtn) {
    modeBulanBtn.addEventListener('click', () => {
      state.masterFilter.mode = 'bulan';
      modeBulanBtn.classList.add('active');
      modeTanggalBtn.classList.remove('active');
      if (bulanGroup) bulanGroup.style.display = 'flex';
      if (tanggalGroup) tanggalGroup.style.display = 'none';
      applyMasterFilter();
    });

    modeTanggalBtn.addEventListener('click', () => {
      state.masterFilter.mode = 'tanggal';
      modeTanggalBtn.classList.add('active');
      modeBulanBtn.classList.remove('active');
      if (bulanGroup) bulanGroup.style.display = 'none';
      if (tanggalGroup) tanggalGroup.style.display = 'flex';
      applyMasterFilter();
    });
  }

  // Presets
  const presetBtns = document.querySelectorAll('.mf-preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      applyMasterFilterPreset(presetKey);
    });
  });

  // Month Selects Change
  const startSelect = document.getElementById('mfStartBulan');
  const endSelect = document.getElementById('mfEndBulan');
  if (startSelect && endSelect) {
    const onMonthChange = () => {
      state.masterFilter.startBulan = startSelect.value;
      state.masterFilter.endBulan = endSelect.value;
      clearActiveMasterPresets();
      applyMasterFilter();
    };
    startSelect.addEventListener('change', onMonthChange);
    endSelect.addEventListener('change', onMonthChange);
  }

  // Date Inputs Change
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
      // Reset mode to Bulan
      state.masterFilter.mode = 'bulan';
      if (modeBulanBtn) modeBulanBtn.classList.add('active');
      if (modeTanggalBtn) modeTanggalBtn.classList.remove('active');
      if (bulanGroup) bulanGroup.style.display = 'flex';
      if (tanggalGroup) tanggalGroup.style.display = 'none';

      applyMasterFilterPreset('all');
    });
  }
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

  const maxDate = getLatestTxDateISO(state.transactions);
  const mf = state.masterFilter;
  if (presetKey === 'all') {
    mf.startBulan = 'Bulan 8 2025';
    mf.endBulan = 'Bulan 9 2026';
    mf.startDate = '2025-08-01';
    mf.endDate = maxDate;
  } else if (presetKey === '2025') {
    mf.startBulan = 'Bulan 8 2025';
    mf.endBulan = 'Bulan 12 2025';
    mf.startDate = '2025-08-01';
    mf.endDate = '2025-12-31';
  } else if (presetKey === '2026') {
    mf.startBulan = 'Bulan 1 2026';
    mf.endBulan = 'Bulan 9 2026';
    mf.startDate = '2026-01-01';
    mf.endDate = maxDate;
  } else if (presetKey === 'q3-2026') {
    mf.startBulan = 'Bulan 7 2026';
    mf.endBulan = 'Bulan 9 2026';
    mf.startDate = '2026-07-01';
    mf.endDate = maxDate;
  } else if (presetKey === 'latest') {
    mf.startBulan = 'Bulan 9 2026';
    mf.endBulan = 'Bulan 9 2026';
    mf.startDate = '2026-09-01';
    mf.endDate = maxDate;
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

  applyMasterFilter();
}

// Master Filter: Core Application Function
function applyMasterFilter() {
  const mf = state.masterFilter;
  const maxDate = getLatestTxDateISO(state.transactions);
  let activeMonths = [];
  let isAll = false;

  if (mf.mode === 'bulan') {
    let startIdx = CHRONO_MONTHS.indexOf(mf.startBulan);
    let endIdx = CHRONO_MONTHS.indexOf(mf.endBulan);
    if (startIdx === -1) startIdx = 0;
    if (endIdx === -1) endIdx = CHRONO_MONTHS.length - 1;
    if (startIdx > endIdx) {
      const temp = startIdx; startIdx = endIdx; endIdx = temp;
      mf.startBulan = CHRONO_MONTHS[startIdx];
      mf.endBulan = CHRONO_MONTHS[endIdx];
      const startSelect = document.getElementById('mfStartBulan');
      const endSelect = document.getElementById('mfEndBulan');
      if (startSelect) startSelect.value = mf.startBulan;
      if (endSelect) endSelect.value = mf.endBulan;
    }
    activeMonths = CHRONO_MONTHS.slice(startIdx, endIdx + 1);
    const monthsSet = new Set(activeMonths);
    isAll = (activeMonths.length === CHRONO_MONTHS.length);

    state.masterFilteredTransactions = (state.transactions || []).filter(t => monthsSet.has(t.bulan));
  } else {
    // Tanggal Mode
    let start = mf.startDate || '2025-08-01';
    let end = mf.endDate || maxDate;
    if (start > end) {
      const temp = start; start = end; end = temp;
      mf.startDate = start;
      mf.endDate = end;
      const startDateInput = document.getElementById('mfStartDate');
      const endDateInput = document.getElementById('mfEndDate');
      if (startDateInput) startDateInput.value = start;
      if (endDateInput) endDateInput.value = end;
    }
    isAll = (start <= '2025-08-01' && end >= maxDate);

    state.masterFilteredTransactions = (state.transactions || []).filter(t => {
      const iso = parseTxDateToISO(t.date_trf || t.date_req);
      if (!iso) return false;
      return iso >= start && iso <= end;
    });

    const activeSet = new Set(state.masterFilteredTransactions.map(t => t.bulan));
    activeMonths = CHRONO_MONTHS.filter(m => activeSet.has(m));
  }

  // 1. Calculate Cash Flow for active months
  const allCf = state.summary?.cash_flow || [];
  const activeMonthsSet = new Set(activeMonths);
  const filteredCf = allCf.filter(item => activeMonthsSet.has(item.bulan));
  state.activeFilteredCf = filteredCf;

  // Compute Grand Total row for Cash Flow
  const sumSumbagja = filteredCf.reduce((a, b) => a + (b.kredit_sumbagja_num || 0), 0);
  const sumEbdi = filteredCf.reduce((a, b) => a + (b.kredit_ebdi_num || 0), 0);
  const sumNabila = filteredCf.reduce((a, b) => a + (b.kredit_nabila_num || 0), 0);
  const totalKredit = sumSumbagja + sumEbdi + sumNabila;
  const totalCashOut = state.masterFilteredTransactions.reduce((a, b) => a + (b.price_num || 0), 0);
  const sisaKredit = totalKredit - totalCashOut;

  const cfForTable = [
    ...filteredCf,
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
    const latestDate = latestTx.date_trf || latestTx.date_req || '07-Sep-26';
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
  updateCostDetailMatrixFromFiltered(state.masterFilteredTransactions);

  // 5. Update Rekapitulasi Price (Tab 4)
  updatePriceMatricesFromFiltered(state.masterFilteredTransactions, activeMonths);

  // 6. Update Charts & Top 5 Categories (Tab 1 & Tab 2)
  renderCharts();

  // 7. Update Tab 5 (Detail Transaksi)
  state.currentPage = 1;
  applyFilters();

  // 8. Update Master Filter Status Bar
  updateMasterFilterStatusUI(totalKredit, totalCashOut, activeMonths, isAll);
}

// Master Filter: Dynamically Rebuild Cost Detail Matrix
function updateCostDetailMatrixFromFiltered(txs) {
  const regions = ["ADMIN", "BALNUS", "CENTRAL SUMATRA", "CENTRAL SUMATRA INTERNAL", "HQ", "JABO", "JATENG", "SULAWESI", "Grand Total"];
  const allCategories = [
    "AKOMODASI", "BBM", "BOP", "COMCASE", "FREELANCE", "INSENTIVE",
    "KASBON", "KREDIT", "MATERIAL", "RENTAL MOBIL", "SALARY", "TOOLS"
  ];

  const thead = document.getElementById('theadCostDetail');
  const tbody = document.getElementById('tbodyCostDetail');
  if (!thead || !tbody) return;

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
    const c = t.category;
    const r = t.region;
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

// Master Filter: Dynamically Rebuild Price Tables
function updatePriceMatricesFromFiltered(txs, activeMonths) {
  // 1. Price per Region
  const regMap = {};
  (txs || []).forEach(t => {
    if (t.region) regMap[t.region] = (regMap[t.region] || 0) + (t.price_num || 0);
  });
  const sortedRegs = Object.keys(regMap).sort();
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
    if (t.bulan) bulanMap[t.bulan] = (bulanMap[t.bulan] || 0) + (t.price_num || 0);
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

  // 3. Price Category x Region Pivot
  const regions = ["ADMIN", "BALNUS", "CENTRAL SUMATRA", "CENTRAL SUMATRA INTERNAL", "HQ", "JABO", "JATENG", "SULAWESI", "Grand Total"];
  const allCategories = [
    "AKOMODASI", "BBM", "BOP", "COMCASE", "FREELANCE", "INSENTIVE",
    "KASBON", "KREDIT", "MATERIAL", "RENTAL MOBIL", "SALARY", "TOOLS"
  ];
  const catRows = [];
  const grandTotalValues = {};
  regions.forEach(r => { grandTotalValues[r] = { text: 'Rp 0', num: 0 }; });

  allCategories.forEach(cat => {
    const rowValues = {};
    let rowSum = 0;
    regions.forEach(reg => {
      if (reg !== 'Grand Total') {
        const sumVal = (txs || []).filter(t => t.category === cat && t.region === reg).reduce((a, b) => a + (b.price_num || 0), 0);
        rowValues[reg] = { text: sumVal > 0 ? formatRp(sumVal) : '', num: sumVal };
        rowSum += sumVal;
        grandTotalValues[reg].num += sumVal;
        grandTotalValues[reg].text = formatRp(grandTotalValues[reg].num);
      }
    });
    rowValues['Grand Total'] = { text: rowSum > 0 ? formatRp(rowSum) : '', num: rowSum };
    grandTotalValues['Grand Total'].num += rowSum;
    grandTotalValues['Grand Total'].text = formatRp(grandTotalValues['Grand Total'].num);
    catRows.push({ category: cat, values: rowValues });
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
      statusRangeText.textContent = 'Semua Periode (Bulan 8 2025 s/d Bulan 9 2026 • 14 Bulan)';
    } else if (mf.mode === 'bulan') {
      const sName = MONTH_NAMES_MAP[mf.startBulan] || mf.startBulan;
      const eName = MONTH_NAMES_MAP[mf.endBulan] || mf.endBulan;
      if (mf.startBulan === mf.endBulan) {
        statusRangeText.textContent = `${mf.startBulan} (${sName})`;
      } else {
        statusRangeText.textContent = `${mf.startBulan} s/d ${mf.endBulan} (${activeMonths.length} Bulan: ${sName} - ${eName})`;
      }
    } else {
      statusRangeText.textContent = `${formatISODateToDisplay(mf.startDate)} s/d ${formatISODateToDisplay(mf.endDate)}`;
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

// Populate Filter Dropdowns from Transactions
function populateFilterDropdowns(txs) {
  const regions = new Set();
  const categories = new Set();
  const vendors = new Set();
  const bulans = new Set();
  const transferBys = new Set();

  txs.forEach(t => {
    if (t.region) regions.add(t.region);
    if (t.category) categories.add(t.category);
    if (t.vendor) vendors.add(t.vendor);
    if (t.bulan) bulans.add(t.bulan);
    if (t.transfer_by) transferBys.add(t.transfer_by);
  });

  const addOptions = (selectId, set) => {
    const select = document.getElementById(selectId);
    const sorted = Array.from(set).sort();
    sorted.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
  };

  addOptions('filterRegion', regions);
  addOptions('filterCategory', categories);
  addOptions('filterVendor', vendors);
  addOptions('filterBulan', bulans);
  addOptions('filterTransferBy', transferBys);
}

// Apply Filters on Transactions
function applyFilters() {
  const f = state.filters;
  const q = f.search;

  const baseTransactions = (state.masterFilteredTransactions && state.masterFilteredTransactions.length)
    ? state.masterFilteredTransactions
    : (state.masterFilter.preset !== 'all' ? [] : (state.transactions || []));

  state.filteredTransactions = baseTransactions.filter(t => {
    if (f.region && t.region !== f.region) return false;
    if (f.category && t.category !== f.category) return false;
    if (f.vendor && t.vendor !== f.vendor) return false;
    if (f.bulan && t.bulan !== f.bulan) return false;
    if (f.transferBy && t.transfer_by !== f.transferBy) return false;

    if (q) {
      const matchText = (t.site_id + ' ' + t.site_name + ' ' + t.pic + ' ' + t.sow + ' ' + t.vendor + ' ' + t.program).toLowerCase();
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
    tr.innerHTML = `<td colspan="11" class="text-center" style="padding: 30px; color: var(--text-muted);">Tidak ada data transaksi yang cocok dengan filter.</td>`;
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

  const headers = ['NO', 'VENDOR', 'PROGRAM', 'DATE REQUEST', 'DATE TRANSFER', 'REGION', 'CATEGORY', 'SITE ID', 'SITE NAME', 'PIC', 'NOMINAL', 'TRANSFER BY', 'STATUS', 'BULAN', 'SOW'];
  const rows = [headers.join(',')];

  state.filteredTransactions.forEach(t => {
    const clean = (str) => `"${(str || '').toString().replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    rows.push([
      clean(t.no),
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

  const filename = `Transfer_EBDI_Filtered_${new Date().toISOString().slice(0, 10)}.csv`;
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
      { label: 'Nama File', value: filename.slice(0, 18) + '...' }
    ],
    duration: 4000
  });
}
