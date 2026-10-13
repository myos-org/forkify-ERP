package com.fooderp.service;

import com.fooderp.dto.ProcurementDto;
import com.fooderp.dto.InventoryDto;
import com.fooderp.entity.*;
import com.fooderp.repository.*;
import com.fooderp.security.UserDetailsImpl;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProcurementService {

    @Autowired private SupplierRepository        supplierRepo;
    @Autowired private MaterialIndentRepository  indentRepo;
    @Autowired private PurchaseOrderRepository   poRepo;
    @Autowired private GoodsReceivedRepository   grnRepo;
    @Autowired private IngredientRepository      ingredientRepo;
    @Autowired private BranchRepository          branchRepo;
    @Autowired private UserRepository            userRepo;
    @Autowired private InventoryService          inventoryService;

    // ── SUPPLIERS ─────────────────────────────────────────────────────────────

    public List<ProcurementDto.SupplierResponse> getSuppliers(Long branchId) {
        List<Supplier> suppliers = isAdmin()
                ? supplierRepo.findAllByOrderByNameAsc()
                : supplierRepo.findVisibleToBranch(branchId);
        return suppliers.stream().map(ProcurementDto.SupplierResponse::from).collect(Collectors.toList());
    }

    public ProcurementDto.SupplierResponse createSupplier(Long branchId, ProcurementDto.SupplierRequest req) {
        Supplier s = new Supplier();
        mapSupplier(req, s);
        if (!isAdmin() && branchId != null) {
            branchRepo.findById(branchId).ifPresent(s::setBranch);
        }
        return ProcurementDto.SupplierResponse.from(supplierRepo.save(s));
    }

    public ProcurementDto.SupplierResponse updateSupplier(Long id, ProcurementDto.SupplierRequest req) {
        Supplier s = supplierRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found: " + id));
        mapSupplier(req, s);
        return ProcurementDto.SupplierResponse.from(supplierRepo.save(s));
    }

    public void deleteSupplier(Long id) {
        Supplier s = supplierRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found: " + id));
        s.setStatus(Supplier.SupplierStatus.INACTIVE);
        supplierRepo.save(s);
    }

    public List<ProcurementDto.SupplierResponse> getApprovedVendors() {
        return supplierRepo
                .findByHqApprovedTrueAndStatusOrderByNameAsc(Supplier.SupplierStatus.ACTIVE)
                .stream().map(ProcurementDto.SupplierResponse::from).collect(Collectors.toList());
    }

    public ProcurementDto.SupplierResponse approveVendor(Long id) {
        Supplier s = supplierRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found: " + id));
        s.setHqApproved(true);
        return ProcurementDto.SupplierResponse.from(supplierRepo.save(s));
    }

    // ── MATERIAL INDENT ───────────────────────────────────────────────────────

    public List<ProcurementDto.IndentResponse> getIndents(Long branchId, String status) {
        List<MaterialIndent> indents;
        if (status != null && !status.isBlank()) {
            indents = indentRepo.findByBranchIdAndStatusOrderByCreatedAtDesc(
                    branchId, MaterialIndent.IndentStatus.valueOf(status.toUpperCase()));
        } else {
            indents = indentRepo.findByBranchIdOrderByCreatedAtDesc(branchId);
        }
        return indents.stream().map(ProcurementDto.IndentResponse::from).collect(Collectors.toList());
    }

    public ProcurementDto.IndentResponse createIndent(Long branchId, ProcurementDto.IndentRequest req) {
        UserDetailsImpl caller = getCaller();
        Branch branch = branchRepo.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        MaterialIndent indent = new MaterialIndent();
        indent.setBranch(branch);
        indent.setIndentNumber(generateIndentNumber());
        indent.setNotes(req.getNotes());
        indent.setStatus(MaterialIndent.IndentStatus.PENDING);
        userRepo.findById(caller.getId()).ifPresent(indent::setRaisedBy);

        MaterialIndent saved = indentRepo.save(indent);

        for (ProcurementDto.IndentItemRequest itemReq : req.getItems()) {
            Ingredient ing = ingredientRepo.findById(itemReq.getIngredientId())
                    .orElseThrow(() -> new RuntimeException("Ingredient not found: " + itemReq.getIngredientId()));
            IndentItem item = new IndentItem();
            item.setIndent(saved);
            item.setIngredient(ing);
            item.setQuantity(itemReq.getQuantity());
            item.setNotes(itemReq.getNotes());
            saved.getItems().add(item);
        }

        return ProcurementDto.IndentResponse.from(indentRepo.save(saved));
    }

    public ProcurementDto.IndentResponse approveIndent(Long id) {
        UserDetailsImpl caller = getCaller();
        MaterialIndent indent  = indentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Indent not found: " + id));

        if (indent.getStatus() != MaterialIndent.IndentStatus.PENDING) {
            throw new RuntimeException("Indent is not in PENDING state");
        }
        indent.setStatus(MaterialIndent.IndentStatus.APPROVED);
        indent.setApprovedAt(LocalDateTime.now());
        userRepo.findById(caller.getId()).ifPresent(indent::setApprovedBy);
        return ProcurementDto.IndentResponse.from(indentRepo.save(indent));
    }

    public ProcurementDto.IndentResponse rejectIndent(Long id, String reason) {
        MaterialIndent indent = indentRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Indent not found: " + id));
        indent.setStatus(MaterialIndent.IndentStatus.REJECTED);
        indent.setRejectionReason(reason);
        return ProcurementDto.IndentResponse.from(indentRepo.save(indent));
    }

    // Convert approved indent → PO
    public ProcurementDto.POResponse convertIndentToPO(Long indentId, Long supplierId) {
        MaterialIndent indent = indentRepo.findById(indentId)
                .orElseThrow(() -> new RuntimeException("Indent not found: " + indentId));

        if (indent.getStatus() != MaterialIndent.IndentStatus.APPROVED) {
            throw new RuntimeException("Only APPROVED indents can be converted to PO");
        }

        Supplier supplier = supplierRepo.findById(supplierId)
                .orElseThrow(() -> new RuntimeException("Supplier not found: " + supplierId));

        ProcurementDto.PORequest poReq = new ProcurementDto.PORequest();
        poReq.setSupplierId(supplierId);
        poReq.setNotes("Created from indent " + indent.getIndentNumber());
        poReq.setItems(indent.getItems().stream().map(item -> {
            ProcurementDto.POItemRequest pi = new ProcurementDto.POItemRequest();
            pi.setIngredientId(item.getIngredient().getId());
            pi.setQuantity(item.getQuantity());
            pi.setUnitPrice(item.getIngredient().getCostPerUnit());
            pi.setNotes(item.getNotes());
            return pi;
        }).collect(Collectors.toList()));

        ProcurementDto.POResponse po = createPO(indent.getBranch().getId(), poReq);

        // Link PO to indent
        PurchaseOrder savedPO = poRepo.findById(po.getId()).orElseThrow();
        indent.setStatus(MaterialIndent.IndentStatus.CONVERTED_TO_PO);
        indent.setPurchaseOrder(savedPO);
        indentRepo.save(indent);

        return po;
    }

    // ── PURCHASE ORDERS ───────────────────────────────────────────────────────

    public List<ProcurementDto.POResponse> getPOs(Long branchId, String status) {
        List<PurchaseOrder> pos;
        if (isAdmin() && branchId == null) {
            pos = poRepo.findAllByOrderByCreatedAtDesc();
        } else if (status != null && !status.isBlank()) {
            pos = poRepo.findByBranchIdAndStatusOrderByCreatedAtDesc(
                    branchId, PurchaseOrder.POStatus.valueOf(status.toUpperCase()));
        } else {
            pos = poRepo.findByBranchIdOrderByCreatedAtDesc(branchId);
        }
        return pos.stream().map(ProcurementDto.POResponse::from).collect(Collectors.toList());
    }

    public ProcurementDto.POResponse getPO(Long id) {
        return ProcurementDto.POResponse.from(
                poRepo.findById(id).orElseThrow(() -> new RuntimeException("PO not found: " + id)));
    }

    public ProcurementDto.POResponse createPO(Long branchId, ProcurementDto.PORequest req) {
        UserDetailsImpl caller = getCaller();
        Branch   branch   = branchRepo.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        Supplier supplier = supplierRepo.findById(req.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        // Branch users can only order from HQ-approved suppliers OR their own branch suppliers.
        // Admins bypass this check.
        if (!isAdmin()) {
            boolean isOwnBranchSupplier = supplier.getBranch() != null
                    && supplier.getBranch().getId().equals(branchId);
            boolean isHqApproved = supplier.isHqApproved();
            if (!isOwnBranchSupplier && !isHqApproved) {
                throw new RuntimeException(
                        "Supplier '" + supplier.getName() + "' is not approved for this branch. " +
                                "Only HQ-approved suppliers or your own branch suppliers can be used.");
            }
        }

        PurchaseOrder po = new PurchaseOrder();
        po.setBranch(branch);
        po.setSupplier(supplier);
        po.setPoNumber(generatePONumber());
        po.setStatus(PurchaseOrder.POStatus.DRAFT);
        po.setNotes(req.getNotes());
        if (req.getExpectedDate() != null && !req.getExpectedDate().isBlank()) {
            po.setExpectedDate(LocalDate.parse(req.getExpectedDate()));
        }
        userRepo.findById(caller.getId()).ifPresent(po::setCreatedBy);

        BigDecimal total = BigDecimal.ZERO;
        PurchaseOrder saved = poRepo.save(po);

        for (ProcurementDto.POItemRequest itemReq : req.getItems()) {
            Ingredient ing = ingredientRepo.findById(itemReq.getIngredientId())
                    .orElseThrow(() -> new RuntimeException("Ingredient not found: " + itemReq.getIngredientId()));
            POItem item = new POItem();
            item.setPurchaseOrder(saved);
            item.setIngredient(ing);
            item.setQuantity(itemReq.getQuantity());
            BigDecimal up = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : ing.getCostPerUnit();
            item.setUnitPrice(up);
            item.setTotalPrice(up.multiply(BigDecimal.valueOf(itemReq.getQuantity())).setScale(2, RoundingMode.HALF_UP));
            item.setNotes(itemReq.getNotes());
            saved.getItems().add(item);
            total = total.add(item.getTotalPrice());
        }

        saved.setTotalAmount(total.setScale(2, RoundingMode.HALF_UP));
        supplier.setTotalOrders(supplier.getTotalOrders() + 1);
        supplierRepo.save(supplier);

        return ProcurementDto.POResponse.from(poRepo.save(saved));
    }

    public ProcurementDto.POResponse updatePOStatus(Long id, String status) {
        PurchaseOrder po = poRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("PO not found: " + id));
        po.setStatus(PurchaseOrder.POStatus.valueOf(status.toUpperCase()));
        return ProcurementDto.POResponse.from(poRepo.save(po));
    }

    // ── GOODS RECEIVED NOTE ───────────────────────────────────────────────────

    public List<ProcurementDto.GRNResponse> getGRNs(Long branchId) {
        return grnRepo.findByBranchIdOrderByCreatedAtDesc(branchId)
                .stream().map(ProcurementDto.GRNResponse::from).collect(Collectors.toList());
    }

    public ProcurementDto.GRNResponse createGRN(Long branchId, ProcurementDto.GRNRequest req) {
        Branch branch = branchRepo.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));
        PurchaseOrder po = poRepo.findById(req.getPurchaseOrderId())
                .orElseThrow(() -> new RuntimeException("PO not found"));

        GoodsReceived grn = new GoodsReceived();
        grn.setGrnNumber(generateGRNNumber());
        grn.setPurchaseOrder(po);
        grn.setBranch(branch);
        grn.setStatus(GoodsReceived.GRNStatus.PENDING);
        grn.setReceivedBy(req.getReceivedBy());
        grn.setNotes(req.getNotes());
        if (req.getReceivedDate() != null && !req.getReceivedDate().isBlank()) {
            grn.setReceivedDate(LocalDate.parse(req.getReceivedDate()));
        }

        GoodsReceived saved = grnRepo.save(grn);

        for (ProcurementDto.GRNItemRequest itemReq : req.getItems()) {
            Ingredient ing = ingredientRepo.findById(itemReq.getIngredientId())
                    .orElseThrow(() -> new RuntimeException("Ingredient not found"));
            GRNItem item = new GRNItem();
            item.setGrn(saved);
            item.setIngredient(ing);
            item.setOrderedQuantity(itemReq.getOrderedQuantity());
            item.setReceivedQuantity(itemReq.getReceivedQuantity());
            item.setUnitPrice(itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : ing.getCostPerUnit());
            if (itemReq.getExpiryDate() != null && !itemReq.getExpiryDate().isBlank()) {
                item.setExpiryDate(LocalDate.parse(itemReq.getExpiryDate()));
            }
            item.setNotes(itemReq.getNotes());
            saved.getItems().add(item);
        }

        return ProcurementDto.GRNResponse.from(grnRepo.save(saved));
    }

    // Confirm GRN → auto triggers Stock-In for each item
    public ProcurementDto.GRNResponse confirmGRN(Long id) {
        UserDetailsImpl caller = getCaller();
        GoodsReceived grn = grnRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("GRN not found: " + id));

        if (grn.getStatus() != GoodsReceived.GRNStatus.PENDING) {
            throw new RuntimeException("GRN is not in PENDING state");
        }

        Long branchId = grn.getBranch().getId();

        // Auto stock-in each GRN item and track receivedQuantity on PO items
        PurchaseOrder po = grn.getPurchaseOrder();
        for (GRNItem item : grn.getItems()) {
            InventoryDto.StockInRequest stockIn = new InventoryDto.StockInRequest();
            stockIn.setIngredientId(item.getIngredient().getId());
            stockIn.setQuantity(item.getReceivedQuantity());
            stockIn.setUnitCost(item.getUnitPrice());
            stockIn.setSupplier(grn.getPurchaseOrder().getSupplier().getName());
            stockIn.setReferenceNo(grn.getGrnNumber());
            stockIn.setNotes("GRN confirmed: " + grn.getGrnNumber());
            if (item.getExpiryDate() != null) {
                stockIn.setExpiryDate(item.getExpiryDate().toString());
            }
            inventoryService.stockIn(branchId, stockIn);

            if (po != null && po.getItems() != null) {
                for (POItem poi : po.getItems()) {
                    if (poi.getIngredient().getId().equals(item.getIngredient().getId())) {
                        double currentRec = poi.getReceivedQuantity() != null ? poi.getReceivedQuantity() : 0.0;
                        poi.setReceivedQuantity(currentRec + item.getReceivedQuantity());
                        break;
                    }
                }
            }
        }

        // Mark GRN confirmed
        grn.setStatus(GoodsReceived.GRNStatus.CONFIRMED);
        grn.setConfirmedAt(LocalDateTime.now());
        userRepo.findById(caller.getId()).ifPresent(grn::setConfirmedBy);
        grnRepo.save(grn);

        // Update PO status
        if (po != null) {
            boolean allReceived = po.getItems().stream()
                    .allMatch(i -> (i.getReceivedQuantity() != null ? i.getReceivedQuantity() : 0.0) >= i.getQuantity());
            po.setStatus(allReceived ? PurchaseOrder.POStatus.RECEIVED : PurchaseOrder.POStatus.PARTIAL);
            poRepo.save(po);
        }

        return ProcurementDto.GRNResponse.from(grn);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void mapSupplier(ProcurementDto.SupplierRequest req, Supplier s) {
        s.setName(req.getName());
        s.setContactPerson(req.getContactPerson());
        s.setPhone(req.getPhone());
        s.setEmail(req.getEmail());
        s.setAddress(req.getAddress());
        s.setCategory(req.getCategory());
        s.setPaymentTerms(req.getPaymentTerms());
        s.setHqApproved(req.isHqApproved());
        s.setNotes(req.getNotes());
        s.setStatus(Supplier.SupplierStatus.ACTIVE);
    }

    private String generateIndentNumber() {
        return "IND-" + System.currentTimeMillis();
    }

    private String generatePONumber() {
        return "PO-" + System.currentTimeMillis();
    }

    private String generateGRNNumber() {
        return "GRN-" + System.currentTimeMillis();
    }

    private UserDetailsImpl getCaller() {
        return (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
    }

    private boolean isAdmin() {
        return getCaller().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}