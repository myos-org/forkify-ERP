package com.fooderp.service;

import com.fooderp.dto.RecipeDto;
import com.fooderp.entity.*;
import com.fooderp.repository.*;
import com.fooderp.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class RecipeService {

    @Autowired private RecipeRepository           recipeRepo;
    @Autowired private RecipeIngredientRepository riRepo;
    @Autowired private RecipeStepRepository       recipeStepRepo;
    @Autowired private IngredientRepository       ingredientRepo;
    @Autowired private BranchRepository           branchRepo;
    @Autowired private UserRepository             userRepo;

    // ── List recipes visible to caller ───────────────────────────────────────
    public List<RecipeDto.Summary> getRecipes(String search, String category) {
        UserDetailsImpl caller = getCaller();
        List<Recipe> recipes;

        if (isAdmin(caller)) {
            recipes = recipeRepo.findAll();
        } else {
            Long branchId = caller.getBranchId();
            recipes = recipeRepo.findAll().stream()
                    .filter(r -> r.isHqOwned()
                            || (r.getBranch() != null && r.getBranch().getId().equals(branchId)))
                    .collect(Collectors.toList());
        }

        if (search != null && !search.isBlank()) {
            String q = search.toLowerCase();
            recipes = recipes.stream()
                    .filter(r -> r.getName().toLowerCase().contains(q)
                            || (r.getDescription() != null && r.getDescription().toLowerCase().contains(q))
                            || (r.getTags() != null && r.getTags().toLowerCase().contains(q)))
                    .collect(Collectors.toList());
        }

        if (category != null && !category.isBlank()) {
            recipes = recipes.stream()
                    .filter(r -> category.equalsIgnoreCase(r.getCategory()))
                    .collect(Collectors.toList());
        }

        return recipes.stream()
                .map(r -> RecipeDto.Summary.from(r, calcTotalCost(r)))
                .collect(Collectors.toList());
    }

    public List<String> getCategories() {
        return recipeRepo.findAll().stream()
                .map(Recipe::getCategory)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    // ── Get single recipe ─────────────────────────────────────────────────────
    public RecipeDto.Response getRecipeById(Long id) {
        Recipe recipe = recipeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + id));
        checkReadAccess(recipe);
        return RecipeDto.Response.from(recipe, calcTotalCost(recipe));
    }

    // ── Create recipe ─────────────────────────────────────────────────────────
    public RecipeDto.Response createRecipe(RecipeDto.Request req) {
        UserDetailsImpl caller = getCaller();

        Recipe recipe = new Recipe();
        mapRequestToEntity(req, recipe);

        if (!isAdmin(caller) && caller.getBranchId() != null) {
            branchRepo.findById(caller.getBranchId()).ifPresent(recipe::setBranch);
        }

        userRepo.findById(caller.getId()).ifPresent(recipe::setCreatedBy);
        Recipe saved = recipeRepo.save(recipe);

        // Save ingredients
        saveIngredients(saved, req.getIngredients());

        // ── Save cooking steps ────────────────────────────────────────────────
        if (req.getSteps() != null && !req.getSteps().isEmpty()) {
            saveSteps(saved, req.getSteps());
        }

        Recipe fresh = recipeRepo.findById(saved.getId()).orElseThrow();
        return RecipeDto.Response.from(fresh, calcTotalCost(fresh));
    }

    // ── Update recipe ─────────────────────────────────────────────────────────
    public RecipeDto.Response updateRecipe(Long id, RecipeDto.Request req) {
        Recipe recipe = recipeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + id));
        checkWriteAccess(recipe);

        mapRequestToEntity(req, recipe);
        if (recipe.getIngredients() != null) {
            recipe.getIngredients().clear();
        }
        if (recipe.getSteps() != null) {
            recipe.getSteps().clear();
        }
        Recipe saved = recipeRepo.save(recipe);
        riRepo.deleteByRecipeId(id);
        recipeStepRepo.deleteByRecipeId(id);

        // Save ingredients
        saveIngredients(saved, req.getIngredients());

        // ── Replace cooking steps: re-save from request ────────
        if (req.getSteps() != null && !req.getSteps().isEmpty()) {
            saveSteps(saved, req.getSteps());
        }

        Recipe fresh = recipeRepo.findById(saved.getId()).orElseThrow();
        return RecipeDto.Response.from(fresh, calcTotalCost(fresh));
    }

    // ── Delete recipe ─────────────────────────────────────────────────────────
    public void deleteRecipe(Long id) {
        Recipe recipe = recipeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + id));
        checkWriteAccess(recipe);
        recipeStepRepo.deleteByRecipeId(id);
        recipeRepo.delete(recipe);
    }

    // ── Add a single step (used by POST /recipes/{id}/steps endpoint) ─────────
    public RecipeStep addStep(Long recipeId, Integer stepNumber, String title,
                              String instruction, Integer durationMinutes) {
        Recipe recipe = recipeRepo.findById(recipeId)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + recipeId));
        checkWriteAccess(recipe);

        RecipeStep step = new RecipeStep();
        step.setRecipe(recipe);
        step.setStepNumber(stepNumber != null ? stepNumber
                : recipeStepRepo.findByRecipeIdOrderByStepNumberAsc(recipeId).size() + 1);
        step.setTitle(title != null ? title : "");
        step.setInstruction(instruction != null ? instruction : "");
        step.setDurationMinutes(durationMinutes);
        return recipeStepRepo.save(step);
    }

    // ── Cost breakdown ─────────────────────────────────────────────────────────
    public RecipeDto.CostBreakdown getCostBreakdown(Long id, Integer servings) {
        Recipe recipe = recipeRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Recipe not found: " + id));
        checkReadAccess(recipe);
        int srv = (servings != null && servings > 0) ? servings : recipe.getServings();
        return RecipeDto.CostBreakdown.from(recipe, srv, calcTotalCost(recipe));
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private void mapRequestToEntity(RecipeDto.Request req, Recipe recipe) {
        recipe.setName(req.getName());
        recipe.setDescription(req.getDescription());
        recipe.setCategory(req.getCategory());
        recipe.setServings(req.getServings() != null ? req.getServings() : 4);
        recipe.setPrepTime(req.getPrepTime() != null ? req.getPrepTime() : 0);
        recipe.setCookTime(req.getCookTime() != null ? req.getCookTime() : 0);
        recipe.setHqOwned(req.isHqOwned());
        recipe.setTags(req.getTags());
        recipe.setAllergens(req.getAllergens());
        recipe.setImageUrl(req.getImageUrl());
        recipe.setCalories(req.getCalories());
        recipe.setProtein(req.getProtein());
        recipe.setCarbs(req.getCarbs());
        recipe.setFat(req.getFat());
        recipe.setFiber(req.getFiber());
        if (req.getStatus() != null) {
            try {
                recipe.setStatus(Recipe.RecipeStatus.valueOf(req.getStatus().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
    }

    private void saveIngredients(Recipe recipe, List<RecipeDto.IngredientRequest> items) {
        if (items == null) return;
        for (RecipeDto.IngredientRequest ir : items) {
            Ingredient ing = ingredientRepo.findById(ir.getIngredientId())
                    .orElseThrow(() -> new RuntimeException("Ingredient not found: " + ir.getIngredientId()));
            RecipeIngredient ri = new RecipeIngredient();
            ri.setRecipe(recipe);
            ri.setIngredient(ing);
            ri.setQuantity(ir.getQuantity() != null ? ir.getQuantity() : 0.0);
            ri.setUnit(ir.getUnit() != null ? ir.getUnit() : ing.getUnit());
            ri.setNotes(ir.getNotes());
            RecipeIngredient savedRi = riRepo.save(ri);
            recipe.getIngredients().add(savedRi);
        }
    }

    /**
     * Saves a list of step requests to the recipe_steps table.
     * Called during both createRecipe and updateRecipe.
     */
    private void saveSteps(Recipe recipe, List<RecipeDto.StepRequest> stepRequests) {
        if (stepRequests == null) return;
        for (int i = 0; i < stepRequests.size(); i++) {
            RecipeDto.StepRequest sr = stepRequests.get(i);
            RecipeStep step = new RecipeStep();
            step.setRecipe(recipe);
            // Always use position index+1 so stepNumbers are clean even if client sent wrong numbers
            step.setStepNumber(i + 1);
            step.setTitle(sr.getTitle() != null ? sr.getTitle() : "");
            step.setInstruction(sr.getInstruction() != null ? sr.getInstruction() : "");
            step.setDurationMinutes(sr.getDurationMinutes());
            recipeStepRepo.save(step);
        }
    }

    private BigDecimal calcTotalCost(Recipe recipe) {
        return recipe.getIngredients().stream()
                .map(ri -> ri.getIngredient().getCostPerUnit()
                        .multiply(BigDecimal.valueOf(ri.getQuantity()))
                        .setScale(2, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void checkReadAccess(Recipe recipe) {
        UserDetailsImpl caller = getCaller();
        if (isAdmin(caller) || recipe.isHqOwned()) return;
        if (recipe.getBranch() == null || !recipe.getBranch().getId().equals(caller.getBranchId())) {
            throw new AccessDeniedException("You do not have access to this recipe");
        }
    }

    private void checkWriteAccess(Recipe recipe) {
        UserDetailsImpl caller = getCaller();
        if (isAdmin(caller)) return;
        if (recipe.isHqOwned()) {
            throw new AccessDeniedException("HQ-owned recipes cannot be modified by branch users");
        }
        if (recipe.getBranch() == null
                || !recipe.getBranch().getId().equals(caller.getBranchId())) {
            throw new AccessDeniedException("You can only edit your own branch's recipes");
        }
    }

    private UserDetailsImpl getCaller() {
        return (UserDetailsImpl) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
    }

    private boolean isAdmin(UserDetailsImpl user) {
        return user.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}