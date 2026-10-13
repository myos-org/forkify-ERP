package com.fooderp.service;

import com.fooderp.TestHelper;
import com.fooderp.dto.RecipeDto;
import com.fooderp.entity.Branch;
import com.fooderp.entity.Ingredient;
import com.fooderp.entity.Role;
import com.fooderp.entity.User;
import com.fooderp.repository.BranchRepository;
import com.fooderp.repository.IngredientRepository;
import com.fooderp.repository.RecipeRepository;
import com.fooderp.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
public class RecipeServiceTest {

    @Autowired private RecipeService recipeService;
    @Autowired private RecipeRepository recipeRepo;
    @Autowired private IngredientRepository ingredientRepo;
    @Autowired private BranchRepository branchRepo;
    @Autowired private UserRepository userRepo;

    private Branch hqBranch;
    private Branch subBranch;
    private User adminUser;
    private User branchManager;
    private Ingredient paneer;
    private Ingredient tomato;

    @BeforeEach
    public void setup() {
        hqBranch = new Branch();
        hqBranch.setName("HQ Kitchen");
        hqBranch.setCity("Delhi");
        hqBranch.setType(Branch.BranchType.HQ);
        hqBranch = branchRepo.save(hqBranch);

        subBranch = new Branch();
        subBranch.setName("Delhi Branch 1");
        subBranch.setCity("Delhi");
        subBranch.setType(Branch.BranchType.BRANCH);
        subBranch = branchRepo.save(subBranch);

        adminUser = new User();
        adminUser.setUsername("chefadmin");
        adminUser.setEmail("chefadmin@klyroerp.com");
        adminUser.setPassword("password123");
        adminUser.setRole(Role.ROLE_ADMIN);
        adminUser.setBranch(hqBranch);
        adminUser = userRepo.save(adminUser);

        branchManager = new User();
        branchManager.setUsername("branchmgr");
        branchManager.setEmail("branchmgr@klyroerp.com");
        branchManager.setPassword("password123");
        branchManager.setRole(Role.ROLE_MANAGER);
        branchManager.setBranch(subBranch);
        branchManager = userRepo.save(branchManager);

        paneer = new Ingredient();
        paneer.setName("Cottage Cheese");
        paneer.setCategory("Dairy");
        paneer.setUnit("KG");
        paneer.setCostPerUnit(BigDecimal.valueOf(300.0));
        paneer = ingredientRepo.save(paneer);

        tomato = new Ingredient();
        tomato.setName("Tomatoes");
        tomato.setCategory("Vegetables");
        tomato.setUnit("KG");
        tomato.setCostPerUnit(BigDecimal.valueOf(40.0));
        tomato = ingredientRepo.save(tomato);

        TestHelper.setSecurityUser(adminUser.getId(), adminUser.getUsername(), Role.ROLE_ADMIN, hqBranch.getId());
    }

    @AfterEach
    public void tearDown() {
        TestHelper.clearSecurityContext();
    }

    @Test
    public void testCreateRecipeAndCostCalculation() {
        RecipeDto.Request req = new RecipeDto.Request();
        req.setName("Paneer Butter Masala");
        req.setCategory("Indian");
        req.setServings(4);
        req.setPrepTime(15);
        req.setCookTime(25);
        req.setHqOwned(true);

        List<RecipeDto.IngredientRequest> items = new ArrayList<>();
        RecipeDto.IngredientRequest i1 = new RecipeDto.IngredientRequest();
        i1.setIngredientId(paneer.getId());
        i1.setQuantity(0.5); // 0.5 * 300 = 150
        items.add(i1);

        RecipeDto.IngredientRequest i2 = new RecipeDto.IngredientRequest();
        i2.setIngredientId(tomato.getId());
        i2.setQuantity(1.0); // 1.0 * 40 = 40
        items.add(i2);
        req.setIngredients(items);

        RecipeDto.Response res = recipeService.createRecipe(req);
        assertNotNull(res.getId());
        assertEquals("Paneer Butter Masala", res.getName());
        assertEquals(2, res.getIngredients().size());

        // Total cost = 150 + 40 = 190.00
        assertEquals(0, BigDecimal.valueOf(190.0).compareTo(res.getTotalCost()));
        // Cost per serving (4 servings) = 190 / 4 = 47.50
        assertEquals(0, BigDecimal.valueOf(47.5).compareTo(res.getCostPerServing()));
    }

    @Test
    public void testUpdateRecipePreventsDuplicateIngredients() {
        RecipeDto.Request req = new RecipeDto.Request();
        req.setName("Paneer Tikka");
        req.setCategory("Starters");
        req.setServings(2);
        req.setHqOwned(true);

        List<RecipeDto.IngredientRequest> items = new ArrayList<>();
        RecipeDto.IngredientRequest i1 = new RecipeDto.IngredientRequest();
        i1.setIngredientId(paneer.getId());
        i1.setQuantity(0.25);
        items.add(i1);
        req.setIngredients(items);

        RecipeDto.Response created = recipeService.createRecipe(req);
        assertEquals(1, created.getIngredients().size());

        // Update with 2 ingredients
        RecipeDto.Request updateReq = new RecipeDto.Request();
        updateReq.setName("Paneer Tikka Special");
        updateReq.setCategory("Starters");
        updateReq.setServings(2);
        updateReq.setHqOwned(true);

        List<RecipeDto.IngredientRequest> updatedItems = new ArrayList<>();
        RecipeDto.IngredientRequest u1 = new RecipeDto.IngredientRequest();
        u1.setIngredientId(paneer.getId());
        u1.setQuantity(0.3);
        updatedItems.add(u1);

        RecipeDto.IngredientRequest u2 = new RecipeDto.IngredientRequest();
        u2.setIngredientId(tomato.getId());
        u2.setQuantity(0.5);
        updatedItems.add(u2);
        updateReq.setIngredients(updatedItems);

        RecipeDto.Response updated = recipeService.updateRecipe(created.getId(), updateReq);

        // Crucial regression assertion: exactly 2 ingredients, not 3 (old + new)!
        assertEquals(2, updated.getIngredients().size());
        assertEquals("Paneer Tikka Special", updated.getName());
    }

    @Test
    public void testBranchManagerCannotEditHqOwnedRecipe() {
        RecipeDto.Request req = new RecipeDto.Request();
        req.setName("HQ Secret Sauce");
        req.setCategory("Sauces");
        req.setServings(10);
        req.setHqOwned(true);
        req.setIngredients(new ArrayList<>());

        RecipeDto.Response created = recipeService.createRecipe(req);

        // Switch security principal to branch manager
        TestHelper.setSecurityUser(branchManager.getId(), branchManager.getUsername(), Role.ROLE_MANAGER, subBranch.getId());

        RecipeDto.Request modifyReq = new RecipeDto.Request();
        modifyReq.setName("Hacked Sauce");
        modifyReq.setCategory("Sauces");
        modifyReq.setServings(10);
        modifyReq.setHqOwned(false);

        assertThrows(AccessDeniedException.class, () -> {
            recipeService.updateRecipe(created.getId(), modifyReq);
        });
    }
}
