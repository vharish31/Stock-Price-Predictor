const MARKET_FEED_NAME = "QuantSight Market Feed";

const STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", exchange: "US", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "US", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "US", currency: "USD" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "US", currency: "USD" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "US", currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "US", currency: "USD" },
  { symbol: "META", name: "Meta Platforms", exchange: "US", currency: "USD" },
  { symbol: "INFY", name: "Infosys", exchange: "NS", currency: "INR" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NS", currency: "INR" },
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NS", currency: "INR" },
  { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NS", currency: "INR" },
  { symbol: "ICICIBANK", name: "ICICI Bank", exchange: "NS", currency: "INR" }
];

const els = {
  ticker: document.querySelector("#tickerInput"),
  exchange: document.querySelector("#exchangeSelect"),
  load: document.querySelector("#loadBtn"),
  suggestions: document.querySelector("#suggestions"),
  ranges: document.querySelector("#rangeButtons"),
  horizons: document.querySelector("#horizonButtons"),
  custom: document.querySelector("#customBtn"),
  customDrawer: document.querySelector("#customBtnDrawer"),
  exchangeMobile: document.querySelector("#exchangeSelectMobile"),
  searchForm: document.querySelector("#searchForm"),
  fileInput: document.querySelector("#importFile"),
  importName: document.querySelector("#importFileName"),
  start: document.querySelector("#startDate"),
  end: document.querySelector("#endDate"),
  title: document.querySelector("#assetTitle"),
  source: document.querySelector("#dataSource"),
  kpis: document.querySelector("#kpiGrid"),
  priceCanvas: document.querySelector("#priceCanvas"),
  volumeCanvas: document.querySelector("#volumeCanvas"),
  tooltip: document.querySelector("#tooltip"),
  prediction: document.querySelector("#predictionPrice"),
  signal: document.querySelector("#signalBadge"),
  confidenceText: document.querySelector("#confidenceText"),
  confidenceBar: document.querySelector("#confidenceBar"),
  metrics: document.querySelector("#modelMetrics"),
  insights: document.querySelector("#insights"),
  copy: document.querySelector("#copyInsights"),
  csv: document.querySelector("#csvBtn"),
  report: document.querySelector("#reportBtn"),
  chart: document.querySelector("#chartBtn"),
  chartMode: document.querySelector("#chartMode"),
  watchlist: document.querySelector("#watchlist"),
  reset: document.querySelector("#resetBtn"),
  sourceDesktop: document.querySelector("#desktopDataSource"),
  loadingBar: document.querySelector("#loadingBar"),
  sidebar: document.querySelector("#sidebarNav"),
  sidebarBackdrop: document.querySelector("#sidebarBackdrop"),
  menuToggle: document.querySelector("#menuToggle"),
  sidebarClose: document.querySelector("#sidebarClose"),
  confidenceTrack: document.querySelector("#confidenceTrack")
};

const state = {
  range: "6mo",
  horizon: 1,
  mode: "line",
  data: [],
  forecast: [],
  model: null,
  profile: STOCKS[0],
  hoverIndex: null,
  custom: null,
  importedRows: null,
  importFileName: null,
  hasData: false
};

const fmt = {
  money(value, currency = state.profile.currency) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "INR" ? 1 : 2 }).format(value);
  },
  number(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
  },
  compact(value) {
    return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  },
  pct(value) {
    return `${(value * 100).toFixed(2)}%`;
  }
};

function yahooSymbol(symbol, exchange) {
  const clean = symbol.trim().toUpperCase();
  if (exchange === "NS" && !clean.endsWith(".NS")) return `${clean}.NS`;
  if (exchange === "BO" && !clean.endsWith(".BO")) return `${clean}.BO`;
  return clean.replace(".NS", "").replace(".BO", "");
}

function rangeToPeriod(range) {
  return ({ "1mo": "1mo", "3mo": "3mo", "6mo": "6mo", "1y": "1y", "5y": "5y" })[range] || "6mo";
}

function clearImportedData() {
  state.importedRows = null;
  state.importFileName = null;
  state.custom = null;
  if (els.fileInput) els.fileInput.value = "";
  if (els.importName) {
    els.importName.textContent = "CSV or JSON with date, open, high, low, close, volume";
    els.importName.classList.remove("loaded");
  }
}

function clearCanvas(canvas) {
  if (!canvas) return;
  const { ctx, width, height } = setupCanvas(canvas);
  ctx.clearRect(0, 0, width, height);
}

function renderEmptyState() {
  els.title.textContent = "No instrument selected";
  setDataSourceLabel("Awaiting data");
  setDataSourceState();
  els.prediction.textContent = "—";
  els.prediction.title = "";
  els.signal.textContent = "—";
  els.signal.classList.remove("bullish", "bearish");
  els.confidenceText.textContent = "0%";
  els.confidenceBar.style.width = "0%";
  if (els.confidenceTrack) {
    els.confidenceTrack.setAttribute("aria-valuenow", "0");
    els.confidenceTrack.setAttribute("aria-valuetext", "0 percent");
  }
  els.kpis.innerHTML = `<p class="empty-hint">Enter a symbol and analyze, or import a dataset to view metrics.</p>`;
  els.metrics.innerHTML = `<div class="metric-row"><span>Status</span><strong>—</strong></div>`;
  els.insights.innerHTML = `<p class="watch-hint">Insights appear after you load market or imported data.</p>`;
  els.watchlist.innerHTML = `<p class="watch-hint">Load a symbol to compare peers.</p>`;
  els.tooltip.hidden = true;
  clearCanvas(els.priceCanvas);
  clearCanvas(els.volumeCanvas);
}

function resetDashboard() {
  clearImportedData();
  state.data = [];
  state.forecast = [];
  state.model = null;
  state.hoverIndex = null;
  state.hasData = false;
  state.custom = null;
  state.range = "6mo";
  state.horizon = 1;
  state.profile = { symbol: "", name: "", exchange: "US", currency: "USD" };
  watchCache.clear();

  els.ticker.value = "";
  setExchange("US");
  els.start.value = "";
  els.end.value = "";
  els.suggestions.hidden = true;
  if (els.fileInput) els.fileInput.value = "";

  [...els.ranges.children].forEach(btn => btn.classList.toggle("active", btn.dataset.range === "6mo"));
  [...els.horizons.children].forEach(btn => btn.classList.toggle("active", Number(btn.dataset.horizon) === 1));

  renderEmptyState();
  closeSidebar();
  showToast("All data cleared", "success");
}

function parseCsvRows(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one data row");
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = splitCsvLine(lines[0], delimiter).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i], delimiter);
    if (!cells.some(cell => cell.trim())) continue;
    const record = {};
    headers.forEach((key, index) => { record[key] = cells[index]?.trim() ?? ""; });
    if (isPredictedFlag(record.predicted)) continue;
    const row = normalizeOhlcvRecord(record);
    if (row) rows.push(row);
  }
  return rows;
}

function splitCsvLine(line, delimiter) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function parseJsonRows(text) {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed.data || parsed.rows || parsed.prices;
  if (!Array.isArray(list)) throw new Error("JSON must be an array or { data: [...] }");
  return list
    .filter(item => !isPredictedFlag(item.predicted))
    .map(item => normalizeOhlcvRecord(flattenKeys(item)))
    .filter(Boolean);
}

function flattenKeys(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key.toLowerCase().replace(/[^a-z0-9]/g, "")] = value;
  }
  return out;
}

function isPredictedFlag(value) {
  return value === true || value === 1 || String(value).toLowerCase() === "true" || String(value) === "1";
}

function pickField(record, aliases) {
  for (const alias of aliases) {
    if (record[alias] != null && record[alias] !== "") return record[alias];
  }
  return null;
}

function parseDateValue(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && raw > 1e11) return new Date(raw);
  const text = String(raw).trim();
  if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000);
  if (/^\d{13}$/.test(text)) return new Date(Number(text));
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(raw) {
  const value = Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function normalizeOhlcvRecord(record) {
  const dateRaw = pickField(record, ["date", "datetime", "time", "timestamp", "tradingdate"]);
  const date = parseDateValue(dateRaw);
  const close = toNumber(pickField(record, ["close", "adjclose", "adjustedclose", "last", "price"]));
  if (!date || close == null) return null;
  const open = toNumber(pickField(record, ["open"])) ?? close;
  const high = toNumber(pickField(record, ["high"])) ?? Math.max(open, close);
  const low = toNumber(pickField(record, ["low"])) ?? Math.min(open, close);
  const volume = toNumber(pickField(record, ["volume", "vol"])) ?? 0;
  return {
    date,
    open,
    high,
    low,
    close,
    volume,
    currency: state.profile.currency
  };
}

function filterImportedByDates(rows) {
  if (!els.start.value && !els.end.value) return rows;
  const start = els.start.value ? new Date(els.start.value) : null;
  const end = els.end.value ? new Date(els.end.value) : null;
  if (start && end && start > end) throw new Error("Start date must be before end date");
  return rows.filter(row => {
    const day = row.date.toISOString().slice(0, 10);
    if (start && day < els.start.value) return false;
    if (end && day > els.end.value) return false;
    return true;
  });
}

function parseImportedFile(text, filename) {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const rows = ext === "json" ? parseJsonRows(text) : parseCsvRows(text);
  if (rows.length < 20) throw new Error("Need at least 20 trading rows for analysis");
  rows.sort((a, b) => a.date - b.date);
  return rows;
}

async function loadImportedFile(file) {
  const text = await file.text();
  const rows = parseImportedFile(text, file.name);
  state.importedRows = rows;
  state.importFileName = file.name;
  return rows;
}

async function fetchMarketData(symbol, exchange, range) {
  const querySymbol = yahooSymbol(symbol, exchange);
  const params = new URLSearchParams({ symbol: querySymbol });
  if (state.custom) {
    params.set("period1", String(Math.floor(new Date(state.custom.start).getTime() / 1000)));
    params.set("period2", String(Math.floor(new Date(state.custom.end).getTime() / 1000)));
  } else {
    params.set("range", rangeToPeriod(range));
  }
  const response = await fetch(`/api/chart?${params}`);
  if (!response.ok) throw new Error("Market data request failed");
  const json = await response.json();
  const result = json.chart?.result?.[0];
  if (!result?.timestamp?.length) throw new Error("No market data returned");
  const quote = result.indicators.quote[0];
  const currency = result.meta.currency || state.profile.currency;
  const metaName = result.meta?.longName || result.meta?.shortName;
  if (metaName) state.profile.name = metaName;
  return result.timestamp.map((time, index) => ({
    date: new Date(time * 1000),
    open: quote.open[index],
    high: quote.high[index],
    low: quote.low[index],
    close: quote.close[index],
    volume: quote.volume[index] || 0,
    currency
  })).filter(row => Number.isFinite(row.close) && Number.isFinite(row.open));
}

function generateFallbackData(symbol, range) {
  let days = ({ "1mo": 30, "3mo": 90, "6mo": 182, "1y": 365, "5y": 1260 })[range] || 182;
  if (state.custom) {
    const start = new Date(state.custom.start);
    const end = new Date(state.custom.end);
    days = Math.max(20, Math.min(1260, Math.round((end - start) / 86_400_000)));
  }
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const base = symbol.includes("RELIANCE") ? 2850 : symbol.includes("TCS") ? 3900 : symbol.includes("INFY") ? 1500 : 160 + seed % 140;
  const rows = [];
  let price = base;
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const wave = Math.sin((days - i + seed) / 11) * 0.012;
    const drift = 0.0009 + (seed % 9) / 10000;
    const shock = Math.sin((days - i) * 1.7 + seed) * 0.006;
    const ret = drift + wave + shock;
    const open = price;
    price = Math.max(4, price * (1 + ret));
    const spread = price * (0.012 + Math.abs(shock));
    rows.push({
      date,
      open,
      high: Math.max(open, price) + spread,
      low: Math.min(open, price) - spread,
      close: price,
      volume: Math.round((2_000_000 + Math.abs(Math.sin(i / 8)) * 9_000_000) * (1 + (seed % 5) / 10)),
      currency: state.profile.currency
    });
  }
  return rows;
}

function movingAverage(data, window) {
  return data.map((_, index) => {
    if (index < window - 1) return null;
    const slice = data.slice(index - window + 1, index + 1);
    return slice.reduce((sum, row) => sum + row.close, 0) / window;
  });
}

function buildFeatures(data) {
  const ma5 = movingAverage(data, 5);
  const ma20 = movingAverage(data, 20);
  const returns = data.map((row, index) => index ? (row.close - data[index - 1].close) / data[index - 1].close : 0);
  const rows = [];
  for (let i = 22; i < data.length - 1; i++) {
    rows.push({
      x: [1, i, data[i].close, ma5[i] || data[i].close, ma20[i] || data[i].close, returns[i], data[i].volume / 1_000_000],
      y: data[i + 1].close
    });
  }
  return rows;
}

function linearRegression(samples, iterations = 1200, alpha = 0.035) {
  const means = samples[0].x.map((_, col) => col === 0 ? 0 : samples.reduce((sum, row) => sum + row.x[col], 0) / samples.length);
  const stds = samples[0].x.map((_, col) => col === 0 ? 1 : Math.sqrt(samples.reduce((sum, row) => sum + (row.x[col] - means[col]) ** 2, 0) / samples.length) || 1);
  const yMean = average(samples.map(row => row.y));
  const yStd = Math.sqrt(average(samples.map(row => (row.y - yMean) ** 2))) || 1;
  const normalized = samples.map(row => ({
    x: row.x.map((value, col) => col === 0 ? 1 : (value - means[col]) / stds[col]),
    y: (row.y - yMean) / yStd
  }));
  let weights = new Array(normalized[0].x.length).fill(0);
  for (let step = 0; step < iterations; step++) {
    const gradient = new Array(weights.length).fill(0);
    for (const row of normalized) {
      const pred = dot(weights, row.x);
      row.x.forEach((value, col) => gradient[col] += (pred - row.y) * value);
    }
    weights = weights.map((weight, col) => weight - alpha * gradient[col] / normalized.length);
  }
  return {
    predict(features) {
      const x = features.map((value, col) => col === 0 ? 1 : (value - means[col]) / stds[col]);
      return dot(weights, x) * yStd + yMean;
    }
  };
}

function momentumModel(samples) {
  return {
    predict(features) {
      const [, , close, ma5, ma20, dailyReturn] = features;
      const trendPremium = (ma5 - ma20) * 0.08;
      return close * (1 + dailyReturn * 0.35) + trendPremium;
    }
  };
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function evaluateModel(model, test) {
  const actual = test.map(row => row.y);
  const predicted = test.map(row => model.predict(row.x));
  const mae = average(actual.map((value, i) => Math.abs(value - predicted[i])));
  const rmse = Math.sqrt(average(actual.map((value, i) => (value - predicted[i]) ** 2)));
  const meanY = average(actual);
  const ssTot = actual.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const ssRes = actual.reduce((sum, value, i) => sum + (value - predicted[i]) ** 2, 0);
  const r2 = Math.max(-1, 1 - ssRes / ssTot);
  const accuracy = Math.max(0, Math.min(0.99, 1 - mae / meanY));
  return { mae, rmse, r2, accuracy };
}

function trainModels(data) {
  const samples = buildFeatures(data);
  if (samples.length < 35) return null;
  const split = Math.max(5, Math.floor(samples.length * 0.78));
  const train = samples.slice(0, split);
  const test = samples.slice(split);
  const linear = linearRegression(train);
  const momentum = momentumModel(train);
  const linearMetrics = evaluateModel(linear, test);
  const momentumMetrics = evaluateModel(momentum, test);
  const best = linearMetrics.rmse <= momentumMetrics.rmse ? linear : momentum;
  const bestName = linearMetrics.rmse <= momentumMetrics.rmse ? "Linear Regression" : "Momentum Ensemble";
  return { linear, momentum, best, bestName, linearMetrics, momentumMetrics };
}

function createForecast(data, model, horizon) {
  const working = [...data];
  const forecast = [];
  for (let step = 0; step < horizon; step++) {
    const features = latestFeatures(working);
    const raw = model.best.predict(features);
    const last = working[working.length - 1];
    const bounded = Math.max(last.close * 0.88, Math.min(last.close * 1.12, raw));
    const date = new Date(last.date);
    date.setDate(date.getDate() + 1);
    const next = {
      date,
      open: last.close,
      close: bounded,
      high: Math.max(last.close, bounded) * 1.01,
      low: Math.min(last.close, bounded) * 0.99,
      volume: last.volume,
      currency: last.currency,
      predicted: true
    };
    working.push(next);
    forecast.push(next);
  }
  return forecast;
}

function latestFeatures(data) {
  const i = data.length - 1;
  const ma5 = average(data.slice(-5).map(row => row.close));
  const ma20 = average(data.slice(-20).map(row => row.close));
  const prev = data[i - 1]?.close ?? data[i].close;
  const dailyReturn = prev ? (data[i].close - prev) / prev : 0;
  return [1, i, data[i].close, ma5, ma20, dailyReturn, data[i].volume / 1_000_000];
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function analyze(data) {
  const closes = data.map(row => row.close);
  const volumes = data.map(row => row.volume);
  const returns = closes.slice(1).map((value, index) => (value - closes[index]) / closes[index]);
  return {
    current: closes.at(-1),
    high: Math.max(...closes),
    low: Math.min(...closes),
    average: average(closes),
    dailyReturn: returns.at(-1) || 0,
    volatility: Math.sqrt(252) * std(returns),
    volumeTrend: volumes.at(-1) / average(volumes.slice(-20)),
    returns
  };
}

function std(values) {
  const mean = average(values);
  return Math.sqrt(average(values.map(value => (value - mean) ** 2)));
}

function setDataSourceLabel(text) {
  if (els.source) els.source.textContent = text;
}

function setDataSourceState(...states) {
  if (!els.sourceDesktop) return;
  els.sourceDesktop.classList.remove("fallback", "imported", "error");
  states.forEach(state => state && els.sourceDesktop.classList.add(state));
}

function setExchange(value) {
  els.exchange.value = value;
  if (els.exchangeMobile) els.exchangeMobile.value = value;
}

function openSidebar() {
  els.sidebar?.classList.add("open");
  els.sidebarBackdrop?.classList.add("visible");
  els.sidebarBackdrop?.removeAttribute("hidden");
  els.menuToggle?.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
}

function closeSidebar() {
  els.sidebar?.classList.remove("open");
  els.sidebarBackdrop?.classList.remove("visible");
  els.sidebarBackdrop?.setAttribute("hidden", "");
  els.menuToggle?.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
}

function showToast(message, type = "info") {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.dataset.type = type;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 4200);
}

async function runAnalysis() {
  const symbol = els.ticker.value.trim().toUpperCase();
  if (!state.importedRows?.length && !symbol) {
    showToast("Enter a symbol and click Analyze, or import a dataset.", "warn");
    return;
  }

  setLoading(true);
  const resolvedSymbol = symbol || "DATA";
  const profile = STOCKS.find(item => item.symbol === symbol) || { symbol: resolvedSymbol, name: resolvedSymbol, exchange: els.exchange.value, currency: els.exchange.value === "US" ? "USD" : "INR" };
  state.profile = { ...profile, exchange: els.exchange.value };
  els.title.textContent = symbol ? `${state.profile.name} · ${symbol}` : "Imported dataset";
  setDataSourceState();

  if (state.importedRows?.length) {
    try {
      state.data = filterImportedByDates(state.importedRows);
      const label = state.importFileName || "local file";
      setDataSourceLabel(`Imported · ${label}`);
      setDataSourceState("imported");
      state.profile.name = label.replace(/\.[^.]+$/, "");
      els.title.textContent = symbol ? `${state.profile.name} · ${symbol}` : `${state.profile.name}`;
    } catch (error) {
      showToast(error.message, "error");
      setLoading(false);
      return;
    }
  } else {
    try {
      state.data = await fetchMarketData(symbol, els.exchange.value, state.range);
      state.profile.currency = state.data.at(-1)?.currency || state.profile.currency;
      setDataSourceLabel(`${MARKET_FEED_NAME} · live`);
    } catch (error) {
      state.data = generateFallbackData(symbol, state.range);
      setDataSourceLabel("Demo data · offline");
      setDataSourceState("fallback");
      showToast(`Live feed unavailable — showing simulated prices. Run npm run dev to connect ${MARKET_FEED_NAME}.`, "warn");
    }
  }
  if (!state.data.length) {
    showToast("No price history for this symbol and range.", "error");
    setLoading(false);
    return;
  }
  state.hasData = true;
  state.model = trainModels(state.data);
  state.forecast = state.model ? createForecast(state.data, state.model, state.horizon) : [];
  els.title.textContent = symbol ? `${state.profile.name} · ${symbol}` : state.profile.name;
  renderAll();
  if (!state.importedRows?.length) refreshWatchlist();
  setLoading(false);
}

function setLoading(isLoading) {
  els.load.textContent = isLoading ? "…" : "Analyze";
  els.load.disabled = isLoading;
  if (els.loadingBar) els.loadingBar.hidden = !isLoading;
  if (isLoading) {
    const skeleton = `<article class="kpi skeleton" aria-hidden="true"></article>`;
    els.kpis.innerHTML = skeleton.repeat(6);
  }
}

function renderAll() {
  if (!state.hasData || !state.data.length) {
    renderEmptyState();
    return;
  }
  const stats = analyze(state.data);
  renderKpis(stats);
  renderPrediction(stats);
  renderMetrics();
  renderInsights(stats);
  renderWatchlist();
  drawPriceChart();
  drawVolumeChart();
}

function renderKpis(stats) {
  const items = [
    ["Current Price", fmt.money(stats.current), `${fmt.pct(stats.dailyReturn)} last session`],
    ["Highest Price", fmt.money(stats.high), "Range peak"],
    ["Lowest Price", fmt.money(stats.low), "Range trough"],
    ["Average Price", fmt.money(stats.average), `${fmt.pct(stats.volatility)} annualized vol`],
    ["Volume Trend", `${stats.volumeTrend.toFixed(2)}x`, "vs. 20-day average"],
    ["Trading Volume", fmt.compact(state.data.at(-1).volume), "Latest session"]
  ];
  els.kpis.innerHTML = items.map(([label, value, note]) => `
    <article class="kpi">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </article>
  `).join("");
}

function renderPrediction(stats) {
  const last = state.data.at(-1).close;
  const predicted = state.forecast.at(-1)?.close || last;
  const change = (predicted - last) / last;
  const confidence = state.model ? Math.round((state.model.bestName === "Linear Regression" ? state.model.linearMetrics.accuracy : state.model.momentumMetrics.accuracy) * 100) : 52;
  const horizonLabel = state.horizon === 1 ? "1 day" : state.horizon === 5 ? "1 week" : "1 month";
  els.prediction.textContent = fmt.money(predicted);
  els.prediction.title = `${change >= 0 ? "+" : ""}${(change * 100).toFixed(2)}% vs. last close (${horizonLabel})`;
  const signal = change >= 0.015 ? "Bullish" : change <= -0.015 ? "Bearish" : "Neutral";
  els.signal.textContent = signal;
  els.signal.classList.toggle("bullish", signal === "Bullish");
  els.signal.classList.toggle("bearish", signal === "Bearish");
  els.confidenceText.textContent = `${confidence}%`;
  els.confidenceBar.style.width = `${confidence}%`;
  if (els.confidenceTrack) {
    els.confidenceTrack.setAttribute("aria-valuenow", String(confidence));
    els.confidenceTrack.setAttribute("aria-valuetext", `${confidence} percent`);
  }
}

function renderMetrics() {
  if (!state.model) {
    els.metrics.innerHTML = `<div class="metric-row"><span>Status</span><strong>Need more data</strong></div>`;
    return;
  }
  const rows = [
    ["Best model", state.model.bestName],
    ["Linear MAE", fmt.money(state.model.linearMetrics.mae)],
    ["Linear RMSE", fmt.money(state.model.linearMetrics.rmse)],
    ["Linear R²", state.model.linearMetrics.r2.toFixed(3)],
    ["Momentum accuracy", `${Math.round(state.model.momentumMetrics.accuracy * 100)}%`]
  ];
  els.metrics.innerHTML = rows.map(([label, value]) => `<div class="metric-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderInsights(stats) {
  const last = state.data.at(-1).close;
  const predicted = state.forecast.at(-1)?.close || last;
  const change = (predicted - last) / last;
  const ma20 = movingAverage(state.data, 20).at(-1) || stats.average;
  const ma50 = movingAverage(state.data, 50).at(-1) || stats.average;
  const insights = [
    change > 0 ? `Prediction indicates ${change > 0.025 ? "strong" : "moderate"} bullish sentiment over the selected horizon.` : `Forecast leans defensive, with projected downside of ${Math.abs(change * 100).toFixed(2)}%.`,
    ma20 > ma50 ? "The 20-day moving average is above the 50-day average, showing constructive near-term momentum." : "The 20-day moving average is below the 50-day average, so momentum remains cautious.",
    stats.volumeTrend > 1.25 ? "Volume is running meaningfully above its 20-day baseline, suggesting stronger institutional participation." : "Volume is close to its recent baseline, so price action is not yet confirmed by heavy turnover.",
    `Annualized volatility is ${fmt.pct(stats.volatility)}, which implies ${stats.volatility > 0.35 ? "elevated" : "controlled"} risk for short-horizon predictions.`
  ];
  els.insights.innerHTML = insights.map(text => `<div class="insight">${text}</div>`).join("");
}

const watchCache = new Map();

async function fetchWatchChange(item) {
  const key = `${item.symbol}:${item.exchange}`;
  if (watchCache.has(key)) return watchCache.get(key);
  try {
    const params = new URLSearchParams({
      symbol: yahooSymbol(item.symbol, item.exchange),
      range: "5d"
    });
    const response = await fetch(`/api/chart?${params}`);
    if (!response.ok) throw new Error("watch");
    const json = await response.json();
    const result = json.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close?.filter(Number.isFinite) || [];
    if (closes.length < 2) throw new Error("watch");
    const move = ((closes.at(-1) - closes.at(-2)) / closes.at(-2)) * 100;
    watchCache.set(key, move);
    return move;
  } catch {
    return null;
  }
}

async function refreshWatchlist() {
  const current = state.profile.symbol;
  const peers = STOCKS.filter(item => item.symbol !== current).slice(0, 6);
  els.watchlist.innerHTML = peers.map(item => `<div class="watch-row" data-symbol="${item.symbol}"><span>${item.symbol}</span><strong class="muted">…</strong></div>`).join("");
  const moves = await Promise.all(peers.map(item => fetchWatchChange(item)));
  els.watchlist.innerHTML = peers.map((item, i) => {
    const move = moves[i];
    const label = move == null ? "—" : `${move >= 0 ? "+" : ""}${move.toFixed(2)}%`;
    const color = move == null ? "var(--muted)" : move >= 0 ? "var(--lime)" : "var(--red)";
    return `<button type="button" class="watch-row" data-symbol="${item.symbol}" data-exchange="${item.exchange}"><span>${item.symbol}</span><strong style="color:${color}">${label}</strong></button>`;
  }).join("");
}

function renderWatchlist() {
  if (!watchCache.size) {
    els.watchlist.innerHTML = `<p class="watch-hint">Load a ticker to refresh peer moves.</p>`;
    return;
  }
  refreshWatchlist();
}

function chartBounds(data) {
  const values = [...data.map(row => row.high), ...state.forecast.map(row => row.high)];
  const lows = [...data.map(row => row.low), ...state.forecast.map(row => row.low)];
  const max = Math.max(...values);
  const min = Math.min(...lows);
  const pad = (max - min) * 0.12 || max * 0.1;
  return { min: min - pad, max: max + pad };
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(600, rect.width * ratio);
  canvas.height = Math.max(280, rect.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function drawGrid(ctx, width, height, padding) {
  ctx.strokeStyle = "rgba(148, 163, 184, 0.11)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + ((height - padding.top - padding.bottom) / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
}

function drawPriceChart() {
  if (!state.data.length) {
    clearCanvas(els.priceCanvas);
    return;
  }
  const { ctx, width, height } = setupCanvas(els.priceCanvas);
  const padding = { left: 58, right: 24, top: 26, bottom: 42 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const combined = [...state.data, ...state.forecast];
  const bounds = chartBounds(state.data);
  const x = index => padding.left + (plotW / Math.max(1, combined.length - 1)) * index;
  const y = value => padding.top + (bounds.max - value) / (bounds.max - bounds.min) * plotH;
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height, padding);
  drawAxisLabels(ctx, width, height, bounds, padding);
  if (state.mode === "candle") drawCandles(ctx, x, y);
  drawLine(ctx, state.data.map((row, i) => [x(i), y(row.close)]), "#33d6ff", 2.4);
  drawLine(ctx, movingAverage(state.data, 20).map((value, i) => value ? [x(i), y(value)] : null), "#8bffbd", 1.6);
  drawLine(ctx, movingAverage(state.data, 50).map((value, i) => value ? [x(i), y(value)] : null), "#ffd166", 1.4);
  drawLine(ctx, movingAverage(state.data, 200).map((value, i) => value ? [x(i), y(value)] : null), "#a78bfa", 1.2);
  if (state.forecast.length) {
    const start = state.data.length - 1;
    const forecastPoints = [state.data.at(-1), ...state.forecast].map((row, i) => [x(start + i), y(row.close)]);
    drawLine(ctx, forecastPoints, "#ff6685", 2.2, [7, 6]);
  }
  drawLegend(ctx, padding.left, padding.top + 4);
  if (state.hoverIndex !== null) drawHover(ctx, x, y, combined, state.hoverIndex, height, padding);
}

function drawAxisLabels(ctx, width, height, bounds, padding) {
  ctx.fillStyle = "rgba(201, 214, 234, 0.72)";
  ctx.font = "12px Inter";
  ctx.textAlign = "right";
  for (let i = 0; i <= 5; i++) {
    const value = bounds.max - ((bounds.max - bounds.min) / 5) * i;
    const y = padding.top + ((height - padding.top - padding.bottom) / 5) * i + 4;
    ctx.fillText(fmt.number(value), padding.left - 10, y);
  }
}

function drawLine(ctx, points, color, width, dash = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  let started = false;
  for (const point of points) {
    if (!point) continue;
    if (!started) {
      ctx.moveTo(point[0], point[1]);
      started = true;
    } else {
      ctx.lineTo(point[0], point[1]);
    }
  }
  ctx.stroke();
  ctx.restore();
}

function drawCandles(ctx, x, y) {
  const width = Math.max(3, Math.min(11, (els.priceCanvas.getBoundingClientRect().width - 100) / state.data.length * 0.55));
  for (let i = 0; i < state.data.length; i++) {
    const row = state.data[i];
    const up = row.close >= row.open;
    ctx.strokeStyle = up ? "rgba(139, 255, 189, 0.85)" : "rgba(255, 102, 133, 0.85)";
    ctx.fillStyle = up ? "rgba(139, 255, 189, 0.35)" : "rgba(255, 102, 133, 0.35)";
    ctx.beginPath();
    ctx.moveTo(x(i), y(row.high));
    ctx.lineTo(x(i), y(row.low));
    ctx.stroke();
    const top = y(Math.max(row.open, row.close));
    const bottom = y(Math.min(row.open, row.close));
    ctx.fillRect(x(i) - width / 2, top, width, Math.max(2, bottom - top));
  }
}

function drawLegend(ctx, left, top) {
  const items = [["Close", "#33d6ff"], ["20D MA", "#8bffbd"], ["50D MA", "#ffd166"], ["200D MA", "#a78bfa"], ["Forecast", "#ff6685"]];
  ctx.font = "12px Inter";
  ctx.textAlign = "left";
  let x = left;
  for (const [label, color] of items) {
    ctx.fillStyle = color;
    ctx.fillRect(x, top, 16, 3);
    ctx.fillStyle = "rgba(201, 214, 234, 0.82)";
    ctx.fillText(label, x + 22, top + 5);
    x += label.length * 8 + 68;
  }
}

function drawHover(ctx, x, y, data, index, height, padding) {
  const row = data[index];
  if (!row) return;
  ctx.strokeStyle = "rgba(238, 244, 255, 0.28)";
  ctx.beginPath();
  ctx.moveTo(x(index), padding.top);
  ctx.lineTo(x(index), height - padding.bottom);
  ctx.stroke();
  ctx.fillStyle = row.predicted ? "#ff6685" : "#33d6ff";
  ctx.beginPath();
  ctx.arc(x(index), y(row.close), 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawVolumeChart() {
  if (!state.data.length) {
    clearCanvas(els.volumeCanvas);
    return;
  }
  const { ctx, width, height } = setupCanvas(els.volumeCanvas);
  const padding = { left: 44, right: 16, top: 18, bottom: 28 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const max = Math.max(...state.data.map(row => row.volume));
  ctx.clearRect(0, 0, width, height);
  drawGrid(ctx, width, height, padding);
  const barW = Math.max(2, plotW / state.data.length * 0.7);
  state.data.forEach((row, index) => {
    const h = row.volume / max * plotH;
    const x = padding.left + index * (plotW / state.data.length);
    const y = height - padding.bottom - h;
    ctx.fillStyle = row.close >= row.open ? "rgba(139, 255, 189, 0.45)" : "rgba(255, 102, 133, 0.45)";
    ctx.fillRect(x, y, barW, h);
  });
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  if (!state.hasData) return showToast("Load data before exporting.", "warn");
  const lines = ["date,open,high,low,close,volume,predicted"];
  [...state.data, ...state.forecast].forEach(row => {
    lines.push([row.date.toISOString().slice(0, 10), row.open, row.high, row.low, row.close, row.volume, Boolean(row.predicted)].join(","));
  });
  download(`${state.profile.symbol}-prediction.csv`, lines.join("\n"), "text/csv");
}

function exportReport() {
  if (!state.hasData) return showToast("Load data before exporting.", "warn");
  const stats = analyze(state.data);
  const report = [
    "QuantSight AI Prediction Report",
    `Ticker: ${state.profile.symbol}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Current price: ${fmt.money(stats.current)}`,
    `Predicted price: ${els.prediction.textContent}`,
    `Signal: ${els.signal.textContent}`,
    "",
    "Insights:",
    ...[...els.insights.querySelectorAll(".insight")].map(node => `- ${node.textContent}`)
  ].join("\n");
  download(`${state.profile.symbol}-ai-report.txt`, report, "text/plain");
}

function exportChart() {
  if (!state.hasData) return showToast("Load data before exporting.", "warn");
  const a = document.createElement("a");
  a.href = els.priceCanvas.toDataURL("image/png");
  a.download = `${state.profile.symbol}-chart.png`;
  a.click();
}

function showSuggestions() {
  const q = els.ticker.value.trim().toUpperCase();
  const matches = STOCKS.filter(item => `${item.symbol} ${item.name}`.toUpperCase().includes(q)).slice(0, 6);
  els.suggestions.hidden = !q || !matches.length;
  els.suggestions.innerHTML = matches.map(item => `<button type="button" data-symbol="${item.symbol}" data-exchange="${item.exchange}"><strong>${item.symbol}</strong> · ${item.name}</button>`).join("");
}

function wireEvents() {
  els.searchForm?.addEventListener("submit", event => {
    event.preventDefault();
    clearImportedData();
    closeSidebar();
    runAnalysis();
  });
  els.load.addEventListener("click", event => {
    event.preventDefault();
    clearImportedData();
    closeSidebar();
    runAnalysis();
  });
  els.ticker.addEventListener("input", showSuggestions);
  els.ticker.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      clearImportedData();
      runAnalysis();
    }
  });
  els.exchange.addEventListener("change", () => setExchange(els.exchange.value));
  els.exchangeMobile?.addEventListener("change", () => setExchange(els.exchangeMobile.value));
  els.suggestions.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    els.ticker.value = button.dataset.symbol;
    if (button.dataset.exchange) setExchange(button.dataset.exchange);
    els.suggestions.hidden = true;
    closeSidebar();
    runAnalysis();
  });
  els.ranges.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    state.range = button.dataset.range;
    [...els.ranges.children].forEach(child => child.classList.toggle("active", child === button));
    if (!state.hasData) return;
    if (!state.importedRows?.length) clearImportedData();
    closeSidebar();
    runAnalysis();
  });
  els.horizons.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    state.horizon = Number(button.dataset.horizon);
    [...els.horizons.children].forEach(child => child.classList.toggle("active", child === button));
    if (!state.hasData) return;
    state.forecast = state.model ? createForecast(state.data, state.model, state.horizon) : [];
    renderAll();
  });
  els.chartMode.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    state.mode = button.dataset.mode;
    [...els.chartMode.children].forEach(child => {
      const active = child === button;
      child.classList.toggle("active", active);
      child.setAttribute("aria-selected", active ? "true" : "false");
    });
    drawPriceChart();
  });
  const openImport = () => els.fileInput.click();
  els.custom?.addEventListener("click", openImport);
  els.customDrawer?.addEventListener("click", openImport);
  els.fileInput.addEventListener("change", async () => {
    const file = els.fileInput.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      await loadImportedFile(file);
      els.importName.textContent = file.name;
      els.importName.classList.add("loaded");
      [...els.ranges.children].forEach(child => child.classList.remove("active"));
      showToast(`Loaded ${state.importedRows.length} rows from ${file.name}`, "success");
      await runAnalysis();
    } catch (error) {
      clearImportedData();
      showToast(error.message || "Could not read that file", "error");
      setLoading(false);
    }
  });
  els.start.addEventListener("change", () => {
    if (state.hasData && state.importedRows?.length) runAnalysis();
  });
  els.end.addEventListener("change", () => {
    if (state.hasData && state.importedRows?.length) runAnalysis();
  });
  els.reset?.addEventListener("click", resetDashboard);
  els.priceCanvas.addEventListener("mousemove", handleHover);
  els.priceCanvas.addEventListener("mouseleave", () => {
    state.hoverIndex = null;
    els.tooltip.hidden = true;
    drawPriceChart();
  });
  els.csv.addEventListener("click", exportCsv);
  els.report.addEventListener("click", exportReport);
  els.chart.addEventListener("click", exportChart);
  els.copy.addEventListener("click", async () => {
    if (!state.hasData) return showToast("Load data before copying insights.", "warn");
    const text = [...els.insights.querySelectorAll(".insight")].map(node => node.textContent).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("Insights copied to clipboard", "success");
    } catch {
      showToast("Could not copy — check browser permissions", "error");
    }
  });
  els.watchlist.addEventListener("click", event => {
    const row = event.target.closest("[data-symbol]");
    if (!row) return;
    els.ticker.value = row.dataset.symbol;
    if (row.dataset.exchange) setExchange(row.dataset.exchange);
    clearImportedData();
    runAnalysis();
  });
  document.addEventListener("click", event => {
    if (!event.target.closest(".search-wrap")) els.suggestions.hidden = true;
  });
  els.menuToggle?.addEventListener("click", openSidebar);
  els.sidebarClose?.addEventListener("click", closeSidebar);
  els.sidebarBackdrop?.addEventListener("click", closeSidebar);
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSidebar();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) closeSidebar();
    drawPriceChart();
    drawVolumeChart();
  });
}

function handleHover(event) {
  if (!state.hasData || !state.data.length) return;
  const rect = els.priceCanvas.getBoundingClientRect();
  const combined = [...state.data, ...state.forecast];
  const index = Math.round((event.clientX - rect.left - 58) / ((rect.width - 82) / Math.max(1, combined.length - 1)));
  state.hoverIndex = Math.max(0, Math.min(combined.length - 1, index));
  const row = combined[state.hoverIndex];
  els.tooltip.hidden = false;
  els.tooltip.style.left = `${event.clientX - rect.left + 16}px`;
  els.tooltip.style.top = `${event.clientY - rect.top + 16}px`;
  els.tooltip.innerHTML = `
    <strong>${row.predicted ? "Forecast" : row.date.toLocaleDateString()}</strong><br>
    Close: ${fmt.money(row.close)}<br>
    High: ${fmt.money(row.high)} · Low: ${fmt.money(row.low)}<br>
    Volume: ${fmt.compact(row.volume)}
  `;
  drawPriceChart();
}

wireEvents();
renderEmptyState();
