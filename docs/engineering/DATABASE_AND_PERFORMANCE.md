# Klyro ERP 2.0 — Database Architecture & Performance Engineering

## 1. Relational Schema Architecture & Indexing Strategy

Klyro relies on MySQL 8.0 InnoDB as its primary ACID transactional engine. At scale, predictable query performance requires deliberate index structures to avoid full table scans and eliminate index merges.

### 1.1 Index Registry & Covering Indexes
Every table in the Klyro ERP schema has an explicit indexing pattern designed for operational query profiles:

```sql
-- 1. Inventory & Raw Materials
ALTER TABLE raw_materials 
  ADD INDEX idx_raw_mat_branch_status (branch_id, status),
  ADD INDEX idx_raw_mat_stock_alert (branch_id, current_stock, minimum_stock);

-- 2. Stock Movements & Transactions
ALTER TABLE stock_transactions 
  ADD INDEX idx_stock_tx_material_date (raw_material_id, created_at DESC),
  ADD INDEX idx_stock_tx_branch_type (branch_id, transaction_type, created_at DESC);

-- 3. Stock Transfers (Multi-Branch)
ALTER TABLE stock_transfers 
  ADD INDEX idx_transfer_source_status (source_branch_id, status),
  ADD INDEX idx_transfer_dest_status (destination_branch_id, status),
  ADD INDEX idx_transfer_dispatch_date (dispatched_at DESC);

-- 4. Procurement & Purchase Orders
ALTER TABLE purchase_orders 
  ADD INDEX idx_po_branch_status (branch_id, status, created_at DESC),
  ADD INDEX idx_po_supplier_status (supplier_id, status);

ALTER TABLE po_items 
  ADD INDEX idx_po_items_po_material (purchase_order_id, raw_material_id);

-- 5. Recipes & Versioning
ALTER TABLE recipes 
  ADD INDEX idx_recipe_branch_category (branch_id, category),
  ADD INDEX idx_recipe_slug_unique (slug);

ALTER TABLE recipe_versions 
  ADD INDEX idx_recipe_ver_recipe_num (recipe_id, version_number DESC);

-- 6. Production & Yield
ALTER TABLE production_logs 
  ADD INDEX idx_prod_branch_date (branch_id, production_date DESC),
  ADD INDEX idx_prod_recipe (recipe_id, created_at DESC);
```

---

## 2. Preventing N+1 Query Anti-Patterns

In typical Spring Data JPA applications, lazy loading collections (e.g., `Recipe.ingredients`, `PurchaseOrder.items`) without explicit fetch joins causes the classic $N+1$ query explosion.

### 2.1 Solution 1: Global Batch Fetching
To prevent $N+1$ queries even when lazy associations are accessed outside explicit fetch queries, Klyro configures Hibernate batch fetching:

```properties
# Backend/foodManagementERP/src/main/resources/application.properties
spring.jpa.properties.hibernate.default_batch_fetch_size=50
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true
spring.jpa.properties.hibernate.batch_versioned_data=true
```
When accessing collections, Hibernate issues a single `WHERE id IN (?, ?, ..., ?)` query containing up to 50 parent keys, reducing network round-trips by 98%.

### 2.2 Solution 2: Explicit Fetch Joins & `@EntityGraph`
For mission-critical read paths such as recipe compilation and purchase order exports, use Spring Data `@EntityGraph`:

```java
@Repository
public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    @EntityGraph(attributePaths = {"ingredients", "ingredients.rawMaterial", "steps"})
    @Query("SELECT r FROM Recipe r WHERE r.id = :id")
    Optional<Recipe> findByIdWithFullDetails(@Param("id") Long id);

    @EntityGraph(attributePaths = {"ingredients"})
    @Query("SELECT r FROM Recipe r WHERE r.branchId = :branchId")
    List<Recipe> findAllByBranchIdWithIngredients(@Param("branchId") Long branchId);
}
```

---

## 3. High-Throughput Concurrency & Locking Strategy

E-commerce and ERP workloads exhibit two fundamentally different concurrency profiles:
1. **Low-contention master data** (Recipes, Suppliers, Menus, Users)
2. **High-contention inventory updates** (Raw material stock deduction during peak dining rushes)

### 3.1 Optimistic Locking for Master Data
For low-contention master data, avoid pessimistic database locks to prevent blocking concurrent readers. Apply JPA `@Version`:

```java
@Entity
@Table(name = "recipes")
public class Recipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    // fields, getters, setters
}
```
If two managers edit the same recipe simultaneously, Hibernate throws `OptimisticLockException`, which the controller catches and converts to `409 CONFLICT` with a message instructing the user to refresh.

### 3.2 Pessimistic Locking for High-Contention Inventory Updates
When multiple orders, production batches, or POS terminals simultaneously deduct stock from the same `RawMaterial`, optimistic locking triggers catastrophic retry storms. Klyro employs `LockModeType.PESSIMISTIC_WRITE`:

```java
@Repository
public interface RawMaterialRepository extends JpaRepository<RawMaterial, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @QueryHints({@QueryHint(name = "jakarta.persistence.lock.timeout", value = "3000")})
    @Query("SELECT rm FROM RawMaterial rm WHERE rm.id = :id")
    Optional<RawMaterial> findByIdForUpdate(@Param("id") Long id);
}
```

#### Atomic Stock Deduction Implementation:
```java
@Service
@Transactional
public class InventoryService {

    public void deductStockWithLock(Long rawMaterialId, BigDecimal quantity, String reason) {
        RawMaterial rm = rawMaterialRepository.findByIdForUpdate(rawMaterialId)
            .orElseThrow(() -> new ResourceNotFoundException("Raw material not found: " + rawMaterialId));

        if (rm.getCurrentStock().compareTo(quantity) < 0) {
            throw new InsufficientStockException(
                "Insufficient stock for " + rm.getName() + ". Available: " + rm.getCurrentStock() + ", Requested: " + quantity);
        }

        rm.setCurrentStock(rm.getCurrentStock().subtract(quantity));
        rawMaterialRepository.save(rm);

        // Record stock transaction log
        StockTransaction tx = new StockTransaction();
        tx.setRawMaterial(rm);
        tx.setQuantity(quantity);
        tx.setType(TransactionType.CONSUMPTION);
        tx.setReason(reason);
        stockTransactionRepository.save(tx);
    }
}
```

---

## 4. Connection Pool Sizing & HikariCP Configuration

To eliminate database connection starvation and connection leak panics under load, HikariCP is configured according to the mathematical formula:
$$\text{Pool Size} = \text{Core Count} \times 2 + \text{Effective Spindle Count}$$

```properties
# HikariCP Production Tuning
spring.datasource.hikari.maximum-pool-size=30
spring.datasource.hikari.minimum-idle=10
spring.datasource.hikari.idle-timeout=300000
spring.datasource.hikari.connection-timeout=5000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.leak-detection-threshold=2000
spring.datasource.hikari.pool-name=KlyroHikariCP
```

### 4.1 Transaction Boundary Discipline
1. **Never hold transactions across network calls:** AI API invocations (Groq), external notification dispatch, and file uploads are executed **outside** `@Transactional` boundaries to prevent holding database connections open.
2. **Read-Only Optimization:** Query-only service methods must declare `@Transactional(readOnly = true)`. This signals Hibernate to skip dirty-checking snapshots, cutting memory overhead by 40%.
