---
description: "Guidelines and conventions for modifying Fund Lens frontend files (HTML, CSS, JavaScript)"
applyTo: "**/*.{html,css,js}"
---

# Fund Lens Frontend Instructions

When editing frontend code in this repository:

1. **Zero-Build Policy**: Use only vanilla HTML5, CSS3, and ES6+ JavaScript. Do not introduce npm packages, bundlers (Webpack, Vite), or build scripts.
2. **Handy Devices Deprecation Rule**: Never show raw tables (`<table>`) on viewports $\le 1024\text{px}$. Use the card/tile feed (`.fund-cards-feed`) for tablets (2 columns) and mobile (1 column).
3. **Design System & Tokens**: Always use CSS custom properties from `style.css` (`--ink`, `--muted`, `--line`, `--surface`, `--canvas`, `--accent`, `--accent-soft`, `--warm`, `--danger`, `--radius`).
4. **Data & Math Consistency**: Respect weighting constants (`WEIGHTS: 20% 1Y, 30% 3Y, 50% 5Y`) and annualized CAGR calculations in `script.js`.
5. **Security & Accessibility**:
   - Sanitize all dynamic strings before inserting into HTML (`escapeHtml`).
   - Keep minimum interactive targets at $\ge 44\times44\text{px}$ on touch devices.
   - Maintain `aria-label`, `role="tab"`, and semantic landmarks.
