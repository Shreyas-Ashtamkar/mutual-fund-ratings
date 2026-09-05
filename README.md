# Fund Lens 🔍

> **Mutual Fund Performance Review & Relative Rating Engine**

Fund Lens is a lightweight, responsive web application designed to evaluate and compare Indian Mutual Funds using live historical Net Asset Value (NAV) data from public APIs. It calculates consistent performance ratings based on a weighted multi-horizon model and provides interactive historical NAV charting.

---

## 🌟 Key Features

### 1. Adaptive Device Layouts (Tablets & Mobile)
- **Deprecated Tables on Handy Devices**: Traditional horizontal-scrolling tables have been replaced with touch-first **Adaptive Insight Cards** on tablets and mobile screens.
- **Tablet Layout (641px – 1024px)**: Structured 2-column responsive tile matrix showcasing fund badges, star ratings, 1Y / 3Y / 5Y return grids, composite scores, and quick NAV chart triggers.
- **Mobile Layout (≤ 640px)**: Streamlined single-column feed with high-contrast metric chips, touch-friendly 44px+ hit targets, and prominent quick actions.
- **Desktop Layout (> 1024px)**: Full multi-column data table for broad horizontal data scanning.

### 2. Algorithmic Rating Model
- **Weighted Multi-Horizon Evaluation**:
  $$\text{Score} = (0.20 \times \text{1Y Return}) + (0.30 \times \text{3Y CAGR}) + (0.50 \times \text{5Y CAGR})$$
- **Relative Percentile Stars**: Generates 1 to 5 star ratings based on cohort percentile ranking.

### 3. Live NAV History via MFAPI
- Automatically searches and matches direct growth mutual fund schemes via the free public [MFAPI](https://www.mfapi.in/).
- Computes exact compounded annualized growth rates (CAGR) from raw daily historical NAV records.

### 4. Interactive NAV Canvas Chart
- Dedicated interactive chart (`chart.html`) built with HTML5 Canvas.
- Switch between 6-month, 1-year, and 3-year timeframes with real-time scaling and gridlines.

### 5. Excel Import & Export
- Import custom fund lists via `.xlsx` spreadsheets.
- Export analyzed results and calculated scores directly to Excel via SheetJS.

### 6. Curated Market Shortlist
- Browse pre-configured direct-growth funds across Flexi Cap, Mid Cap, Small Cap, ELSS, Index, Hybrid, and International categories.
- Top Funds automatically refresh their live CAGR metrics, model scores, and ratings once per day. Results are cached in the browser for 24 hours to keep reloads fast and limit unnecessary API requests.
- A GitHub Actions workflow runs daily at 7:00 PM IST, generates `top-funds.json`, and publishes it to the `daily-top-funds` release. The browser fetches that release asset on the next cache refresh.

---

## 📐 Breakpoint Architecture

| Device Class | Viewport Range | Rating Presentation | Summary Metrics | Top Funds |
|---|---|---|---|---|
| **Desktop** | `> 1024px` | Full Data Table (`.desktop-only-table`) | 3 Columns | 3 Columns |
| **Tablet / iPad** | `641px – 1024px` | 2-Column Insight Cards (`.fund-cards-feed`) | 3 Columns | 2 Columns |
| **Mobile** | `≤ 640px` | 1-Column Feed (`.fund-cards-feed`) | 1 Column Stack | 1 Column Stack |

---

## 📁 Project Structure

```
mutual-fund-ratings/
├── index.html        # Main application shell (Inputs, Ratings, Curated View)
├── chart.html        # Canvas NAV historical charting page
├── script.js         # API integration, CAGR math, scoring & DOM rendering
├── style.css         # Design system tokens, typography, and responsive media queries
├── .github/workflows/daily-top-funds.yml # Daily release publishing workflow
├── .github/scripts/update-top-funds.py   # MFAPI fetch and rating generator
├── README.md         # Project documentation & usage guide
└── AGENTS.md         # Instructions and conventions for AI agents & contributors
```

---

## 🚀 Getting Started

Fund Lens runs purely on standard client-side technologies (HTML5, CSS3, ES6 JavaScript) without any build step or bundler needed.

### Running Locally

1. **Direct Browser**:
   Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).

2. **Local HTTP Server** (Recommended for file APIs):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node (npx)
   npx serve .
   ```
   Navigate to `http://localhost:8000` in your browser.

---

## ⚖️ Disclaimer

Ranking purely on trailing CAGR without considering downside risk, standard deviation, expense ratios, or fund manager stability encourages users to chase recent market tops (recency bias). 

Fund Lens is designed strictly for **historical observation and algorithmic ranking**. Public NAV data is always going to be incomplete regarding future prospects, portfolio shifts, and risk-adjusted metrics. Please make investment decisions based on your own intelligence, due diligence, and financial objectives. This tool does not constitute financial, investment, or advisory recommendations. Mutual fund investments are subject to market risks; always read scheme-related documents carefully before investing.
