# KLYRO ERP — Bugs, Root Causes, and Repairs Log

This document catalogs all defects, security vulnerabilities, business logic errors, and integration mismatches identified during the Phase 1 repository audit, along with their root causes, remediations, and automated regression tests.

---

## 1. Summary of Repaired Defects

| Bug ID | Severity | Category | Component / File | Root Cause | Status | Regression Test |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-001** | **Critical** | Security / Auth | `AdminController.java`, `SecurityConfig.java` | `/api/admin/setup` required ADMIN role, causing bootstrap deadlock on clean DB | **Fixed** | `AuthControllerIntegrationTest.testUnauthenticatedAdminSetupBootstrapAllowed` |
| **BUG-002** | **Critical** | Security / Access | `UserDetailsImpl.java` | `isEnabled()` hardcoded to return `true`; disabled accounts could still log in | **Fixed** | `AuthControllerIntegrationTest.testDisabledUserCannotLogin` |
| **BUG-003** | **High** | Procurement / Inventory | `ProcurementService.java` | `POItem.receivedQuantity` never updated during GRN confirmation; PO stuck in `PARTIAL` | **Fixed** | `ProcurementServiceTest.testGRNReceiptAndPOStatusTransition` |
| **BUG-004** | **High** | Recipe / Data Integrity | `RecipeService.java` | JPA cascade re-persisted orphaned items on collection update, duplicating ingredients | **Fixed** | `RecipeServiceTest.testUpdateRecipePreventsDuplicateIngredients` |
| **BUG-005** | **High** | Menu / Data Integrity | `MenuService.java` | In-memory `menu.getItems()` collection held stale items while deleting from repo | **Fixed** | Tested in menu update |
| **BUG-006** | **High** | Inventory / Stock Transfer | `StockTransferController.java` | Dispatch had no stock sufficiency validation; deducted negative quantities silently | **Fixed** | `StockTransferIntegrationTest.testDispatchRejectsWhenStockInsufficient` |
| **BUG-007** | **High** | Inventory / Stock Transfer | `StockTransferController.java` | Cancelling `DISPATCHED` transfer did not refund deducted stock back to source branch | **Fixed** | `StockTransferIntegrationTest.testDispatchAndCancelRestoresSourceStock` |
| **BUG-008** | **Medium** | Recipe Versions | `RecipeVersionController.java` | Version restore skipped ingredients array stored in JSON snapshot | **Fixed** | Restored ingredient parsing |
| **BUG-009** | **High** | Mobile / Reports | `ReportController.java` (Backend) | Mobile app requested `/api/reports/{inventory,cost,wastage,sales,branches,supplier}`, but backend controller was missing (HTTP 404) | **Fixed** | `ReportControllerIntegrationTest` (All 6 endpoints) |
| **BUG-010** | **High** | Mobile UX / Router | `reports/inventory.js` (Mobile) | Screen redirected to `/(app)/reports/inventory` inside itself, causing infinite loop | **Fixed** | Directly renders `ReportScreen` with parameter |
| **BUG-011** | **Medium** | Frontend / Test Runner | `package.json`, `setupTests.js` (Web) | Jest 27 failed to resolve Axios ESM exports and lacked `TextEncoder` / `matchMedia` polyfills | **Fixed** | `CI=true npm test` succeeds |
| **BUG-012** | **Medium** | Inventory / Query Logic | `InventoryItemRepository.java` | Unconfigured items (`minStockLevel = 0`) flagged as low stock | **Fixed** | `InventoryServiceTest.testLowStockFilteringExcludesZeroMinStockItems` |

---

## 2. Detailed Bug Reports

### BUG-001: Bootstrap Deadlock on Clean Database
- **Impact:** System initialization deadlock. A new deployment could not set up the initial HQ branch and super-administrator without manually inserting records into MySQL.
- **Root Cause:** `SecurityConfig.java` protected all `/api/admin/**` endpoints with `.hasRole("ADMIN")`. However, `POST /api/admin/setup` was designed to be run only when no administrator exists.
- **Fix:** Added `.requestMatchers("/api/admin/setup").permitAll()` to `SecurityConfig.java` before the general `/api/admin/**` rule.
- **Regression Test:** `AuthControllerIntegrationTest.testUnauthenticatedAdminSetupBootstrapAllowed` executes `POST /api/admin/setup` without a bearer token and asserts HTTP 200 on initial setup and HTTP 400 on subsequent invocation.

### BUG-002: User Account Deactivation Bypass
- **Impact:** Security vulnerability. When an administrator deactivated a user via `DELETE /api/admin/users/{id}`, the user could still successfully log in and obtain JWT access tokens.
- **Root Cause:** In `UserDetailsImpl.java`, `@Override public boolean isEnabled()` returned `true` unconditionally, ignoring `user.isEnabled()`.
- **Fix:** Added `private boolean enabled;` field populated from `user.isEnabled()` and returned via `isEnabled()`.
- **Regression Test:** `AuthControllerIntegrationTest.testDisabledUserCannotLogin` creates a user with `enabled = false` and verifies login attempt returns HTTP 401 Unauthorized.

### BUG-003: Purchase Order Status Stuck in `PARTIAL`
- **Impact:** Core ERP procurement workflow blockage. Purchase orders could never transition to `RECEIVED`, leaving open procurement balances and inconsistent accounting.
- **Root Cause:** In `ProcurementService.java:confirmGRN()`, the logic checked whether all PO items satisfied `receivedQuantity >= quantity`. However, `POItem.receivedQuantity` was never updated when GRN items were received.
- **Fix:** Updated `confirmGRN()` to increment `POItem.receivedQuantity` for each received line item before evaluating PO completion.
- **Regression Test:** `ProcurementServiceTest.testGRNReceiptAndPOStatusTransition` executes a partial receipt (verifying `POStatus.PARTIAL`) followed by the remaining receipt (verifying `POStatus.RECEIVED`).

### BUG-004: Child Entity Duplication on JPA Collection Cascade
- **Impact:** Data corruption. Editing a recipe caused recipe ingredients and cooking steps to duplicate on every save.
- **Root Cause:** In `RecipeService.java:updateRecipe()`, `riRepo.deleteByRecipeId(id)` deleted rows from the database, but Hibernate's persistent entity in memory still held references in `recipe.getIngredients()`. Calling `recipeRepo.save(recipe)` caused Hibernate cascade to re-persist the deleted items alongside new ones.
- **Fix:** Explicitly cleared `recipe.getIngredients().clear()` and `recipe.getSteps().clear()` before persisting updates.
- **Regression Test:** `RecipeServiceTest.testUpdateRecipePreventsDuplicateIngredients` updates a recipe with new ingredients and asserts that the count strictly equals the updated list size.

### BUG-005: Menu Item Duplication on Update
- **Impact:** Updating a menu caused stale or duplicated menu items to persist in database.
- **Root Cause:** Identical to BUG-004; `Menu.items` orphan collection was not cleared prior to repository flush and re-saving.
- **Fix:** Added `menu.getItems().clear()`, `menuItemRepo.deleteAll(...)`, and `menuRepo.flush()` in `MenuService.java:update()`.

### BUG-006 & BUG-007: Stock Transfer Concurrency and Cancellation Leak
- **Impact:** Inventory ledger discrepancy. Dispatches did not verify that the source branch possessed sufficient stock, allowing stock to go negative. Furthermore, cancelling a dispatched transfer deleted the transfer without refunding the deducted inventory back to the source branch.
- **Root Cause:** `StockTransferController.java:dispatch()` used `Math.max(0, current - qty)` without pre-validation. `cancel()` simply marked status as `CANCELLED` without restoring stock.
- **Fix:** Added upfront stock sufficiency validation across all transfer items before dispatching. Added stock refund and `TRANSFER_IN` audit transaction generation upon cancelling a dispatched transfer.
- **Regression Test:** `StockTransferIntegrationTest.testDispatchRejectsWhenStockInsufficient` and `StockTransferIntegrationTest.testDispatchAndCancelRestoresSourceStock`.

### BUG-008: Recipe Version Snapshot Restore Ingredient Amnesia
- **Impact:** Restoring a previous recipe version updated names and servings but wiped out or ignored ingredient lists.
- **Root Cause:** In `RecipeVersionController.java:restore()`, the controller parsed the JSON snapshot but only copied recipe scalar properties.
- **Fix:** Extracted `ingredients` array from snapshot JSON, looked up ingredients by ID, and repopulated `recipe.getIngredients()`.

### BUG-009: Missing Backend Report Endpoints
- **Impact:** Mobile app reports screens (Inventory, Cost, Wastage, Sales, Branches, Supplier) consistently threw HTTP 404 errors.
- **Root Cause:** `Mobile App/ForkifyERP 2/src/services/index.js` invoked `/api/reports/...`, but no `ReportController.java` existed on backend.
- **Fix:** Implemented `ReportController.java` providing all 6 report aggregation endpoints matching expected client contracts.
- **Regression Test:** `ReportControllerIntegrationTest` verifies all 6 endpoints with valid schemas, authentication, and HTTP 200 responses.

### BUG-010: Mobile App Infinite Redirect Loop
- **Impact:** Application freeze / crash when navigating to inventory reports on mobile.
- **Root Cause:** `Mobile App/ForkifyERP 2/app/(app)/reports/inventory.js` contained `<Redirect href="/(app)/reports/inventory" />`, redirecting to itself in an infinite loop.
- **Fix:** Replaced redirect with direct rendering of `ReportScreen` with parameter `type="inventory"`.

### BUG-011: Web App Test Suite Runner Failures
- **Impact:** CI/CD broken; `npm test` failed on modern Node/Jest due to ESM package exports and missing browser polyfills.
- **Root Cause:** Axios 1.7+ ESM export incompatibility with Jest 27 in CRA; missing `TextEncoder` and `window.matchMedia`.
- **Fix:** Added `moduleNameMapper` in `package.json` and polyfills in `setupTests.js`.
- **Regression Test:** `Frontend/forkify-webApp` test runner exits with code 0 on `CI=true npm test`.

### BUG-012: Zero Minimum Stock False Low-Stock Alarms
- **Impact:** Items with 0 minStockLevel (unconfigured threshold) were incorrectly treated as low stock.
- **Root Cause:** SQL query evaluated `currentQuantity < minStockLevel` without requiring `minStockLevel > 0`.
- **Fix:** Added `AND i.minStockLevel > 0` to query in `InventoryItemRepository.java`.
- **Regression Test:** `InventoryServiceTest.testLowStockFilteringExcludesZeroMinStockItems`.
