package com.fooderp.controller;

import com.fooderp.TestHelper;
import com.fooderp.entity.*;
import com.fooderp.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class StockTransferIntegrationTest {

    @Autowired private StockTransferController transferController;
    @Autowired private BranchRepository branchRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private IngredientRepository ingredientRepo;
    @Autowired private InventoryItemRepository inventoryRepo;
    @Autowired private StockTransferRepository transferRepo;

    private Branch branchA;
    private Branch branchB;
    private User adminUser;
    private Ingredient butter;

    @BeforeEach
    public void setup() {
        branchA = new Branch();
        branchA.setName("Branch North");
        branchA.setCity("Delhi");
        branchA.setType(Branch.BranchType.BRANCH);
        branchA = branchRepo.save(branchA);

        branchB = new Branch();
        branchB.setName("Branch South");
        branchB.setCity("Delhi");
        branchB.setType(Branch.BranchType.BRANCH);
        branchB = branchRepo.save(branchB);

        adminUser = new User();
        adminUser.setUsername("transferadmin");
        adminUser.setEmail("transferadmin@klyroerp.com");
        adminUser.setPassword("password123");
        adminUser.setRole(Role.ROLE_ADMIN);
        adminUser.setBranch(branchA);
        adminUser = userRepo.save(adminUser);

        butter = new Ingredient();
        butter.setName("Table Butter");
        butter.setCategory("Dairy");
        butter.setUnit("KG");
        butter.setCostPerUnit(BigDecimal.valueOf(500.0));
        butter = ingredientRepo.save(butter);

        TestHelper.setSecurityUser(adminUser.getId(), adminUser.getUsername(), Role.ROLE_ADMIN, branchA.getId());
    }

    @AfterEach
    public void tearDown() {
        TestHelper.clearSecurityContext();
    }

    private Authentication getAuth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @Test
    public void testDispatchRejectsWhenStockInsufficient() {
        // Setup inventory in Branch A with only 5 KG
        InventoryItem invA = new InventoryItem();
        invA.setBranch(branchA);
        invA.setIngredient(butter);
        invA.setCurrentQuantity(5.0);
        inventoryRepo.save(invA);

        // Request 20 KG from Branch A to Branch B
        StockTransferController.TransferRequest req = new StockTransferController.TransferRequest();
        req.setFromBranchId(branchA.getId());
        req.setToBranchId(branchB.getId());
        req.setNotes("Emergency butter transfer");

        StockTransferController.TransferItemRequest item = new StockTransferController.TransferItemRequest();
        item.setIngredientId(butter.getId());
        item.setQuantity(20.0);
        req.setItems(List.of(item));

        ResponseEntity<?> createRes = transferController.create(req, getAuth());
        assertEquals(HttpStatus.OK, createRes.getStatusCode());
        StockTransferController.TransferDto created = (StockTransferController.TransferDto) createRes.getBody();

        // Approve transfer
        transferController.approve(created.getId(), getAuth());

        // Attempt dispatch: Available 5.0, requested 20.0 -> must be rejected!
        ResponseEntity<?> dispatchRes = transferController.dispatch(created.getId(), getAuth());
        assertEquals(HttpStatus.BAD_REQUEST, dispatchRes.getStatusCode());
        assertTrue(dispatchRes.getBody().toString().contains("Insufficient stock"));

        // Verify Branch A stock is still intact at 5.0
        InventoryItem refreshedInv = inventoryRepo.findByIngredientIdAndBranchId(butter.getId(), branchA.getId()).orElseThrow();
        assertEquals(5.0, refreshedInv.getCurrentQuantity());
    }

    @Test
    public void testDispatchAndCancelRestoresSourceStock() {
        // Setup inventory in Branch A with 30 KG
        InventoryItem invA = new InventoryItem();
        invA.setBranch(branchA);
        invA.setIngredient(butter);
        invA.setCurrentQuantity(30.0);
        inventoryRepo.save(invA);

        // Request 15 KG transfer
        StockTransferController.TransferRequest req = new StockTransferController.TransferRequest();
        req.setFromBranchId(branchA.getId());
        req.setToBranchId(branchB.getId());
        StockTransferController.TransferItemRequest item = new StockTransferController.TransferItemRequest();
        item.setIngredientId(butter.getId());
        item.setQuantity(15.0);
        req.setItems(List.of(item));

        ResponseEntity<?> createRes = transferController.create(req, getAuth());
        StockTransferController.TransferDto created = (StockTransferController.TransferDto) createRes.getBody();

        transferController.approve(created.getId(), getAuth());

        // Dispatch transfer
        ResponseEntity<?> dispatchRes = transferController.dispatch(created.getId(), getAuth());
        assertEquals(HttpStatus.OK, dispatchRes.getStatusCode());

        // Branch A stock should now be 15.0 KG (30 - 15)
        InventoryItem afterDispatchInv = inventoryRepo.findByIngredientIdAndBranchId(butter.getId(), branchA.getId()).orElseThrow();
        assertEquals(15.0, afterDispatchInv.getCurrentQuantity());

        // Now CANCEL the dispatched transfer
        ResponseEntity<?> cancelRes = transferController.cancel(created.getId(), getAuth());
        assertEquals(HttpStatus.OK, cancelRes.getStatusCode());

        // Regression assertion: Branch A stock MUST be refunded back to 30.0 KG!
        InventoryItem refundedInv = inventoryRepo.findByIngredientIdAndBranchId(butter.getId(), branchA.getId()).orElseThrow();
        assertEquals(30.0, refundedInv.getCurrentQuantity());
    }

    @Test
    public void testFullTransferWorkflowDispatchesAndReceives() {
        // Setup inventory in Branch A with 50 KG
        InventoryItem invA = new InventoryItem();
        invA.setBranch(branchA);
        invA.setIngredient(butter);
        invA.setCurrentQuantity(50.0);
        inventoryRepo.save(invA);

        StockTransferController.TransferRequest req = new StockTransferController.TransferRequest();
        req.setFromBranchId(branchA.getId());
        req.setToBranchId(branchB.getId());
        StockTransferController.TransferItemRequest item = new StockTransferController.TransferItemRequest();
        item.setIngredientId(butter.getId());
        item.setQuantity(25.0);
        req.setItems(List.of(item));

        ResponseEntity<?> createRes = transferController.create(req, getAuth());
        StockTransferController.TransferDto created = (StockTransferController.TransferDto) createRes.getBody();

        transferController.approve(created.getId(), getAuth());
        transferController.dispatch(created.getId(), getAuth());

        // Receive at Branch B
        ResponseEntity<?> receiveRes = transferController.receive(created.getId(), null, getAuth());
        assertEquals(HttpStatus.OK, receiveRes.getStatusCode());

        // Destination Branch B now has 25 KG
        InventoryItem invB = inventoryRepo.findByIngredientIdAndBranchId(butter.getId(), branchB.getId()).orElseThrow();
        assertEquals(25.0, invB.getCurrentQuantity());

        // Source Branch A has 25 KG remaining
        InventoryItem finalInvA = inventoryRepo.findByIngredientIdAndBranchId(butter.getId(), branchA.getId()).orElseThrow();
        assertEquals(25.0, finalInvA.getCurrentQuantity());
    }
}
