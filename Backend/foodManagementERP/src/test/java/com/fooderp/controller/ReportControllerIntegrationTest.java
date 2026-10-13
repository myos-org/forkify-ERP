package com.fooderp.controller;

import com.fooderp.TestHelper;
import com.fooderp.entity.*;
import com.fooderp.repository.*;
import com.fooderp.security.JwtUtils;
import com.fooderp.security.UserDetailsImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class ReportControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private BranchRepository branchRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private IngredientRepository ingredientRepo;
    @Autowired private InventoryItemRepository inventoryRepo;
    @Autowired private RecipeRepository recipeRepo;
    @Autowired private SalesEntryRepository salesRepo;
    @Autowired private WastageRecordRepository wastageRepo;
    @Autowired private SupplierRepository supplierRepo;
    @Autowired private PurchaseOrderRepository poRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtils jwtUtils;

    private Branch branch;
    private User admin;
    private Ingredient milk;
    private Recipe chai;
    private Supplier dairySupplier;
    private String jwtToken;

    @BeforeEach
    public void setup() {
        branch = new Branch();
        branch.setName("Connaught Place Branch");
        branch.setCity("New Delhi");
        branch.setType(Branch.BranchType.BRANCH);
        branch = branchRepo.save(branch);

        admin = new User();
        admin.setUsername("reportsadmin");
        admin.setEmail("reportsadmin@klyroerp.com");
        admin.setPassword(passwordEncoder.encode("password123"));
        admin.setRole(Role.ROLE_ADMIN);
        admin.setBranch(branch);
        admin = userRepo.save(admin);

        UserDetailsImpl userDetails = UserDetailsImpl.build(admin);
        Authentication authentication =
                new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
        jwtToken = jwtUtils.generateJwtToken(authentication);

        milk = new Ingredient();
        milk.setName("Fresh Milk");
        milk.setCategory("Dairy");
        milk.setUnit("L");
        milk.setCostPerUnit(BigDecimal.valueOf(60.0));
        milk = ingredientRepo.save(milk);

        InventoryItem inv = new InventoryItem();
        inv.setBranch(branch);
        inv.setIngredient(milk);
        inv.setCurrentQuantity(100.0);
        inv.setMinStockLevel(20.0);
        inv.setUnitCost(BigDecimal.valueOf(60.0));
        inventoryRepo.save(inv);

        chai = new Recipe();
        chai.setName("Masala Chai");
        chai.setCategory("Beverages");
        chai.setServings(1);
        chai.setHqOwned(true);
        chai = recipeRepo.save(chai);

        // Sales entry
        SalesEntry sale = new SalesEntry();
        sale.setBranch(branch);
        sale.setRecipe(chai);
        sale.setSaleDate(LocalDate.now());
        sale.setQuantitySold(50);
        sale.setSellingPrice(BigDecimal.valueOf(30.0));
        sale.setTotalRevenue(BigDecimal.valueOf(1500.0));
        sale.setCostOfGoods(BigDecimal.valueOf(500.0));
        salesRepo.save(sale);

        // Wastage entry
        WastageRecord waste = new WastageRecord();
        waste.setBranch(branch);
        waste.setIngredient(milk);
        waste.setQuantity(2.0);
        waste.setReason(WastageRecord.WastageReason.EXPIRED);
        waste.setCostLoss(BigDecimal.valueOf(120.0));
        waste.setStatus(WastageRecord.WastageStatus.APPROVED);
        wastageRepo.save(waste);

        // Supplier & PO
        dairySupplier = new Supplier();
        dairySupplier.setName("Mother Dairy");
        dairySupplier.setCategory("Dairy");
        dairySupplier.setStatus(Supplier.SupplierStatus.ACTIVE);
        dairySupplier.setHqApproved(true);
        dairySupplier = supplierRepo.save(dairySupplier);

        PurchaseOrder po = new PurchaseOrder();
        po.setBranch(branch);
        po.setSupplier(dairySupplier);
        po.setPoNumber("PO-REP-001");
        po.setStatus(PurchaseOrder.POStatus.RECEIVED);
        po.setTotalAmount(BigDecimal.valueOf(6000.0));
        poRepo.save(po);

        TestHelper.setSecurityUser(admin.getId(), admin.getUsername(), Role.ROLE_ADMIN, branch.getId());
    }

    @AfterEach
    public void tearDown() {
        TestHelper.clearSecurityContext();
    }

    @Test
    public void testGetSalesReportSchemaAndData() throws Exception {
        mockMvc.perform(get("/api/reports/sales")
                        .header("Authorization", "Bearer " + jwtToken)
                        .param("branchId", branch.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRevenue").value(1500.0))
                .andExpect(jsonPath("$.totalCovers").value(50))
                .andExpect(jsonPath("$.avgOrderValue").value(30.0))
                .andExpect(jsonPath("$.topRecipe.name").value("Masala Chai"))
                .andExpect(jsonPath("$.rows[0].recipeName").value("Masala Chai"))
                .andExpect(jsonPath("$.rows[0].quantitySold").value(50));
    }

    @Test
    public void testGetInventoryReportSchemaAndData() throws Exception {
        mockMvc.perform(get("/api/reports/inventory")
                        .header("Authorization", "Bearer " + jwtToken)
                        .param("branchId", branch.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].ingredientName").value("Fresh Milk"))
                .andExpect(jsonPath("$.rows[0].currentQuantity").value(100.0))
                .andExpect(jsonPath("$.rows[0].status").value("IN_STOCK"))
                .andExpect(jsonPath("$.rows[0].totalValue").value(6000.0));
    }

    @Test
    public void testGetCostReportSchemaAndData() throws Exception {
        mockMvc.perform(get("/api/reports/cost")
                        .header("Authorization", "Bearer " + jwtToken)
                        .param("branchId", branch.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCost").value(500.0))
                .andExpect(jsonPath("$.foodCostPercent").isNotEmpty())
                .andExpect(jsonPath("$.grossMarginPercent").isNotEmpty())
                .andExpect(jsonPath("$.rows[0].recipeName").value("Masala Chai"));
    }

    @Test
    public void testGetWastageReportSchemaAndData() throws Exception {
        mockMvc.perform(get("/api/reports/wastage")
                        .header("Authorization", "Bearer " + jwtToken)
                        .param("branchId", branch.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLoss").value(120.0))
                .andExpect(jsonPath("$.totalIncidents").value(1))
                .andExpect(jsonPath("$.topReason").value("EXPIRED"))
                .andExpect(jsonPath("$.rows[0].ingredientName").value("Fresh Milk"));
    }

    @Test
    public void testGetBranchesReportSchemaAndData() throws Exception {
        mockMvc.perform(get("/api/reports/branches")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].branchName").value("Connaught Place Branch"))
                .andExpect(jsonPath("$.rows[0].revenue").value(1500.0));
    }

    @Test
    public void testGetSupplierReportSchemaAndData() throws Exception {
        mockMvc.perform(get("/api/reports/supplier")
                        .header("Authorization", "Bearer " + jwtToken)
                        .param("branchId", branch.getId().toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rows[0].supplierName").value("Mother Dairy"))
                .andExpect(jsonPath("$.rows[0].poCount").value(1))
                .andExpect(jsonPath("$.rows[0].totalAmount").value(6000.0))
                .andExpect(jsonPath("$.rows[0].onTimePercent").value(100));
    }
}
