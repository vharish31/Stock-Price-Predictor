# QuantSight AI Stock Price Predictor

A premium fintech-style stock prediction dashboard with live market data, machine-learning diagnostics, interactive canvas charts, autocomplete stock search, AI analyst insights, and export utilities.

## Run

Use the built-in Node server (recommended — connects the QuantSight market feed and avoids CORS):

```powershell
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

Alternative static servers (live data may fall back to demo mode without the proxy):

```powershell
npx serve .
```

```powershell
python -m http.server 5173
```

## Features

- Dynamic ticker search for US and Indian stocks (NSE/BSE suffixes applied automatically).
- QuantSight Market Feed via local `/api/chart` proxy with deterministic fallback data.
- Historical OHLCV dashboard with 1M, 3M, 6M, 1Y, 5Y presets.
- Import custom OHLCV from CSV or JSON on your computer (optional date filter).
- KPI cards for current price, high, low, average, daily return, volatility, and volume trend.
- In-browser ML engine with linear regression and a momentum ensemble benchmark.
- MAE, RMSE, R², accuracy, confidence, bullish/bearish signal, and forecast horizon controls.
- Line, moving-average, forecast, candlestick, and volume visualizations.
- Clickable watchlist with live 1-day peer moves.
- CSV, report, and chart image export.
- Fully responsive layout with mobile drawer navigation, safe-area support, and accessible controls.
