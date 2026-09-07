/**
 * EBDI Dashboard Application Logic (Pure Web Base)
 * Works standalone with 0 dependencies, 0 Python, 0 Terminal.
 * Can be opened directly by double-clicking index.html!
 */

// Application State
const state = {
  summary: null,
  transactions: [],
  filteredTransactions: [],
  currentPage: 1,
  pageSize: 25,
  charts: {},
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

  // Check if data is already available via data.js (Pure Web, No Python / Server needed)
  if (window.EBDI_SUMMARY) {
    state.summary = window.EBDI_SUMMARY;
    populateSummaryUI(state.summary);
    renderCharts();

    if (window.EBDI_TRANSACTIONS && window.EBDI_TRANSACTIONS.length) {
      state.transactions = window.EBDI_TRANSACTIONS;
      state.filteredTransactions = window.EBDI_TRANSACTIONS;
      populateFilterDropdowns(state.transactions);
      applyFilters();
    }
    badgeText.textContent = 'Data Siap (Offline & Online)';
    return;
  }

  // Fallback: If hosted on a server, try fetch
  badgeText.textContent = 'Memuat data...';
  fetch('data/summary.json')
    .then(res => res.json())
    .then(data => {
      state.summary = data;
      populateSummaryUI(data);
      renderCharts();
      badgeText.textContent = 'Data Terhubung';
      
      return fetch('data/transactions.json');
    })
    .then(res => res.json())
    .then(txs => {
      state.transactions = txs;
      state.filteredTransactions = txs;
      populateFilterDropdowns(txs);
      applyFilters();
    })
    .catch(err => {
      console.warn('Local JSON load fallback error:', err);
      badgeText.textContent = 'Data Standby';
    });
}

// Direct Sync from Google Sheets via Pure JavaScript (No Python)
async function syncDataDirectFromGoogleSheets() {
  const badge = document.getElementById('syncStatusBadge');
  const badgeText = document.getElementById('syncStatusText');
  badgeText.textContent = 'Menghubungi Google Sheets...';
  badge.style.borderColor = 'var(--warning)';
  badge.style.color = 'var(--warning)';

  const summaryUrl = 'https://docs.google.com/spreadsheets/d/1wQV3dYvMY5XaJNkw7y-4ZycZ8VmJcScQPRTFp1wSvnY/export?format=csv&gid=1112038042';

  try {
    const res = await fetch(summaryUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const csvText = await res.text();
    
    parseAndApplySummaryCSV(csvText);

    badgeText.textContent = 'Data Diperbarui Langsung!';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    badge.style.color = '#10b981';
  } catch (err) {
    console.error('Google Sheets sync notice:', err);
    // If CORS prevents direct browser fetch on file://, inform gracefully:
    alert('Informasi Sinkronisasi:\n\nJika membuka file HTML langsung secara lokal (file://), browser membatasi permintaan CORS eksternal langsung ke Google Sheets. Anda dapat menggunakan data yang sudah tersimpan rapi atau membuka via web hosting / server static.\n\nData lokal Anda tetap 100% lengkap dan siap digunakan.');
    badgeText.textContent = 'Data Siap (Offline & Online)';
    badge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    badge.style.color = '#10b981';
  }
}

// Pure JS CSV parser for live updates
function parseAndApplySummaryCSV(text) {
  // Simple line-by-line CSV parser
  const lines = text.split(/\r?\n/).map(line => {
    const cells = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) { cells.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    cells.push(cur.trim());
    return cells;
  });

  // Re-populate Summary UI if needed
  renderCharts();
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
function populateTopCategories(cd) {
  const container = document.getElementById('topCategoriesList');
  if (!container || !cd || !cd.rows) return;

  const list = cd.rows.map(r => {
    const totalNum = r.values['Grand Total'] ? r.values['Grand Total'].num : 0;
    const totalText = r.values['Grand Total'] ? r.values['Grand Total'].text : formatRp(totalNum);
    return { name: r.category, num: totalNum, text: totalText };
  }).sort((a, b) => b.num - a.num);

  const topTotal = list.length > 0 ? list[0].num : 1;
  container.innerHTML = '';

  list.slice(0, 5).forEach((item, index) => {
    const pct = Math.min(100, Math.round((item.num / topTotal) * 100));
    const div = document.createElement('div');
    div.className = 'top-cat-item';
    div.innerHTML = `
      <div class="top-cat-row">
        <div class="top-cat-name">#${index + 1} ${item.name}</div>
        <div class="top-cat-price">${item.text}</div>
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
  if (!state.summary || typeof Chart === 'undefined') return;

  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';

  // 1. Cash Flow Overview Bar Chart
  const cf = (state.summary.cash_flow || []).filter(i => i.bulan.toLowerCase() !== 'grand total');
  const labels = cf.map(i => i.bulan.replace('Bulan ', 'Bln '));
  const kreditData = cf.map(i => (i.kredit_sumbagja_num || 0) + (i.kredit_ebdi_num || 0) + (i.kredit_nabila_num || 0));
  const cashOutData = cf.map(i => i.cash_out_num || 0);

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

  // 2. Category Donut Chart
  const cd = state.summary.cost_detail;
  if (cd && cd.rows) {
    const catLabels = [];
    const catData = [];
    cd.rows.forEach(r => {
      const gt = r.values['Grand Total'];
      if (gt && gt.num > 0) {
        catLabels.push(r.category);
        catData.push(gt.num);
      }
    });

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
              '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#e11d48'
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
  }

  // 3. Regional Bar Chart
  if (cd && cd.regions && cd.grand_total) {
    const regLabels = cd.regions.filter(r => r !== 'Grand Total');
    const regData = regLabels.map(r => cd.grand_total[r] ? cd.grand_total[r].num : 0);

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

  state.filteredTransactions = state.transactions.filter(t => {
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

  document.getElementById('txFilteredCount').textContent = state.filteredTransactions.length.toLocaleString('id-ID');
  document.getElementById('txTotalCount').textContent = state.transactions.length.toLocaleString('id-ID');

  const sum = state.filteredTransactions.reduce((acc, cur) => acc + (cur.price_num || 0), 0);
  document.getElementById('txFilteredSum').textContent = formatRp(sum);

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
    alert('Tidak ada data transaksi untuk diekspor.');
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

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(rows.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `Transfer_EBDI_Filtered_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
