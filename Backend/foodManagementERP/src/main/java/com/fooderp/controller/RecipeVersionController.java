package com.fooderp.controller;

import com.fooderp.entity.Recipe;
import com.fooderp.entity.RecipeIngredient;
import com.fooderp.entity.RecipeVersion;
import com.fooderp.repository.IngredientRepository;
import com.fooderp.repository.RecipeIngredientRepository;
import com.fooderp.repository.RecipeRepository;
import com.fooderp.repository.RecipeVersionRepository;
import com.fooderp.repository.UserRepository;
import com.fooderp.security.UserDetailsImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/recipe-versions")
@CrossOrigin(origins = "*")
public class RecipeVersionController {

    @Autowired RecipeVersionRepository      versionRepo;
    @Autowired RecipeRepository             recipeRepo;
    @Autowired UserRepository               userRepo;
    @Autowired IngredientRepository         ingredientRepo;
    @Autowired RecipeIngredientRepository   riRepo;
    private final ObjectMapper mapper = new ObjectMapper();

    private UserDetailsImpl caller(Authentication auth) { return (UserDetailsImpl) auth.getPrincipal(); }

    // GET /api/recipe-versions/{recipeId}
    @GetMapping("/{recipeId}")
    public ResponseEntity<?> getVersions(@PathVariable Long recipeId) {
        List<RecipeVersion> versions = versionRepo.findByRecipeIdOrderByVersionDesc(recipeId);
        return ResponseEntity.ok(versions.stream().map(this::toDto).collect(Collectors.toList()));
    }

    // GET /api/recipe-versions/{recipeId}/{version}
    @GetMapping("/{recipeId}/{version}")
    public ResponseEntity<?> getVersion(@PathVariable Long recipeId, @PathVariable Integer version) {
        return versionRepo.findByRecipeIdOrderByVersionDesc(recipeId).stream()
                .filter(v -> v.getVersion().equals(version)).findFirst()
                .map(v -> ResponseEntity.ok(toDto(v)))
                .orElse(ResponseEntity.notFound().build());
    }

    // POST /api/recipe-versions/{recipeId}/snapshot — save current recipe as a version
    @PostMapping("/{recipeId}/snapshot")
    public ResponseEntity<?> saveSnapshot(
            @PathVariable Long recipeId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication auth) {
        try {
            Recipe recipe = recipeRepo.findById(recipeId)
                    .orElseThrow(() -> new RuntimeException("Recipe not found"));

            int nextVersion = versionRepo.countByRecipeId(recipeId) + 1;

            // Build snapshot
            Map<String, Object> snapshot = new HashMap<>();
            snapshot.put("id", recipe.getId()); snapshot.put("name", recipe.getName());
            snapshot.put("category", recipe.getCategory()); snapshot.put("servings", recipe.getServings());
            snapshot.put("prepTime", recipe.getPrepTime()); snapshot.put("cookTime", recipe.getCookTime());
            snapshot.put("description", recipe.getDescription()); snapshot.put("tags", recipe.getTags());
            snapshot.put("allergens", recipe.getAllergens()); snapshot.put("calories", recipe.getCalories());
            snapshot.put("protein", recipe.getProtein()); snapshot.put("carbs", recipe.getCarbs());
            snapshot.put("fat", recipe.getFat()); snapshot.put("fiber", recipe.getFiber());

            List<Map<String, Object>> ingredients = recipe.getIngredients().stream().map(ri -> {
                Map<String, Object> m = new HashMap<>();
                m.put("ingredientId", ri.getIngredient().getId());
                m.put("ingredientName", ri.getIngredient().getName());
                m.put("quantity", ri.getQuantity()); m.put("unit", ri.getUnit() != null ? ri.getUnit() : ri.getIngredient().getUnit());
                m.put("notes", ri.getNotes());
                m.put("costPerUnit", ri.getIngredient().getCostPerUnit());
                return m;
            }).collect(Collectors.toList());
            snapshot.put("ingredients", ingredients);

            BigDecimal totalCost = recipe.getIngredients().stream()
                    .map(ri -> ri.getIngredient().getCostPerUnit().multiply(BigDecimal.valueOf(ri.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal costPerServing = recipe.getServings() > 0
                    ? totalCost.divide(BigDecimal.valueOf(recipe.getServings()), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

            RecipeVersion rv = new RecipeVersion();
            rv.setRecipe(recipe); rv.setVersion(nextVersion);
            rv.setSnapshotJson(mapper.writeValueAsString(snapshot));
            rv.setCostPerServing(costPerServing);
            rv.setChangeSummary(body != null ? body.getOrDefault("summary", "Version " + nextVersion) : "Version " + nextVersion);
            userRepo.findById(caller(auth).getId()).ifPresent(rv::setCreatedBy);

            return ResponseEntity.ok(toDto(versionRepo.save(rv)));
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    // PUT /api/recipe-versions/{recipeId}/restore/{version} — restore a past version
    @PutMapping("/{recipeId}/restore/{version}")
    public ResponseEntity<?> restore(@PathVariable Long recipeId, @PathVariable Integer version) {
        try {
            RecipeVersion rv = versionRepo.findByRecipeIdOrderByVersionDesc(recipeId).stream()
                    .filter(v -> v.getVersion().equals(version)).findFirst()
                    .orElseThrow(() -> new RuntimeException("Version not found"));

            Map<String, Object> snap = mapper.readValue(rv.getSnapshotJson(), Map.class);
            Recipe recipe = recipeRepo.findById(recipeId).orElseThrow();
            recipe.setName((String) snap.get("name")); recipe.setCategory((String) snap.get("category"));
            recipe.setDescription((String) snap.get("description")); recipe.setTags((String) snap.get("tags"));
            recipe.setAllergens((String) snap.get("allergens"));
            if (snap.get("servings") != null) recipe.setServings(((Number) snap.get("servings")).intValue());
            if (snap.get("prepTime") != null) recipe.setPrepTime(((Number) snap.get("prepTime")).intValue());
            if (snap.get("cookTime") != null) recipe.setCookTime(((Number) snap.get("cookTime")).intValue());

            if (snap.get("ingredients") != null) {
                recipe.getIngredients().clear();
                List<?> rawList = (List<?>) snap.get("ingredients");
                for (Object itemObj : rawList) {
                    if (itemObj instanceof Map) {
                        Map<?, ?> im = (Map<?, ?>) itemObj;
                        Long ingId = ((Number) im.get("ingredientId")).longValue();
                        Double qty = im.get("quantity") != null ? ((Number) im.get("quantity")).doubleValue() : 0.0;
                        String unit = (String) im.get("unit");
                        String notes = (String) im.get("notes");
                        ingredientRepo.findById(ingId).ifPresent(ing -> {
                            RecipeIngredient ri = new RecipeIngredient();
                            ri.setRecipe(recipe);
                            ri.setIngredient(ing);
                            ri.setQuantity(qty);
                            ri.setUnit(unit != null ? unit : ing.getUnit());
                            ri.setNotes(notes);
                            recipe.getIngredients().add(ri);
                        });
                    }
                }
            }

            recipeRepo.save(recipe);

            return ResponseEntity.ok(Map.of("message", "Recipe restored to version " + version, "version", version));
        } catch (Exception e) { return ResponseEntity.badRequest().body(e.getMessage()); }
    }

    private VersionDto toDto(RecipeVersion rv) {
        VersionDto d = new VersionDto();
        d.setId(rv.getId()); d.setVersion(rv.getVersion());
        d.setRecipeId(rv.getRecipe().getId()); d.setRecipeName(rv.getRecipe().getName());
        d.setSnapshotJson(rv.getSnapshotJson()); d.setCostPerServing(rv.getCostPerServing());
        d.setChangeSummary(rv.getChangeSummary());
        d.setCreatedBy(rv.getCreatedBy() != null ? rv.getCreatedBy().getFullName() : null);
        d.setCreatedAt(rv.getCreatedAt() != null ? rv.getCreatedAt().toString() : null);
        return d;
    }

    @Data public static class VersionDto {
        private Long id, recipeId; private String recipeName, snapshotJson, changeSummary, createdBy, createdAt;
        private Integer version; private BigDecimal costPerServing;
    }
}