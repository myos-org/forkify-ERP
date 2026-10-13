# Klyro ERP — Rebrand Migration & Architectural Preservation Guide

## 1. Migration Overview

This document records the systematic rebranding of the platform from **Forkify ERP** to **Klyro ERP**, detailing the translation of visual assets, design tokens, and user interfaces while explicitly preserving technical compatibility boundaries.

### 1.1 Core Principles
1. **Zero Downtime / Zero Regressions:** No user data, active sessions, or operational workflows were broken.
2. **Preserved Technical Identifiers:** Internal package identifiers, database schemas, foreign keys, API routes, and mobile application bundle IDs were maintained to ensure binary compatibility and prevent migration failures.
3. **Comprehensive User-Facing Rebrand:** Every user-facing screen, modal, navigation header, document title, meta tag, favicon, splash screen, and notification was updated to the Klyro visual identity.

---

## 2. Design Token & Asset Migration Mapping

### 2.1 Color Token Migration
| Legacy Forkify Token / Value | Klyro Canonical Token | Klyro Value | Design & Rationale |
|---|---|---|---|
| `#ff6b6b` (Coral Red) | `klyro.brand.navy` | `#101828` | Replaced decorative consumer red with enterprise Midnight Navy |
| `#ffa502` (Orange) | `klyro.brand.blue` | `#2563EB` | Shifted to accessible Electric Blue for high visual focus |
| `#2ed573` (Green) | `klyro.semantic.success` | `#16A34A` | Standardized to accessible WCAG AA green |
| `#ff4757` (Red) | `klyro.semantic.error` | `#DC2626` | Standardized to accessible WCAG AA danger red |
| `#f1f2f6` (Light Gray) | `klyro.color.bg.canvas` | `#F8FAFC` | Calibrated Slate 50 canvas for reduced eye fatigue |
| `#2f3542` (Dark Slate) | `klyro.brand.navy` | `#101828` | Unified dark neutrals into single Midnight Navy scale |
| Arbitrary inline borders | `klyro.color.border.default` | `#E4E7EC` | Centralized 1px subtle boundary token |

### 2.2 Asset Migration Mapping
| Legacy Asset / Path | Klyro Asset File | Deployed Locations |
|---|---|---|
| Generic fork/plate icons | `klyro-symbol.svg` | `Frontend/.../public/brand/klyro-symbol.svg`<br>`Mobile App/.../assets/brand/klyro-symbol.svg`<br>`forkify-landing/.../public/brand/klyro-symbol.svg` |
| "Forkify ERP" raster text | `klyro-logo-horizontal.svg` | Web sidebar, auth lockup, invoice templates |
| Inverted text PNGs | `klyro-logo-dark.svg` | Web dark mode header, mobile dark drawer |
| Legacy app icon | `klyro-app-icon.svg` | Android adaptive icon, iOS asset catalog, PWA manifest |
| Default React favicon | `klyro-favicon.svg` | `public/brand/klyro-favicon.svg`, `public/favicon.ico` |

---

## 3. Preserved Technical Identifiers

To guarantee 100% backward compatibility and eliminate binary breakages across distributed environments, the following technical identifiers were **deliberately preserved**:

### 3.1 Backend Application (`foodManagementERP`)
- **Package Hierarchy:** `com.fooderp.*` (controllers, entities, repositories, services, security filters).
  - *Rationale:* Refactoring Java package namespaces breaks JPA `@EntityScan`, Spring Bean definitions, and serialized session tokens.
- **Database Table Names:** `users`, `roles`, `recipes`, `ingredients`, `purchase_orders`, `po_items`, `stock_transfers`, `wastage_records`, `production_logs`.
  - *Rationale:* Changing table names triggers destructive DDL schema migrations, invalidates existing production backups, and risks catastrophic data loss.
- **API Endpoints:** `/api/auth/**`, `/api/inventory/**`, `/api/procurement/**`, `/api/recipes/**`, `/api/reports/**`.
  - *Rationale:* Mobile native binaries already deployed in the field and third-party webhook integrations rely on stable URI paths.
- **Environment Variables:** `JWT_SECRET`, `GROQ_API_KEY`, `SPRING_DATASOURCE_URL`.
  - *Rationale:* Existing infrastructure secrets in Docker Compose and Kubernetes secrets manifests remain valid.

### 3.2 Mobile Application (`ForkifyERP 2`)
- **Android Package Name:** `com.forkify.erp`
  - *Rationale:* Changing the Android package name creates a brand-new application listing on Google Play Console, disconnecting existing store installs and preventing automated updates.
- **iOS Bundle Identifier:** `com.forkify.erp`
  - *Rationale:* Preserves Apple App Store Connect provisioning profiles and push notification certificates.
- **App Display Name:** Rebranded to **Klyro ERP** in `app.json` (`name: "Klyro ERP"`, `slug: "klyro-erp"`).

---

## 4. Rebrand Implementation Audit Checklist

| Component / Layer | File / Location | Rebrand Action Taken | Verification Status |
|---|---|---|---|
| **Vector Assets** | `docs/branding/assets/` | Created 5 production SVG vector marks | **VERIFIED** |
| **Web Tokens** | `Frontend/forkify-webApp/src/styles/abstracts/_variables.scss` | Configured Midnight Navy & Electric Blue tokens | **VERIFIED** |
| **Web Tokens** | `Frontend/forkify-webApp/src/styles/abstracts/_erp-tokens.scss` | Standardized ERP surface, border & dark tokens | **VERIFIED** |
| **Web Sidebar** | `Frontend/forkify-webApp/src/styles/layout/_sidebar.scss` | Styled to Midnight Navy background with blue accents | **VERIFIED** |
| **Web Shell** | `Frontend/forkify-webApp/public/index.html` | Updated document title to "Klyro ERP", meta description, and SVG favicons | **VERIFIED** |
| **Web Manifest** | `Frontend/forkify-webApp/public/manifest.json` | Updated name to "Klyro ERP" and app icon paths | **VERIFIED** |
| **Web Header** | `src/components/Layout/FoodERPHeader.js` | Embedded `klyro-symbol.svg` and Klyro brand typography | **VERIFIED** |
| **Web Sidebar Nav** | `src/components/Layout/FoodERPSidebar.js` | Updated brand lockup and sidebar headers to Klyro | **VERIFIED** |
| **Web Auth Modal** | `src/components/Auth/AuthModal.js` | Rebranded modal header to "Klyro ERP" | **VERIFIED** |
| **Web Login Screen** | `src/components/Auth/Login.js` | Rebranded subtitle, credentials demo box, and form branding | **VERIFIED** |
| **Web QR Menu** | `src/components/Pages/Menu/QRMenuPage.js` | Rebranded customer-facing footer to "Powered by Klyro ERP" | **VERIFIED** |
| **Web AI Assistant**| `src/components/AI/AICalorieAssistant.js` | Rebranded header to "Klyro AI Assistant" | **VERIFIED** |
| **Mobile Config** | `Mobile App/ForkifyERP 2/app.json` | Rebranded app name to "Klyro ERP", slug to "klyro-erp", splash/bg to `#101828` | **VERIFIED** |
| **Mobile Theme** | `Mobile App/ForkifyERP 2/src/theme/index.js` | Injected Midnight Navy & Electric Blue token palette | **VERIFIED** |
| **Landing Hero** | `forkify-landing/app/page.tsx` | Rebranded header, hero copy, features, CTA, and footer to Klyro | **VERIFIED** |
| **Landing Meta** | `forkify-landing/app/layout.tsx` | Updated page metadata, title, and open-graph tags to Klyro ERP | **VERIFIED** |
| **Dev Environment**| `docker-compose.yml` | Configured full stack: MySQL, Redis, Kafka, and Klyro Backend | **VERIFIED** |
| **CI/CD Pipeline** | `.github/workflows/ci.yml` | Multi-job automated build, test & packaging workflow | **VERIFIED** |
