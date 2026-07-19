# CodeHaus Design System

Version 1.0 — first comprehensive design-system reference for the CodeHaus product. This document is the source of truth for visual language, component behavior, and page-level layout conventions across the platform. It reconciles the tokens already implemented in `frontend/src/index.css` with the canonical brand specification, and defines the additional tokens and component specs required to build out the remaining product surface.

Scope: documentation only. No implementation code is included. All values below are precise (px/rem/hex) and are intended to be dropped directly into Tailwind config, CSS custom properties, or component props by the Frontend Engineer.

---

## Table of Contents

1. [Brand Foundations](#1-brand-foundations)
2. [Component Library Specs](#2-component-library-specs)
3. [Page-Level Guidance](#3-page-level-guidance)
4. [Responsive Rules](#4-responsive-rules)
5. [Accessibility Notes](#5-accessibility-notes)
6. [Developer Handoff Notes](#6-developer-handoff-notes)
7. [Landing Page Visual Treatment](#7-landing-page-visual-treatment)

---

## 1. Brand Foundations

### 1.1 Color Palette

CodeHaus already has a partial token implementation in `frontend/src/index.css` (Tailwind v4 `@theme inline`, shadcn/ui pattern, using `oklch()` values). The brand specification defines canonical hex values for the same semantic roles. Where both exist, **the hex value is canonical for design work**; the table below states the hex value, the CSS custom property it maps to, the property's current implemented value, and whether the two agree.

| Role | Canonical brand hex | Maps to CSS var | Current CSS value | Reconciliation status |
|---|---|---|---|---|
| Background | `#F0F8FF` (Alice Blue) | `--background` | `#f0f8ff` | **Matches exactly.** No change needed. |
| Surface | `#FFFFFF` (White) | `--card` | `oklch(1 0 0)` | **Matches** (`oklch(1 0 0)` is pure white). Use `--card` for elevated surfaces (cards, modals, dropdowns, popovers). |
| Primary | `#2563EB` | `--primary` | `oklch(0.205 0 0)` (renders as near-black, ≈ `#171717`) | **Discrepancy.** The CSS token exists but is currently a neutral near-black, not brand blue. `#2563EB` is canonical for all primary actions (primary buttons, links, active nav state, focus accents). The `--primary` CSS variable needs to be updated to `#2563EB` (or an equivalent `oklch` conversion) to match brand; do not treat the current near-black value as correct. |
| Primary Hover | `#1D4ED8` | *(none yet)* | — | **New.** No dedicated hover token exists. The current `button.tsx` implementation simulates hover by reducing primary to 80% opacity (`bg-primary/80`) rather than swapping to a distinct hover color. Once `--primary` is corrected to `#2563EB`, introduce `--primary-hover: #1D4ED8` as a solid-color hover state (preferred over opacity-based hover for solid-fill buttons, since opacity shifts also lighten the background behind translucent buttons unpredictably). |
| Primary Foreground (text on primary) | `#FFFFFF` | `--primary-foreground` | `oklch(0.985 0 0)` (≈ `#FBFBFB`, near-white) | **Matches for practical purposes.** Off-white is visually indistinguishable from white at this luminance; acceptable as-is. |
| Text (primary body/heading text) | `#111827` | `--foreground` | `oklch(0.145 0 0)` (≈ `#0A0A0A`) | **Close, not identical.** CSS value is a true neutral near-black; brand hex has a cool, slightly blue-gray undertone. Treat `--foreground` as the implemented equivalent of Text for now — the visual difference is negligible at body-text sizes — but if the token is ever regenerated, use `#111827` directly. |
| Secondary Text | `#6B7280` | `--muted-foreground` | `oklch(0.556 0 0)` (≈ `#8C8C8C`, neutral gray) | **Close conceptually, hue differs.** Brand value is a cool gray; CSS value is a neutral gray. Use `--muted-foreground` for all secondary/muted text (captions, helper text, timestamps, placeholder copy); if regenerated, converge on `#6B7280`. |
| Border | `#E5E7EB` | `--border` / `--input` | `oklch(0.922 0 0)` (≈ `#EBEBEB`, neutral) | **Close match.** Same treatment as Secondary Text — neutral vs. cool gray, negligible visual difference. Use `--border` for dividers/outlines and `--input` for form-field borders (currently identical values). |
| Secondary surface | *(no brand hex defined)* | `--secondary` | `oklch(0.97 0 0)` (≈ `#F7F7F7`) | Existing neutral light surface with no direct brand-spec counterpart. Keep as the token for secondary button fills and subtle section backgrounds. |
| Secondary Foreground | *(no brand hex defined)* | `--secondary-foreground` | `oklch(0.205 0 0)` (≈ `#171717`) | Pairs with `--secondary`; keep as-is. |
| Muted surface | *(no brand hex defined)* | `--muted` | `oklch(0.97 0 0)` | Same value as `--secondary`; used for hover states on ghost/outline buttons and table row hover. Keep as-is. |
| Danger | `#DC2626` | `--destructive` | `oklch(0.577 0.245 27.325)` (≈ `#DC2626`–`#E23636` red) | **Matches closely.** The existing `--destructive` oklch value renders as essentially the same red as brand Danger. Treat as equivalent; no change required. |
| Success | `#16A34A` | *(none)* | — | **New token to add.** No success/positive token exists in `index.css` today. Add `--success: #16A34A` and `--success-foreground: #FFFFFF` (or a light tint for badge backgrounds — see §5). |
| Warning | `#F59E0B` | *(none)* | — | **New token to add.** No warning token exists today. Add `--warning: #F59E0B`. Because this color fails text-contrast requirements on white (see §5 Accessibility Notes), also add `--warning-foreground-on-light: #92400E` (a dark amber) for any case where warning-colored *text* is needed on a light background; `#F59E0B` itself should be reserved for fills, icons, and borders. |
| Danger (as new semantic pairing) | `#DC2626` | *(none, reuse `--destructive`)* | — | No separate `--danger` token is needed; `--destructive` already covers this role. Keep a single source of truth and do not introduce a duplicate variable. |
| Info | `#0EA5E9` | *(none)* | — | **New token to add.** No info token exists today. Add `--info: #0EA5E9`. Like Warning, this color fails text contrast on white; add `--info-foreground-on-light: #0369A1` for text use, reserving `#0EA5E9` for fills/icons/borders. |
| Focus Ring | *(no brand hex defined)* | `--ring` | `oklch(0.708 0 0)` (≈ `#B5B5B5`, mid-gray) | Existing neutral-gray focus ring, currently used by `button.tsx` at `ring-3 ring-ring/50`. Documented as-is; not changed here since the brand spec does not define a competing value. See §5 for accessibility guidance on pairing focus rings with the Primary blue once `--primary` is corrected. |

**Semantic usage summary** (for quick reference when building new components):

| Purpose | Token |
|---|---|
| Page background | `--background` (`#F0F8FF`) |
| Card / modal / dropdown / popover surface | `--card` (`#FFFFFF`) |
| Primary action fill | `--primary` (canonical `#2563EB`) |
| Primary action hover fill | `--primary-hover` (canonical `#1D4ED8`, new) |
| Text on primary fill | `--primary-foreground` (`#FFFFFF`) |
| Body / heading text | `--foreground` (canonical `#111827`) |
| Secondary / muted text | `--muted-foreground` (canonical `#6B7280`) |
| Borders, dividers, input outlines | `--border` / `--input` (canonical `#E5E7EB`) |
| Positive / success state | `--success` (`#16A34A`, new) |
| Caution / warning state | `--warning` (`#F59E0B`, new; text use `#92400E`) |
| Destructive / error state | `--destructive` (canonical `#DC2626`) |
| Informational state | `--info` (`#0EA5E9`, new; text use `#0369A1`) |
| Focus indicator | `--ring` (existing mid-gray) |

### 1.2 Typography

**Font family:** Inter, for all UI text (headings, body, labels, buttons, tables). `index.css` does not currently declare a `font-family`, so the page renders on the browser's default sans-serif stack — Inter must be added as part of implementing this design system. Load Inter via self-hosted `@font-face` or a package (e.g. `@fontsource/inter`) rather than a runtime Google Fonts request, and register it in the `@theme` block as `--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;` so all Tailwind `font-sans` utilities resolve to it.

Font weights used across the system: **400 (Regular)**, **500 (Medium)**, **600 (Semibold)**, **700 (Bold)**. Do not introduce additional weights (e.g. 300 or 800) — Inter's variable font supports them, but the system intentionally limits the palette for consistency.

**Type scale.** The existing components already consume Tailwind's default type steps directly (`text-xs`, `text-sm`, `text-base`) rather than named design tokens; this scale formalizes that same Tailwind scale end-to-end so headings introduced at the page level stay on the same system.

| Step | Size (px / rem) | Line height (px / rem) | Weight | Usage |
|---|---|---|---|---|
| Display | 36px / 2.25rem | 40px / 2.5rem | 700 | Reserved for marketing/landing contexts only; not used inside the authenticated app shell. |
| H1 | 30px / 1.875rem | 36px / 2.25rem | 700 | Page-level title (e.g. "Invoices", "Projects") in the module header region. |
| H2 | 24px / 1.5rem | 32px / 2rem | 600 | Section headings within a page (e.g. a dashboard panel title larger than a card title). |
| H3 | 20px / 1.25rem | 28px / 1.75rem | 600 | Sub-section headings, modal titles. |
| H4 | 18px / 1.125rem | 28px / 1.75rem | 600 | Minor headings, drawer titles. |
| Card Title | 16px / 1rem (`text-base`) | 1.375 line-height (`leading-snug`) | 500 | Existing, as implemented in `card.tsx` (`CardTitle`). At `size="sm"`, drops to 14px / `text-sm`. |
| Body | 14px / 0.875rem (`text-sm`) | 20px / 1.25rem | 400 | Default body copy, form labels, table cells, card descriptions. This is the dominant text size across the product. |
| Body Emphasis | 14px / 0.875rem | 20px / 1.25rem | 500 | Emphasized inline text, active nav items, table header labels. |
| Small / Caption | 12px / 0.75rem (`text-xs`) | 16px / 1rem | 400 | Timestamps, helper text, badge labels, pagination counts. |
| Button (default/lg) | 14px / 0.875rem | 20px / 1.25rem | 500 | Matches `buttonVariants` default/lg sizes. |
| Button (sm) | 12.8px / 0.8rem | — | 500 | Matches the existing `sm` button size exactly (`text-[0.8rem]`); an intentional one-off between `text-xs` and `text-sm`, retained for continuity with `button.tsx`. |
| Button (xs) | 12px / 0.75rem | — | 500 | Matches the existing `xs` button size. |

### 1.3 Spacing Scale (8-point system)

Base unit: **4px** (half-step of the 8pt grid, already in use — `card.tsx` uses Tailwind's `--spacing(4)` = 16px and `--spacing(3)` = 12px for its padding). All spacing values in the product must be selected from this scale; do not use arbitrary pixel values.

| Token | Value (px) | Value (rem) | Typical usage |
|---|---|---|---|
| `space-1` | 4px | 0.25rem | Icon-to-label gap, tight inline gaps (matches `gap-1` in `button.tsx`). |
| `space-1.5` | 6px | 0.375rem | Button internal gap (default/lg sizes). |
| `space-2` | 8px | 0.5rem | Compact stacking gap, badge horizontal padding. |
| `space-3` | 12px | 0.75rem | Card padding at `size="sm"`; form field vertical padding. |
| `space-4` | 16px | 1rem | Default card padding; standard gap between form fields; default gutter inside panels. |
| `space-5` | 20px | 1.25rem | Gap between related field groups. |
| `space-6` | 24px | 1.5rem | Section spacing inside a page; default grid gutter (desktop). |
| `space-8` | 32px | 2rem | Spacing between major page sections; page horizontal margin (desktop). |
| `space-10` | 40px | 2.5rem | Spacing above/below page header block. |
| `space-12` | 48px | 3rem | Large section separation on dashboards. |
| `space-16` | 64px | 4rem | Empty-state vertical padding; hero-style spacing. |
| `space-20` | 80px | 5rem | Reserved for large marketing sections only. |

### 1.4 Grid

- **Columns:** 12-column grid for all page layouts.
- **Max content width:** 1280px (`max-w-7xl`), centered, beyond which horizontal margin absorbs remaining viewport width.
- **Gutter (space between columns):** 24px desktop (`≥1024px`), 16px tablet (`640–1023px`), 16px mobile (`<640px`).
- **Page margin (space between grid and viewport edge):** 32px desktop, 24px tablet, 16px mobile.
- **Breakpoints** (Tailwind defaults, adopted as the system's breakpoints): `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px.
- **Sidebar-affected content grid:** when the app sidebar (fixed 264px, see §2.5) is present, the 12-column grid applies to the remaining content area, not the full viewport.

### 1.5 Radius Scale

Derived from `--radius: 0.625rem` (10px) exactly as computed in `index.css`'s `@theme inline` block — do not introduce a competing radius base.

| Token | Formula | Value |
|---|---|---|
| `radius-sm` | `radius - 4px` | 6px / 0.375rem |
| `radius-md` | `radius - 2px` | 8px / 0.5rem |
| `radius-lg` | `radius` | 10px / 0.625rem |
| `radius-xl` | `radius + 4px` | 14px / 0.875rem |
| `radius-full` | — | 9999px (pills, avatars, badges, dots) — new, not derived from `--radius` but required for several components below. |

Observed current usage: `button.tsx` default/lg/icon sizes use `radius-lg` (10px); `xs`/`sm` sizes clamp to `min(radius-md, Npx)`, which resolves to 8px in both cases. `card.tsx` uses `radius-xl` (14px) for its outer corners.

### 1.6 Elevation / Shadow Scale

No shadow tokens exist in `index.css` today — `Card` currently achieves its edge definition with a 1px inset ring (`ring-1 ring-foreground/10`) rather than a drop shadow. That treatment should remain for **Card** specifically (see §2.2), but floating/overlay surfaces (modal, drawer, dropdown, toast) need true elevation shadows, which are new tokens defined here, tinted with the brand Text color (`#111827`) rather than pure black for a warmer, on-brand shadow:

| Token | Value | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(17, 24, 39, 0.05)` | Inputs on focus, subtle affordance. |
| `shadow-sm` | `0 1px 3px rgba(17, 24, 39, 0.08), 0 1px 2px rgba(17, 24, 39, 0.04)` | Dropdown menus, popovers. |
| `shadow-md` | `0 4px 6px rgba(17, 24, 39, 0.07), 0 2px 4px rgba(17, 24, 39, 0.05)` | Toasts, small floating cards. |
| `shadow-lg` | `0 10px 15px rgba(17, 24, 39, 0.08), 0 4px 6px rgba(17, 24, 39, 0.05)` | Modals, drawers. |
| `shadow-xl` | `0 20px 25px rgba(17, 24, 39, 0.10), 0 8px 10px rgba(17, 24, 39, 0.05)` | Full-screen overlays, command palettes. |

---

## 2. Component Library Specs

For each component: default visual treatment, interactive states, spacing, and typography. Components marked **(existing)** document the current implementation in `frontend/src/components/ui/`; all other components are **(new)** specifications designed to extend that same visual language (radius, spacing, and color tokens) consistently, since they do not yet exist in the codebase.

### 2.1 Button (existing)

Base shape: inline-flex, `radius-lg` (10px) at default/lg/icon sizes, `radius-md` (8px, clamped) at xs/sm sizes. Border is transparent by default (color appears via background, not stroke), 1px border width reserved for the `outline` variant.

**Sizes:**

| Size | Height | Horizontal padding | Gap | Text size |
|---|---|---|---|---|
| `xs` | 24px | 8px | 4px | 12px |
| `sm` | 28px | 10px | 4px | 12.8px |
| `default` | 32px | 10px | 6px | 14px |
| `lg` | 36px | 10px | 6px | 14px |
| `icon-xs` / `icon-sm` / `icon` / `icon-lg` | 24 / 28 / 32 / 36px square | — | — | — |

**Variants (color treatment):**

| Variant | Default | Hover | Notes |
|---|---|---|---|
| `default` (primary) | Fill `--primary`, text `--primary-foreground` | Fill at 80% opacity of `--primary` | Once `--primary` is corrected to `#2563EB` (§1.1), replace the opacity-based hover with solid `--primary-hover` (`#1D4ED8`) for a crisper hover state. |
| `outline` | 1px border `--border`, fill `--background`, text `--foreground` | Fill `--muted` | |
| `secondary` | Fill `--secondary`, text `--secondary-foreground` | Fill mixed 5% toward `--foreground` | |
| `ghost` | Transparent | Fill `--muted` | No border in any state. |
| `destructive` | Fill `--destructive` at 10% opacity, text `--destructive` | Fill at 20% opacity | Intentionally a soft/tinted treatment, not a solid red fill — reserve solid red for irreversible confirmation dialogs only (see Modal, §2.6). |
| `link` | Text `--primary`, no fill | Underline appears | Underline offset 4px. |

**States:**
- **Focus-visible:** 1px border in `--ring`, plus a 3px ring at 50% opacity of `--ring`.
- **Active (press):** translates down 1px (`translateY(1px)`), except when the button controls a popup (`aria-haspopup`), where the press-down effect is suppressed to avoid visual conflict with the opening menu.
- **Disabled:** 50% opacity, pointer events disabled.
- **Invalid** (e.g. a submit button tied to a failed form): border and ring switch to `--destructive` (border solid, ring at 20% opacity, 3px).

### 2.2 Card (existing)

Outer shape: `radius-xl` (14px), background `--card` (`#FFFFFF`), 1px inset ring at `foreground/10` opacity (not a drop shadow — intentional flat, bordered treatment distinct from floating surfaces). Text defaults to 14px (`text-sm`) with color `--card-foreground`.

**Padding:** 16px (`space-4`) on all sides by default; 12px (`space-3`) when `size="sm"`. Padding is expressed as a single `--card-spacing` value so header/content/footer all stay in sync.

**Sub-components:**
- **CardHeader:** grid layout, 4px (`space-1`) internal gap, horizontal padding = card padding, no top padding beyond the card's own. Supports a two-column layout (`content` + `action`) when a `CardAction` is present.
- **CardTitle:** 16px / weight 500 / `leading-snug` (1.375) by default; drops to 14px at `size="sm"`.
- **CardDescription:** 14px, color `--muted-foreground`.
- **CardAction:** right-aligned slot, top-right of the header grid (e.g. an overflow menu button).
- **CardContent:** horizontal padding = card padding, no vertical padding of its own (relies on the card's `flex flex-col gap` for vertical rhythm).
- **CardFooter:** 1px top border (`--border`), background `--muted` at 50% opacity, padding = card padding, bottom corners rounded to match the card (`radius-xl`), flush with the card's bottom edge (no additional bottom padding on the card itself when a footer is present).

**Images:** a card whose first/last child is an `<img>` receives matching rounded corners (`radius-xl`) on that edge and the card's own top/bottom padding collapses to 0 on that side, so images bleed to the card edge.

### 2.3 Input (new)

Height 32px (matches Button `default`) for single-line text inputs; 36px available as a `lg` variant to pair with `lg` buttons in the same row. Radius `radius-lg` (10px). Border 1px `--input` (`#E5E7EB`), background `--background` (white in practice, since inputs sit on card surfaces). Padding: 8px vertical, 12px horizontal (`space-2` / `space-3`). Text 14px, placeholder text color `--muted-foreground`.

**States:**
- **Default:** border `--input`.
- **Hover:** border darkens to `--border` at full opacity if not already; no fill change.
- **Focus:** border `--ring`, plus 3px ring at `--ring`/50%, matching Button's focus treatment exactly for visual consistency.
- **Disabled:** 50% opacity, background `--muted`, not interactive.
- **Error:** border `--destructive`, 3px ring at `--destructive`/20%, with a 12px helper text below in `--destructive` (4px / `space-1` top margin from the field).
- **With icon:** leading/trailing icon inset 8px from the field edge, icon sized 16px, does not reduce the text padding on the opposite side.

Label: 14px, weight 500, `--foreground`, positioned 4px (`space-1`) above the field. Helper text: 12px, `--muted-foreground`, 4px below the field (replaced by error text, in `--destructive`, when the field is invalid).

### 2.4 Table (new)

Row height 44px for data rows, 40px for the header row. Horizontal cell padding 16px (`space-4`); vertical cell padding 10px, centered against the row height. Header row: text 12px, weight 600, uppercase optional (product default: not uppercased, sentence case), color `--muted-foreground`, bottom border 1px `--border`. Body rows: text 14px, `--foreground`, separated by 1px `--border` row dividers (no vertical column dividers by default, to keep the table visually light).

**States:**
- **Row hover:** background `--muted`.
- **Row selected** (when selectable): background `--primary` at 8% opacity, left edge 2px accent bar in `--primary`.
- **Sortable header:** cursor pointer, hover text color `--foreground`, active sort direction indicated by a 12px chevron icon next to the label.
- **Empty:** see Empty State (§2.15) rendered inside the table body region, spanning all columns.
- **Loading:** see Loading State (§2.16), skeleton rows matching the real row height (44px) so layout does not shift on load.

Table sits inside a Card (`radius-xl`, `--card` background) by default, with the table's own corners un-rounded and inheriting the parent card's clipping.

### 2.5 Sidebar / Navigation (new)

Fixed width 264px on desktop, collapsible to a 72px icon-only rail (collapse affordance: a chevron toggle at the bottom of the sidebar). Background `--card` (white), 1px right border `--border`. Full viewport height, independently scrollable from the content area.

**Structure (top to bottom):** 64px header zone (logo + product name, 24px horizontal padding), primary nav item list, an optional secondary/utility group pinned to the bottom (settings, support, account), separated by a 1px `--border` divider with 16px vertical spacing above it.

**Nav item:** height 40px, full-width, `radius-md` (8px), horizontal padding 12px, icon 20px + 12px gap + label at 14px/weight 500. States:
- **Default:** transparent background, text `--muted-foreground`.
- **Hover:** background `--muted`, text `--foreground`.
- **Active (current route):** background `--primary` at 8% opacity, text `--primary`, icon `--primary`, left edge 3px accent bar in `--primary` flush to the sidebar's inner edge.
- **Focus-visible:** same ring treatment as Button (3px `--ring`/50%).

Nested items (sub-navigation) indent an additional 32px and drop to 13px text, only revealed when the parent item is active or manually expanded.

### 2.6 Modal (new)

Centered overlay dialog. Backdrop: `--foreground` at 50% opacity, covering the full viewport, click-to-dismiss enabled unless the modal is a destructive-confirmation type (must require explicit button action in that case). Panel: background `--card`, `radius-xl` (14px), `shadow-lg`, max-width 480px for standard dialogs, 640px for content-heavy dialogs (e.g. a multi-field form), padding 24px (`space-6`), vertical gap between header/body/footer of 16px (`space-4`).

**Header:** title 18px/weight 600 (H4 scale), optional description 14px `--muted-foreground` beneath it, close (×) button top-right, 32px square, `ghost` button treatment.

**Footer:** right-aligned action row, 8px gap between buttons, secondary/cancel action on the left of the pair, primary/confirming action on the right, using standard Button specs (§2.1). Destructive confirmation modals use the `destructive` button variant for the confirming action, and — unlike the default tinted destructive button — should use a solid `--destructive` fill for that single action to signal irreversibility, as an intentional, documented exception to the standard tinted-destructive treatment.

**States:** entrance/exit use a 150ms fade + 4px translate-up on the panel; backdrop fades independently at 150ms. Focus is trapped within the modal while open and returns to the triggering element on close.

### 2.7 Drawer (new)

Side-anchored panel (default: right edge), full viewport height, width 400px on desktop (expandable to 560px for record-detail drawers), background `--card`, `shadow-lg`, left border `--border` (1px). Backdrop identical to Modal (50% `--foreground`).

Internal layout mirrors Modal: 24px padding, header with title (18px/600) and close button, scrollable body region, optional sticky footer (1px top border `--border`, 16px padding, right-aligned actions) when the drawer contains a form.

**States:** slide-in/out transition 200ms ease, from the anchored edge. On mobile, the drawer becomes full-width (see §4).

### 2.8 Dropdown / Menu (new)

Trigger is typically a Button (`outline`, `ghost`, or `icon` variant). Menu panel: background `--card`, `radius-md` (8px), 1px border `--border`, `shadow-sm`, padding 4px (`space-1`), min-width 180px, positioned 4px offset from the trigger.

**Menu item:** height 32px, `radius-sm` (6px) applied on hover/focus only (not resting state), horizontal padding 8px, text 14px, icon (optional) 16px + 8px gap. States: hover/focus background `--muted`; destructive items (e.g. "Delete") use `--destructive` text color with `--destructive`/10% hover background; disabled items 40% opacity, non-interactive. Dividers between groups: 1px `--border`, 4px vertical margin.

### 2.9 Badge (new)

Inline pill, height 20px, `radius-full`, horizontal padding 8px, text 12px/weight 500, no icon by default (optional leading 12px icon/dot with 4px gap).

**Semantic variants** (background tinted at 10% of the semantic color, text at the full semantic color, per the accessible-pairing guidance in §5):

| Variant | Background | Text |
|---|---|---|
| Neutral | `--muted` | `--muted-foreground` |
| Primary | `--primary`/10% | `--primary` |
| Success | `--success`/10% | `--success` |
| Warning | `--warning`/15% | `#92400E` (dark amber text variant, per §1.1) |
| Danger | `--destructive`/10% | `--destructive` |
| Info | `--info`/10% | `#0369A1` (dark sky text variant, per §1.1) |

### 2.10 Avatar (new)

Circular (`radius-full`), default size 32px, size variants: 24px (compact lists), 40px (profile headers), 64px (account settings). 1px border `--border` for avatars placed directly on `--background`, omitted when placed on `--card`. Fallback (no image): initials, 14px/weight 600 (scaled proportionally at other sizes), background `--muted`, text `--foreground`. Status dot (optional, e.g. online indicator): 8px circle, 2px `--card`-colored ring to separate it from the avatar image, positioned bottom-right.

### 2.11 Alert (new)

Inline, non-dismissible-by-default banner for page-level or form-level messaging. Full-width within its container, `radius-md` (8px), 1px border in the semantic color at 30% opacity, background in the semantic color at 8% opacity, padding 12px vertical / 16px horizontal, icon 20px at the semantic color leading the text with 12px gap, title 14px/weight 600, optional description 14px/weight 400 beneath at 2px (`space-0.5`, i.e. half of `space-1`) margin-top — round to 4px if a half-step token is undesirable.

Semantic colors follow the same palette as Badge (§2.9): neutral, primary (informational), success, warning, danger, info.

### 2.12 Toast (new)

Transient notification, stacked bottom-right of the viewport, 12px gap between stacked toasts. Panel: background `--card`, `radius-lg` (10px), `shadow-md`, 1px border `--border`, width 360px, padding 16px, leading 20px semantic icon, title 14px/weight 600, optional description 14px `--muted-foreground` beneath (4px gap), optional single text-link action, dismiss (×) button top-right at 16px square.

**Behavior:** auto-dismiss after 5000ms for informational/success toasts; error toasts remain until manually dismissed. Entrance: slide-in 200ms from the right edge + fade; exit: fade + collapse height 150ms so remaining toasts reflow smoothly.

### 2.13 Tabs (new)

Horizontal tab list, height 40px, bottom border 1px `--border` spanning the full tab list width. Each tab: horizontal padding 16px, text 14px/weight 500, color `--muted-foreground` at rest, `--foreground` on hover, `--primary` when active with a 2px bottom accent border in `--primary` aligned flush with the list's bottom border. 8px gap between tabs is not used — tabs sit edge-to-edge with internal padding only, to keep the underline continuous and predictable for keyboard navigation.

Focus-visible: same 3px `--ring`/50% treatment, applied as a ring around the individual tab (not the full list).

### 2.14 Pagination (new)

Height 32px, inline-flex, 4px gap between controls. Page buttons: 32px square, `radius-md` (8px), text 14px. Current page: background `--primary`/10%, text `--primary`, weight 600. Other pages: transparent, `--muted-foreground`, hover background `--muted`. Prev/Next controls use 16px chevron icons with the same 32px square hit target; disabled at the first/last page (50% opacity, non-interactive). A results-count label ("Showing 1–10 of 42") may appear left-aligned in the same row at 14px `--muted-foreground`, with the page controls right-aligned — this is the default pagination layout for all data tables.

### 2.15 Empty State (new)

Centered content block, vertical padding 64px (`space-16`), used inside cards, tables, and full-page contexts when no data exists yet. Structure: 48px icon or illustration (color `--muted-foreground`), 16px gap, title 16px/weight 600 `--foreground`, 4px gap, description 14px `--muted-foreground` (max-width 360px, centered), 24px gap, optional primary Button (default variant) as the call to action.

### 2.16 Loading State (new)

Two approved patterns:
- **Skeleton loading** (preferred for tables, cards, lists): gray blocks at `--muted` background, `radius-sm` (6px), matching the exact height/width of the real content they replace, with a 1500ms looping shimmer (a lighter gradient sweep at `--card` opacity 40%, left-to-right) to indicate activity without layout shift.
- **Spinner** (used only for in-place actions, e.g. inside a Button after submit, or a full-panel blocking load): 16–20px circular spinner in `--primary`, 2px stroke, 800ms rotation. Buttons showing a spinner replace their leading icon slot with the spinner and disable interaction for the duration.

### 2.17 Error State (new)

Used for failed data fetches (distinct from form field errors, §2.3, and toasts, §2.12, which handle transient/action-level errors). Centered block matching Empty State's structure and spacing (64px vertical padding, 48px icon in `--destructive`, 16px gap, title 16px/weight 600, description 14px `--muted-foreground`, 24px gap, "Try again" Button in `outline` variant that re-triggers the failed request).

---

## 3. Page-Level Guidance

All modules share the same app shell: fixed Sidebar (§2.5, 264px) on the left, and a content region on the right containing a 64px sticky top bar (breadcrumb/page title on the left, search + notifications bell + avatar menu on the right, background `--card`, bottom border `--border`) followed by the page content, which is constrained to the 12-column grid (§1.4) with 32px top/bottom page padding and 32px horizontal page padding on desktop.

### 3.1 auth

**Layout:** Full-viewport, sidebar-free, centered single-column layout, max-width 400px, on `--background`. A card (`--card`, `radius-xl`, `shadow-sm` — the one place a Card legitimately gains a shadow, since it floats on the page background rather than sitting within the app shell) contains the form, with the CodeHaus logo above it (32px height, 24px margin-bottom).

**Primary components:** Card, Input (email/password fields), Button (`default` variant, full-width, `lg` size for the primary submit action), Alert (for authentication errors, e.g. invalid credentials), link-style Button for "Forgot password" / "Create an account" navigation, Divider ("or continue with") for any SSO options.

**Key interactions:** inline field validation on blur (Input error state); submit button enters Loading State (spinner) while the request is in flight; failed login surfaces a page-level Alert (danger variant) above the form rather than a toast, since the user's attention is already on this page; successful auth redirects into the appropriate dashboard (admin vs. client) based on role.

### 3.2 dashboard-admin

**Layout:** 12-column grid. Row 1: four summary Cards (3 columns each on desktop, `size="default"`) showing key metrics (e.g. active projects, outstanding invoices, monthly revenue, open support tickets), each with a large 24px numeral, a 14px label, and a small trend Badge. Row 2: a wide Card (8 columns) with a Table of recent activity, paired with a narrower Card (4 columns) listing upcoming deadlines or tasks. Row 3: full-width Card containing a chart or secondary Table (e.g. recent payments).

**Primary components:** Card, Table (with Pagination), Badge (status indicators), Avatar (assignee/client thumbnails in table rows), Dropdown (per-row row actions, per-card time-range filters), Empty State (when no activity exists yet for a new workspace).

**Key interactions:** summary cards are clickable, routing to the relevant module (e.g. clicking the invoices metric routes to `invoices`); table rows open a Drawer with record detail rather than a full page navigation, to keep the admin in dashboard context; a time-range Dropdown at the top-right of the page (Today / 7 days / 30 days / custom) re-fetches all dashboard data and triggers Loading State (skeleton) across all cards simultaneously.

### 3.3 dashboard-client

**Layout:** Same 12-column shell as `dashboard-admin` but simplified to what a client needs to see: Row 1: two summary Cards (6 columns each) for "Active Projects" and "Outstanding Balance." Row 2: full-width Card with a Table of the client's project status. Row 3: full-width Card listing recent invoices/messages requiring attention.

**Primary components:** Card, Table, Badge (project/invoice status), Alert (informational, e.g. "You have 1 invoice due in 3 days"), Empty State (new client with no projects yet).

**Key interactions:** clicking an outstanding balance summary routes directly into `payments` with the relevant invoice pre-selected; status Badges use semantic color mapping consistently with `projects`/`invoices` (see below) so a client learns the meaning once and it holds everywhere.

### 3.4 clients

**Layout:** Full-width Table view (12 columns) inside a single Card, with a top toolbar row: page title (H1) + "Add Client" Button (`default`, right-aligned) on one row, followed by a search Input (280px) + filter Dropdown row above the table.

**Primary components:** Table (columns: name/Avatar, company, contact info, active projects count, status Badge, row-action Dropdown), Modal (Add/Edit Client form), Drawer (client detail view with tabs for Overview / Projects / Invoices / Messages), Pagination, Empty State (no clients yet, CTA to add the first client).

**Key interactions:** row click opens the client Drawer (not full navigation); "Add Client" opens a Modal with a form (Input fields, submit Button entering Loading State); deleting a client routes through the destructive-confirmation Modal pattern defined in §2.6.

### 3.5 invoices

**Layout:** Table-first layout identical in structure to `clients`: toolbar (H1 + "Create Invoice" Button) then filter row (status Dropdown, date-range filter, search Input), then a full-width Table Card.

**Primary components:** Table (columns: invoice #, client Avatar+name, issue/due date, amount, status Badge, row-action Dropdown), Badge (statuses: Draft = neutral, Sent = info, Paid = success, Overdue = danger, Partially Paid = warning), Drawer (invoice detail, itemized line items, payment history), Modal (create/edit invoice form, multi-field), Toast (confirmation on send/mark-as-paid actions), Empty State.

**Key interactions:** "Mark as Paid" and "Send Invoice" are row-level Dropdown actions that trigger a Toast on success rather than a full page reload; overdue invoices surface a small warning Badge in the sidebar/nav via a count indicator on the `invoices` nav item (see §2.5 nav item, extended with an optional trailing count Badge).

### 3.6 quotations

**Layout:** Same Table-first pattern as `invoices` (toolbar + filter row + Table Card), reflecting that quotations and invoices are closely related document types in this product.

**Primary components:** Table (columns: quote #, client, date, amount, status Badge — Draft/Sent/Accepted/Declined/Expired), Modal (create/edit quotation, including a repeatable line-item sub-form), Drawer (quote detail with an "Convert to Invoice" primary action), Badge, Toast, Empty State.

**Key interactions:** "Convert to Invoice" is a primary Button inside the quote Drawer footer, which — on confirmation — routes the user into a pre-filled `invoices` creation Modal; status changes (accept/decline, typically client-driven from `dashboard-client`) reflect immediately via Badge color change plus a Toast to the admin if they're viewing the record live.

### 3.7 payments

**Layout:** Table-first (toolbar + filter row + Table Card) for the admin view (all payments across clients); for the client-facing context this module is entered from `dashboard-client` or an invoice Drawer, where it instead renders as a focused single-column payment form (max-width 480px, centered, similar shell to `auth` but within the app chrome) rather than a table.

**Primary components:** Table (columns: date, client, invoice reference, amount, method, status Badge — Pending = warning, Completed = success, Failed = danger, Refunded = neutral), Card (payment method entry form context), Input (card/payment fields), Alert (payment failure messaging, danger variant, shown inline above the retry action), Toast (payment success confirmation).

**Key interactions:** payment form submission enters Loading State on its submit Button and disables all fields for the duration; failure surfaces an inline Alert (not just a toast) since the user needs to see and act on the specific failure reason; success triggers a Toast plus a redirect back to the originating invoice or dashboard.

### 3.8 projects

**Layout:** Dual view — a Table view (default, same toolbar + filter + Table Card pattern) and a Card-grid "board" view toggle (each project as a Card in a responsive grid, 4 columns desktop / 2 tablet / 1 mobile) selectable via a small view-switcher control (two icon Buttons, `icon-sm` size, grouped) in the toolbar next to the search Input.

**Primary components:** Table or Card grid (columns/fields: project name, client, status Badge — Planning/In Progress/Review/Completed/On Hold, progress indicator, due date, team Avatars stacked with -8px overlap), Drawer (project detail, tabbed: Overview / Tasks / Files / Messages), Modal (create project form), Empty State.

**Key interactions:** stacked Avatar group in both views is clickable to open an assignee Dropdown; progress indicator is a thin 4px-height bar in `--primary` over a `--muted` track, rounded (`radius-full`); switching between Table/Card views persists per-user (not per-session) so an admin's preferred view is remembered.

### 3.9 messaging

**Layout:** Two-pane layout distinct from the Table-first pattern: left pane (320px fixed) lists conversations (Avatar + name + last-message preview + timestamp + unread count Badge), right pane is the active conversation thread (message bubbles, composer Input pinned to the bottom of the pane).

**Primary components:** Avatar, Badge (unread count, `radius-full`, `--primary` background, white text, 18px min-width for double-digit counts), Input (composer, auto-growing up to 4 lines then scrollable, with a trailing send icon-Button), Empty State (no conversation selected: centered icon + "Select a conversation to start messaging").

**Key interactions:** new incoming messages surface a Toast only when the user is outside the `messaging` module entirely; within the module, new messages append directly to the thread with a subtle 150ms fade-in and auto-scroll to the newest message unless the user has scrolled up to read history (in which case a small "New messages" pill appears, docked above the composer, to jump down).

### 3.10 notifications

**Layout:** Single-column list, max-width 640px, centered within the content area, no Card wrapper per item — instead a flat list with 1px `--border` dividers between rows (similar density to Table rows but without column structure), inside one outer Card for the whole list.

**Primary components:** list rows (leading 32px semantic icon matching the notification type, 14px title, 13px `--muted-foreground` description, 12px timestamp right-aligned), Badge (unread indicator — a simple 8px dot in `--primary`, not a text badge, positioned left of the icon), Dropdown (per-row "mark as read" / "dismiss" on hover, revealed via a `ghost` icon-Button that fades in on row hover), Empty State ("You're all caught up").

**Key interactions:** unread rows have a subtle `--primary`/4% background tint that clears on read (click or "mark all as read," a text-link Button top-right of the list); the sidebar's notification bell icon (in the top bar, §3 intro) shows the same unread-count Badge pattern as `messaging`.

### 3.11 reports

**Layout:** Toolbar row (H1 + date-range Dropdown + "Export" Button, `outline` variant, right-aligned) followed by a responsive Card grid: 2 large chart Cards (6 columns each) in row 1, 1 full-width Table Card in row 2 for the underlying data.

**Primary components:** Card (chart containers, header includes a per-card time-range or metric-type Dropdown independent of the page-level filter), Table (raw data backing the charts, sortable columns), Button (`outline`, export actions — CSV/PDF), Loading State (skeleton for chart cards specifically — a `--muted` block matching the chart's aspect ratio while data loads), Empty State (no data for the selected range).

**Key interactions:** changing the page-level date-range Dropdown re-fetches and re-renders all charts and the table together (skeletons on all cards simultaneously, matching the `dashboard-admin` filter interaction for consistency); export Button enters Loading State briefly then triggers a browser download plus a confirmation Toast.

### 3.12 settings

**Layout:** Two-column layout distinct from Table-first pages: a left-hand settings sub-navigation (200px fixed, list of section links: Profile, Company, Team, Billing, Notifications, Integrations — visually similar to Tabs but rendered vertically, not the horizontal Tabs component) and a right content pane (remaining width, max-width 720px) containing one or more Cards per section, each with a form.

**Primary components:** vertical section nav (same interaction states as Sidebar nav items, §2.5, at a smaller 36px height), Card (one per logical settings group, e.g. "Profile Photo," "Password," "Two-Factor Authentication"), Input, Avatar (profile photo upload, 64px, with a hover overlay "Change photo" affordance), Toggle/Switch (new component, not separately specified above since it's out of the required minimum list — implement using the same interactive-state language as Button: `--primary` fill when on, `--muted` when off, `radius-full` track), Button (`default` for "Save changes," typically right-aligned within each Card's footer).

**Key interactions:** each settings Card saves independently (its own "Save" button and its own success Toast) rather than one global save action, so a user editing their profile photo doesn't need to also submit unrelated billing fields; destructive settings actions (e.g. "Delete Account," "Remove team member") always route through the destructive-confirmation Modal pattern (§2.6).

### 3.13 support

**Layout:** Table-first for the ticket list (toolbar + filter row + Table Card, consistent with `invoices`/`quotations`/`clients`), with ticket detail opening as a Drawer containing a message-thread view reusing the `messaging` thread pattern (message bubbles + composer) plus a metadata sidebar strip (status Badge, priority Badge, assignee Avatar+Dropdown) at the top of the Drawer.

**Primary components:** Table (columns: ticket #, subject, requester Avatar+name, status Badge — Open = info, In Progress = warning, Resolved = success, Closed = neutral, priority Badge, last updated), Drawer (ticket detail/thread), Input (composer, reused from `messaging`), Badge, Empty State ("No open tickets").

**Key interactions:** changing ticket status or priority from within the Drawer is a Dropdown action that updates the corresponding Badge instantly and logs a small system message in the thread (e.g. "Status changed to Resolved by [admin]"); resolving a ticket surfaces a Toast confirming the client will be notified.

---

## 4. Responsive Rules

Breakpoints as defined in §1.4: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px. "Desktop" below refers to `≥1024px`, "tablet" to `640–1023px`, "mobile" to `<640px`.

**App shell:**
- Desktop: Sidebar fixed and expanded (264px) or collapsed to rail (72px) by user preference; top bar always visible.
- Tablet: Sidebar defaults to the collapsed 72px rail; expands as a temporary overlay (same visual treatment as Drawer, §2.7, sliding from the left) when the user taps the rail's expand control, then auto-collapses on navigation.
- Mobile: Sidebar is fully hidden by default and replaced by a hamburger icon-Button in the top bar; opening it renders as a full-width Drawer overlay (100% viewport width) rather than a fixed-width panel.

**Grid / page layout:**
- Desktop: full 12-column grid as specified per module in §3 (e.g. 3/6/8/4-column card splits).
- Tablet: all multi-column Card rows collapse to 2 columns; any component specified as 3 or 4 desktop columns re-flows to 2, preserving relative order.
- Mobile: single column throughout; all Card grids and dashboard summary rows stack vertically with 16px (`space-4`) gaps.

**Table:**
- Desktop/tablet: standard tabular layout as specified in §2.4.
- Mobile: tables convert to a stacked card-per-row layout — each row renders as its own compact Card (12px padding) with field label/value pairs stacked vertically (label 12px `--muted-foreground`, value 14px `--foreground`), preserving the same status Badge and row-action Dropdown in the top-right of each card. Pagination remains at the bottom, centered.

**Modal / Drawer:**
- Desktop/tablet: Modal centered at its specified max-width; Drawer anchored at its specified width (400/560px).
- Mobile: Modal becomes full-width with 16px side margins (effectively edge-to-edge with a small gutter) and pins to the vertical center; Drawer becomes full-width (100vw), full-height, functioning as a full-screen takeover with the same header/body/footer structure.

**Two-pane layouts (messaging, settings):**
- Desktop/tablet: both panes visible simultaneously as specified in §3.9/§3.12.
- Mobile: collapses to a single visible pane at a time — the list/nav pane shows first, selecting an item navigates to the detail/content pane full-screen with a back (‹) control top-left in the top bar, replicating standard master-detail mobile navigation.

**Typography:**
- H1 reduces from 30px to 24px on mobile to preserve visual hierarchy against the smaller viewport; all other type-scale steps remain constant across breakpoints (body text does not shrink further, to protect readability and touch-target legibility).

**Touch targets:**
- On tablet and mobile, all interactive elements (Buttons, nav items, table row actions, Dropdown triggers) enforce a minimum 44×44px hit area even where the visual element itself is smaller (e.g. a 32px icon-Button gets 6px of invisible padding on touch viewports to reach 44px).

---

## 5. Accessibility Notes

**Color contrast (WCAG 2.1 AA, computed against relevant backgrounds):**

| Pairing | Computed ratio | Result |
|---|---|---|
| Text `#111827` on Background `#F0F8FF` / Surface `#FFFFFF` | ≈ 17.7:1 | Passes AA and AAA for all text sizes. |
| Primary `#2563EB` on white (used for links, outlined text, icon fills) | ≈ 5.17:1 | Passes AA for normal text (≥4.5:1 required) and AAA for large text; does not meet AAA for normal text — acceptable, AA is the system's compliance target. |
| White text on Primary `#2563EB` fill (button labels) | ≈ 5.17:1 (same pair, reversed) | Passes AA comfortably. |
| Secondary Text `#6B7280` on white | ≈ 4.83:1 | Passes AA for normal text, but only marginally. Do not additionally reduce opacity or apply this color at sizes below 14px. |
| Danger `#DC2626` on white (status text, error copy) | ≈ 4.83:1 | Passes AA for normal text. Safe for inline error messages and destructive text. |
| Success `#16A34A` on white | ≈ 3.30:1 | **Fails** AA for normal text (needs 4.5:1); passes the 3:1 threshold for large text (≥18.66px regular or ≥14px bold) and for non-text UI elements (icons, borders). **Rule:** never use `#16A34A` as small body text on a white/light background — use it for icons, badge text (Badge already pairs it on a tinted 10% background, which is a decorative/iconographic context, not body copy), progress bars, and borders only. |
| Warning `#F59E0B` on white | ≈ 2.15:1 | **Fails** AA even for large text. **Rule:** never use as text color on light backgrounds. Reserve for fills, icon color, and borders; use `#92400E` (defined in §1.1) whenever warning-colored text is required. |
| Info `#0EA5E9` on white | ≈ 2.77:1 | **Fails** AA for text. Same rule as Warning: use `#0369A1` (defined in §1.1) for any text application; `#0EA5E9` is fill/icon/border-only. |

**Focus states:** every interactive element (Button, Input, nav item, Tab, Dropdown trigger, table row action) must render a visible focus indicator on keyboard focus — the 3px ring at 50% opacity of `--ring`, consistent with the existing `button.tsx` implementation, is the system-wide standard. Focus indicators must never be suppressed (no `outline: none` without an equivalent replacement) and must remain visible against both `--background` and `--card` surfaces. Once `--primary` is corrected to brand blue, consider evaluating a `--ring` value derived from `--primary` at reduced opacity instead of the current neutral gray, to strengthen the association between focus and brand identity — noted here as a future evaluation, not a value change made in this document.

**Keyboard navigation:**
- All Table rows with row-level actions must be reachable and operable via keyboard (Tab to the row's action trigger, Enter/Space to open the Dropdown, Arrow keys to move within it, Escape to close).
- Modal and Drawer trap focus while open, restore focus to the triggering element on close, and close on Escape.
- Sidebar and Tabs support Arrow-key navigation between items in addition to Tab-based traversal, per standard `role="navigation"`/`role="tablist"` patterns.
- Skip-to-content link is required at the top of the app shell (visually hidden until focused) so keyboard users can bypass the Sidebar on every page load.

**Screen readers / ARIA:**
- Badge and status-only Dots (unread indicators) must have accompanying text alternatives (e.g. `aria-label="3 unread notifications"`) since color and shape alone cannot convey their meaning non-visually.
- Toast notifications must be announced via an `aria-live="polite"` region (`aria-live="assertive"` for error toasts) so screen reader users are notified without needing focus to be on the toast.
- Icon-only Buttons (icon/icon-sm/icon-xs/icon-lg sizes) require an `aria-label` in all cases — there is no icon in this system considered universally self-explanatory without one.
- Form Inputs must have a programmatically associated `<label>` (not placeholder-only labeling); error text must be linked via `aria-describedby` so the message is announced when the field receives focus.

**Click/touch targets:** minimum 24×24px for any element embedded within dense layouts (e.g. a table's inline icon action) per WCAG 2.5.8 minimum target size, and 44×44px on touch viewports per §4's responsive touch-target rule.

---

## 6. Developer Handoff Notes

Precise values for implementation, consolidated for quick reference:

**Color tokens to add to `index.css`** (new CSS custom properties, alongside the existing `:root` block, then registered in `@theme inline` following the existing pattern for `--color-*`):
```
--success: #16A34A;
--warning: #F59E0B;
--warning-foreground-on-light: #92400E;
--info: #0EA5E9;
--info-foreground-on-light: #0369A1;
--primary-hover: #1D4ED8;
```

**Color token to correct:** `--primary` should be updated from `oklch(0.205 0 0)` to the brand blue. Either supply the hex directly (`--primary: #2563EB;`) or convert to `oklch` for consistency with the file's existing format — the perceptual-space conversion of `#2563EB` is approximately `oklch(0.51 0.19 260)`; a design/engineering sign-off on the exact conversion is recommended before committing it, since small `oklch` rounding differences are visually detectable at this saturation.

**Font setup:** add `--font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;` to the `@theme inline` block; load Inter weights 400/500/600/700 only.

**Radius base:** unchanged — continue using `--radius: 0.625rem` as the single source of truth; all four derived radii (`sm` 6px / `md` 8px / `lg` 10px / `xl` 14px) are already correctly wired via `@theme inline` and must not be redefined ad hoc in components.

**Spacing:** always author spacing with Tailwind's 4px-based scale (`space-1`=4px through `space-20`=80px, table in §1.3); never hardcode arbitrary pixel margins/padding outside this scale.

**Shadow tokens to add** (new, none exist today): `--shadow-xs`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl` per the values in §1.6, for use on Modal, Drawer, Dropdown, Toast, and the `auth` page's floating Card only — `Card` inside the normal app shell keeps its existing `ring-1 ring-foreground/10` treatment and should not gain a shadow.

**Component sizing quick-reference:**
- Button heights: xs 24px, sm 28px, default 32px, lg 36px (icon variants are square at the same heights).
- Input height: 32px default, 36px `lg`.
- Table row height: 44px body, 40px header.
- Sidebar: 264px expanded, 72px collapsed rail.
- Top bar: 64px height.
- Modal max-width: 480px standard, 640px content-heavy.
- Drawer width: 400px default, 560px record-detail.
- Toast width: 360px.
- Avatar sizes: 24 / 32 / 40 / 64px.
- Badge height: 20px.

**Interaction timings:** Modal/backdrop fade 150ms; Drawer slide 200ms ease; Toast entrance slide+fade 200ms, exit fade+collapse 150ms; message bubble fade-in 150ms; skeleton shimmer loop 1500ms; spinner rotation 800ms; button press translate 1px (duration inherits Tailwind's default `transition-all`, effectively ~150ms).

**Breakpoints:** `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px, `2xl` 1536px — treat `lg` (1024px) as the desktop/tablet boundary and `sm` (640px) as the tablet/mobile boundary for all responsive rules in §4.

---

## 7. Landing Page Visual Treatment

Version 1.1 addendum. Scope: `frontend/src/modules/marketing/**` only (`LandingPage.tsx` and its `components/` — Navbar, Hero, Services, Pricing, About, Contact, Footer). Nothing in this section applies to the authenticated app shell (Sidebar, dashboards, `auth`, etc.).

**Direction.** Move the landing page from "flat sections with one decorative panel behind the Hero" to a single coherent light/glass system that reads as more elegant and premium, in the vein of suzzyai.com's formula — light neutral base, one saturated brand accent expressed through gradients/glass rather than flat color blocks, frosted translucent header, generous whitespace — reimplemented with **our** brand blue (`--primary` / `#2563EB`) and **our** existing primitives (`BrandGradientAccent`, `Card`, `Button`, the documented spacing/radius/shadow scale). This is a reskin, not a new design language: every recommendation below extends a token or component that already exists in §1–§2 rather than inventing a parallel one.

**Explicitly unchanged (hard constraints):**
- `font-poppins` stays scoped to the whole landing page exactly as wired in `LandingLayout.tsx`; no `font-family` changes anywhere in this section. Weight/size/tracking adjustments to Poppins headings and body text are in scope.
- Logo height (`h-14` in `Footer.tsx`) is unchanged. (Note: `Navbar.tsx` currently renders the logo at `h-19`, not `h-14` — this section does not touch logo sizing in either file; leave both exactly as they are today.)
- `--background` (Alice Blue, `#F0F8FF`) remains the literal page background on every section. All gradient/glass treatment below is a decorative overlay on top of it, same layering pattern `BrandGradientAccent` already uses in Hero (`absolute` + negative `z-index`), never a replacement of the base color.
- No new dependencies. Everything below is achievable with existing Tailwind utilities, the existing `color-mix()`/`radial-gradient()` arbitrary-value pattern already used in `BrandGradientAccent`, and existing shadcn/ui components (`Card`, `Button`, `Input`, `Alert`).

### 7.1 `BrandGradientAccent` extensions

`BrandGradientAccent` (`frontend/src/shared/components/common/BrandGradientAccent.tsx`) is reused everywhere below instead of inventing a second gradient mechanism. It needs two small additive prop extensions to cover the new placements (both are backward-compatible — every existing call site, including Hero's current usage and the `subtle` usage behind `AuthLayout`/`DashboardShell`, continues to work unmodified):

**1. New `intensity="whisper"` tier** — for full-bleed washes behind an entire section's background (Services, About, Footer), where even `subtle` is too visible sitting behind body copy and card grids for a sustained scroll distance. Roughly halves `subtle`'s already-halved values:

```
// Linear layer
isWhisper: 'from-primary/[0.04] via-primary/[0.015]'

// Radial layer
isWhisper: 'bg-[radial-gradient(circle_at_50%_-10%,color-mix(in_oklch,var(--color-primary),transparent_94%),transparent_60%)]'

// Stripe layer — opacity-[0.012] (see `layers` below: whisper omits the stripe by default)
```

**2. New `layers?: Array<'linear' | 'radial' | 'stripe'>` prop**, default `['linear', 'radial', 'stripe']` for `strong`/`subtle` (i.e. unchanged current behavior), default `['linear', 'radial']` for `whisper` (the diagonal stripe reads as visual noise at whisper opacity over large areas / behind text — omit it unless a caller opts back in). This also lets bounded "glow" placements (Pricing's highlighted tier, Contact's form card) request `layers={['radial']}` alone for a soft ambient blob instead of the full 3-layer Hero treatment.

Updated prop table:

| Prop | Values | Notes |
|---|---|---|
| `intensity` | `'strong'` \| `'subtle'` (existing) \| `'whisper'` (new) | `strong` = Hero + Pricing highlighted-tier glow. `subtle` = existing AuthLayout/DashboardShell usage, unchanged. `whisper` = new full-section background washes below. |
| `layers` | `Array<'linear' \| 'radial' \| 'stripe'>`, default per-intensity as above | Lets a caller render only the radial "glass" layer for a compact glow, without pulling in the linear tint or stripe texture meant for large bounded panels. |

No other props change. `className` continues to carry all positioning/sizing/rounding as today.

### 7.2 Navbar (`Navbar.tsx`)

Current: `sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md`.

- Increase glass translucency and blur so the header reads as frosted glass rather than a mostly-opaque bar: change to `bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50`.
- Replace the neutral `border-border/60` bottom hairline with a brand-tinted one so the header edge picks up the accent instead of a generic gray line: `border-b border-primary/10`, plus a hairline brand shadow for depth once content scrolls beneath it: add `shadow-[0_1px_0_0_rgba(37,99,235,0.05)]`.
- Combined header className: `sticky top-0 z-50 border-b border-primary/10 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/50 shadow-[0_1px_0_0_rgba(37,99,235,0.05)]`.
- Desktop nav links: add an underline-on-hover micro-interaction for polish — wrap the existing `hover:text-foreground` transition with a 2px animated underline: add `relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:after:scale-x-100` to each nav `<a>`. Purely additive to the existing link classes; no structural change.
- "Sign up" CTA button in the nav: apply a landing-only glow via `className` on that specific `<Button>` instance (do **not** touch `button.tsx`'s shared `default` variant, since dashboards/auth reuse it) — `className="shadow-[0_1px_2px_rgba(37,99,235,0.15),0_4px_12px_-2px_rgba(37,99,235,0.35)] hover:shadow-[0_1px_2px_rgba(37,99,235,0.2),0_6px_16px_-2px_rgba(37,99,235,0.45)]"`.
- Mobile drawer background: change flat `bg-card` to `bg-card/95 backdrop-blur-md` so it matches the frosted language established by the header, instead of being a fully opaque panel.
- Height (`h-16`) and logo size are unchanged.

### 7.3 Hero (`Hero.tsx`)

Hero already carries the `strong` treatment; refine rather than replace:

- Panel height/rounding: increase from `h-[34rem] sm:h-[38rem]` to `h-[38rem] sm:h-[42rem]` and soften the corner from `rounded-b-[3rem]` to `rounded-b-[4rem]` for a more generous, less boxy silhouette.
- Ring: soften `ring-1 ring-primary/10` to `ring-1 ring-primary/8` now that the panel is taller and the tint alone carries more visual weight.
- Add a second, smaller `BrandGradientAccent` with `intensity="whisper"` and `layers={['radial']}` positioned at the **bottom** of the Hero panel (e.g. `className="inset-x-0 -bottom-24 -z-10 h-48"`), so the accent doesn't hard-cut at the `rounded-b-[4rem]` edge but fades further into the Services section below it — the connective-tissue transition the reference site achieves and the current implementation currently lacks (Hero's accent stops abruptly at its own bounding box).
- Eyebrow badge (`Software delivery, without the guesswork`): unchanged structurally; this pattern is good and should be repeated (see §7.4–7.7) as a consistent "eyebrow" convention across every section, not just Hero.
- H1: increase from `text-4xl leading-10` to `text-5xl leading-[1.1] sm:text-6xl sm:leading-[1.05]` for more presence — still Poppins, only size/leading changes, tracking stays `tracking-tight`.
- Lead paragraph: bump from `text-base leading-7` to `text-lg leading-8` and widen `max-w-xl` to `max-w-2xl` to match the larger H1 without feeling cramped.
- Product-preview panel: replace the flat `ring-1 ring-foreground/10` with a floating-surface treatment consistent with §1.6's shadow scale (this panel is a floating visual on the page background, not an app-shell Card, so it earns a shadow the way `auth`'s Card does per §6): `rounded-xl bg-card p-2 ring-1 ring-foreground/8 shadow-xl`.
- CTA buttons: give the primary "Get started free" button the same landing-only glow classes specified for the Navbar CTA in §7.2, for visual consistency between the two places a user sees the primary action above the fold.

### 7.4 Services (`Services.tsx`)

Current: flat `bg-background`, plain `Card` grid, no eyebrow, `mt-16` gap.

- Add a `BrandGradientAccent` full-bleed wash so Services doesn't read as a flat white gap between Hero's accent and Pricing's tinted background: `<BrandGradientAccent intensity="whisper" className="inset-x-0 top-0 -z-10 h-[28rem]" />` (top-anchored only, fading out before the section's own content ends — this is the layer that receives Hero's bottom fade from §7.3, so the two blend into one continuous wash rather than two disconnected panels).
- Add an eyebrow label above the H2, matching Hero's badge convention: `<span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-xs font-medium text-primary">Platform</span>` inside the existing `ScrollReveal` wrapper, 16px (`space-4`) above the `<h2>`.
- H2: bump `text-3xl` to `text-3xl sm:text-4xl` (keep `font-bold tracking-tight`) to match the elevated scale introduced in Hero.
- Section padding: increase `py-20 sm:py-28` to `py-24 sm:py-32` for more generous vertical rhythm (still within the documented "large marketing sections" precedent of `space-16`/`space-20`).
- Grid gap: `mt-16` unchanged; card-to-card `gap-6` unchanged (already on-scale).
- Card treatment (applies to all four service `Card`s — and reused as the standard "elegant card" pattern for Pricing/About below, so it's specified once here): replace the bare `<Card className="h-full">` with `<Card className="h-full border-transparent shadow-sm ring-1 ring-foreground/8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/15">`. This keeps the existing `Card` component untouched (no shadow by default in the app shell per §1.6/§6) while giving the *landing* instances a resting `shadow-sm` + a lift-and-glow hover state — an elegant, restrained micro-interaction rather than the flat, static card the section has today.
- Icon tile (`bg-primary/10 text-primary` size-10 rounded-lg): unchanged, already on-brand; optionally increase to `size-11` now that cards read slightly larger with the new padding rhythm — not required.

### 7.5 Pricing (`Pricing.tsx`)

Current: `bg-secondary/40`, three `Card`s, highlighted tier gets `ring-2 ring-primary shadow-lg`.

- Keep `bg-secondary/40` as the section's own tint (it already differentiates Pricing from Services/About), but layer a `whisper` wash on top for continuity with the rest of the page's accent language: `<BrandGradientAccent intensity="whisper" layers={['radial']} className="inset-x-0 top-0 -z-10 h-[24rem]" />`.
- Add the same eyebrow-label convention as §7.4 above the H2 (copy: e.g. `Pricing`).
- H2: same `text-3xl sm:text-4xl` bump as Services for consistency.
- Section padding: same `py-24 sm:py-32` bump as Services.
- Apply the standard elegant-card treatment from §7.4 (`shadow-sm ring-1 ring-foreground/8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/15`) to the two non-highlighted tiers.
- **Highlighted tier ("Studio")** gets its own elevated treatment, since it's the section's single most important conversion surface and the current `ring-2 ring-primary shadow-lg` is close but flat:
  - Wrap the highlighted `Card` in a positioned container and place a bounded glow behind it: `<BrandGradientAccent intensity="strong" layers={['radial']} className="-inset-4 -z-10 rounded-2xl" />` on a `relative` wrapper around just that card, so the glow bleeds slightly past the card's own edges.
  - Card className: replace `ring-2 ring-primary shadow-lg` with `ring-2 ring-primary shadow-xl scale-100 lg:scale-105` — the slight desktop-only scale-up is a common, effective SaaS pricing convention for drawing the eye to the recommended tier without changing layout weight on mobile.
  - "Most popular" badge: replace the flat `bg-primary/10 text-primary` pill with a filled gradient treatment for more visual weight on the one badge in the section that should stand out: `bg-gradient-to-r from-primary to-primary-hover text-primary-foreground` (same pill shape/padding otherwise).
- Feature-list `Check` icon and copy: unchanged.

### 7.6 About (`About.tsx`)

Current: flat `bg-background`, stats rendered as plain `bg-secondary/60` blocks, no eyebrow.

- Add an eyebrow label above the H2 (copy: e.g. `Our story`), same convention as §7.4/§7.5.
- H2: same `text-3xl sm:text-4xl` bump.
- Body copy: bump both paragraphs from `text-base leading-7` to `text-base leading-8` (slightly more generous line-height only, size unchanged — About is read-heavy prose and shouldn't jump to `text-lg` the way Hero's short lead does).
- Stats blocks: replace the flat `rounded-xl bg-secondary/60 p-6` with the glass-card language used at the top of the page, so the two-column layout doesn't feel like two different design systems stacked together: `rounded-xl bg-card/70 p-6 shadow-sm ring-1 ring-foreground/8 backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:ring-primary/15`. This is the one true "glassmorphism" (translucent + blur) moment on the page outside the Navbar, deliberately used sparingly.
- Section padding: same `py-24 sm:py-32` bump as Services/Pricing.
- No full-bleed `BrandGradientAccent` wash needed here — About is intentionally the visual "rest point" of the page between Pricing's glow and Contact's; keeping it accent-free (aside from the glass stat cards) preserves contrast and pacing rather than making every section equally loud.

### 7.7 Contact (`Contact.tsx`)

Current: `bg-secondary/40`, form inside `rounded-xl bg-card p-6 ring-1 ring-foreground/10 sm:p-8`.

- Add the eyebrow-label convention (copy: e.g. `Get in touch`) above the `Let's talk` H2.
- H2: same `text-3xl sm:text-4xl` bump; keep the section centered as today.
- Section padding: same `py-24 sm:py-32` bump.
- Form card: add a bounded glow behind it (this is the page's last conversion moment before the Footer, so it deserves the same accent treatment as Pricing's highlighted tier, at a lower intensity since it's a form, not a pricing pitch): wrap in `relative` and add `<BrandGradientAccent intensity="subtle" layers={['radial']} className="-inset-6 -z-10 rounded-3xl" />`.
- Card className: `rounded-xl bg-card/95 p-6 shadow-md ring-1 ring-foreground/8 backdrop-blur-sm sm:p-8` — slightly translucent + blurred to pick up the glow behind it (an intentional echo of the Navbar/About glass moments), with `shadow-md` added since, like Hero's product-preview panel, this is a floating surface, not an app-shell `Card` instance.
- Inputs/textarea/Button inside the form: unchanged (already using the shared `Input`/`Button`/`Alert` components per §2 — no landing-specific override needed here).

### 7.8 Footer (`Footer.tsx`)

Current: `border-t border-border bg-background`, flat two-row layout.

- Replace the flat `border-t border-border` top edge with a brand-tinted gradient seam instead of a plain gray hairline, echoing the Navbar's bottom edge treatment from §7.2 so the page opens and closes with the same accent language: remove `border-t border-border` from the `<footer>` and instead add a 1px gradient div as the first child: `<div className="h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />`.
- Add a very low-intensity full-bleed wash behind the footer for continuity with the rest of the page (this is the page's exit point, so it should feel like part of the same system, not a bare utility strip): `<BrandGradientAccent intensity="whisper" layers={['linear']} className="inset-x-0 bottom-0 -z-10 h-64" />` on a `relative` footer wrapper.
- Bottom copyright bar: keep `border-t border-border` as-is (this internal divider is fine as a neutral hairline; only the outer/top edge of the Footer gets the brand treatment, to avoid overusing the gradient-seam device).
- Logo size (`h-14`) and all copy/layout unchanged.

### 7.9 Cross-section rhythm, spacing, and typography summary

Consolidated for quick reference — all values above, gathered in one place:

| Section | Padding (was → now) | H2 scale (was → now) | Eyebrow label added |
|---|---|---|---|
| Hero | `py-20 sm:py-28 lg:py-32` (unchanged) | H1 `text-4xl` → `text-5xl sm:text-6xl` | Already present (unchanged) |
| Services | `py-20 sm:py-28` → `py-24 sm:py-32` | `text-3xl` → `text-3xl sm:text-4xl` | Yes (new) |
| Pricing | `py-20 sm:py-28` → `py-24 sm:py-32` | `text-3xl` → `text-3xl sm:text-4xl` | Yes (new) |
| About | `py-20 sm:py-28` → `py-24 sm:py-32` | `text-3xl` → `text-3xl sm:text-4xl` | Yes (new) |
| Contact | `py-20 sm:py-28` → `py-24 sm:py-32` | `text-3xl` → `text-3xl sm:text-4xl` | Yes (new) |
| Footer | n/a | n/a | n/a |

**Card elevation pattern** (new landing-only convention, does not change the shared `Card` component's default app-shell behavior of §2.2): resting `shadow-sm ring-1 ring-foreground/8`, hover `shadow-lg ring-primary/15` plus `-translate-y-1`, `transition-all duration-300`. Applied to: Services cards, Pricing non-highlighted tiers, About stat blocks (with the added `bg-card/70 backdrop-blur-sm` glass variant). Pricing's highlighted tier and Contact's form card use the heavier `shadow-xl`/`shadow-md` + bounded-glow variant instead, since they're each a section's single focal surface rather than one of a repeated grid.

**Gradient/glass placement summary** (all via `BrandGradientAccent`, §7.1):

| Placement | `intensity` | `layers` | Purpose |
|---|---|---|---|
| Hero top panel | `strong` | all (default) | Existing hero treatment, refined per §7.3 |
| Hero bottom fade | `whisper` | `['radial']` | New — bleeds Hero's accent into Services |
| Services background | `whisper` | `['linear','radial']` (default) | New — full-bleed section wash |
| Pricing background | `whisper` | `['radial']` | New — layered on top of existing `bg-secondary/40` |
| Pricing highlighted tier | `strong` | `['radial']` | New — bounded glow behind the "Studio" card |
| Contact form card | `subtle` | `['radial']` | New — bounded glow behind the form |
| Footer | `whisper` | `['linear']` | New — low-intensity closing wash |
| About | — | — | Intentionally no accent (glass stat cards only) — pacing "rest point" |

### 7.10 Accessibility notes specific to this section

- All new `BrandGradientAccent` placements remain `aria-hidden="true"` and `pointer-events-none` (inherited from the component, §7.1) — no change needed to the component's own accessibility posture, but do not add interactive content inside any `BrandGradientAccent` instance.
- Text contrast is unaffected by any change in this section: no text color changes are proposed, and all new background washes stay in the `/[0.01]`–`/[0.08]` opacity range against `--background`/`--card`, well below any threshold that would visibly shift the existing AA-passing pairings documented in §5.
- The Navbar's `backdrop-blur-xl` + `bg-background/60` change must be checked against the existing `border-primary/10` hairline and nav-link text in a real browser once implemented — translucent headers can occasionally reduce effective contrast if content scrolls directly beneath a link; if any nav link fails contrast against a busy hero background, raise `bg-background/60` to `bg-background/70` rather than removing the blur.
- New hover/translate micro-interactions (Services/Pricing/About cards, Navbar link underline) must respect `prefers-reduced-motion` consistent with the existing `ScrollReveal`/`motion` usage already in these files — apply the same reduced-motion handling already established for the page's `framer-motion` animations (no new motion library or pattern introduced).
