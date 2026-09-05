---
name: create-view
description: "Workflow for adding a new tabbed view to the Fund Lens application"
user-invocable: true
---

# Create View Workflow

Use this skill when adding a new top-level view to Fund Lens. The application treats the buttons in the `view-tabs` navigation as views, with matching sections controlled by `setView()` in `script.js`.

## View Contract

A new view requires all of the following:

1. Add a button inside `.view-tabs` in `index.html`:
   - Use `class="view-tab"` and `type="button"`.
   - Set `data-view` to the exact `id` of the target section.
   - Include an accessible icon with `aria-hidden="true"` when using Font Awesome.
   - Keep the existing active-tab behavior; `setView()` updates `.is-active` and `aria-selected`.
2. Add a sibling section in `index.html`:
   - Use a unique `id` matching `data-view`.
   - Add `class="app-view"` and `hidden` so the existing view switcher controls visibility.
   - Give the section an accessible heading and connect it with `aria-labelledby`.
3. Add view-specific rendering and event handling in `script.js` only when the view needs behavior:
   - Query required elements after the existing DOM references.
   - Keep rendering functions focused on the new view.
   - Escape dynamic text with `escapeHtml()` before inserting HTML.
4. Add view-specific presentation in `style.css`:
   - Reuse the existing design tokens and component patterns.
   - Keep interactive controls at least 44px by 44px on touch layouts.
   - Add responsive rules for desktop, tablet, and mobile without exposing raw tables at widths of 1024px or below.

## Implementation Checklist

- Choose a stable, descriptive view id such as `reports-view` or `watchlist-view`.
- Confirm the new tab's `data-view` and section `id` match exactly.
- Preserve the existing `analyze-view` and `top-funds-view` behavior.
- Keep the view usable when entered directly after page load and when revisited through the tabs.
- Add loading, empty, and error states for views that fetch or compute data.
- Use semantic landmarks and maintain `aria-label`, `aria-labelledby`, `role="tab"`, and `aria-selected` where applicable.
- Update `README.md` when the project structure or user-facing workflow changes.

## Validation Steps

1. Run diagnostics on the changed HTML, CSS, and JavaScript files.
2. Confirm the new tab toggles only its matching `.app-view` section.
3. Check that the active tab updates its visual state and `aria-selected` value.
4. Verify desktop, tablet, and mobile layouts, including no horizontal overflow on mobile.
5. Check browser-console behavior for missing DOM elements, rendering errors, and failed data states.
