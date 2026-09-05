# AGENTS.md — Developer & AI Agent Guidelines

This document establishes development standards, architectural patterns, design tokens, and modification rules for AI agents and human contributors working on the **Fund Lens** repository. For user documentation, see [README.md](README.md).

---

## 1. Project Philosophy & Stack

- **Zero-Build Architecture**: The project uses pure standard Vanilla HTML5, CSS3, and modern ES6+ JavaScript. Do not introduce build tools (Webpack, Vite, Babel, npm dependencies) unless explicitly requested.
- **External Dependencies**:
  - `FontAwesome 6.7.2` (via CDN for icons)
  - `SheetJS / xlsx 0.20.3` (via CDN for Excel import/export)
  - `MFAPI` (`https://api.mfapi.in/mf`) for Indian Mutual Fund NAV data
- **Cross-Device Usability**: Focus on clean visual hierarchy, fast rendering, touch accessibility, and responsive typography. Key files: [index.html](index.html), [chart.html](chart.html), [script.js](script.js), and [style.css](style.css).

---

## 2. Responsive Design & Handy Device Conventions

### ⚠️ Deprecation Rule for Tabular Data
- **Never display raw data tables on mobile or tablet devices (`<= 1024px`)**.
- Data tables force horizontal scrolling or unreadable truncation on touch devices.
- On viewports $\le 1024\text{px}$, data must always be rendered using the **Card / Tile Feed** (`.fund-cards-feed`), structured as:
  - **Tablets (`641px - 1024px`)**: 2-column grid (`repeat(2, minmax(0, 1fr))`).
  - **Mobile (`≤ 640px`)**: 1-column flex/grid stack.
- The desktop table (`.desktop-only-table`) should only remain active at $> 1024\text{px}$.

### 📱 Card Component Anatomy (`.fund-card`)
When rendering or modifying fund cards in [script.js](script.js) and [style.css](style.css), ensure the following elements are present:
1. **Header**: Category tag (`.fund-category-tag`), optional Scheme Code pill (`.fund-code-pill`), and star rating (`.rating-stars`, `.rating-badge`).
2. **Title**: Full scheme name with serif typography (`.fund-card-title`).
3. **Metrics Grid**: 3-column pill layout for `1Y Return`, `3Y CAGR`, and `5Y CAGR` with positive/negative color tags.
4. **Footer**: Model score chip and a prominent touch-friendly trigger button (`.card-chart-btn`) linking to [chart.html](chart.html).

---

## 3. CSS Tokens & Theming ([style.css](style.css))

All color palettes and radii must adhere to the defined CSS custom properties:

```css
:root {
  --ink: #17221c;         /* Primary text */
  --muted: #6d786f;       /* Subtext and secondary labels */
  --line: #dce4de;        /* Borders and dividers */
  --surface: #ffffff;     /* Card and modal backgrounds */
  --canvas: #f3f6f2;      /* App background canvas */
  --accent: #246b52;      /* Primary brand green */
  --accent-soft: #e4f1e9; /* Soft green tint for badges & hover */
  --warm: #e8a34e;        /* Stars and highlight accents */
  --danger: #b83b39;      /* Negative returns and error alerts */
  --radius: 12px;         /* Standard border radius */
}
```

---

## 4. Rating & Mathematical Logic ([script.js](script.js))

- **Weighting Formula**:
  ```javascript
  const WEIGHTS = { oneYear: 0.2, threeYear: 0.3, fiveYear: 0.5 };
  ```
- **Annualized Return (CAGR)**:
  $$\text{CAGR} = \left(\frac{\text{Latest NAV}}{\text{Past NAV}}\right)^{\frac{1}{\text{Actual Years}}} - 1$$
- **Score Calculation**: Weighted average over available horizons. If 5Y is missing, re-normalizes weights over 1Y and 3Y.
- **Percentile-Based Rating**:
  - Rank scores descending.
  - Percentile $= 1 - \frac{\text{Rank}}{\text{Length} - 1}$.
  - Star rating $= \text{clamp}(1, 5, \lceil\text{Percentile} \times 5\rceil)$.

---

## 5. Security & Accessibility Requirements

- **XSS Prevention**: Always sanitize dynamic strings before insertion via `escapeHtml(value)`.
- **Touch Affordance**: Minimum interactive target dimensions should be at least $44 \times 44\text{px}$ on mobile screens.
- **ARIA & Semantics**: Maintain `aria-label`, `role="tab"`, `role="status"`, and `role="alert"` for dynamic state changes.

---

## 6. Verification Checklist

Before completing tasks on this repository, verify:
1. `get_errors` returns 0 diagnostics across HTML, CSS, and JS files.
2. Desktop view (> 1024px) renders the data table properly.
3. Tablet view (768px – 1024px) cleanly displays the 2-column card layout and hides the table.
4. Mobile view (320px – 640px) displays the single-column feed without horizontal overflow.
5. Search filtering, Excel upload/export, and NAV chart opening function without JavaScript console errors.
