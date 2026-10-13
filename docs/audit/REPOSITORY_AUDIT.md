# KLYRO ERP — Repository Architecture Audit

**Repository:** Forkify ERP (Targeting Rebrand to Klyro ERP)  
**Date:** October 2026  
**Auditor:** Senior Software Architecture & Engineering Review  
**Target Architecture:** Modular Monolith (Spring Boot 3 + MySQL 8 + React 19 Web + React Native / Expo 52 Mobile + Next.js 16 Landing)

---

## 1. Executive Summary

The Forkify ERP codebase is designed as a multi-branch restaurant operations platform spanning recipe formulation, inventory management (raw ingredients & finished goods), procurement lifecycles (Indents → Purchase Orders → Goods Received Notes), weekly meal planning with ingredient demand forecasting, seasonal/active menu pricing, public customer-facing QR menu ordering with automatic CRM registration, daily sales logging with finished good deduction and loyalty tier calculation, staff shift scheduling, audit logging, and LLM-assisted operational analytics via Groq.

While the conceptual architecture is coherent as a modular monolith, this initial Phase 1 audit revealed critical structural gaps, logic defects, security vulnerabilities, missing API endpoints, and a total absence of automated tests prior to remediation.

---

## 2. Technology Stack & Runtime Requirements

### 2.1 Backend Runtime & Libraries
- **Language / Runtime:** Java 17 (OpenJDK 17.0.17)
- **Framework:** Spring Boot 3.1.5 (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-validation`)
- **Security & Tokens:** Spring Security 6.x (Stateless session policy, `OncePerRequestFilter`, JJWT `0.11.5`)
- **Database / ORM:** MySQL 8.0, Hibernate 6.x (Dialect `org.hibernate.dialect.MySQLDialect`), HikariCP connection pool
- **Boilerplate Reduction:** Project Lombok
- **External AI Integration:** Groq Cloud API (`llama-3.3-70b-versatile` via REST)
- **Build System:** Apache Maven 3.9.11 (`pom.xml` located in `Backend/foodManagementERP/pom.xml`)
- **Test Framework (Initial State):** Absent. `spring-boot-starter-test` was omitted from dependencies; zero tests existed in `src/test`.

### 2.2 Web Application (`Frontend/forkify-webApp`)
- **Framework:** React 19.2.3, React DOM 19.2.3
- **Toolchain:** Create React App (`react-scripts 5.0.1`)
- **State Management:** Redux 5.0.1, React-Redux 9.2.0, Redux Thunk 3.1.0
- **Routing:** React Router v7 (`react-router-dom 7.11.0`)
- **UI & Icons:** Ant Design (`antd 6.3.1`), `@ant-design/icons 6.1.0`, `lucide-react 0.562.0`
- **Styling:** SASS (`sass 1.97.1`), SCSS modular styles
- **HTTP Client:** Axios 1.13.6
- **Test Framework (Initial State):** Jest 27 via `react-scripts test`. Out-of-the-box runner failed due to React Router v7 ESM exports and missing `TextEncoder` in test environment.

### 2.3 Mobile Application (`Mobile App/ForkifyERP 2`)
- **Framework:** React Native 0.76.9, Expo SDK 52 (`~52.0.0`)
- **Navigation:** Expo Router 4.0.14 (`expo-router/entry`)
- **State Management:** Redux Toolkit 2.3.0 (`@reduxjs/toolkit`), React-Redux 9.2.0
- **Storage:** `@react-native-async-storage/async-storage 1.23.1`, `expo-secure-store ~14.0.0`
- **Gestures & Animations:** `react-native-gesture-handler ~2.20.2`, `react-native-reanimated ~3.16.1`, `react-native-safe-area-context 4.12.0`, `react-native-screens ~4.4.0`
- **HTTP Client:** Axios 1.7.9
- **Build & Distribution:** EAS (`eas.json`), Metro Bundler

### 2.4 Landing Site (`forkify-landing`)
- **Framework:** Next.js 16.2.1 (Turbopack, App Router)
- **UI:** React 19.2.4, Tailwind CSS v4 (`@tailwindcss/postcss 4`, `tailwindcss 4`)
- **TypeScript:** TypeScript 5.x

---

## 3. Architecture & Repository Topography

```
forkify-ERP/
├── Backend/foodManagementERP/         # Spring Boot 3 Modular Monolith
│   ├── src/main/java/com/fooderp/
│   │   ├── config/                   # SecurityConfig, WebConfig, AuditInterceptor
│   │   ├── controller/               # 25 REST Controllers
│   │   ├── dto/                      # Request / Response transfer objects
│   │   ├── entity/                   # 31 JPA Entities
│   │   ├── repository/               # 28 Spring Data JPA Repositories
│   │   ├── security/                 # JwtUtils, AuthTokenFilter, UserDetailsServiceImpl
│   │   └── service/                  # 10 Core Service classes
│   ├── src/main/resources/
│   │   └── application.properties    # Datasource, JWT, Hikari, Groq config
│   ├── Dockerfile                    # Container definition
│   └── pom.xml                       # Maven build configuration
│
├── Frontend/forkify-webApp/          # React 19 Single Page Application
│   ├── public/                       # HTML template and static assets
│   ├── src/
│   │   ├── components/               # Auth, Layout, Pages (50+ views), Menu, Sales
│   │   ├── hooks/                    # useBranch, usePermission
│   │   ├── services/                 # Axios API service clients
│   │   ├── store/                    # Redux store, actions, reducers
│   │   └── styles/                   # SASS mixins, variables, layout
│   └── package.json
│
├── Mobile App/ForkifyERP 2/          # Expo 52 React Native Mobile App
│   ├── app/                          # Expo Router file-based screens
│   │   ├── (auth)/                   # Authentication screens
│   │   └── (app)/                    # Protected routes, tabs, domain screens
│   ├── src/                          # Common components, hooks, services, Redux store
│   └── package.json
│
├── forkify-landing/                  # Marketing Next.js 16 site
│   ├── app/                          # App router layout and landing page
│   └── package.json
│
└── docs/audit/                       # Audit documentation and test records
```

---

## 4. Database Schema & Persistence Architecture

The database `food_erp_db` operates on MySQL 8. Hibernate schema management uses `spring.jpa.hibernate.ddl-auto=update`.

### 4.1 Primary Entity Domains (31 Entities)
1. **Organization & Staff:** `Branch`, `User`, `Role`, `Shift`
2. **Catalog & Formulation:** `Ingredient`, `Recipe`, `RecipeIngredient`, `RecipeStep`, `RecipeVersion`
3. **Inventory & Ledger:** `InventoryItem`, `FinishedGoodStock`, `StockTransaction`, `WastageRecord`, `StockTransfer`, `StockTransferItem`
4. **Procurement:** `Supplier`, `MaterialIndent`, `IndentItem`, `PurchaseOrder`, `POItem`, `GoodsReceived`, `GRNItem`
5. **Menu & Pricing:** `Menu`, `MenuItem`, `BranchMenuPrice`
6. **Sales & Customers:** `SalesEntry`, `Customer`
7. **Meal Planning:** `MealPlan`, `MealPlanItem`, `ProductionLog`
8. **Compliance & Audit:** `AuditLog`

### 4.2 Relational Integrity & Key Constraints
- Dual-ledger stock design:
  - `InventoryItem`: tracks raw ingredient levels per branch (`branch_id`, `ingredient_id` unique pair).
  - `FinishedGoodStock`: tracks finished servings per recipe per branch (`branch_id`, `recipe_id` unique pair).
  - `StockTransaction`: immutable ledger for every stock change (`STOCK_IN`, `STOCK_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `WASTAGE`, `PRODUCTION`).
- Procurement lifecycle enforces referential links:
  `MaterialIndent` (1:N `IndentItem`) -> `PurchaseOrder` (1:N `POItem`) -> `GoodsReceived` (1:N `GRNItem`).
- Menus support headquarters master definitions (`Menu.isHqMenu`) with branch-level overrides stored in `BranchMenuPrice`.

---

## 5. Security & Multi-Tenancy Architecture

### 5.1 Authentication Mechanism
- Stateless Bearer JWT tokens issued upon `/api/auth/login`.
- Tokens expire in 24 hours (`jwt.expiration=86400000`).
- Token claims include `userId`, `role`, `email`, `fullName`, and optionally `branchId` & `branchName`.
- `AuthTokenFilter` validates signature and loads `UserDetailsImpl` into `SecurityContextHolder`.

### 5.2 Authorization & Role-Based Access Control
- Roles: `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_STAFF`, `ROLE_USER`.
- Global method security enabled (`@EnableMethodSecurity(prePostEnabled = true)`).
- Public unauthenticated endpoints:
  - `/api/auth/**` (login, registration)
  - `/api/menus/public/**` (public QR menu viewer and customer order placement)
  - `/`, `/test` (health check endpoints)
  - `/api/test/**` (security smoke endpoints)

### 5.3 Tenant Boundaries
- Multitenancy is implemented via branch isolation (`branch_id` on records).
- `ROLE_ADMIN` has global visibility across all branches and can query with explicit `branchId` parameters.
- Branch staff and managers are constrained to their authenticated user's `branchId`.

---

## 6. Critical Architectural Risks & Defects Discovered

1. **Bootstrap Deadlock (`/api/admin/setup`):**
   `AdminController` exposes `/setup` for initial database bootstrapping (creating the HQ branch and first Admin). However, `SecurityConfig` lacked a permit-all rule for this endpoint, blocking unauthenticated bootstrap calls with 401 Unauthorized.

2. **Spring Boot Startup Vulnerability:**
   `application.properties` specified un-defaulted environment variable interpolations (`${GROQ_API_KEY}` and `${ALLOWED_ORIGINS}`). In environments where optional keys were absent, the application failed to boot with placeholder resolution errors.

3. **Procurement State Inconsistency:**
   When receiving goods via GRN (`ProcurementService.confirmGRN`), the system never recorded the received quantities onto `POItem.receivedQuantity`. Consequently, Purchase Orders remained stuck in `PARTIAL` status indefinitely.

4. **Entity Duplication on Update:**
   In `RecipeService.updateRecipe` and `MenuService.update`, deleting child repository entities while parent JPA entities retained in-memory child collections caused Hibernate to cascade re-persist old entities alongside newly added ones.

5. **Missing Backend API Contracts (Reports):**
   Mobile App features depended on `/api/reports/{inventory,cost,wastage,sales,branches,supplier}`, but no `ReportController` existed in the backend.

6. **Mobile App Navigation Infinite Loop:**
   `Mobile App/ForkifyERP 2/app/(app)/reports/inventory.js` contained a redirect targeting itself, triggering immediate stack overflow / render freeze in Expo.

7. **Vulnerable Stock Transfer Cancellation:**
   Cancelling an already-dispatched stock transfer failed to restore deducted stock to the origin branch, leading to inventory leakage.

8. **Hardcoded User Enablement Check:**
   `UserDetailsImpl.isEnabled()` was hardcoded to `return true;`, preventing administrative user deactivation from terminating or blocking user sessions.

---

## 7. Recommended Remediation Order

1. **Security & Startup Resilience:** Fix `SecurityConfig` and `application.properties` default placeholders. Wire real account enablement status to `UserDetailsImpl`.
2. **Database Integrity & Business Calculations:** Fix `RecipeService` collection orphan handling, `ProcurementService` PO received quantities, and `StockTransfer` cancellation rollback.
3. **API Contract Completion:** Implement backend `ReportController` to satisfy mobile and web reporting contracts.
4. **Mobile Navigation Repair:** Eliminate infinite redirect loop in mobile reports routing.
5. **Testing Infrastructure:** Establish JUnit 5 test harness for the backend and Jest/RTL test harness for the frontend.
