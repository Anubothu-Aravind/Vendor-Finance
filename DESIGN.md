---
name: Vastrams Design System
description: Professional visual tokens and guidelines for the back-office Vendor and Finance Management app.
---

<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Vastrams

## 1. Overview

**Creative North Star: "The Financial Control Room"**

The design system for Vastrams is optimized for a back-office financial ledger environment. It prioritizes information density, numerical legibility, and high visual contrast over decorative whitespace or heavy animations. The interface is composed of a prominent dark charcoal-navy sidebar nav rail juxtaposed with a clean, cool-tinted off-white content canvas.

**Key Characteristics:**
* Restrained accent color application to emphasize calls to action.
* Compact, structured grids and tabular layouts with blue-slate dividers.
* High legibility for figures and monetary calculations.
* Flat, layering-based hierarchy rather than heavy shadows.

## 2. Colors

The palette leverages a cool-tinted off-white background, deep charcoal-navy for the main navigation, slate-blue grays for text/dividers, and a vibrant cobalt blue as the sole functional accent.

### Primary
* **Cobalt Blue** (`#235ee0`): Used for primary interactive actions, active navigation states, and selected dropdown selections.

### Secondary
* **Charcoal-Navy** (`#0e1629`): Used for the main sidebar navigation rail background, evoking stability and focus.

### Neutral
* **Content Canvas** (`#f3f3f3`): The default page background behind panels.
* **Panel Container** (`#ffffff`): The card and grid container background color.
* **Header Background** (`#eceef0`): Sub-panel headers, table headers, and inputs.
* **Ink Primary** (`#0f172a`): Body text and table figures.
* **Ink Muted** (`#8d9baf`): Slate-blue gray for secondary labels and placeholder text.
* **Border Divider** (`#d7dde5`): Thin borders and row separators.
* **Success Background** (`#e1f1e9`): Soft green background tint for cleared cheques or paid bills.

### Named Rules
**The 10% Accent Rule.** Cobalt blue is reserved for primary actions and active navigation items only. It should never occupy more than 10% of any viewport's surface area.
**The Cool Neutrals Rule.** Pure neutral grays (e.g. `#808080`) are prohibited. All secondary surfaces, borders, and text must carry a cool slate-blue tint to preserve a cohesive, premium financial brand.

## 3. Typography

**Display Font:** Inter (with system-sans fallback)
**Body Font:** Inter (with system-sans fallback)

**Character:** Standardizing on *Inter* ensures maximum letter and digit legibility across tabular columns, lists, and form inputs.

### Hierarchy
* **Display** (Bold (700), clamp(1.75rem, 4vw, 2.5rem), line-height: 1.2): Section and page title headers.
* **Headline** (Semibold (600), 20px, line-height: 1.3): Panel and card headers.
* **Title** (Medium (500), 16px, line-height: 1.4): Table section subtitles, list items, and form labels.
* **Body** (Regular (400), 14px, line-height: 1.5, max-width: 75ch): Row records, values, details, and description paragraphs.
* **Label** (Semibold (600), 12px, letter-spacing: 0.05em, case: uppercase): Column headers and small helper warnings.

### Named Rules
**The Tabular Numbers Rule.** All numeric data, including currency amounts, percentages, transaction counts, dates, and cheque numbers, must explicitly be styled with `font-variant-numeric: tabular-nums` to align perfectly in columns.

## 4. Elevation

Vastrams is flat-by-default. Layering and panel boundaries are defined by light slate borders (`#d7dde5`) and background tones (`#eceef0`) rather than drop shadows.

### Shadow Vocabulary
* **Active Overlay** (`box-shadow: 0 4px 20px rgba(14, 22, 41, 0.04)`): Restrained soft shadow used exclusively for dropdown lists, autocomplete comboboxes, and active modal overlays.

### Named Rules
**The Flat-Rest Rule.** All cards, tables, inputs, and buttons are completely flat at rest. Subtle shadows appear only when components are hovered or active.

## 5. Components

*(Omitted in seed stage. Component specs and HTML/CSS snippets will be extracted once core pages are generated.)*

## 6. Do's and Don'ts

### Do:
* **Do** use `font-variant-numeric: tabular-nums` on all currencies and transaction figures.
* **Do** restrict Cobalt Blue `#235ee0` to interactive buttons, navigation indicators, and active states.
* **Do** use `#d7dde5` for all row separators, borders, and input strokes.
* **Do** keep transition durations for hovers and state changes short, capped at `150ms ease-out`.

### Don't:
* **Don't** use warm beige, cream, or sand background values (`#faf7f2`, `--cream`, `--sand`), which clash with the cool slate-blue brand.
* **Don't** use pastel gradients, glowing neon shadows, or rounded glassmorphic elements.
* **Don't** use vertical side-stripe borders (border-left/right > 1px) for card accents or alert states.
* **Don't** apply transform or scale animations on hover for image elements.
