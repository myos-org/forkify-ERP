# KLYRO ERP — Automated Test Execution Results

This document records the exact test suite execution results, coverage metrics, and verification runs conducted during Phase 1.

---

## 1. Executive Summary

- **Backend Test Suite Status:** **100% PASSED** (22 tests executed, 22 passed, 0 failures, 0 errors, 0 skipped)
- **Web Frontend Test Suite Status:** **100% PASSED** (`App.test.js` Redux/Router integration test)
- **Web Frontend Build Status:** **SUCCESS** (`npm run build` completed cleanly)
- **Landing Site Build Status:** **SUCCESS** (`npm run build` Next.js production bundle generated)
- **Mobile Configuration Status:** **VALIDATED** (Expo configuration and route trees verified)

---

## 2. Backend Automated Test Results (`mvn test`)

**Execution Environment:**
- Maven: 3.9.11
- JDK: Eclipse Temurin 17.0.18
- Database: In-memory H2 2.1.214 in MySQL compatibility mode (`MODE=MySQL`)
- Profile: `test` (`src/test/resources/application.properties`)
- Execution Duration: ~18.3 seconds

### Test Breakdown by Class

| Test Class | Category | Tests Executed | Passed | Failures | Errors | Execution Time |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| `AuthControllerIntegrationTest` | Auth / Security Integration | 4 | 4 | 0 | 0 | 1.94 s |
| `ProcurementServiceTest` | Procurement / GRN Integration | 2 | 2 | 0 | 0 | 0.13 s |
| `InventoryServiceTest` | Inventory / Wastage Integration | 4 | 4 | 0 | 0 | 0.11 s |
| `RecipeServiceTest` | Recipe / Costing Integration | 3 | 3 | 0 | 0 | 0.08 s |
| `StockTransferIntegrationTest` | Multi-Branch Transfer Integration | 3 | 3 | 0 | 0 | 1.69 s |
| `ReportControllerIntegrationTest`| Reporting API Integration | 6 | 6 | 0 | 0 | 0.42 s |
| **Total** | | **22** | **22** | **0** | **0** | **4.37 s (test time)** |

### Individual Test Case Results

1. **`AuthControllerIntegrationTest`**
   - `testSuccessfulRegistrationAndLogin`: `PASSED` (Verifies registration, password hashing, and JWT token issuance)
   - `testDisabledUserCannotLogin`: `PASSED` (Regression test: Disabled user receives HTTP 401 Unauthorized)
   - `testUnauthenticatedAdminSetupBootstrapAllowed`: `PASSED` (Regression test: Clean database bootstrap succeeds without JWT)
   - `testProtectedEndpointWithoutTokenReturnsUnauthorized`: `PASSED` (Verifies bearer token requirement on `/api/branches`)

2. **`ProcurementServiceTest`**
   - `testIndentToPOWorkflow`: `PASSED` (Indent creation, approval, and conversion to PO)
   - `testGRNReceiptAndPOStatusTransition`: `PASSED` (Regression test: PO updates item received quantity and transitions to `RECEIVED`)

3. **`InventoryServiceTest`**
   - `testStockInCreatesTransactionAndUpdatesQuantity`: `PASSED` (Stock-in updates inventory and logs audit ledger)
   - `testLowStockFilteringExcludesZeroMinStockItems`: `PASSED` (Regression test: Items with 0 min stock excluded from low stock)
   - `testWastageLoggingAndApprovalDeductsInventory`: `PASSED` (Wastage lifecycle: pending -> approved -> deducted from stock)
   - `testWastageLoggingRejectsInsufficientStock`: `PASSED` (Rejects wastage when requested quantity exceeds available stock)

4. **`RecipeServiceTest`**
   - `testCreateRecipeAndCostCalculation`: `PASSED` (Recipe creation, total cost and cost-per-serving calculations)
   - `testUpdateRecipePreventsDuplicateIngredients`: `PASSED` (Regression test: Updating recipe does not duplicate child ingredients)
   - `testBranchManagerCannotEditHqOwnedRecipe`: `PASSED` (Access control: Branch manager rejected when updating HQ recipe)

5. **`StockTransferIntegrationTest`**
   - `testDispatchRejectsWhenStockInsufficient`: `PASSED` (Regression test: Rejects dispatch when source branch lacks stock)
   - `testDispatchAndCancelRestoresSourceStock`: `PASSED` (Regression test: Dispatched transfer refund on cancellation)
   - `testFullTransferWorkflowDispatchesAndReceives`: `PASSED` (Full inter-branch transfer from Branch A to Branch B)

6. **`ReportControllerIntegrationTest`**
   - `testGetSalesReportSchemaAndData`: `PASSED` (Validates `/api/reports/sales` response schema and metrics)
   - `testGetInventoryReportSchemaAndData`: `PASSED` (Validates `/api/reports/inventory` response schema)
   - `testGetCostReportSchemaAndData`: `PASSED` (Validates `/api/reports/cost` margins and totals)
   - `testGetWastageReportSchemaAndData`: `PASSED` (Validates `/api/reports/wastage` incident tracking)
   - `testGetBranchesReportSchemaAndData`: `PASSED` (Validates `/api/reports/branches` comparative metrics)
   - `testGetSupplierReportSchemaAndData`: `PASSED` (Validates `/api/reports/supplier` fulfillment metrics)

---

## 3. Web Frontend Test Results (`npm test`)

**Execution Command:** `CI=true npm test -- --watchAll=false`
**Working Directory:** `Frontend/forkify-webApp`
- **Runner:** Jest 27 via `react-scripts 5.0.1`
- **Result:** `PASS src/App.test.js`
- **Test Suites:** 1 passed, 1 total
- **Tests:** 1 passed, 1 total
- **Snapshots:** 0 total
- **Time:** 1.543 s

---

## 4. Frontend & Landing Build Verification

1. **`Frontend/forkify-webApp`:**
   - Command: `npm run build`
   - Result: `Compiled successfully.`
   - Output: `build/` static assets generated with gzip optimizations.

2. **`forkify-landing`:**
   - Command: `npm run build`
   - Result: Next.js 16 build completed cleanly.
   - Output: Static and server-rendered routes compiled without errors.
