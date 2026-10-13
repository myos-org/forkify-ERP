package com.fooderp.service;

import com.fooderp.entity.*;
import com.fooderp.repository.*;
import com.fooderp.security.UserDetailsImpl;
import jakarta.transaction.Transactional;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class MenuService {

    @Autowired private MenuRepository           menuRepo;
    @Autowired private MenuItemRepository       menuItemRepo;
    @Autowired private BranchMenuPriceRepository priceRepo;
    @Autowired private RecipeRepository          recipeRepo;
    @Autowired private BranchRepository          branchRepo;
    @Autowired private UserRepository            userRepo;

    // ── List menus ────────────────────────────────────────────────────────────
    public List<MenuResponse> getAllMenus() {
        return menuRepo.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public List<MenuResponse> getActiveMenus() {
        return menuRepo.findByActiveTrueOrderByNameAsc().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    public MenuResponse getById(Long id) {
        return toResponse(menuRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu not found: " + id)));
    }

    // ── Create menu ────────────────────────────────────────────────────────────
    public MenuResponse create(MenuRequest req) {
        UserDetailsImpl caller = getCaller();
        Menu menu = new Menu();
        mapRequest(req, menu);
        userRepo.findById(caller.getId()).ifPresent(menu::setCreatedBy);
        Menu saved = menuRepo.save(menu);
        saveItems(saved, req.getItems());
        return toResponse(menuRepo.findById(saved.getId()).orElseThrow());
    }

    // ── Update menu ────────────────────────────────────────────────────────────
    public MenuResponse update(Long id, MenuRequest req) {
        Menu menu = menuRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu not found: " + id));
        mapRequest(req, menu);
        menu.getItems().clear();
        menuItemRepo.deleteAll(menuItemRepo.findByMenuIdOrderBySortOrderAsc(id));
        menuRepo.flush();
        saveItems(menu, req.getItems());
        Menu saved = menuRepo.save(menu);
        return toResponse(saved);
    }

    // ── Activate / deactivate ─────────────────────────────────────────────────
    public MenuResponse setActive(Long id, boolean active) {
        Menu menu = menuRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu not found: " + id));
        menu.setActive(active);
        return toResponse(menuRepo.save(menu));
    }

    // ── Push menu to all branches ─────────────────────────────────────────────
    public String pushToBranches(Long menuId) {
        Menu menu = menuRepo.findById(menuId)
                .orElseThrow(() -> new RuntimeException("Menu not found: " + menuId));
        List<Branch> branches = branchRepo.findByActiveTrue().stream()
                .filter(b -> b.getType() == Branch.BranchType.BRANCH)
                .collect(Collectors.toList());
        // For each branch, create BranchMenuPrice entries at base price if not already set
        for (Branch branch : branches) {
            for (MenuItem item : menu.getItems()) {
                if (priceRepo.findByMenuItemIdAndBranchId(item.getId(), branch.getId()).isEmpty()) {
                    BranchMenuPrice price = new BranchMenuPrice();
                    price.setMenuItem(item);
                    price.setBranch(branch);
                    price.setCustomPrice(null); // use base price
                    price.setAvailable(true);
                    priceRepo.save(price);
                }
            }
        }
        return "Menu pushed to " + branches.size() + " branches";
    }

    // ── Delete ─────────────────────────────────────────────────────────────────
    public void delete(Long id) {
        menuRepo.findById(id).ifPresent(menuRepo::delete);
    }

    // ── Get branch pricing for a menu ─────────────────────────────────────────
    public List<BranchPriceResponse> getBranchPricing(Long menuId, Long branchId) {
        List<MenuItem> items = menuItemRepo.findByMenuIdOrderBySortOrderAsc(menuId);
        return items.stream().map(item -> {
            BranchPriceResponse r = new BranchPriceResponse();
            r.setMenuItemId(item.getId());
            r.setRecipeName(item.getRecipe().getName());
            r.setDisplayName(item.getDisplayName() != null ? item.getDisplayName() : item.getRecipe().getName());
            r.setMenuCategory(item.getMenuCategory());
            r.setBasePrice(item.getBasePrice());
            priceRepo.findByMenuItemIdAndBranchId(item.getId(), branchId).ifPresent(p -> {
                r.setBranchPriceId(p.getId());
                r.setCustomPrice(p.getCustomPrice());
                r.setAvailableAtBranch(p.isAvailable());
            });
            return r;
        }).collect(Collectors.toList());
    }

    // ── Save / update branch price ─────────────────────────────────────────────
    public BranchPriceResponse saveBranchPrice(Long menuItemId, Long branchId,
                                               BigDecimal customPrice, boolean available) {
        MenuItem item = menuItemRepo.findById(menuItemId)
                .orElseThrow(() -> new RuntimeException("Menu item not found"));
        Branch branch = branchRepo.findById(branchId)
                .orElseThrow(() -> new RuntimeException("Branch not found"));

        BranchMenuPrice price = priceRepo.findByMenuItemIdAndBranchId(menuItemId, branchId)
                .orElse(new BranchMenuPrice());
        price.setMenuItem(item);
        price.setBranch(branch);
        price.setCustomPrice(customPrice);
        price.setAvailable(available);
        BranchMenuPrice saved = priceRepo.save(price);

        BranchPriceResponse r = new BranchPriceResponse();
        r.setBranchPriceId(saved.getId());
        r.setMenuItemId(menuItemId);
        r.setRecipeName(item.getRecipe().getName());
        r.setBasePrice(item.getBasePrice());
        r.setCustomPrice(saved.getCustomPrice());
        r.setAvailableAtBranch(saved.isAvailable());
        return r;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private void mapRequest(MenuRequest req, Menu menu) {
        menu.setName(req.getName());
        menu.setDescription(req.getDescription());
        menu.setSeason(req.getSeason());
        menu.setHqMenu(req.isHqMenu());
        menu.setActive(req.isActive());
        if (req.getValidFrom() != null && !req.getValidFrom().isBlank())
            menu.setValidFrom(LocalDate.parse(req.getValidFrom()));
        if (req.getValidTo() != null && !req.getValidTo().isBlank())
            menu.setValidTo(LocalDate.parse(req.getValidTo()));
    }

    private void saveItems(Menu menu, List<MenuItemRequest> itemReqs) {
        if (itemReqs == null) return;
        int order = 0;
        for (MenuItemRequest ir : itemReqs) {
            Recipe recipe = recipeRepo.findById(ir.getRecipeId())
                    .orElseThrow(() -> new RuntimeException("Recipe not found: " + ir.getRecipeId()));
            MenuItem item = new MenuItem();
            item.setMenu(menu);
            item.setRecipe(recipe);
            item.setDisplayName(ir.getDisplayName());
            item.setBasePrice(ir.getBasePrice() != null ? ir.getBasePrice() : BigDecimal.ZERO);
            item.setMenuCategory(ir.getMenuCategory());
            item.setDescription(ir.getDescription());
            item.setAvailable(true);
            item.setSortOrder(order++);
            menuItemRepo.save(item);
        }
    }

    private MenuResponse toResponse(Menu m) {
        MenuResponse r = new MenuResponse();
        r.setId(m.getId());
        r.setName(m.getName());
        r.setDescription(m.getDescription());
        r.setSeason(m.getSeason());
        r.setActive(m.isActive());
        r.setHqMenu(m.isHqMenu());
        r.setValidFrom(m.getValidFrom() != null ? m.getValidFrom().toString() : null);
        r.setValidTo(m.getValidTo() != null ? m.getValidTo().toString() : null);
        r.setCreatedAt(m.getCreatedAt() != null ? m.getCreatedAt().toString() : null);
        r.setItemCount(m.getItems().size());
        r.setItems(m.getItems().stream().map(item -> {
            MenuItemResponse ir = new MenuItemResponse();
            ir.setId(item.getId());
            ir.setRecipeId(item.getRecipe().getId());
            ir.setRecipeName(item.getRecipe().getName());
            ir.setDisplayName(item.getDisplayName() != null ? item.getDisplayName() : item.getRecipe().getName());
            ir.setBasePrice(item.getBasePrice());
            ir.setMenuCategory(item.getMenuCategory());
            ir.setDescription(item.getDescription());
            ir.setAvailable(item.isAvailable());
            ir.setSortOrder(item.getSortOrder());
            // Include live ingredient cost
            BigDecimal cost = item.getRecipe().getIngredients().stream()
                    .map(ri -> ri.getIngredient().getCostPerUnit().multiply(BigDecimal.valueOf(ri.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP);
            ir.setIngredientCost(cost);
            if (item.getBasePrice().compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal margin = item.getBasePrice().subtract(cost)
                        .divide(item.getBasePrice(), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)).setScale(1, RoundingMode.HALF_UP);
                ir.setMarginPct(margin);
            }
            // Map nutrition data from Recipe so AI assistant has calorie info
            Recipe recipe = item.getRecipe();
            ir.setCalories(recipe.getCalories() != null ? recipe.getCalories() : 0.0);
            ir.setProtein(recipe.getProtein()   != null ? recipe.getProtein()   : 0.0);
            ir.setCarbs(recipe.getCarbs()       != null ? recipe.getCarbs()     : 0.0);
            ir.setFat(recipe.getFat()           != null ? recipe.getFat()       : 0.0);
            ir.setFiber(recipe.getFiber()       != null ? recipe.getFiber()     : 0.0);
            return ir;
        }).collect(Collectors.toList()));
        return r;
    }

    private UserDetailsImpl getCaller() {
        return (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
    }

    // ── DTOs ──────────────────────────────────────────────────────────────────
    @Data public static class MenuRequest {
        private String name, description, season, validFrom, validTo;
        private boolean active, hqMenu;
        private List<MenuItemRequest> items = new ArrayList<>();
    }
    @Data public static class MenuItemRequest {
        private Long recipeId;
        private String displayName, menuCategory, description;
        private BigDecimal basePrice;
    }
    @Data public static class MenuResponse {
        private Long id;
        private String name, description, season, validFrom, validTo, createdAt;
        private boolean active, hqMenu;
        private int itemCount;
        private List<MenuItemResponse> items;
    }
    @Data public static class MenuItemResponse {
        private Long id, recipeId;
        private String recipeName, displayName, menuCategory, description;
        private BigDecimal basePrice, ingredientCost, marginPct;
        private boolean available;
        private int sortOrder;
        // Nutrition fields pulled from the linked Recipe
        private Double calories;
        private Double protein;
        private Double carbs;
        private Double fat;
        private Double fiber;
    }
    @Data public static class BranchPriceResponse {
        private Long branchPriceId, menuItemId;
        private String recipeName, displayName, menuCategory;
        private BigDecimal basePrice, customPrice;
        private boolean availableAtBranch = true;
    }
}