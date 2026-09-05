const WEIGHTS = { oneYear: 0.2, threeYear: 0.3, fiveYear: 0.5 };
const MFAPI_BASE = 'https://api.mfapi.in/mf';
const TOP_FUNDS_DATA_URL = 'https://github.com/Shreyas-Ashtamkar/mutual-fund-ratings/releases/download/daily-top-funds/top-funds.json';

const TOP_FUNDS = [
  { category: 'Flexi Cap', name: 'Parag Parikh Flexi Cap Fund Direct Growth', thesis: 'Diversified equity allocation with an established long-term record.', horizon: '5+ years' },
  { category: 'International', name: 'Kotak Quality Overseas Equity Active FOF Direct Growth', schemeCode: '154287', thesis: 'International equity fund-of-funds exposure for a diversified satellite allocation.', horizon: '7+ years' },
  { category: 'Mid Cap', name: 'HDFC Mid-Cap Opportunities Fund Direct Growth', schemeCode: '118989', thesis: 'Higher-growth equity exposure for investors who can tolerate volatility.', horizon: '7+ years' },
  { category: 'Small Cap', name: 'Nippon India Small Cap Fund Direct Growth', thesis: 'High-risk satellite allocation focused on smaller Indian companies.', horizon: '7+ years' },
  { category: 'ELSS', name: 'Mirae Asset ELSS Tax Saver Fund Direct Growth', thesis: 'Equity-linked tax saver with the statutory three-year lock-in.', horizon: '3+ years' },
  { category: 'Hybrid', name: 'ICICI Prudential Equity & Debt Fund Direct Growth', thesis: 'Equity and debt mix for a smoother path than pure equity.', horizon: '5+ years' },
  { category: 'Index', name: 'UTI Nifty 50 Index Fund Direct Growth', thesis: 'Low-cost access to India’s large-cap benchmark.', horizon: '5+ years' },
];

let funds = [];
let selectedCategory = 'All';
const TOP_FUNDS_CACHE_KEY = 'fund-lens-top-funds-v1';
const TOP_FUNDS_CACHE_TTL = 24 * 60 * 60 * 1000;
let topFundMetrics = {};
let topFundsUpdatedAt = 0;

const tableBody = document.getElementById('fund-table-body');
const fundCardsFeed = document.getElementById('fund-cards-feed');
const emptyState = document.getElementById('empty-state');
const filterInput = document.getElementById('fund-filter');
const fundNameFields = document.getElementById('fund-name-fields');
const addFundButton = document.getElementById('add-fund-button');
const fetchFundsButton = document.getElementById('fetch-funds-button');
const fundFileInput = document.getElementById('fund-file');
const downloadButton = document.getElementById('download-button');
const inputScreen = document.getElementById('input-screen');
const resultsScreen = document.getElementById('results-screen');
const backButton = document.getElementById('back-button');
const goToInputsButton = document.getElementById('go-to-inputs-button');
const status = document.getElementById('file-status');
const errorMessage = document.getElementById('error-message');
const viewTabs = [...document.querySelectorAll('.view-tab')];
const appViews = [...document.querySelectorAll('.app-view')];
const categoryFilters = document.getElementById('category-filters');
const topFundsGrid = document.getElementById('top-funds-grid');
const topFundsRefreshStatus = document.getElementById('top-funds-refresh-status');

function parseNumber(value) {
  const number = Number.parseFloat(String(value).replace('%', '').trim());
  return Number.isFinite(number) ? number : null;
}

function calculateScore(fund) {
  const periods = [['oneYear', WEIGHTS.oneYear], ['threeYear', WEIGHTS.threeYear], ['fiveYear', WEIGHTS.fiveYear]];
  const available = periods.filter(([period]) => Number.isFinite(fund[period]));
  if (!available.length) return null;
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  return available.reduce((sum, [period, weight]) => sum + fund[period] * weight, 0) / totalWeight;
}

function ratingFor(score, allScores) {
  const sorted = [...allScores].sort((a, b) => b - a);
  const rank = sorted.indexOf(score);
  const percentile = allScores.length === 1 ? 1 : 1 - rank / (allScores.length - 1);
  return Math.max(1, Math.min(5, Math.ceil(percentile * 5)));
}

function formatReturn(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : '—';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = '';
  errorMessage.hidden = true;
}

function render() {
  const query = filterInput.value.trim().toLowerCase();
  const visibleFunds = funds.filter((fund) => `${fund.name} ${fund.category}`.toLowerCase().includes(query));
  const scoredFunds = funds.map((fund) => ({ ...fund, score: calculateScore(fund) }));
  const scores = scoredFunds.map((fund) => fund.score).filter(Number.isFinite);

  const renderPill = (val) => {
    if (!Number.isFinite(val)) return '<span class="metric-val neutral">—</span>';
    const isPos = val >= 0;
    return `<span class="metric-val ${isPos ? 'positive' : 'negative'}">${isPos ? '+' : ''}${val.toFixed(1)}%</span>`;
  };

  const rows = visibleFunds.map((fund) => {
    const score = calculateScore(fund);
    const rating = Number.isFinite(score) ? ratingFor(score, scores) : 0;
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    return `<tr>
      <td><span class="fund-name">${escapeHtml(fund.name)}</span><span class="category">${escapeHtml(fund.category)}${fund.schemeCode ? ` · Code ${fund.schemeCode}` : ''}</span></td>
      <td><span class="rating" aria-label="${rating ? `${rating} out of 5 stars` : 'Not enough history for a rating'}">${rating ? stars : '—'}</span></td>
      <td>${formatReturn(fund.oneYear)}</td>
      <td>${formatReturn(fund.threeYear)}</td>
      <td>${formatReturn(fund.fiveYear)}</td>
      <td class="score">${formatReturn(score)}</td>
      <td><a class="chart-button" href="${chartUrl(fund)}" target="_blank" rel="noopener" aria-label="Open NAV chart for ${escapeHtml(fund.name)}" title="Open NAV chart in a new tab"><i class="fa-solid fa-chart-line" aria-hidden="true"></i></a></td>
    </tr>`;
  });

  const cards = visibleFunds.map((fund) => {
    const score = calculateScore(fund);
    const rating = Number.isFinite(score) ? ratingFor(score, scores) : 0;
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    return `<article class="fund-card">
      <div class="fund-card-header">
        <div class="fund-badge-group">
          <span class="fund-category-tag">${escapeHtml(fund.category || 'Mutual Fund')}</span>
          ${fund.schemeCode ? `<span class="fund-code-pill">Code ${escapeHtml(String(fund.schemeCode))}</span>` : ''}
        </div>
        <div class="fund-card-rating" aria-label="${rating ? `${rating} out of 5 stars` : 'Not enough history for a rating'}">
          <span class="rating-stars">${rating ? stars : '—'}</span>
          ${rating ? `<span class="rating-badge">${rating}/5</span>` : ''}
        </div>
      </div>
      <h3 class="fund-card-title">${escapeHtml(fund.name)}</h3>
      <div class="fund-metrics-grid">
        <div class="fund-metric-item">
          <span class="metric-lbl">1Y Return</span>
          ${renderPill(fund.oneYear)}
        </div>
        <div class="fund-metric-item">
          <span class="metric-lbl">3Y CAGR</span>
          ${renderPill(fund.threeYear)}
        </div>
        <div class="fund-metric-item">
          <span class="metric-lbl">5Y CAGR</span>
          ${renderPill(fund.fiveYear)}
        </div>
      </div>
      <div class="fund-card-footer">
        <div class="score-chip">
          <span class="score-chip-lbl">Model Score</span>
          <span class="score-chip-val">${formatReturn(score)}</span>
        </div>
        <a class="card-chart-btn" href="${chartUrl(fund)}" target="_blank" rel="noopener" aria-label="Open NAV chart for ${escapeHtml(fund.name)}">
          <span>NAV Chart</span>
          <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
        </a>
      </div>
    </article>`;
  });

  tableBody.innerHTML = rows.join('');
  if (fundCardsFeed) {
    fundCardsFeed.innerHTML = cards.join('');
  }
  emptyState.hidden = visibleFunds.length !== 0;
  document.getElementById('fund-count').textContent = funds.length;
  const rankedFunds = funds.filter((fund) => Number.isFinite(calculateScore(fund))).sort((a, b) => calculateScore(b) - calculateScore(a));
  const fiveYearFunds = funds.filter((fund) => Number.isFinite(fund.fiveYear));
  document.getElementById('top-rated').textContent = rankedFunds.length ? rankedFunds[0].name : '—';
  document.getElementById('average-return').textContent = fiveYearFunds.length
    ? formatReturn(fiveYearFunds.reduce((sum, fund) => sum + fund.fiveYear, 0) / fiveYearFunds.length)
    : '—';
}

function chartUrl(fund) {
  const params = new URLSearchParams({ name: fund.name });
  if (fund.schemeCode) params.set('code', fund.schemeCode);
  return `chart.html?${params}`;
}

function readTopFundsCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(TOP_FUNDS_CACHE_KEY));
    if (!cached || !cached.updatedAt || !cached.entries || Date.now() - cached.updatedAt > TOP_FUNDS_CACHE_TTL) return null;
    return cached;
  } catch (error) {
    return null;
  }
}

function saveTopFundsCache(entries) {
  topFundsUpdatedAt = Date.now();
  topFundMetrics = entries;
  localStorage.setItem(TOP_FUNDS_CACHE_KEY, JSON.stringify({ updatedAt: topFundsUpdatedAt, entries }));
}

function formatRefreshTime(timestamp) {
  return new Date(timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderTopFunds() {
  const categories = ['All', ...new Set(TOP_FUNDS.map((fund) => fund.category))];
  categoryFilters.innerHTML = categories.map((category) => `<button class="category-filter${category === selectedCategory ? ' is-selected' : ''}" type="button" role="tab" aria-selected="${category === selectedCategory}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('');
  const visibleFunds = selectedCategory === 'All' ? TOP_FUNDS : TOP_FUNDS.filter((fund) => fund.category === selectedCategory);
  topFundsGrid.innerHTML = visibleFunds.map((fund) => `<article class="top-fund-card">
    <div class="top-fund-card-head"><span class="fund-category-pill">${escapeHtml(fund.category)}</span><span class="horizon"><i class="fa-regular fa-clock" aria-hidden="true"></i> ${fund.horizon}</span></div>
    <h3>${escapeHtml(fund.name)}</h3>
    <p>${escapeHtml(fund.thesis)}</p>
    ${topFundMetrics[fund.name] ? `<div class="top-fund-live-metrics" aria-label="Live performance metrics">
      <div><span>1Y</span><strong>${formatReturn(topFundMetrics[fund.name].oneYear)}</strong></div>
      <div><span>3Y</span><strong>${formatReturn(topFundMetrics[fund.name].threeYear)}</strong></div>
      <div><span>5Y</span><strong>${formatReturn(topFundMetrics[fund.name].fiveYear)}</strong></div>
    </div>
    <div class="top-fund-score"><span>Model score ${formatReturn(topFundMetrics[fund.name].score)}</span><span class="rating" aria-label="${topFundMetrics[fund.name].rating || 0} out of 5 stars">${topFundMetrics[fund.name].rating ? '★'.repeat(topFundMetrics[fund.name].rating) : '—'}</span></div>` : '<p class="top-fund-loading" role="status">Loading daily performance metrics...</p>'}
    <a class="open-chart-link" href="${chartUrl(fund)}" target="_blank" rel="noopener">Open NAV chart <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>
  </article>`).join('');
}

async function refreshTopFunds() {
  const cached = readTopFundsCache();
  if (cached) {
    topFundMetrics = cached.entries;
    topFundsUpdatedAt = cached.updatedAt;
    renderTopFunds();
    topFundsRefreshStatus.textContent = `Daily update from ${formatRefreshTime(topFundsUpdatedAt)}. Refreshes every 24 hours.`;
    return;
  }

  renderTopFunds();
  topFundsRefreshStatus.textContent = 'Loading the latest daily Top Funds release...';
  try {
    const response = await fetch(`${TOP_FUNDS_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('The daily release is not available yet.');
    const payload = await response.json();
    const entries = Object.fromEntries((payload.funds || []).map((fund) => [fund.name, fund]));
    if (!Object.keys(entries).length) throw new Error('The daily release did not contain any funds.');
    saveTopFundsCache(entries);
    renderTopFunds();
    topFundsRefreshStatus.textContent = `Updated ${formatRefreshTime(topFundsUpdatedAt)}. Refreshes daily at 7:00 PM IST.`;
  } catch (error) {
    topFundsRefreshStatus.textContent = 'Daily release unavailable. Charts remain available with live NAV history.';
  }
}

function setView(viewId) {
  appViews.forEach((view) => { view.hidden = view.id !== viewId; });
  viewTabs.forEach((tab) => {
    const active = tab.dataset.view === viewId;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  if (viewId === 'top-funds-view') renderTopFunds();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function parseMfDate(value) {
  const [day, month, year] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function navAtOrBefore(history, targetDate) {
  return history.find((entry) => entry.date <= targetDate);
}

function annualizedReturn(history, latestDate, latestNav, years) {
  const targetDate = new Date(latestDate);
  targetDate.setFullYear(targetDate.getFullYear() - years);
  const previous = navAtOrBefore(history, targetDate);
  if (!previous || previous.nav <= 0 || latestNav <= 0) return null;
  const actualYears = (latestDate - previous.date) / (365.25 * 24 * 60 * 60 * 1000);
  return (Math.pow(latestNav / previous.nav, 1 / actualYears) - 1) * 100;
}

function selectScheme(matches, requestedName) {
  const usable = matches.filter((match) => !/idcw|dividend|bonus/i.test(match.schemeName));
  const candidates = usable.length ? usable : matches;
  const growth = candidates.filter((match) => /direct plan.*growth/i.test(match.schemeName));
  const pool = growth.length ? growth : candidates;
  const requestedWords = requestedName.toLowerCase().split(/\s+/).filter((word) => word.length > 2);
  return [...pool].sort((a, b) => {
    const aScore = requestedWords.filter((word) => a.schemeName.toLowerCase().includes(word)).length;
    const bScore = requestedWords.filter((word) => b.schemeName.toLowerCase().includes(word)).length;
    return bScore - aScore || a.schemeName.localeCompare(b.schemeName);
  })[0];
}

async function fetchLiveFund(name, providedSchemeCode = '') {
  let scheme;
  if (providedSchemeCode) {
    scheme = { schemeCode: providedSchemeCode, schemeName: name };
  } else {
    const searchResponse = await fetch(`${MFAPI_BASE}/search?q=${encodeURIComponent(name)}`);
    if (!searchResponse.ok) throw new Error(`Could not search for "${name}".`);
    const matches = await searchResponse.json();
    if (!Array.isArray(matches) || !matches.length) throw new Error(`No Indian mutual-fund scheme matched "${name}".`);
    scheme = selectScheme(matches, name);
  }
  const historyResponse = await fetch(`${MFAPI_BASE}/${scheme.schemeCode}`);
  if (!historyResponse.ok) throw new Error(`Could not load NAV history for "${scheme.schemeName}".`);
  const payload = await historyResponse.json();
  const history = (payload.data || []).map((entry) => ({ date: parseMfDate(entry.date), nav: Number(entry.nav) })).filter((entry) => !Number.isNaN(entry.nav) && !Number.isNaN(entry.date.getTime())).sort((a, b) => b.date - a.date);
  if (!history.length) throw new Error(`No NAV history is available for "${scheme.schemeName}".`);
  const latest = history[0];
  return {
    name: scheme.schemeName,
    category: payload.meta?.scheme_category || 'Indian mutual fund',
    schemeCode: scheme.schemeCode,
    oneYear: annualizedReturn(history, latest.date, latest.nav, 1),
    threeYear: annualizedReturn(history, latest.date, latest.nav, 3),
    fiveYear: annualizedReturn(history, latest.date, latest.nav, 5),
  };
}

async function fetchLiveFunds() {
  clearError();
  const names = [...document.querySelectorAll('.fund-name-input')].map((input) => input.value.trim()).filter(Boolean);
  if (!names.length) {
    showError('Enter at least one Indian mutual-fund name.');
    return;
  }
  fetchFundsButton.disabled = true;
  fetchFundsButton.textContent = 'Fetching NAV history…';
  try {
    const results = await Promise.all(names.map(async (name) => {
      try {
        return { fund: await fetchLiveFund(name) };
      } catch (error) {
        return { error: error.message };
      }
    }));
    const loadedFunds = results.filter((result) => result.fund).map((result) => result.fund);
    const failures = results.filter((result) => result.error).map((result) => result.error);
    if (!loadedFunds.length) throw new Error(failures.join(' '));
    showResults(loadedFunds, `${loadedFunds.length} live scheme(s) loaded from MFAPI.${failures.length ? ` ${failures.length} name(s) could not be matched: ${failures.join(' ')}` : ''}`);
  } catch (error) {
    showError(error.message);
  } finally {
    fetchFundsButton.disabled = false;
    fetchFundsButton.textContent = 'Fetch actual NAV data';
  }
}

function showResults(nextFunds, sourceMessage) {
  funds = nextFunds;
  filterInput.value = '';
  status.textContent = sourceMessage;
  inputScreen.hidden = true;
  resultsScreen.hidden = false;
  goToInputsButton.hidden = false;
  render();
  requestAnimationFrame(() => resultsScreen.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function importExcelFile(file) {
  if (!window.XLSX) throw new Error('Excel support could not load. Check your internet connection and try again.');
  return file.arrayBuffer().then((contents) => {
    const workbook = XLSX.read(contents, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    if (!rows.length) throw new Error('The Excel file does not contain any funds.');
    return rows.map((row, index) => {
      const values = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase(), value]));
      const fund = {
        name: String(values.fund || '').trim(),
        category: String(values.category || 'Uncategorized').trim(),
        schemeCode: String(values['scheme code'] || '').trim(),
        oneYear: parseNumber(values['1y']),
        threeYear: parseNumber(values['3y']),
        fiveYear: parseNumber(values['5y']),
      };
      if (!fund.name) {
        throw new Error(`Invalid fund data in Excel row ${index + 2}.`);
      }
      return fund;
    });
  });
}

function downloadExcel() {
  if (!window.XLSX) {
    showError('Excel support could not load. Check your internet connection and try again.');
    return;
  }
  const rows = funds.map((fund) => ({
    Fund: fund.name,
    Category: fund.category,
    '1Y': fund.oneYear,
    '3Y': fund.threeYear,
    '5Y': fund.fiveYear,
    'Scheme Code': fund.schemeCode || '',
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Fund ratings');
  XLSX.writeFile(workbook, 'fund-lens-ratings.xlsx');
}

fetchFundsButton.addEventListener('click', fetchLiveFunds);
downloadButton.addEventListener('click', downloadExcel);

fundFileInput.addEventListener('change', async () => {
  const file = fundFileInput.files[0];
  if (!file) return;
  clearError();
  try {
    const importedFunds = await importExcelFile(file);
    populateFundNameFields(importedFunds.map((fund) => fund.name));
    showResults(importedFunds, `${importedFunds.length} fund(s) restored from ${file.name}.`);
  } catch (error) {
    showError(error.message);
  } finally {
    fundFileInput.value = '';
  }
});

function addFundNameField(name = '', shouldFocus = true) {
  const fieldNumber = fundNameFields.children.length + 1;
  const label = document.createElement('label');
  label.className = 'fund-name-field';
  label.innerHTML = `<span class="sr-only">Fund name ${fieldNumber}</span><input class="fund-name-input" type="text" placeholder="e.g. SBI Bluechip Fund" autocomplete="off">`;
  fundNameFields.append(label);
  const input = label.querySelector('input');
  input.value = name;
  if (shouldFocus) {
    input.focus();
    fundNameFields.scrollTo({ top: fundNameFields.scrollHeight, behavior: 'smooth' });
  }
}

function populateFundNameFields(names) {
  fundNameFields.innerHTML = '';
  names.forEach((name) => addFundNameField(name, false));
  fundNameFields.scrollTo({ top: 0 });
}

addFundButton.addEventListener('click', addFundNameField);

fundNameFields.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addFundNameField();
    return;
  }
  if (event.key !== 'Backspace' || event.target.value || fundNameFields.children.length === 1) return;
  event.preventDefault();
  const field = event.target.closest('.fund-name-field');
  const previousInput = field.previousElementSibling?.querySelector('.fund-name-input');
  field.remove();
  previousInput?.focus();
  fundNameFields.scrollTo({ top: fundNameFields.scrollHeight, behavior: 'smooth' });
});

function showInputs() {
  resultsScreen.hidden = true;
  inputScreen.hidden = false;
  goToInputsButton.hidden = true;
  clearError();
  inputScreen.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

backButton.addEventListener('click', showInputs);
goToInputsButton.addEventListener('click', showInputs);

filterInput.addEventListener('input', render);

viewTabs.forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));
categoryFilters.addEventListener('click', (event) => {
  const filter = event.target.closest('.category-filter');
  if (!filter) return;
  selectedCategory = filter.dataset.category;
  renderTopFunds();
});

refreshTopFunds();
