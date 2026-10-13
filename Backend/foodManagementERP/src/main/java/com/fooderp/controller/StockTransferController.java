package com.fooderp.controller;

import com.fooderp.entity.*;
import com.fooderp.repository.*;
import com.fooderp.security.UserDetailsImpl;
import com.fooderp.service.InventoryService;
import com.fooderp.dto.InventoryDto;
import jakarta.transaction.Transactional;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transfers")
@CrossOrigin(origins = "*")
public class StockTransferController {

    @Autowired StockTransferRepository  transferRepo;
    @Autowired BranchRepository         branchRepo;
    @Autowired IngredientRepository     ingredientRepo;
    @Autowired UserRepository           userRepo;
    @Autowired InventoryItemRepository  inventoryRepo;
    @Autowired StockTransactionRepository txRepo;

    private static final AtomicLong COUNTER = new AtomicLong(System.currentTimeMillis() % 10000);

    private Long resolveBranch(Authentication auth, Long branchId) {
        UserDetailsImpl u = (UserDetailsImpl) auth.getPrincipal();
        boolean isAdmin = u.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return (isAdmin && branchId != null) ? branchId : u.getBranchId();
    }
    private UserDetailsImpl caller(Authentication auth) { return (UserDetailsImpl) auth.getPrincipal(); }

    // GET /api/transfers?branchId=&status=
    @GetMapping
    @Transactional
    public ResponseEntity<?> getAll(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String status,
            Authentication auth) {
        Long bid = resolveBranch(auth, branchId);
        if (bid == null) return ResponseEntity.badRequest().body("Branch not assigned");
        List<StockTransfer> list = status != null && !status.isBlank()
                ? transferRepo.findByBranchAndStatus(bid, StockTransfer.TransferStatus.valueOf(status.toUpperCase()))
                : transferRepo.findAllForBranch(bid);
        return ResponseEntity.ok(list.stream().map(this::toDto).collect(Collectors.toList()));
    }

    // POST /api/transfers — request a transfer
    @PostMapping
    @Transactional
    public ResponseEntity<?> create(@RequestBody TransferRequest req, Authentication auth) {
        try {
            Branch from = branchRepo.findById(req.getFromBranchId()).orElseThrow(() -> new RuntimeException("From-branch not found"));
            Branch to   = branchRepo.findById(req.getToBranchId()).orElseThrow(() -> new RuntimeException("To-branch not found"));

            StockTransfer t = new StockTransfer();
            t.setTransferNumber("TRF-" + String.format("%06d", COUNTER.incrementAndGet()));
            t.setFromBranch(from); t.setToBranch(to);
            t.setNotes(req.getNotes());
            t.setStatus(StockTransfer.TransferStatus.PENDING);
            userRepo.findById(caller(auth).getId()).ifPresent(t::setRequestedBy);

            BigDecimal total = BigDecimal.ZERO;
            for (TransferItemRequest ir : req.getItems()) {
                Ingredient ing = ingredientRepo.findById(ir.getIngredientId()).orElseThrow();
                StockTransferItem item = new StockTransferItem();
                item.setTransfer(t); item.setIngredient(ing);
                item.setRequestedQuantity(ir.getQuantity());
                BigDecimal cost = ing.getCostPerUnit().multiply(BigDecimal.valueOf(ir.getQuantity()));
                item.setUnitCost(ing.getCostPerUnit());
                total = total.add(cost);
                item.setNotes(ir.getNotes());
                t.getItems().add(item);
            }
            t.setTotalValue(total.setScale(2, RoundingMode.HALF_UP));
            return ResponseEntity.ok(toDto(transferRepo.save(t)));
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // PUT /api/transfers/{id}/approve
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public ResponseEntity<?> approve(@PathVariable Long id, Authentication auth) {
        return transferRepo.findById(id).map(t -> {
            if (t.getStatus() != StockTransfer.TransferStatus.PENDING)
                return ResponseEntity.badRequest().body((Object)"Only PENDING transfers can be approved");
            t.setStatus(StockTransfer.TransferStatus.APPROVED);
            t.setApprovedAt(LocalDateTime.now());
            userRepo.findById(caller(auth).getId()).ifPresent(t::setApprovedBy);
            return ResponseEntity.ok((Object) toDto(transferRepo.save(t)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // PUT /api/transfers/{id}/dispatch — deducts from source branch inventory
    @PutMapping("/{id}/dispatch")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public ResponseEntity<?> dispatch(@PathVariable Long id, Authentication auth) {
        return transferRepo.findById(id).map(t -> {
            if (t.getStatus() != StockTransfer.TransferStatus.APPROVED)
                return ResponseEntity.badRequest().body((Object)"Only APPROVED transfers can be dispatched");

            // Validate sufficient stock for all items before any deduction
            for (StockTransferItem item : t.getItems()) {
                double qty = item.getRequestedQuantity();
                var invOpt = inventoryRepo.findByIngredientIdAndBranchId(item.getIngredient().getId(), t.getFromBranch().getId());
                if (invOpt.isEmpty() || invOpt.get().getCurrentQuantity() < qty) {
                    double avail = invOpt.map(InventoryItem::getCurrentQuantity).orElse(0.0);
                    return ResponseEntity.badRequest().body((Object)("Insufficient stock for " + item.getIngredient().getName() + ": requested " + qty + ", available " + avail));
                }
            }

            // Deduct from source branch
            for (StockTransferItem item : t.getItems()) {
                double qty = item.getRequestedQuantity();
                item.setDispatchedQuantity(qty);

                InventoryItem inv = inventoryRepo.findByIngredientIdAndBranchId(item.getIngredient().getId(), t.getFromBranch().getId()).orElseThrow();
                inv.setCurrentQuantity(inv.getCurrentQuantity() - qty);
                inventoryRepo.save(inv);

                StockTransaction tx = new StockTransaction();
                tx.setIngredient(item.getIngredient()); tx.setBranch(t.getFromBranch());
                tx.setType(StockTransaction.TransactionType.TRANSFER_OUT);
                tx.setQuantity(qty); tx.setUnitCost(item.getUnitCost());
                tx.setBalanceAfter(inv.getCurrentQuantity());
                tx.setReferenceNo(t.getTransferNumber());
                tx.setNotes("Transfer to " + t.getToBranch().getName());
                userRepo.findById(caller(auth).getId()).ifPresent(tx::setCreatedBy);
                txRepo.save(tx);
            }
            t.setStatus(StockTransfer.TransferStatus.DISPATCHED);
            t.setDispatchedAt(LocalDateTime.now());
            return ResponseEntity.ok((Object) toDto(transferRepo.save(t)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // PUT /api/transfers/{id}/receive — adds to destination branch inventory
    @PutMapping("/{id}/receive")
    @Transactional
    public ResponseEntity<?> receive(@PathVariable Long id, @RequestBody(required = false) Map<String, Object> body, Authentication auth) {
        return transferRepo.findById(id).map(t -> {
            if (t.getStatus() != StockTransfer.TransferStatus.DISPATCHED)
                return ResponseEntity.badRequest().body((Object)"Only DISPATCHED transfers can be received");

            for (StockTransferItem item : t.getItems()) {
                double qty = item.getDispatchedQuantity() != null ? item.getDispatchedQuantity() : item.getRequestedQuantity();
                item.setReceivedQuantity(qty);

                Long toId = t.getToBranch().getId();
                Long ingId = item.getIngredient().getId();
                InventoryItem inv = inventoryRepo.findByIngredientIdAndBranchId(ingId, toId).orElseGet(() -> {
                    InventoryItem ni = new InventoryItem();
                    ni.setIngredient(item.getIngredient()); ni.setBranch(t.getToBranch());
                    ni.setCurrentQuantity(0.0); ni.setMinStockLevel(0.0);
                    return ni;
                });
                inv.setCurrentQuantity(inv.getCurrentQuantity() + qty);
                inventoryRepo.save(inv);

                StockTransaction tx = new StockTransaction();
                tx.setIngredient(item.getIngredient()); tx.setBranch(t.getToBranch());
                tx.setType(StockTransaction.TransactionType.TRANSFER_IN);
                tx.setQuantity(qty); tx.setUnitCost(item.getUnitCost());
                tx.setBalanceAfter(inv.getCurrentQuantity());
                tx.setReferenceNo(t.getTransferNumber());
                tx.setNotes("Transfer from " + t.getFromBranch().getName());
                userRepo.findById(caller(auth).getId()).ifPresent(tx::setCreatedBy);
                txRepo.save(tx);
            }
            t.setStatus(StockTransfer.TransferStatus.RECEIVED);
            t.setReceivedAt(LocalDateTime.now());
            userRepo.findById(caller(auth).getId()).ifPresent(t::setReceivedBy);
            return ResponseEntity.ok((Object) toDto(transferRepo.save(t)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // PUT /api/transfers/{id}/cancel
    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Transactional
    public ResponseEntity<?> cancel(@PathVariable Long id, Authentication auth) {
        return transferRepo.findById(id).map(t -> {
            if (t.getStatus() == StockTransfer.TransferStatus.RECEIVED)
                return ResponseEntity.badRequest().body((Object)"Received transfers cannot be cancelled");
            if (t.getStatus() == StockTransfer.TransferStatus.CANCELLED)
                return ResponseEntity.badRequest().body((Object)"Transfer is already cancelled");

            // If already DISPATCHED, stock was deducted from source branch; refund it back!
            if (t.getStatus() == StockTransfer.TransferStatus.DISPATCHED) {
                for (StockTransferItem item : t.getItems()) {
                    double qty = item.getDispatchedQuantity() != null ? item.getDispatchedQuantity() : item.getRequestedQuantity();
                    InventoryItem inv = inventoryRepo.findByIngredientIdAndBranchId(item.getIngredient().getId(), t.getFromBranch().getId()).orElseGet(() -> {
                        InventoryItem ni = new InventoryItem();
                        ni.setIngredient(item.getIngredient()); ni.setBranch(t.getFromBranch());
                        ni.setCurrentQuantity(0.0); ni.setMinStockLevel(0.0);
                        return ni;
                    });
                    inv.setCurrentQuantity(inv.getCurrentQuantity() + qty);
                    inventoryRepo.save(inv);

                    StockTransaction tx = new StockTransaction();
                    tx.setIngredient(item.getIngredient()); tx.setBranch(t.getFromBranch());
                    tx.setType(StockTransaction.TransactionType.TRANSFER_IN);
                    tx.setQuantity(qty); tx.setUnitCost(item.getUnitCost());
                    tx.setBalanceAfter(inv.getCurrentQuantity());
                    tx.setReferenceNo(t.getTransferNumber());
                    tx.setNotes("Transfer cancelled: refunded to " + t.getFromBranch().getName());
                    if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl) {
                        userRepo.findById(caller(auth).getId()).ifPresent(tx::setCreatedBy);
                    }
                    txRepo.save(tx);
                }
            }
            t.setStatus(StockTransfer.TransferStatus.CANCELLED);
            return ResponseEntity.ok((Object) toDto(transferRepo.save(t)));
        }).orElse(ResponseEntity.notFound().build());
    }

    private TransferDto toDto(StockTransfer t) {
        TransferDto d = new TransferDto();
        d.setId(t.getId()); d.setTransferNumber(t.getTransferNumber());
        d.setFromBranchId(t.getFromBranch().getId()); d.setFromBranchName(t.getFromBranch().getName());
        d.setToBranchId(t.getToBranch().getId()); d.setToBranchName(t.getToBranch().getName());
        d.setStatus(t.getStatus().name()); d.setNotes(t.getNotes());
        d.setTotalValue(t.getTotalValue()); d.setTransferDate(t.getTransferDate() != null ? t.getTransferDate().toString() : null);
        d.setRequestedBy(t.getRequestedBy() != null ? t.getRequestedBy().getFullName() : null);
        d.setApprovedBy(t.getApprovedBy() != null ? t.getApprovedBy().getFullName() : null);
        d.setCreatedAt(t.getCreatedAt() != null ? t.getCreatedAt().toString() : null);
        d.setItems(t.getItems().stream().map(item -> {
            TransferItemDto id2 = new TransferItemDto();
            id2.setIngredientId(item.getIngredient().getId()); id2.setIngredientName(item.getIngredient().getName());
            id2.setUnit(item.getIngredient().getUnit()); id2.setRequestedQuantity(item.getRequestedQuantity());
            id2.setDispatchedQuantity(item.getDispatchedQuantity()); id2.setReceivedQuantity(item.getReceivedQuantity());
            id2.setUnitCost(item.getUnitCost()); id2.setNotes(item.getNotes()); return id2;
        }).collect(Collectors.toList()));
        return d;
    }

    @Data public static class TransferRequest { private Long fromBranchId, toBranchId; private String notes; private List<TransferItemRequest> items; }
    @Data public static class TransferItemRequest { private Long ingredientId; private Double quantity; private String notes; }
    @Data public static class TransferDto {
        private Long id, fromBranchId, toBranchId; private String transferNumber, status, notes, fromBranchName, toBranchName, requestedBy, approvedBy, transferDate, createdAt;
        private BigDecimal totalValue; private List<TransferItemDto> items;
    }
    @Data public static class TransferItemDto {
        private Long ingredientId; private String ingredientName, unit, notes;
        private Double requestedQuantity, dispatchedQuantity, receivedQuantity; private BigDecimal unitCost;
    }
}