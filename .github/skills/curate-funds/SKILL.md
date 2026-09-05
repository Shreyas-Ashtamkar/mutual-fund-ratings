---
name: curate-funds
description: "Workflow for adding, auditing, or updating curated direct-growth mutual funds in the TOP_FUNDS registry in script.js"
user-invocable: true
---

# Curate Funds Workflow

Use this skill when adding or updating mutual funds in the `TOP_FUNDS` list in `script.js`.

## Required Entry Schema

Every entry in `TOP_FUNDS` must follow this structure:

```javascript
{
  category: 'Flexi Cap', // Standard SEBI category: Flexi Cap, Large Cap, Mid Cap, Small Cap, ELSS, Hybrid, Index, International
  name: 'Full Direct Growth Scheme Name',
  schemeCode: '154287', // Optional: provide if name search is ambiguous or has special direct-plan naming
  thesis: 'Clear, 1-sentence rationale explaining the fund strategy or market positioning.',
  horizon: '5+ years' // Formatted as 'X+ years'
}
```

## Validation Steps

1. **Verify Direct-Growth Option**: Ensure the scheme is an Indian Direct Plan with Growth option (no IDCW / Dividend / Regular plans).
2. **MFAPI Scheme Match**: Test that querying `https://api.mfapi.in/mf/search?q=<name>` returns the exact intended scheme. If ambiguous, set the explicit `schemeCode`.
3. **Horizon Alignment**:
   - Small Cap / Mid Cap / International: `7+ years`
   - Flexi Cap / Large Cap / Index / Hybrid: `5+ years`
   - ELSS: `3+ years` (statutory lock-in)
4. **Zero-Error Check**: Run diagnostics to ensure no syntax errors in `script.js`.
