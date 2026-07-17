# UI/UX Design System Guideline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce `frontend/docs/design-system.md` — a comprehensive UI/UX design system guideline for CodeHaus — plus an HTML preview artifact, so the user can visually verify and accept the guideline before any implementation work uses it.

**Architecture:** The `uiux-engineer` agent drafts the doc from its built-in brand spec, reconciled against existing tokens in `frontend/src/index.css` and the module list in `frontend/src/modules/`. A review pass checks for gaps/contradictions. An HTML artifact renders the tokens and component samples for visual sign-off.

**Tech Stack:** Markdown (doc), HTML/CSS (preview artifact, self-contained per Artifact tool constraints — inline styles only, no external requests).

## Global Constraints

- No git repository exists in this project (verified: `git status` fails at root and in `frontend/`) — skip all commit steps.
- No dark mode tokens.
- No Figma output (tool not connected this session).
- No Canva output (user chose HTML artifact only).
- No React/TSX implementation — this plan produces documentation and a preview artifact only.
- Color/spacing/typography values in the doc must not contradict `frontend/src/index.css` (background `#f0f8ff`, primary `oklch(0.205 0 0)` mapped from brand `#2563EB`, radius `0.625rem`, etc — read the file directly in Task 2, don't rely on this summary).
- Module coverage must exactly match `frontend/src/modules/*` directory names: auth, clients, dashboard-admin, dashboard-client, invoices, messaging, notifications, payments, projects, quotations, reports, settings, support.

---

### Task 1: Draft the design-system doc via uiux-engineer agent

**Files:**
- Create: `frontend/docs/design-system.md`

**Interfaces:**
- Consumes: spec at `frontend/docs/superpowers/specs/2026-07-17-ui-ux-design-system-guideline-design.md`
- Produces: `frontend/docs/design-system.md` with sections — Brand Foundations, Component Library Specs, Page-Level Guidance, Responsive Rules, Accessibility Notes, Developer Handoff Notes (consumed by Task 2 review and Task 3 artifact build)

- [ ] **Step 1: Read current brand tokens**

Read `frontend/src/index.css` in full so the dispatch prompt can hand the agent exact current values instead of letting it invent new ones.

- [ ] **Step 2: Read current module list**

Run: `ls frontend/src/modules`
Expected output: directory names `auth clients dashboard-admin dashboard-client invoices messaging notifications payments projects quotations reports settings support`

- [ ] **Step 3: Dispatch uiux-engineer agent**

Spawn the `uiux-engineer` agent (subagent_type: `uiux-engineer`) with a prompt containing:
- The full text of `frontend/docs/superpowers/specs/2026-07-17-ui-ux-design-system-guideline-design.md`
- The exact current contents of `frontend/src/index.css` (from Step 1), with instruction: reconcile, don't contradict — extend the token set, don't redefine existing values
- The exact module list (from Step 2), with instruction: one subsection per module, no more, no fewer
- Explicit instruction: write the result to `frontend/docs/design-system.md`, no other files
- Explicit instruction: no placeholders (no "TBD"/"TODO"), no React/JSX code, no dark mode section

Run in foreground (`run_in_background: false`) since Task 2 depends on its output.

- [ ] **Step 4: Verify the file was created**

Run: `Test-Path "c:\Users\denobleza\desktop\code-refresher\frontend\docs\design-system.md"`
Expected: `True`

Read the file to confirm it has content in all six required sections (Brand Foundations, Component Library Specs, Page-Level Guidance, Responsive Rules, Accessibility Notes, Developer Handoff Notes) — no placeholder text.

---

### Task 2: Review pass — consistency and completeness

**Files:**
- Modify: `frontend/docs/design-system.md` (only if gaps found)

**Interfaces:**
- Consumes: `frontend/docs/design-system.md` (from Task 1), `frontend/src/index.css`, `frontend/src/modules/*`
- Produces: a `frontend/docs/design-system.md` confirmed internally consistent (input to Task 3)

- [ ] **Step 1: Check token consistency**

Compare every color/spacing/radius value the doc states against `frontend/src/index.css`. Specifically confirm: background matches `#f0f8ff` / Alice Blue, radius base matches `0.625rem`, and no color value in the doc contradicts a `--color-*` custom property already defined in the CSS file.

If a contradiction exists, edit `frontend/docs/design-system.md` directly to match the CSS file (CSS file is the existing source of truth; the doc extends it, not the reverse).

- [ ] **Step 2: Check module coverage**

Confirm the doc's Page-Level Guidance section has exactly one subsection per entry in: auth, clients, dashboard-admin, dashboard-client, invoices, messaging, notifications, payments, projects, quotations, reports, settings, support.

If any module is missing, add a subsection for it (layout, primary components used, key interactions — same depth as existing subsections). If an extra/invented module is present, remove it.

- [ ] **Step 3: Check component list coverage**

Confirm the Component Library Specs section covers at minimum: button, card (existing), input, table, sidebar/nav, modal, drawer, dropdown, badge, avatar, alert, toast, tabs, pagination, empty state, loading state, error state.

If any are missing, add a spec for it (states: default/hover/focus/disabled/error; spacing; typography — no code).

- [ ] **Step 4: Placeholder scan**

Search the doc for "TBD", "TODO", "TK", or any sentence that describes what should go somewhere without giving the actual value. Fix any found inline.

---

### Task 3: Build the HTML preview artifact

**Files:**
- Create: `<scratchpad>/design-system-preview.html` (scratchpad directory: `C:\Users\DENOBL~1\AppData\Local\Temp\claude\c--Users-denobleza-desktop-code-refresher\9db58565-15a4-4580-8169-fa645e2133a9\scratchpad`)

**Interfaces:**
- Consumes: token values and component specs from `frontend/docs/design-system.md` (Task 2 output)
- Produces: a published Artifact URL (input to Task 4 — user's visual verification)

- [ ] **Step 1: Load the artifact-design skill**

Invoke `Skill` with `skill: "artifact-design"` before writing any HTML — required by the Artifact tool's own instructions to calibrate design investment.

- [ ] **Step 2: Write the preview HTML**

Write `<scratchpad>/design-system-preview.html` containing, sourced from the reviewed doc's actual values (not invented ones):
- Color swatches for every token in Brand Foundations (swatch + hex/oklch value + token name label)
- Type scale sample (each heading/body size rendered in Inter with its label)
- Spacing scale sample (visual bars at each 8pt increment used)
- Rendered samples of each component from Component Library Specs, in their default/hover/focus/disabled states where applicable, using inline CSS only (no external font/CDN requests — system-ui fallback stack is fine, or self-contained `@font-face` is not required)
- Must follow Artifact constraints: no `<!DOCTYPE>`/`<html>`/`<head>`/`<body>` tags (content only), theme-aware CSS for light/dark viewer modes, no horizontal page scroll (wide sections get their own `overflow-x: auto` container)

- [ ] **Step 3: Publish the artifact**

Call `Artifact` with `file_path` pointing at the file from Step 2, a `title` like "CodeHaus Design System Preview", a one-sentence `description`, and a `favicon` (single emoji, e.g. "🎨").

- [ ] **Step 4: Verify publish succeeded**

Confirm the tool call returns a URL with no error. If it errors, read the error, fix the HTML (most likely cause: a disallowed tag or external resource reference), and republish to the same `file_path`.

---

### Task 4: Present for user verification and acceptance

**Files:** none (communication only)

**Interfaces:**
- Consumes: `frontend/docs/design-system.md` (Task 2), artifact URL (Task 3)
- Produces: user accept/reject decision — gates any future implementation work that would consume this doc

- [ ] **Step 1: Summarize and hand off**

Message the user with: the doc path, the artifact URL, and a short list of what's covered (brand foundations, N components specified, M module subsections, accessibility, responsive rules, dev handoff notes). Ask them to review both and accept or request changes.

- [ ] **Step 2: Handle response**

If changes requested: identify which task (1–3) the change belongs to, make the edit directly in `frontend/docs/design-system.md` and/or the artifact HTML, republish the artifact if it changed, and re-present.

If accepted: done. Note explicitly that `frontend/docs/design-system.md` is now the source of truth for future frontend implementation work, which is out of scope for this plan.
