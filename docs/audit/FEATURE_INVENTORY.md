# KLYRO ERP — Feature Inventory & Workflow Map

This document establishes the authoritative inventory of all functional modules across the Forkify ERP repository, detailing frontend screens, backend endpoints, relational entities, validation rules, external dependencies, test coverage, and health status.

---

## 1. Authentication & Session Management

| Attribute | Details |
|---|---|
| **Module** | Authentication & RBAC |
| **Frontend Screens (Web)** | `/` (Login screen when unauthenticated) |
| **Frontend Screens (Mobile)** | `app/(auth)/login.js` |
| **Backend Endpoints** | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`, `POST /api/admin/setup` |
| **Services & Handlers** | `AuthController.java`, `UserDetailsServiceImpl.java`, `JwtUtils.java`, `AuthTokenFilter.java` |
| **Tables & Relationships** | `users` (M:1 `branches`) |
| **Permissions & Validation** | Public permit-all for login/register/setup; username min 3 chars; password min 6 chars; email format. |
| **External Dependencies** | JJWT (io.jsonwebtoken), BCrypt |
| **Initial Status** | Partially Working (Admin `/setup` blocked by 401; user disable did not prevent login due to hardcoded `isEnabled=true`). |

---

## 2. Organization & User Administration

| Attribute | Details |
|---|---|
| **Module** | Admin & Branches |
| **Frontend Screens (Web)** | `/fooderp/users` (`UserManagement.js`), `/fooderp/branches` (`BranchManagement.js`), `/fooderp/audit` (`AuditLogs.js`) |
| **Frontend Screens (Mobile)** | `app/(app)/admin/users.js`, `app/(app)/admin/branches.js`, `app/(app)/admin/audit.js` |
| **Backend Endpoints** | `GET /api/admin/users`, `POST /api/admin/users`, `PUT /api/admin/users/{id}`, `DELETE /api/admin/users/{id}`, `PUT /api/admin/users/{id}/enable`, `GET /api/admin/branches/summary`, `GET /api/admin/audit-logs`, `GET /api/branches`, `POST /api/branches`, `PUT /api/branches/{id}`, `DELETE /api/branches/{id}` |
| **Services & Handlers** | `AdminController.java`, `BranchController.java`, `AuditService.java`, `AuditInterceptor.java` |
| **Tables & Relationships** | `users`, `branches`, `audit_logs` |
| **Permissions & Validation** | `ROLE_ADMIN` required for admin management endpoints; unique branch names; branch soft deletion. |
| **Initial Status** | Partially Working (Audit interceptor functional; disabling user did not block auth). |

---

## 3. Recipe Formulation & Versioning

| Attribute | Details |
|---|---|
| **Module** | Recipes, Ingredients, Versioning & Allergens |
| **Frontend Screens (Web)** | `/fooderp/recipes/list` (`RecipeList.js`), `/fooderp/recipes/add` & `/:id/edit` (`AddEditRecipe.js`), `/fooderp/recipes/:id` (`RecipeDetail.js`), `/fooderp/recipes/:id/versions` (`RecipeVersionHistory.js`), `/fooderp/recipes/nutrition` (`RecipeNutrition.js`), `/fooderp/recipes/allergens` (`AllergenMatrix.js`), `/fooderp/recipes/ingredients` (`IngredientList.js`) |
| **Frontend Screens (Mobile)** | `app/(app)/(tabs)/recipes.js`, `app/(app)/recipes/detail.js`, `app/(app)/recipes/add-edit.js`, `app/(app)/recipes/versions.js`, `app/(app)/recipes/allergens.js`, `app/(app)/recipes/ingredients.js`, `app/(app)/recipes/nutrition.js` |
| **Backend Endpoints** | `GET /api/recipes`, `GET /api/recipes/{id}`, `POST /api/recipes`, `PUT /api/recipes/{id}`, `DELETE /api/recipes/{id}`, `GET /api/recipes/{id}/cost`, `GET /api/recipes/{id}/steps`, `POST /api/recipes/{id}/steps`, `DELETE /api/recipes/{id}/steps`, `GET /api/ingredients`, `POST /api/ingredients`, `PUT /api/ingredients/{id}`, `DELETE /api/ingredients/{id}`, `GET /api/recipe-versions/{recipeId}`, `POST /api/recipe-versions/{recipeId}/snapshot`, `PUT /api/recipe-versions/{recipeId}/restore/{version}`, `GET /api/allergens/matrix`, `GET /api/allergens/list`, `GET /api/allergens/recipe/{id}` |
| **Services & Handlers** | `RecipeService.java`, `RecipeController.java`, `IngredientController.java`, `RecipeVersionController.java`, `AllergenController.java` |
| **Tables & Relationships** | `recipes` (1:N `recipe_ingredients`, 1:N `recipe_steps`, 1:N `recipe_versions`), `ingredients` |
| **Permissions & Validation** | `ROLE_ADMIN` / `ROLE_MANAGER`; branch users can only edit their own branch recipes; HQ recipes are read-only to branch users. |
| **Initial Status** | Partially Working / Broken (Recipe update re-duplicated ingredients and steps due to JPA cascade flush; version restore failed to restore ingredients). |

---

## 4. Inventory, Stock Movement & Wastage

| Attribute | Details |
|---|---|
| **Module** | Raw Materials, Finished Goods, Stock In/Out, Transfers & Wastage |
| **Frontend Screens (Web)** | `/fooderp/inventory/raw-materials`, `/fooderp/inventory/finished-goods`, `/fooderp/inventory/stock-in`, `/fooderp/inventory/stock-out`, `/fooderp/inventory/wastage`, `/fooderp/inventory/transfers` |
| **Frontend Screens (Mobile)** | `app/(app)/(tabs)/inventory.js`, `app/(app)/inventory/raw-materials.js`, `app/(app)/inventory/finished-goods.js`, `app/(app)/inventory/stock-in.js`, `app/(app)/inventory/stock-out.js`, `app/(app)/inventory/wastage.js`, `app/(app)/inventory/transfers.js` |
| **Backend Endpoints** | `GET /api/inventory/summary`, `GET /api/inventory`, `GET /api/inventory/low-stock`, `GET /api/inventory/expiring`, `POST /api/inventory`, `POST /api/inventory/stock-in`, `GET /api/inventory/transactions`, `POST /api/inventory/wastage`, `GET /api/inventory/wastage`, `PUT /api/inventory/wastage/{id}/approve`, `PUT /api/inventory/wastage/{id}/reject`, `GET /api/transfers`, `POST /api/transfers`, `PUT /api/transfers/{id}/approve`, `PUT /api/transfers/{id}/dispatch`, `PUT /api/transfers/{id}/receive`, `PUT /api/transfers/{id}/cancel` |
| **Services & Handlers** | `InventoryService.java`, `InventoryController.java`, `StockTransferController.java` |
| **Tables & Relationships** | `inventory_items`, `finished_good_stock`, `stock_transactions`, `wastage_records`, `stock_transfers` (1:N `stock_transfer_items`) |
| **Permissions & Validation** | Low-stock calculation (`currentQty < minStockLevel`); double wastage pathways (ingredient & finished goods); transfer state machine: PENDING → APPROVED → DISPATCHED → RECEIVED. |
| **Initial Status** | Broken (Transfer cancellation on DISPATCHED transfers caused inventory leakage without refund; dispatch lacked stock sufficiency validation). |

---

## 5. Production & Finished Goods Conversion

| Attribute | Details |
|---|---|
| **Module** | Production Execution |
| **Frontend Screens (Web)** | `/fooderp/recipes/:id/produce` (`LogProduction.js`), modal in `DailySales.js` |
| **Frontend Screens (Mobile)** | `app/(app)/recipes/log-production.js` |
| **Backend Endpoints** | `GET /api/production/preview`, `POST /api/production`, `GET /api/production`, `GET /api/production/stock` |
| **Services & Handlers** | `ProductionService.java`, `ProductionController.java` |
| **Tables & Relationships** | `production_logs`, `finished_good_stock`, `stock_transactions`, `inventory_items` |
| **Permissions & Validation** | Checks ingredient stock availability before deducting; scales ingredient requirements proportionally by target servings; generates `STOCK_OUT` ledger entries; credits `FinishedGoodStock`. |
| **Initial Status** | Working. |

---

## 6. Procurement & Vendor Supply Chain

| Attribute | Details |
|---|---|
| **Module** | Indents, Purchase Orders, Suppliers & GRN |
| **Frontend Screens (Web)** | `/fooderp/procurement/indent`, `/fooderp/procurement/orders`, `/fooderp/procurement/suppliers`, `/fooderp/procurement/grn`, `/fooderp/procurement/vendors` |
| **Frontend Screens (Mobile)** | `app/(app)/(tabs)/procurement.js`, `app/(app)/procurement/indent.js`, `app/(app)/procurement/orders.js`, `app/(app)/procurement/suppliers.js`, `app/(app)/procurement/grn.js`, `app/(app)/procurement/vendors.js` |
| **Backend Endpoints** | `GET /api/suppliers`, `POST /api/suppliers`, `PUT /api/suppliers/{id}`, `DELETE /api/suppliers/{id}`, `GET /api/suppliers/approved`, `PUT /api/suppliers/{id}/approve`, `GET /api/indents`, `POST /api/indents`, `PUT /api/indents/{id}/approve`, `PUT /api/indents/{id}/reject`, `POST /api/indents/{id}/convert-to-po`, `GET /api/purchase-orders`, `GET /api/purchase-orders/{id}`, `POST /api/purchase-orders`, `PUT /api/purchase-orders/{id}/status`, `GET /api/grn`, `POST /api/grn`, `PUT /api/grn/{id}/confirm` |
| **Services & Handlers** | `ProcurementService.java`, `IndentController.java`, `PurchaseOrderController.java`, `SupplierController.java`, `GRNController.java` |
| **Tables & Relationships** | `suppliers`, `material_indents` (1:N `indent_items`), `purchase_orders` (1:N `po_items`), `goods_received` (1:N `grn_items`) |
| **Permissions & Validation** | Non-admin branch users restricted to approved or branch vendors; GRN confirmation triggers automated Stock-In transaction and updates inventory. |
| **Initial Status** | Broken (PO status was stuck on `PARTIAL` because `confirmGRN` did not update `POItem.receivedQuantity`). |

---

## 7. Menu Planning & Ingredient Forecasting

| Attribute | Details |
|---|---|
| **Module** | Meal Planning |
| **Frontend Screens (Web)** | `/fooderp/meal-planning/weekly`, `/fooderp/meal-planning/forecast`, `/fooderp/meal-planning/push` |
| **Frontend Screens (Mobile)** | `app/(app)/meal-planning/weekly.js`, `app/(app)/meal-planning/forecast.js`, `app/(app)/meal-planning/push.js` |
| **Backend Endpoints** | `GET /api/meal-plans`, `GET /api/meal-plans/{id}`, `POST /api/meal-plans`, `PUT /api/meal-plans/{id}`, `DELETE /api/meal-plans/{id}`, `POST /api/meal-plans/{id}/push-to-branches`, `GET /api/meal-plans/{id}/forecast`, `GET /api/meal-plans/{id}/shortage`, `GET /api/meal-plans/{id}/shopping-list` |
| **Services & Handlers** | `MealPlanService.java`, `MealPlanController.java` |
| **Tables & Relationships** | `meal_plans` (1:N `meal_plan_items`) |
| **Permissions & Validation** | Week number (1-52), year; HQ template pushing to branch copies; ingredient shortage calculation against current stock. |
| **Initial Status** | Working. |

---

## 8. Menu Management & Public QR Menu Ordering

| Attribute | Details |
|---|---|
| **Module** | Menu & QR Ordering |
| **Frontend Screens (Web)** | `/fooderp/menu/active`, `/fooderp/menu/seasonal`, `/fooderp/menu/pricing`, `/menu/:menuId` (Public customer QR menu) |
| **Frontend Screens (Mobile)** | `app/(app)/menu/active.js`, `app/(app)/menu/seasonal.js`, `app/(app)/menu/pricing.js` |
| **Backend Endpoints** | `GET /api/menus`, `GET /api/menus/{id}`, `POST /api/menus`, `PUT /api/menus/{id}`, `PUT /api/menus/{id}/activate`, `PUT /api/menus/{id}/deactivate`, `POST /api/menus/{id}/push`, `DELETE /api/menus/{id}`, `GET /api/menus/{id}/pricing`, `PUT /api/menus/items/{itemId}/pricing`, `GET /api/menus/public/{menuId}`, `POST /api/menus/public/order` |
| **Services & Handlers** | `MenuService.java`, `MenuController.java`, `SalesService.java` |
| **Tables & Relationships** | `menus` (1:N `menu_items`), `branch_menu_prices`, `sales_entries`, `customers` |
| **Permissions & Validation** | Public endpoints permit all; live stock lookup (`FinishedGoodStock.availableServings > 0`); auto customer CRM creation; notes tagged `[QR-ORDER:QR-YYYYMMDD-XXXX]`. |
| **Initial Status** | Partially Working (Menu update duplicated items due to missing `items.clear()` before save). |

---

## 9. Sales Operations & Customer CRM

| Attribute | Details |
|---|---|
| **Module** | Daily Sales & Loyalty CRM |
| **Frontend Screens (Web)** | `/fooderp/sales` (`DailySales.js`), `/fooderp/customers` (`CustomerCRM.js`) |
| **Frontend Screens (Mobile)** | `app/(app)/sales/daily-sales.js`, `app/(app)/customers/index.js` |
| **Backend Endpoints** | `POST /api/sales`, `GET /api/sales`, `GET /api/customers`, `GET /api/customers/{id}`, `POST /api/customers`, `PUT /api/customers/{id}`, `PUT /api/customers/{id}/add-points`, `PUT /api/customers/{id}/redeem-points`, `PUT /api/customers/{id}/record-visit`, `GET /api/customers/birthdays`, `GET /api/customers/stats` |
| **Services & Handlers** | `SalesService.java`, `SalesController.java`, `CustomerController.java` |
| **Tables & Relationships** | `sales_entries` (M:1 `customers`, M:1 `recipes`, M:1 `branches`), `customers` |
| **Permissions & Validation** | Finished goods deducted upon sale completion; loyalty points computed at ₹10 = 1 point; tiering: Bronze (0-499), Silver (500-999), Gold (1,000+). |
| **Initial Status** | Partially Working (Potential NPE on customer `totalSpend` if null; QR orders integration verified). |

---

## 10. Staff Shift Scheduling

| Attribute | Details |
|---|---|
| **Module** | Staff Shifts |
| **Frontend Screens (Web)** | `/fooderp/staff/shifts` (`ShiftScheduler.js`) |
| **Frontend Screens (Mobile)** | `app/(app)/staff/shifts.js` |
| **Backend Endpoints** | `GET /api/shifts`, `GET /api/shifts/my`, `POST /api/shifts`, `PUT /api/shifts/{id}`, `PUT /api/shifts/{id}/clock-in`, `PUT /api/shifts/{id}/clock-out`, `DELETE /api/shifts/{id}` |
| **Services & Handlers** | `ShiftController.java` |
| **Tables & Relationships** | `shifts` (M:1 `users`, M:1 `branches`) |
| **Permissions & Validation** | `ROLE_ADMIN` / `ROLE_MANAGER` create and assign; staff view own shifts via `/my`; clock-in / clock-out status transitions. |
| **Initial Status** | Working. |

---

## 11. Reports & Analytics

| Attribute | Details |
|---|---|
| **Module** | Reports & Analytics |
| **Frontend Screens (Web)** | `/fooderp/reports/inventory`, `/cost`, `/wastage`, `/sales`, `/branches`, `/suppliers`, `/fooderp/analytics` |
| **Frontend Screens (Mobile)** | `app/(app)/reports/[type].js`, `app/(app)/admin/analytics.js` |
| **Backend Endpoints** | `GET /api/analytics/overview`, `GET /api/analytics/food-cost`, `GET /api/reports/inventory`, `GET /api/reports/cost`, `GET /api/reports/wastage`, `GET /api/reports/sales`, `GET /api/reports/branches`, `GET /api/reports/supplier` |
| **Services & Handlers** | `AnalyticsController.java`, `ReportController.java` (Newly created to fill missing contract) |
| **Tables & Relationships** | Aggregates from `sales_entries`, `inventory_items`, `wastage_records`, `purchase_orders`, `branches`, `recipes` |
| **Permissions & Validation** | Filter by branch and date range; gross margin & food cost calculations. |
| **Initial Status** | Broken (Backend lacked `/api/reports/*` endpoints causing 404 for mobile; mobile inventory report had infinite redirect loop). |

---

## 12. AI Contextual Chat Assistant

| Attribute | Details |
|---|---|
| **Module** | Groq AI Assistant |
| **Frontend Screens (Web)** | Floating AI assistant drawer in `FoodERPLayout.js` (`AICalorieAssistant.js`) |
| **Frontend Screens (Mobile)** | Embedded AI assistance helpers |
| **Backend Endpoints** | `POST /api/ai/chat` |
| **Services & Handlers** | `AIController.java`, `AIContextService.java` |
| **Tables & Relationships** | Reads live state from recipes, ingredients, inventory, sales, suppliers, meal plans |
| **Permissions & Validation** | Injects live database state into system prompt; fails safely with HTTP 503 if API key missing. |
| **Initial Status** | Working (Fails safely when Groq key is unset). |
