# Klyro Brand Guidelines & Identity System

## 1. Brand Overview

**Klyro** is a modern, enterprise-grade business management and food service ERP platform designed for precision, reliability, and operational speed. 

### 1.1 Brand Personality
- **Clean & Minimal:** Uncluttered layouts, high information density without visual noise. Form follows function.
- **Confident & Authoritative:** Strong architectural grounding anchored by Midnight Navy (`#101828`).
- **Modern & Energetic:** Strategic accents of Electric Blue (`#2563EB`) indicate action, navigation, and momentum.
- **Trustworthy & Resilient:** Predictable interaction patterns, accessible contrast, enterprise compliance.
- **Unified Ecosystem:** Seamless visual continuity across Web desktop/tablets, Android/iOS mobile apps, and public landing properties.

---

## 2. Logo System & Assets

The Klyro identity is anchored by a geometric symbol: an architectural chevron-and-beam construction forming the letter **K**, evoking growth, data pipelines, and structural strength.

### 2.1 Logo Variants
The official SVG vector assets are stored in `docs/branding/assets/` and deployed across client applications:

| Asset Name | Relative Path | Purpose |
|------------|---------------|---------|
| **Symbol Only** | `assets/klyro-symbol.svg` | App icon, favicon, compact mobile header, avatars |
| **Horizontal Wordmark** | `assets/klyro-logo-horizontal.svg` | Desktop sidebar, headers, invoice headers, desktop login |
| **Dark Mode Wordmark** | `assets/klyro-logo-dark.svg` | Dark theme navigation, high-contrast dark surfaces |
| **Application Icon** | `assets/klyro-app-icon.svg` | Android adaptive icon, iOS home screen, PWA manifest |
| **Favicon** | `assets/klyro-favicon.svg` | Browser tab favicon, pinned tabs, web shortcuts |

### 2.2 Clear Space & Proportions
- **Clear Space:** Maintain a minimum clear space surrounding the logo equal to the height of the "K" symbol ($X$). No typography, borders, or intersecting graphic elements may intrude into this exclusion zone.
- **Minimum Sizing:**
  - *Full Horizontal Logo:* Minimum width of `120px` on screen; `35mm` in print.
  - *Symbol / App Icon:* Minimum size of `24px x 24px` on screen; `8mm` in print.

```
       +---------------------------------------------+
       |                  [ X ]                      |
       |       +----+                                |
 [ X ] |  [X]  | K  |   K L Y R O             [ X ]  |
       |       +----+                                |
       |                  [ X ]                      |
       +---------------------------------------------+
```

### 2.3 Logo Misuse Rules (Don'ts)
- **DO NOT** stretch, condense, or alter the aspect ratio of the logo.
- **DO NOT** apply gradients, drop shadows, outer glows, or bevels to the mark or wordmark.
- **DO NOT** place the dark navy logo on dark backgrounds (use `klyro-logo-dark.svg` with white typography).
- **DO NOT** enclose the logo in decorative shapes (e.g., shields, badges, or circular borders unless part of an OS-mandated icon container).
- **DO NOT** replace the official typeface in the wordmark with generic sans-serif fonts.

---

## 3. Official Color Architecture

Klyro employs a dual-anchor palette: **Midnight Navy** for structural dominance and **Electric Blue** for focused interactivity.

### 3.1 Primary Brand Palette
- **Midnight Navy (`#101828`):** Deep, authoritative base. Anchors navigation sidebars, major headlines, card titles, and high-contrast structural dividers.
- **Electric Blue (`#2563EB`):** Vibrant, accessible digital blue. Directs user focus to primary CTAs, active route states, links, and keyboard focus rings.
- **Hover Blue (`#1D4ED8`):** Deepened electric blue for button hover, active press states, and selected dropdown items.
- **Pale Blue Surface (`#EAF1FF`):** Soft, tinted neutral used for selected table rows, badge backgrounds, and information callouts.

### 3.2 Neutral Palette (Light Theme)
- **Main App Canvas:** `#F8FAFC` (Slate 50) — Off-white backdrop reducing eye strain during 8-hour operational shifts.
- **Card Surface:** `#FFFFFF` (Pure White) — Elevated work panels, modal bodies, and form cards.
- **Primary Text:** `#101828` (Slate 900) — High contrast text for labels, table data, and metrics.
- **Secondary / Subdued Text:** `#667085` (Slate 500) — Helper descriptions, timestamps, table column headers.
- **Structural Borders:** `#E4E7EC` (Slate 200) — 1px crisp separation lines for tables, cards, and inputs.
- **Disabled State Surface:** `#F2F4F7` (Slate 100) — Inactive buttons and read-only inputs.
- **Disabled Text:** `#98A2B3` (Slate 400) — Inactive placeholder and label states.

### 3.3 Semantic Color Tokens
Semantic colors are strictly reserved for state indicators and system feedback. Never use semantic colors for decorative or branding purposes.
- **Success (`#16A34A` / Green 600):** Approved orders, active inventory, received shipments, positive margins.
- **Warning (`#D97706` / Amber 600):** Pending approval, low stock threshold, recipe draft versions.
- **Error / Danger (`#DC2626` / Red 600):** Out of stock, rejected indents, wastage entries, form validation errors.
- **Info (`#2563EB` / Blue 600):** System notices, stock transfer in-transit, standard audit logs.

---

## 4. Dark Theme Architecture

The Klyro dark mode is an intentional, layered surface architecture rather than an inverted color scheme.

| Level | Token Name | Hex Code | Role / Usage |
|-------|------------|----------|--------------|
| L0 | `klyro-dark-bg` | `#0B1220` | Base viewport background, behind cards and tables |
| L1 | `klyro-dark-sidebar` | `#101828` | Main navigation drawer and persistent headers |
| L2 | `klyro-dark-card` | `#182230` | Data tables, form cards, KPI stat panels |
| L3 | `klyro-dark-surface-elevated` | `#1D2939` | Dropdown menus, modals, tooltips, popovers |
| Border | `klyro-dark-border` | `#344054` | Crisp card boundaries, row dividers |
| Text Primary | `klyro-dark-text-primary`| `#F9FAFB` | Crisp, high-readability foreground copy |
| Text Secondary | `klyro-dark-text-secondary`| `#98A2B3` | Column headers, meta badges, breadcrumbs |
| Accent | `klyro-dark-accent` | `#60A5FA` | High-contrast electric blue adapted for dark backgrounds |

---

## 5. Typography & Hierarchy

Klyro uses standard system sans-serif typography stacks optimized for zero layout-shift, high rendering fidelity, and instant load times.

- **Font Family Stack:** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Monospace Stack (SKUs, Barcodes, Financial Quantities):** `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, Consolas, monospace`

### Typographic Scale
- **Display 1 (H1 - Page Titles):** `24px` (`1.5rem`), SemiBold (600), Line Height `1.25`, Letter Spacing `-0.02em`
- **Heading 2 (H2 - Section Headers):** `20px` (`1.25rem`), SemiBold (600), Line Height `1.3`, Letter Spacing `-0.01em`
- **Heading 3 (H3 - Card / Modal Titles):** `16px` (`1.0rem`), SemiBold (600), Line Height `1.4`
- **Body Regular:** `14px` (`0.875rem`), Regular (400), Line Height `1.5`
- **Body Medium / Table Cells:** `14px` (`0.875rem`), Medium (500), Line Height `1.5`
- **Caption / Meta / Badges:** `12px` (`0.75rem`), Medium (500), Line Height `1.4`

---

## 6. Accessibility & Contrast (WCAG 2.2 AA)

All Klyro color pairings satisfy WCAG 2.2 Level AA requirements:
- **Primary Navy (`#101828`) on White (`#FFFFFF`):** Contrast Ratio **16.3:1** (Exceeds 7:1 AAA standard).
- **Secondary Text (`#667085`) on White (`#FFFFFF`):** Contrast Ratio **4.7:1** (Exceeds 4.5:1 AA standard for normal text).
- **Electric Blue (`#2563EB`) on White (`#FFFFFF`):** Contrast Ratio **4.6:1** (Meets 4.5:1 AA standard).
- **Dark Text Primary (`#F9FAFB`) on Dark Card (`#182230`):** Contrast Ratio **13.8:1** (Exceeds AAA).
- **Dark Accent (`#60A5FA`) on Dark Card (`#182230`):** Contrast Ratio **6.2:1** (Exceeds AA standard).

---

## 7. Cross-Platform Guidelines

1. **Web ERP Application (`Frontend/forkify-webApp`):**
   - Fixed Midnight Navy sidebar (`#101828`) with `klyro-logo-horizontal.svg`.
   - Electric Blue active state indicators with 3px left border pill.
   - Clean slate background `#F8FAFC` with crisp `#FFFFFF` cards and `#E4E7EC` borders.
2. **Mobile Application (`Mobile App/ForkifyERP 2`):**
   - Splash screen and adaptive icon background: `#101828`.
   - App display name: **Klyro ERP**.
   - Preserved Android package / iOS bundle ID: `com.forkify.erp` for zero disruption to deployment certificates.
3. **Landing Page (`forkify-landing`):**
   - Modern, executive headline positioning: "The Enterprise ERP Engine for Modern Food Operations".
   - Navy and Electric Blue hero section with high-conversion product demonstration previews.
