# UI/UX Design System Guideline — Design Spec

## Purpose

CodeHaus has no written design system yet. Only scattered tokens exist (`frontend/src/index.css`) and two components (`button.tsx`, `card.tsx`). Every module folder under `frontend/src/modules/` (auth, dashboard-admin, dashboard-client, projects, invoices, quotations, payments, messaging, notifications, reports, settings, support) currently has no shared visual reference, so future frontend work risks inconsistent spacing, color, and component shape.

This spec covers producing one authoritative design-system document plus a visual preview artifact for human verification. It does not cover implementing any React component or page.

## Deliverable

`frontend/docs/design-system.md` — single comprehensive guideline doc, produced by the `uiux-engineer` agent using its existing brand spec (CodeHaus brand: Alice Blue background `#F0F8FF`, primary `#2563EB`, Inter typeface, 8pt spacing, 12-col grid — matches values already in `frontend/src/index.css`).

### Contents

1. **Brand foundations** — color palette, typography scale, spacing system, grid, radius/shadow/elevation tokens. Must reconcile with (not contradict) existing `--color-*` custom properties in `index.css`.
2. **Component library specs** — existing: button, card. Gap components to specify: input, table, sidebar/nav, modal, drawer, dropdown, badge, avatar, alert, toast, tabs, pagination, empty/loading/error states. Each: states (default/hover/focus/disabled/error), spacing, typography, no code.
3. **Page-level guidance** — one subsection per module folder listed above: layout, primary components used, key interactions.
4. **Responsive rules** — desktop/tablet/mobile behavior per component category.
5. **Accessibility notes** — contrast ratios, focus states, keyboard navigation.
6. **Developer handoff notes** — spacing/typography/interaction values frontend-engineer needs to implement from. No React code, no JSX.

### Explicit exclusions

- No dark mode (light-mode-first per brand; can be added later as its own task)
- No Figma file (tool not connected to this session)
- No Canva output (HTML artifact preferred for dev-handoff precision, per user decision)
- No React implementation of any component or page

## Process

1. Dispatch `uiux-engineer` agent with this spec as scope. Agent writes `frontend/docs/design-system.md`.
2. Team-lead review pass: check doc for consistency against brand spec and against existing `index.css` tokens, completeness against the module list, no placeholders.
3. Build an HTML artifact (style-guide preview: color swatches, type scale, spacing scale, rendered component samples) sourced from the doc's tokens, published for the user to visually inspect in-browser.
4. User reviews doc + artifact together, accepts or requests changes.
5. Once accepted, the doc becomes the source of truth for future frontend implementation work (separate future task — not built now).

## Verification

- Doc content cross-checked against `frontend/src/index.css` (no contradicting token values) and against `frontend/src/modules/*` (no missing module, no invented module).
- Artifact rendered and confirmed to load (colors/type/components visibly correct) before handing to user.
- User explicit accept required before this work is considered done.

## Out of scope

- Any React/TSX implementation
- Figma or Canva deliverables
- Dark mode
- Backend/API changes
