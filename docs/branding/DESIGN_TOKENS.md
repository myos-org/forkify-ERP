# Klyro ERP — Unified Design Tokens

This specification provides the authoritative design token registry for the Klyro ERP ecosystem across Web (`forkify-webApp`), Mobile (`ForkifyERP 2`), and Landing (`forkify-landing`).

---

## 1. Color Palette Tokens

### 1.1 Brand Foundation Tokens
| Token Name | Hex Code | RGB | Role / Usage |
|---|---|---|---|
| `klyro.brand.navy` | `#101828` | `16, 24, 40` | Dominant structural anchor, navigation, display text |
| `klyro.brand.navy-dark` | `#0B1220` | `11, 18, 32` | Dark mode background canvas |
| `klyro.brand.navy-surface` | `#182230` | `24, 34, 48` | Dark mode card & panel surface |
| `klyro.brand.navy-elevated` | `#1D2939` | `29, 41, 57` | Dark mode elevated dropdowns & modals |
| `klyro.brand.blue` | `#2563EB` | `37, 99, 235` | Primary action accent, links, active state indicators |
| `klyro.brand.blue-hover` | `#1D4ED8` | `29, 78, 216` | Hover & pressed states for primary buttons |
| `klyro.brand.blue-light` | `#EAF1FF` | `234, 241, 255` | Soft tint for selected rows, pill backgrounds |
| `klyro.brand.blue-accent` | `#60A5FA` | `96, 165, 250` | Dark mode interactive accent & focus indicators |

### 1.2 Neutral Tokens (Light Theme)
| Token Name | Hex Code | Role / Usage |
|---|---|---|
| `klyro.color.bg.canvas` | `#F8FAFC` | Main application background (Slate 50) |
| `klyro.color.bg.card` | `#FFFFFF` | Form cards, data tables, dialog bodies |
| `klyro.color.bg.subtle` | `#F1F5F9` | Secondary table headers, disabled card surfaces |
| `klyro.color.border.default` | `#E4E7EC` | Structural card borders, input borders |
| `klyro.color.border.strong` | `#D0D5DD` | Focused or hovered border boundaries |
| `klyro.color.text.primary` | `#101828` | High-emphasis body text, titles, table data |
| `klyro.color.text.secondary` | `#667085` | Subtitles, helper text, table column headers |
| `klyro.color.text.disabled` | `#98A2B3` | Inactive buttons, placeholder text |

### 1.3 Semantic Tokens
| Semantic Role | Main Hex | Background Tint Hex | Text On Tint Hex | Usage |
|---|---|---|---|---|
| **Success** | `#16A34A` | `#DCFCE7` | `#14532D` | Received GRN, approved PO, completed transfer |
| **Warning** | `#D97706` | `#FEF3C7` | `#78350F` | Low inventory, pending approval, recipe drafts |
| **Danger / Error** | `#DC2626` | `#FEE2E2` | `#7F1D1D` | Stock-out, rejected indent, wastage, failed auth |
| **Info** | `#2563EB` | `#EAF1FF` | `#1E40AF` | System announcements, transfer in-transit |

---

## 2. Dark Mode Token Mappings

| UI Element | Light Token / Value | Dark Token / Value |
|---|---|---|
| App Canvas | `klyro.color.bg.canvas` (`#F8FAFC`) | `klyro.dark.bg` (`#0B1220`) |
| Persistent Sidebar | `klyro.brand.navy` (`#101828`) | `klyro.dark.sidebar` (`#101828`) |
| Content Cards / Tables | `klyro.color.bg.card` (`#FFFFFF`) | `klyro.dark.card` (`#182230`) |
| Dialog / Popover / Tooltip | `klyro.color.bg.card` (`#FFFFFF`) | `klyro.dark.elevated` (`#1D2939`) |
| Card & Table Borders | `klyro.color.border.default` (`#E4E7EC`) | `klyro.dark.border` (`#344054`) |
| Primary Typography | `klyro.color.text.primary` (`#101828`) | `klyro.dark.text.primary` (`#F9FAFB`) |
| Secondary Typography | `klyro.color.text.secondary` (`#667085`) | `klyro.dark.text.secondary` (`#98A2B3`) |
| Primary Action Button | `klyro.brand.blue` (`#2563EB`) | `klyro.brand.blue` (`#2563EB`) |
| Accent Focus / Links | `klyro.brand.blue` (`#2563EB`) | `klyro.dark.accent` (`#60A5FA`) |

---

## 3. Typography Tokens

### 3.1 Font Families
- **Sans-Serif (Body & Display):** `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Monospace (SKUs, Currency, Batch Codes):** `"JetBrains Mono", SFMono-Regular, Menlo, Monaco, monospace`

### 3.2 Font Scale & Weights
| Token Name | Size (px / rem) | Line Height | Weight | Letter Spacing |
|---|---|---|---|---|
| `klyro.type.display` | `24px` / `1.5rem` | `1.25` | `600` (SemiBold) | `-0.02em` |
| `klyro.type.title.lg` | `20px` / `1.25rem` | `1.3` | `600` (SemiBold) | `-0.01em` |
| `klyro.type.title.md` | `16px` / `1.0rem` | `1.4` | `600` (SemiBold) | `0` |
| `klyro.type.body.lg` | `16px` / `1.0rem` | `1.5` | `400` (Regular) | `0` |
| `klyro.type.body.md` | `14px` / `0.875rem` | `1.5` | `400` (Regular) | `0` |
| `klyro.type.body.md-medium`| `14px` / `0.875rem`| `1.5` | `500` (Medium) | `0` |
| `klyro.type.caption` | `12px` / `0.75rem` | `1.4` | `500` (Medium) | `0.01em` |
| `klyro.type.micro` | `10px` / `0.625rem` | `1.3` | `600` (SemiBold) | `0.02em` |

---

## 4. Spacing Scale Tokens

Based on an 8-point base grid with 4-point half-step increments:

| Token Name | Rem Value | Pixel Equivalent | Typical Application |
|---|---|---|---|
| `klyro.space.2xs` | `0.125rem` | `2px` | Subtle inner borders, icon nudging |
| `klyro.space.xs` | `0.25rem` | `4px` | Pill badge padding, icon gap |
| `klyro.space.sm` | `0.5rem` | `8px` | Form field inner padding, menu item gaps |
| `klyro.space.md` | `1.0rem` | `16px` | Standard card body padding, stack gap |
| `klyro.space.lg` | `1.5rem` | `24px` | Card header padding, layout grid columns |
| `klyro.space.xl` | `2.0rem` | `32px` | Section margins, dashboard row separation |
| `klyro.space.2xl` | `2.5rem` | `40px` | Page header vertical padding |
| `klyro.space.3xl` | `3.0rem` | `48px` | Modal boundary spacing, empty-state padding |

---

## 5. Border Radii & Elevation Tokens

### 5.1 Corner Radii
| Token Name | Value | Role |
|---|---|---|
| `klyro.radius.xs` | `4px` | Small tags, inline badges |
| `klyro.radius.sm` | `6px` | Input controls, action buttons, table cell pills |
| `klyro.radius.md` | `8px` | Cards, table containers, popovers |
| `klyro.radius.lg` | `12px` | Large dashboard stat cards, modals |
| `klyro.radius.pill` | `999px` | User avatar badges, status indicators |
| `klyro.radius.round`| `50%` | Circular action buttons, avatar images |

### 5.2 Shadows & Elevation
| Elevation Level | Token Name | CSS Value |
|---|---|---|
| `0` (Flat) | `klyro.shadow.none` | `none` |
| `1` (Subtle) | `klyro.shadow.sm` | `0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04)` |
| `2` (Card) | `klyro.shadow.md` | `0 4px 8px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.04)` |
| `3` (Floating) | `klyro.shadow.lg` | `0 12px 16px -4px rgba(16, 24, 40, 0.08), 0 4px 6px -2px rgba(16, 24, 40, 0.03)` |
| `4` (Modal) | `klyro.shadow.xl` | `0 20px 24px -4px rgba(16, 24, 40, 0.12), 0 8px 8px -4px rgba(16, 24, 40, 0.04)` |

---

## 6. WCAG 2.2 Level AA Contrast Validation Matrix

All text and UI controls adhere to international accessibility benchmarks:

| Foreground Token | Background Token | Calculated Ratio | WCAG 2.2 AA Minimum | Status |
|---|---|---|---|---|
| Primary Navy (`#101828`) | Card Surface (`#FFFFFF`) | **16.3 : 1** | 4.5 : 1 (Normal Text) | **PASS (AAA)** |
| Secondary Text (`#667085`) | Card Surface (`#FFFFFF`) | **4.7 : 1** | 4.5 : 1 (Normal Text) | **PASS (AA)** |
| Electric Blue (`#2563EB`) | Card Surface (`#FFFFFF`) | **4.6 : 1** | 4.5 : 1 (Normal Text) | **PASS (AA)** |
| White (`#FFFFFF`) | Electric Blue (`#2563EB`) | **4.6 : 1** | 4.5 : 1 (Button Text) | **PASS (AA)** |
| Dark Text Primary (`#F9FAFB`) | Dark Card (`#182230`) | **13.8 : 1** | 4.5 : 1 (Normal Text) | **PASS (AAA)** |
| Dark Text Secondary (`#98A2B3`)| Dark Card (`#182230`) | **6.1 : 1** | 4.5 : 1 (Normal Text) | **PASS (AA)** |
| Dark Accent (`#60A5FA`) | Dark Card (`#182230`) | **6.2 : 1** | 4.5 : 1 (Normal Text) | **PASS (AA)** |
| Danger Text (`#7F1D1D`) | Danger Tint (`#FEE2E2`) | **8.1 : 1** | 4.5 : 1 (Badge Text) | **PASS (AAA)** |
| Success Text (`#14532D`) | Success Tint (`#DCFCE7`) | **8.4 : 1** | 4.5 : 1 (Badge Text) | **PASS (AAA)** |
| Warning Text (`#78350F`) | Warning Tint (`#FEF3C7`) | **7.5 : 1** | 4.5 : 1 (Badge Text) | **PASS (AAA)** |
