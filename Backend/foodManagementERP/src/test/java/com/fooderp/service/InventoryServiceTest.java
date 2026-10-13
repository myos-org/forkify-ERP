package com.fooderp.service;

import com.fooderp.TestHelper;
import com.fooderp.dto.InventoryDto;
import com.fooderp.entity.*;
import com.fooderp.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class InventoryServiceTest {

    @Autowired private InventoryService inventoryService;
    @Autowired private BranchRepository branchRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private IngredientRepository ingredientRepo;
    @Autowired private InventoryItemRepository itemRepo;
    @Autowired private StockTransactionRepository txRepo;
    @Autowired private WastageRecordRepository wastageRepo;

    private Branch branch;
    private User manager;
    private Ingredient flour;
    private Ingredient sugar;

    @BeforeEach
    public void setup() {
        branch = new Branch();
        branch.setName("Pune Branch");
        branch.setCity("Pune");
        branch.setType(Branch.BranchType.BRANCH);
        branch = branchRepo.save(branch);

        manager = new User();
        manager.setUsername("invmanager");
        manager.setEmail("invmanager@klyroerp.com");
        manager.setPassword("password123");
        manager.setRole(Role.ROLE_MANAGER);
        manager.setBranch(branch);
        manager = userRepo.save(manager);

        flour = new Ingredient();
        flour.setName("Wheat Flour");
        flour.setCategory("Grains");
        flour.setUnit("KG");
        flour.setCostPerUnit(BigDecimal.valueOf(35.0));
        flour = ingredientRepo.save(flour);

        sugar = new Ingredient();
        sugar.setName("Cane Sugar");
        sugar.setCategory("Sweeteners");
        sugar.setUnit("KG");
        sugar.setCostPerUnit(BigDecimal.valueOf(45.0));
        sugar = ingredientRepo.save(sugar);

        TestHelper.setSecurityUser(manager.getId(), manager.getUsername(), Role.ROLE_MANAGER, branch.getId());
    }

    @AfterEach
    public void tearDown() {
        TestHelper.clearSecurityContext();
    }

    @Test
    public void testStockInCreatesTransactionAndUpdatesQuantity() {
        InventoryDto.StockInRequest req = new InventoryDto.StockInRequest();
        req.setIngredientId(flour.getId());
        req.setQuantity(50.0);
        req.setUnitCost(BigDecimal.valueOf(36.0));
        req.setReferenceNo("PO-IN-001");
        req.setSupplier("Local Agro");
        req.setNotes("First stock in batch");

        InventoryDto.ItemResponse itemRes = inventoryService.stockIn(branch.getId(), req);
        assertEquals(50.0, itemRes.getCurrentQuantity());

        // Check database
        InventoryItem item = itemRepo.findByIngredientIdAndBranchId(flour.getId(), branch.getId()).orElseThrow();
        assertEquals(50.0, item.getCurrentQuantity());
        assertEquals(0, BigDecimal.valueOf(36.0).compareTo(item.getUnitCost()));

        // Check stock transaction
        List<StockTransaction> txs = txRepo.findByBranchIdOrderByCreatedAtDesc(branch.getId());
        assertFalse(txs.isEmpty());
        StockTransaction tx = txs.get(0);
        assertEquals(StockTransaction.TransactionType.STOCK_IN, tx.getType());
        assertEquals(50.0, tx.getQuantity());
        assertEquals(50.0, tx.getBalanceAfter());
        assertEquals("PO-IN-001", tx.getReferenceNo());
    }

    @Test
    public void testLowStockFilteringExcludesZeroMinStockItems() {
        // Flour: minStockLevel = 20, currentQuantity = 10 -> Low stock
        InventoryDto.ItemRequest flourReq = new InventoryDto.ItemRequest();
        flourReq.setIngredientId(flour.getId());
        flourReq.setCurrentQuantity(10.0);
        flourReq.setMinStockLevel(20.0);
        inventoryService.upsertItem(branch.getId(), flourReq);

        // Sugar: minStockLevel = 0, currentQuantity = 0 -> NOT low stock (unconfigured minStock)
        InventoryDto.ItemRequest sugarReq = new InventoryDto.ItemRequest();
        sugarReq.setIngredientId(sugar.getId());
        sugarReq.setCurrentQuantity(0.0);
        sugarReq.setMinStockLevel(0.0);
        inventoryService.upsertItem(branch.getId(), sugarReq);

        List<InventoryDto.ItemResponse> lowStock = inventoryService.getLowStock(branch.getId());
        assertEquals(1, lowStock.size());
        assertEquals("Wheat Flour", lowStock.get(0).getIngredientName());
    }

    @Test
    public void testWastageLoggingAndApprovalDeductsInventory() {
        // Setup initial stock of 40 KG flour
        InventoryDto.ItemRequest flourReq = new InventoryDto.ItemRequest();
        flourReq.setIngredientId(flour.getId());
        flourReq.setCurrentQuantity(40.0);
        flourReq.setMinStockLevel(10.0);
        flourReq.setUnitCost(BigDecimal.valueOf(35.0));
        inventoryService.upsertItem(branch.getId(), flourReq);

        // Log wastage of 5 KG due to SPOILAGE
        InventoryDto.WastageRequest wReq = new InventoryDto.WastageRequest();
        wReq.setIngredientId(flour.getId());
        wReq.setQuantity(5.0);
        wReq.setReason("SPOILED");
        wReq.setNotes("Rain water leakage");
        wReq.setReferenceNo("WASTE-001");

        InventoryDto.WastageResponse wRes = inventoryService.logWastage(branch.getId(), wReq);
        assertNotNull(wRes.getId());
        assertEquals(WastageRecord.WastageStatus.PENDING.name(), wRes.getStatus());
        // Loss: 5 * 35 = 175.00
        assertEquals(0, BigDecimal.valueOf(175.0).compareTo(wRes.getCostLoss()));

        // Approve wastage
        InventoryDto.WastageResponse approved = inventoryService.approveWastage(wRes.getId());
        assertEquals(WastageRecord.WastageStatus.APPROVED.name(), approved.getStatus());

        // Inventory should now be 35.0 KG
        InventoryItem item = itemRepo.findByIngredientIdAndBranchId(flour.getId(), branch.getId()).orElseThrow();
        assertEquals(35.0, item.getCurrentQuantity());

        // Verify WASTAGE transaction logged
        List<StockTransaction> txs = txRepo.findByBranchIdOrderByCreatedAtDesc(branch.getId());
        assertTrue(txs.stream().anyMatch(t -> t.getType() == StockTransaction.TransactionType.WASTAGE && t.getQuantity() == 5.0));
    }

    @Test
    public void testWastageLoggingRejectsInsufficientStock() {
        InventoryDto.ItemRequest flourReq = new InventoryDto.ItemRequest();
        flourReq.setIngredientId(flour.getId());
        flourReq.setCurrentQuantity(3.0);
        inventoryService.upsertItem(branch.getId(), flourReq);

        InventoryDto.WastageRequest wReq = new InventoryDto.WastageRequest();
        wReq.setIngredientId(flour.getId());
        wReq.setQuantity(10.0); // More than available 3.0
        wReq.setReason("EXPIRED");

        assertThrows(RuntimeException.class, () -> {
            inventoryService.logWastage(branch.getId(), wReq);
        });
    }
}
