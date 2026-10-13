package com.fooderp.controller;

import com.fooderp.entity.*;
import com.fooderp.repository.*;
import com.fooderp.security.UserDetailsImpl;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportController {

    @Autowired private SalesEntryRepository    salesRepo;
    @Autowired private WastageRecordRepository wastageRepo;
    @Autowired private InventoryItemRepository inventoryRepo;
    @Autowired private RecipeRepository        recipeRepo;
    @Autowired private BranchRepository        branchRepo;
    @Autowired private PurchaseOrderRepository poRepo;
    @Autowired private SupplierRepository      supplierRepo;

    private Long resolveBranch(Authentication auth, Long branchId) {
        if (auth == null || !(auth.getPrincipal() instanceof UserDetailsImpl)) return branchId;
        UserDetailsImpl u = (UserDetailsImpl) auth.getPrincipal();
        boolean isAdmin = u.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return (isAdmin && branchId != null) ? branchId : (u.getBranchId() != null ? u.getBranchId() : branchId);
    }

    private LocalDate parseDate(String dateStr, LocalDate defaultVal) {
        if (dateStr == null || dateStr.isBlank()) return defaultVal;
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return defaultVal;
        }
    }

    // ── GET /api/reports/sales ───────────────────────────────────────────────
    @GetMapping("/sales")
    public ResponseEntity<?> getSalesReport(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            Authentication auth) {

        Long bid = resolveBranch(auth, branchId);
        LocalDate to = parseDate(toDate, LocalDate.now());
        LocalDate from = parseDate(fromDate, to.minusDays(30));

        List<SalesEntry> entries = (bid != null)
                ? salesRepo.findByBranchAndDateRange(bid, from, to)
                : salesRepo.findAll().stream()
                .filter(s -> s.getSaleDate() != null && !s.getSaleDate().isBefore(from) && !s.getSaleDate().isAfter(to))
                .collect(Collectors.toList());

        BigDecimal totalRevenue = entries.stream()
                .map(e -> e.getTotalRevenue() != null ? e.getTotalRevenue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalCovers = entries.stream()
                .mapToInt(e -> e.getQuantitySold() != null ? e.getQuantitySold() : 0)
                .sum();

        BigDecimal avgOrderValue = totalCovers > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalCovers), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Group rows by recipe
        Map<String, List<SalesEntry>> byRecipe = entries.stream()
                .collect(Collectors.groupingBy(e -> e.getRecipe() != null ? e.getRecipe().getName() : "Unknown"));

        List<Map<String, Object>> rows = byRecipe.entrySet().stream().map(entry -> {
            int qty = entry.getValue().stream().mapToInt(e -> e.getQuantitySold() != null ? e.getQuantitySold() : 0).sum();
            BigDecimal amount = entry.getValue().stream()
                    .map(e -> e.getTotalRevenue() != null ? e.getTotalRevenue() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Map<String, Object> r = new HashMap<>();
            r.put("recipeName", entry.getKey());
            r.put("quantitySold", qty);
            r.put("totalAmount", amount);
            return r;
        }).sorted((a, b) -> ((BigDecimal) b.get("totalAmount")).compareTo((BigDecimal) a.get("totalAmount")))
                .collect(Collectors.toList());

        String topRecipeName = rows.isEmpty() ? "—" : (String) rows.get(0).get("recipeName");

        Map<String, Object> response = new HashMap<>();
        response.put("totalRevenue", totalRevenue);
        response.put("totalCovers", totalCovers);
        response.put("avgOrderValue", avgOrderValue);
        response.put("topRecipe", Map.of("name", topRecipeName));
        response.put("rows", rows);

        return ResponseEntity.ok(response);
    }

    // ── GET /api/reports/inventory ───────────────────────────────────────────
    @GetMapping("/inventory")
    public ResponseEntity<?> getInventoryReport(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            Authentication auth) {

        Long bid = resolveBranch(auth, branchId);
        List<InventoryItem> items = (bid != null)
                ? inventoryRepo.findByBranchIdOrderByIngredientNameAsc(bid)
                : inventoryRepo.findAll();

        List<Map<String, Object>> rows = items.stream().map(item -> {
            Map<String, Object> r = new HashMap<>();
            String ingName = item.getIngredient() != null ? item.getIngredient().getName() : "Item " + item.getId();
            double currentQty = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0.0;
            double minStock = item.getMinStockLevel() != null ? item.getMinStockLevel() : 0.0;

            String status = "IN_STOCK";
            if (currentQty <= 0) status = "OUT_OF_STOCK";
            else if (minStock > 0 && currentQty < minStock) status = "LOW_STOCK";

            BigDecimal unitCost = item.getUnitCost() != null ? item.getUnitCost()
                    : (item.getIngredient() != null && item.getIngredient().getCostPerUnit() != null
                    ? item.getIngredient().getCostPerUnit() : BigDecimal.ZERO);
            BigDecimal totalValue = unitCost.multiply(BigDecimal.valueOf(currentQty)).setScale(2, RoundingMode.HALF_UP);

            r.put("ingredientName", ingName);
            r.put("currentQuantity", currentQty);
            r.put("minStockLevel", minStock);
            r.put("status", status);
            r.put("totalValue", totalValue);
            return r;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("rows", rows));
    }

    // ── GET /api/reports/cost ────────────────────────────────────────────────
    @GetMapping("/cost")
    public ResponseEntity<?> getCostReport(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            Authentication auth) {

        Long bid = resolveBranch(auth, branchId);
        LocalDate to = parseDate(toDate, LocalDate.now());
        LocalDate from = parseDate(fromDate, to.minusDays(30));

        List<SalesEntry> sales = (bid != null)
                ? salesRepo.findByBranchAndDateRange(bid, from, to)
                : salesRepo.findAll().stream()
                .filter(s -> s.getSaleDate() != null && !s.getSaleDate().isBefore(from) && !s.getSaleDate().isAfter(to))
                .collect(Collectors.toList());

        BigDecimal totalRevenue = sales.stream()
                .map(e -> e.getTotalRevenue() != null ? e.getTotalRevenue() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalCost = sales.stream()
                .map(e -> e.getCostOfGoods() != null ? e.getCostOfGoods() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal foodCostPct = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? totalCost.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal grossMarginPct = BigDecimal.valueOf(100).subtract(foodCostPct).setScale(1, RoundingMode.HALF_UP);

        BigDecimal wastageCost = (bid != null)
                ? wastageRepo.sumTotalLossByBranch(bid)
                : wastageRepo.findAll().stream()
                .filter(w -> w.getStatus() == WastageRecord.WastageStatus.APPROVED)
                .map(w -> w.getCostLoss() != null ? w.getCostLoss() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Group cost rows by recipe
        Map<String, List<SalesEntry>> byRecipe = sales.stream()
                .collect(Collectors.groupingBy(e -> e.getRecipe() != null ? e.getRecipe().getName() : "Unknown"));

        List<Map<String, Object>> rows = byRecipe.entrySet().stream().map(entry -> {
            int qty = entry.getValue().stream().mapToInt(e -> e.getQuantitySold() != null ? e.getQuantitySold() : 0).sum();
            BigDecimal cost = entry.getValue().stream()
                    .map(e -> e.getCostOfGoods() != null ? e.getCostOfGoods() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal costPerServing = qty > 0 ? cost.divide(BigDecimal.valueOf(qty), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            Map<String, Object> r = new HashMap<>();
            r.put("recipeName", entry.getKey());
            r.put("costPerServing", costPerServing);
            r.put("totalCost", cost);
            return r;
        }).sorted((a, b) -> ((BigDecimal) b.get("totalCost")).compareTo((BigDecimal) a.get("totalCost")))
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("totalCost", totalCost);
        response.put("foodCostPercent", foodCostPct);
        response.put("grossMarginPercent", grossMarginPct);
        response.put("wastageCost", wastageCost != null ? wastageCost : BigDecimal.ZERO);
        response.put("rows", rows);

        return ResponseEntity.ok(response);
    }

    // ── GET /api/reports/wastage ─────────────────────────────────────────────
    @GetMapping("/wastage")
    public ResponseEntity<?> getWastageReport(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            Authentication auth) {

        Long bid = resolveBranch(auth, branchId);
        LocalDate to = parseDate(toDate, LocalDate.now());
        LocalDate from = parseDate(fromDate, to.minusDays(30));

        List<WastageRecord> records = (bid != null)
                ? wastageRepo.findByBranchIdOrderByCreatedAtDesc(bid)
                : wastageRepo.findAll();

        // Filter by date range if createdAt present
        List<WastageRecord> filtered = records.stream()
                .filter(w -> {
                    if (w.getCreatedAt() == null) return true;
                    LocalDate d = w.getCreatedAt().toLocalDate();
                    return !d.isBefore(from) && !d.isAfter(to);
                }).collect(Collectors.toList());

        BigDecimal totalLoss = filtered.stream()
                .filter(w -> w.getStatus() == WastageRecord.WastageStatus.APPROVED)
                .map(w -> w.getCostLoss() != null ? w.getCostLoss() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Find top reason
        Map<String, Long> reasonsCount = filtered.stream()
                .collect(Collectors.groupingBy(w -> w.getReason() != null ? w.getReason().name() : "OTHER", Collectors.counting()));
        String topReason = reasonsCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("—");

        List<Map<String, Object>> rows = filtered.stream().map(w -> {
            Map<String, Object> r = new HashMap<>();
            r.put("ingredientName", w.getIngredient() != null ? w.getIngredient().getName() : "—");
            r.put("quantity", w.getQuantity() != null ? w.getQuantity() : 0.0);
            r.put("reason", w.getReason() != null ? w.getReason().name() : "OTHER");
            r.put("costLoss", w.getCostLoss() != null ? w.getCostLoss() : BigDecimal.ZERO);
            return r;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("totalLoss", totalLoss);
        response.put("totalIncidents", filtered.size());
        response.put("topReason", topReason);
        response.put("rows", rows);

        return ResponseEntity.ok(response);
    }

    // ── GET /api/reports/branches ────────────────────────────────────────────
    @GetMapping("/branches")
    public ResponseEntity<?> getBranchComparison(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        LocalDate to = parseDate(toDate, LocalDate.now());
        LocalDate from = parseDate(fromDate, to.minusDays(30));

        List<Branch> branches = branchRepo.findByActiveTrue();

        List<Map<String, Object>> rows = branches.stream().map(b -> {
            List<SalesEntry> sales = salesRepo.findByBranchAndDateRange(b.getId(), from, to);
            BigDecimal revenue = sales.stream()
                    .map(e -> e.getTotalRevenue() != null ? e.getTotalRevenue() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            int orderCount = sales.stream().mapToInt(e -> e.getQuantitySold() != null ? e.getQuantitySold() : 0).sum();

            BigDecimal waste = wastageRepo.findByBranchIdOrderByCreatedAtDesc(b.getId()).stream()
                    .filter(w -> w.getStatus() == WastageRecord.WastageStatus.APPROVED)
                    .map(w -> w.getCostLoss() != null ? w.getCostLoss() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal wastePct = revenue.compareTo(BigDecimal.ZERO) > 0
                    ? waste.divide(revenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            Map<String, Object> r = new HashMap<>();
            r.put("branchName", b.getName());
            r.put("revenue", revenue);
            r.put("orderCount", orderCount);
            r.put("wastagePercent", wastePct);
            return r;
        }).sorted((a, b) -> ((BigDecimal) b.get("revenue")).compareTo((BigDecimal) a.get("revenue")))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("rows", rows));
    }

    // ── GET /api/reports/supplier ────────────────────────────────────────────
    @GetMapping("/supplier")
    public ResponseEntity<?> getSupplierReport(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            Authentication auth) {

        Long bid = resolveBranch(auth, branchId);
        List<PurchaseOrder> pos = (bid != null)
                ? poRepo.findByBranchIdOrderByCreatedAtDesc(bid)
                : poRepo.findAllByOrderByCreatedAtDesc();

        Map<Supplier, List<PurchaseOrder>> bySupplier = pos.stream()
                .filter(p -> p.getSupplier() != null)
                .collect(Collectors.groupingBy(PurchaseOrder::getSupplier));

        List<Map<String, Object>> rows = bySupplier.entrySet().stream().map(entry -> {
            Supplier s = entry.getKey();
            List<PurchaseOrder> poList = entry.getValue();
            int poCount = poList.size();
            BigDecimal totalAmount = poList.stream()
                    .map(p -> p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long receivedOnTime = poList.stream()
                    .filter(p -> p.getStatus() == PurchaseOrder.POStatus.RECEIVED)
                    .count();
            double onTimePct = poCount > 0 ? ((double) receivedOnTime / poCount) * 100.0 : 100.0;

            Map<String, Object> r = new HashMap<>();
            r.put("supplierName", s.getName());
            r.put("poCount", poCount);
            r.put("totalAmount", totalAmount);
            r.put("onTimePercent", Math.round(onTimePct));
            return r;
        }).sorted((a, b) -> ((BigDecimal) b.get("totalAmount")).compareTo((BigDecimal) a.get("totalAmount")))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of("rows", rows));
    }
}
