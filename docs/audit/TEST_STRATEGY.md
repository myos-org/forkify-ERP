# KLYRO ERP — Automated Testing Strategy

This document establishes the comprehensive automated testing architecture and quality gates for Klyro ERP across backend services, web applications, and mobile clients.

---

## 1. Testing Philosophy & Non-Negotiable Rules

1. **Test Real Behavior:** Never mock away core business logic, calculations, or database state transitions being tested.
2. **Never Disable Failing Tests:** Assertions must be maintained and strengthened, never relaxed to achieve green builds.
3. **Reproducible Test Environment:** All tests run against disposable, in-memory configurations (e.g. H2 in MySQL mode) or dedicated test databases without modifying production data.
4. **Fast Feedback in CI/CD:** Test suites must execute within seconds during pull requests to maintain rapid engineering velocity.
5. **Clear Separation of Test Types:** Maintain unit, integration, contract, and end-to-end regression layers.

---

## 2. Test Architecture & Pyramids

```
         / \
        / E2E \          Browser & Mobile Cross-Stack Workflows
       /-------\
      / Integration \     Spring MockMvc, H2 DB, Web Component RTL Tests
     /---------------\
    /   Unit Tests    \   Business Rules, Calculations, Reducers, Validation
   /-------------------\
```

### Layer 1: Backend Testing (Java 17 / JUnit 5 / Spring Boot Test)
- **Unit & Service Layer Tests:**
  - Calculations: Recipe cost per serving, nutritional totals, margin percentages, gross profits.
  - State Transitions: Indent -> PO -> GRN -> Finished Good; Stock Transfer dispatch/receive/cancel.
  - Access Rules: Branch isolation, HQ-owned recipe immutability, role-based operations.
- **Integration & Web Layer Tests (`MockMvc`):**
  - Authentication: Sign-in, token issuance, account deactivation, bootstrap endpoint.
  - Query Contracts: Pagination, sorting, date-range filters, report schemas.
  - Concurrency & Constraints: Duplicate key prevention, insufficient stock rejections.
- **Test Configuration:**
  - `src/test/resources/application.properties` configuring H2 in MySQL compatibility mode (`MODE=MySQL;DB_CLOSE_DELAY=-1`).

### Layer 2: Web Frontend Testing (React 19 / Jest 27 / React Testing Library)
- **Core Verification:**
  - Application mounting with Redux Store, Helmet Provider, and React Router.
  - Role-based route guards (`RoleRoute`, `AppRoutes`).
  - Form validation: Login, recipe creation, purchase orders, inventory adjustments.
  - State updates following API mutations (AntD tables and custom state).
- **Environment:**
  - Custom polyfills in `setupTests.js` (`TextEncoder`, `TextDecoder`, `window.matchMedia`).
  - CJS module aliasing in `package.json` for Axios and React Router.

### Layer 3: Mobile Frontend Verification (Expo 52 / React Native)
- **Core Verification:**
  - API client service contract alignment (`src/services/index.js` matching backend endpoints).
  - Navigation route integrity in Expo Router (`app/(app)/**`).
  - Screen lifecycle, safe-area wrapping, and keyboard handling.
  - Elimination of recursive redirect loops.

---

## 3. Critical Workflow Acceptance Matrix

| Workflow ID | Business Flow | Expected Outcome | Test Implementation |
| :--- | :--- | :--- | :--- |
| **WF-01** | Initial Bootstrap | Unauthenticated setup creates HQ and Admin; subsequent attempts fail | `AuthControllerIntegrationTest.testUnauthenticatedAdminSetupBootstrapAllowed` |
| **WF-02** | Account Suspension | Deactivated user receives HTTP 401 on login | `AuthControllerIntegrationTest.testDisabledUserCannotLogin` |
| **WF-03** | Indent -> PO -> GRN | Indent converts to PO; GRN increments stock and sets PO to RECEIVED | `ProcurementServiceTest.testGRNReceiptAndPOStatusTransition` |
| **WF-04** | Recipe Mutation | Editing recipe clears and resets child collections without duplicates | `RecipeServiceTest.testUpdateRecipePreventsDuplicateIngredients` |
| **WF-05** | Stock Transfer Dispatch | Rejects if source stock < requested; deducts stock upon dispatch | `StockTransferIntegrationTest.testDispatchRejectsWhenStockInsufficient` |
| **WF-06** | Stock Transfer Cancel | Dispatched transfer cancelled refunds inventory to source branch | `StockTransferIntegrationTest.testDispatchAndCancelRestoresSourceStock` |
| **WF-07** | Reporting Aggregations | All 6 reporting endpoints return expected metrics and HTTP 200 | `ReportControllerIntegrationTest` |

---

## 4. CI/CD Quality Gates

Every pull request must pass the automated pipeline defined in `.github/workflows/ci.yml`:
1. `mvn compile test-compile` passes with zero compiler warnings/errors.
2. `mvn test` executes with 100% pass rate.
3. `CI=true npm test` passes in `Frontend/forkify-webApp`.
4. `npm run build` succeeds for web and landing applications.
5. Docker Compose configuration is validated.
