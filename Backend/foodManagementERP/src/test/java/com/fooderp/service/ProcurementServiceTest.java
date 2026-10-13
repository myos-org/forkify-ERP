package com.fooderp.service;

import com.fooderp.TestHelper;
import com.fooderp.dto.ProcurementDto;
import com.fooderp.entity.*;
import com.fooderp.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class ProcurementServiceTest {

    @Autowired private ProcurementService procurementService;
    @Autowired private BranchRepository branchRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private SupplierRepository supplierRepo;
    @Autowired private IngredientRepository ingredientRepo;
    @Autowired private PurchaseOrderRepository poRepo;
    @Autowired private InventoryItemRepository inventoryRepo;

    private Branch branch;
    private User adminUser;
    private Supplier supplier;
    private Ingredient ingredient;

    @BeforeEach
    public void setup() {
        branch = new Branch();
        branch.setName("Klyro Central Kitchen");
        branch.setCity("Mumbai");
        branch.setType(Branch.BranchType.HQ);
        branch = branchRepo.save(branch);

        adminUser = new User();
        adminUser.setUsername("procureadmin");
        adminUser.setEmail("procureadmin@klyroerp.com");
        adminUser.setPassword("password123");
        adminUser.setFullName("Procurement Admin");
        adminUser.setRole(Role.ROLE_ADMIN);
        adminUser.setBranch(branch);
        adminUser = userRepo.save(adminUser);

        supplier = new Supplier();
        supplier.setName("Apex Fresh Foods");
        supplier.setContactPerson("Ramesh Kumar");
        supplier.setCategory("Vegetables");
        supplier.setStatus(Supplier.SupplierStatus.ACTIVE);
        supplier.setHqApproved(true);
        supplier = supplierRepo.save(supplier);

        ingredient = new Ingredient();
        ingredient.setName("Basmati Rice");
        ingredient.setCategory("Grains");
        ingredient.setUnit("KG");
        ingredient.setCostPerUnit(BigDecimal.valueOf(80.0));
        ingredient = ingredientRepo.save(ingredient);

        TestHelper.setSecurityUser(adminUser.getId(), adminUser.getUsername(), Role.ROLE_ADMIN, branch.getId());
    }

    @AfterEach
    public void tearDown() {
        TestHelper.clearSecurityContext();
    }

    @Test
    public void testIndentToPOWorkflow() {
        ProcurementDto.IndentRequest indentReq = new ProcurementDto.IndentRequest();
        indentReq.setNotes("Weekly bulk grain requisition");
        ProcurementDto.IndentItemRequest itemReq = new ProcurementDto.IndentItemRequest();
        itemReq.setIngredientId(ingredient.getId());
        itemReq.setQuantity(100.0);
        itemReq.setNotes("First grade");
        indentReq.setItems(List.of(itemReq));

        ProcurementDto.IndentResponse indent = procurementService.createIndent(branch.getId(), indentReq);
        assertNotNull(indent.getId());
        assertEquals(MaterialIndent.IndentStatus.PENDING.name(), indent.getStatus());

        // Approve indent
        ProcurementDto.IndentResponse approvedIndent = procurementService.approveIndent(indent.getId());
        assertEquals(MaterialIndent.IndentStatus.APPROVED.name(), approvedIndent.getStatus());

        // Convert Indent to PO
        ProcurementDto.POResponse po = procurementService.convertIndentToPO(approvedIndent.getId(), supplier.getId());
        assertNotNull(po.getId());
        assertEquals(PurchaseOrder.POStatus.DRAFT.name(), po.getStatus());
        assertEquals(1, po.getItems().size());
        assertEquals(0, BigDecimal.valueOf(8000.0).compareTo(po.getTotalAmount()));

        // Send PO
        ProcurementDto.POResponse sentPO = procurementService.updatePOStatus(po.getId(), "SENT");
        assertEquals(PurchaseOrder.POStatus.SENT.name(), sentPO.getStatus());
    }

    @Test
    public void testGRNReceiptAndPOStatusTransition() {
        // Direct PO creation
        ProcurementDto.PORequest poReq = new ProcurementDto.PORequest();
        poReq.setSupplierId(supplier.getId());
        poReq.setExpectedDate(LocalDate.now().plusDays(3).toString());
        ProcurementDto.POItemRequest poItem = new ProcurementDto.POItemRequest();
        poItem.setIngredientId(ingredient.getId());
        poItem.setQuantity(50.0);
        poItem.setUnitPrice(BigDecimal.valueOf(80.0));
        poReq.setItems(List.of(poItem));

        ProcurementDto.POResponse po = procurementService.createPO(branch.getId(), poReq);
        procurementService.updatePOStatus(po.getId(), "SENT");

        // 1. Partial GRN (receive 20 of 50)
        ProcurementDto.GRNRequest grnReq1 = new ProcurementDto.GRNRequest();
        grnReq1.setPurchaseOrderId(po.getId());
        grnReq1.setReceivedDate(LocalDate.now().toString());
        grnReq1.setReceivedBy("Kitchen Receiving");
        ProcurementDto.GRNItemRequest grnItem1 = new ProcurementDto.GRNItemRequest();
        grnItem1.setIngredientId(ingredient.getId());
        grnItem1.setOrderedQuantity(50.0);
        grnItem1.setReceivedQuantity(20.0);
        grnItem1.setUnitPrice(BigDecimal.valueOf(80.0));
        grnReq1.setItems(List.of(grnItem1));

        ProcurementDto.GRNResponse draftGrn1 = procurementService.createGRN(branch.getId(), grnReq1);
        ProcurementDto.GRNResponse confirmedGrn1 = procurementService.confirmGRN(draftGrn1.getId());
        assertEquals("CONFIRMED", confirmedGrn1.getStatus());

        // Verify PO transitioned to PARTIAL
        PurchaseOrder updatedPo = poRepo.findById(po.getId()).orElseThrow();
        assertEquals(PurchaseOrder.POStatus.PARTIAL, updatedPo.getStatus());
        assertEquals(20.0, updatedPo.getItems().get(0).getReceivedQuantity());

        // Verify inventory reflects 20 KG received
        InventoryItem inv = inventoryRepo.findByIngredientIdAndBranchId(ingredient.getId(), branch.getId()).orElseThrow();
        assertEquals(20.0, inv.getCurrentQuantity());

        // 2. Remaining GRN (receive remaining 30 of 50)
        ProcurementDto.GRNRequest grnReq2 = new ProcurementDto.GRNRequest();
        grnReq2.setPurchaseOrderId(po.getId());
        grnReq2.setReceivedDate(LocalDate.now().toString());
        grnReq2.setReceivedBy("Kitchen Receiving");
        ProcurementDto.GRNItemRequest grnItem2 = new ProcurementDto.GRNItemRequest();
        grnItem2.setIngredientId(ingredient.getId());
        grnItem2.setOrderedQuantity(50.0);
        grnItem2.setReceivedQuantity(30.0);
        grnItem2.setUnitPrice(BigDecimal.valueOf(80.0));
        grnReq2.setItems(List.of(grnItem2));

        ProcurementDto.GRNResponse draftGrn2 = procurementService.createGRN(branch.getId(), grnReq2);
        procurementService.confirmGRN(draftGrn2.getId());

        // Regression assertion: PO MUST now be RECEIVED, not stuck in PARTIAL!
        PurchaseOrder fullyReceivedPo = poRepo.findById(po.getId()).orElseThrow();
        assertEquals(PurchaseOrder.POStatus.RECEIVED, fullyReceivedPo.getStatus());
        assertEquals(50.0, fullyReceivedPo.getItems().get(0).getReceivedQuantity());

        // Verify inventory now has full 50 KG
        InventoryItem finalInv = inventoryRepo.findByIngredientIdAndBranchId(ingredient.getId(), branch.getId()).orElseThrow();
        assertEquals(50.0, finalInv.getCurrentQuantity());
    }
}
