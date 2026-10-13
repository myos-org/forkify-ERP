# Klyro ERP 2.0 — Backend System Architecture

## 1. Architectural Philosophy: The Modular Monolith

Klyro ERP is engineered as a **Modular Monolith**. Rather than introducing premature microservices that incur distributed transaction complexity, network serialization latency, and operational overhead, Klyro enforces strict in-process modularity with clearly demarcated domain boundaries.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT APPS                                      |
|    Klyro Web (React SPA)    |    Klyro Mobile (Expo/React Native)   |   Landing   |
+-----------------------------------------------------------------------------------+
                                         |
                                  HTTPS / REST JSON
                                         |
+-----------------------------------------------------------------------------------+
|                         KLYRO MODULAR MONOLITH CORE                               |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |    AUTH & USERS    |  |     INVENTORY      |  |         PROCUREMENT         |  |
|  | - JWT Authentication|  | - Raw Materials    |  | - Indents (Requisitions)    |  |
|  | - RBAC & Permissions| | - Stock In/Out     |  | - Purchase Orders (POs)     |  |
|  | - Branch Security  |  | - Inter-Branch Xfer|  | - Goods Receipts (GRN)      |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |  RECIPES & MENUS   |  |     PRODUCTION     |  |      SALES & ORDERS         |  |
|  | - Multi-level BOM  |  | - Batch Cooking    |  | - Daily Sales Entry         |  |
|  | - Cost Calculations|  | - Yield Tracking   |  | - QR Table Ordering         |  |
|  | - Version History  |  | - Auto-Stock Deduct|  | - Kitchen Display System    |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|                                                                                   |
|  +--------------------+  +--------------------+  +-----------------------------+  |
|  |      REPORTS       |  |   AI ASSISTANT     |  |       EVENT BUS / OUTBOX    |  |
|  | - Sales Analytics  |  | - Groq Llama 3     |  | - Transactional Outbox      |  |
|  | - Wastage & Margins|  | - Nutritional Est. |  | - Kafka Event Publishing    |  |
|  +--------------------+  +--------------------+  +-----------------------------+  |
+-----------------------------------------------------------------------------------+
              |                           |                           |
     JDBC / HikariCP                Jedis / Lettuce             Kafka Producer
              |                           |                           |
              v                           v                           v
     +-----------------+         +-----------------+         +-----------------+
     |    MySQL 8.0    |         |    Redis 7.2    |         |   Apache Kafka  |
     | Relational Data |         | Distributed L2  |         | Event Streaming |
     | ACID Invariants |         | Caching & Locks |         | & Async Bus     |
     +-----------------+         +-----------------+         +-----------------+
```

---

## 2. Technology Stack & Runtime Specifications

| Layer / Concern | Technology | Version | Architectural Responsibility |
|---|---|---|---|
| **Language Runtime** | Java OpenJDK | 17 LTS | Core application execution environment |
| **Framework** | Spring Boot | 3.2.0 | Dependency injection, MVC, Security, Actuator |
| **Persistence** | Spring Data JPA / Hibernate | 6.x | Relational mapping, transaction boundary control |
| **Database Engine** | MySQL Server | 8.0.36+ | Primary transactional datastore (InnoDB) |
| **Distributed Cache** | Redis | 7.2 Alpine | Query cache, session store, distributed locks |
| **Event Streaming** | Apache Kafka | 3.7 (KRaft) | Asynchronous domain events, audit trail, decoupled jobs |
| **Connection Pooling** | HikariCP | 5.0+ | High-throughput, low-latency JDBC pool |
| **Security / Auth** | Spring Security 6 + JJWT | 0.11.5 | Stateless JWT authentication, role enforcement |
| **AI LLM Client** | Groq SDK / REST Client | 2024+ | Calorie & nutritional estimation via Llama 3 |

---

## 3. Bounded Contexts & Module Registry

### 3.1 Authentication & IAM Module (`com.fooderp.security`, `com.fooderp.controller.AuthController`)
- **Responsibilities:** User credential validation, JWT issuance/refresh, password encryption (BCrypt), role assignment (`ROLE_ADMIN`, `ROLE_HQ_MANAGER`, `ROLE_BRANCH_MANAGER`, `ROLE_CHEF`, `ROLE_STAFF`), and branch access scoping.
- **Invariants:** 
  - An inactive/suspended user cannot authenticate or execute API operations (`UserDetailsImpl.isEnabled()`).
  - Passwords must meet a minimum length constraint of 6 characters.

### 3.2 Inventory & Stock Movement Module (`com.fooderp.service.InventoryService`, `com.fooderp.controller.InventoryController`)
- **Responsibilities:** Real-time raw material tracking, stock-in batches, stock-out adjustments, wastage logging with manager approvals, and multi-branch transfers.
- **Invariants:**
  - Raw material quantities must never drop below zero during automated consumption.
  - Stock transfers between branches require atomic dispatch (source deduction) and receipt (target increment).
  - Cancelled transfers must execute transactional stock refunds to source inventory.

### 3.3 Procurement Module (`com.fooderp.service.ProcurementService`, `com.fooderp.controller.ProcurementController`)
- **Responsibilities:** Material indent requisitions, supplier management, purchase order lifecycle (`DRAFT` -> `ORDERED` -> `PARTIALLY_RECEIVED` -> `RECEIVED`), and goods receipt notes (GRN).
- **Invariants:**
  - A GRN cannot receive items in excess of the purchase order's remaining balance.
  - When all PO line items are satisfied, the PO status automatically transitions to `RECEIVED`.

### 3.4 Recipes & Culinary Engineering (`com.fooderp.service.RecipeService`, `com.fooderp.controller.RecipeController`)
- **Responsibilities:** Multi-level bill of materials (BOM), step-by-step prep procedures, allergen flags, live ingredient cost rollups, and immutable version snapshots (`RecipeVersionController`).
- **Invariants:**
  - Branch kitchens cannot modify HQ master recipes; branch overrides are scoped to local copies.
  - Updates to recipe ingredient collections must preserve Hibernate referential integrity without orphan leaks.

### 3.5 Production & Batch Cooking (`com.fooderp.service.ProductionService`)
- **Responsibilities:** Production logging, batch yield calculation, and automated bill-of-materials raw material stock deduction upon completion.

### 3.6 Sales & POS Integration (`com.fooderp.controller.SalesController`)
- **Responsibilities:** Daily sales entry, table QR ordering, menu category tracking, revenue aggregation.

### 3.7 Reporting & Analytics (`com.fooderp.controller.ReportController`)
- **Responsibilities:** Cross-branch performance comparisons, supplier fulfillment metrics, inventory turnover, wastage analysis, and food cost percentage calculations.

---

## 4. Layering Rules & Communication Boundaries

To prevent tight coupling within the modular monolith, the codebase enforces the following architectural rules:

1. **Strict Layer Separation:**
   - Controllers handle HTTP routing, DTO validation, and response serialization.
   - Services contain pure business logic, calculations, and `@Transactional` boundaries.
   - Repositories encapsulate database queries using Spring Data JPA.
   - Controllers **never** interact directly with repositories.
2. **Inter-Module Communication:**
   - Synchronous invocation is permitted only through strongly-typed service interfaces.
   - Cross-domain state changes that do not require immediate synchronous consistency are dispatched asynchronously via the **Transactional Outbox Pattern** to Apache Kafka.
3. **Database Boundaries:**
   - Foreign keys enforce referential integrity within domain boundaries.
   - Cross-domain entities are referenced by primary key IDs rather than heavy eager object relationships, avoiding N+1 cascade loading.
