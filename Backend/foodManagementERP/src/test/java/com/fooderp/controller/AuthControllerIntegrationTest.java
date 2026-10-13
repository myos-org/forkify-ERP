package com.fooderp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fooderp.dto.LoginRequest;
import com.fooderp.dto.RegisterRequest;
import com.fooderp.entity.Branch;
import com.fooderp.entity.Role;
import com.fooderp.entity.User;
import com.fooderp.repository.BranchRepository;
import com.fooderp.repository.UserRepository;
import com.fooderp.service.SetupService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AuthControllerIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepo;
    @Autowired private BranchRepository branchRepo;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private SetupService setupService;
    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    public void setup() {
        userRepo.deleteAll();
        branchRepo.deleteAll();
    }

    @Test
    public void testSuccessfulRegistrationAndLogin() throws Exception {
        RegisterRequest reg = new RegisterRequest();
        reg.setUsername("chef_john");
        reg.setEmail("john@klyroerp.com");
        reg.setPassword("Password123!");
        reg.setFullName("John Chef");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(reg)))
                .andExpect(status().isOk());

        LoginRequest login = new LoginRequest();
        login.setUsername("chef_john");
        login.setPassword("Password123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.username").value("chef_john"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"));
    }

    @Test
    public void testDisabledUserCannotLogin() throws Exception {
        User disabledUser = new User();
        disabledUser.setUsername("banned_user");
        disabledUser.setEmail("banned@klyroerp.com");
        disabledUser.setPassword(passwordEncoder.encode("Password123!"));
        disabledUser.setFullName("Banned User");
        disabledUser.setRole(Role.ROLE_USER);
        disabledUser.setEnabled(false); // Disabled account!
        userRepo.save(disabledUser);

        LoginRequest login = new LoginRequest();
        login.setUsername("banned_user");
        login.setPassword("Password123!");

        // Regression assertion: must return 401 Unauthorized, NOT 200 OK!
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testUnauthenticatedAdminSetupBootstrapAllowed() throws Exception {
        // Database is clean (no admin user)
        Map<String, String> setupBody = Map.of(
                "username", "superadmin",
                "email", "admin@klyroerp.com",
                "password", "AdminSecret123!",
                "fullName", "Master Admin",
                "branchName", "Headquarters",
                "city", "Bangalore"
        );

        // Regression assertion: /api/admin/setup must be accessible without any JWT!
        mockMvc.perform(post("/api/admin/setup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(setupBody)))
                .andExpect(status().isOk());

        // Subsequent bootstrap attempt should fail because admin now exists
        mockMvc.perform(post("/api/admin/setup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(setupBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testAdminSetupRejectsMissingPassword() throws Exception {
        Map<String, String> setupBody = Map.of(
                "username", "superadmin",
                "email", "admin@klyroerp.com"
        );

        mockMvc.perform(post("/api/admin/setup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(setupBody)))
                .andExpect(status().isBadRequest());
    }

    @Test
    public void testAdminSetupWithTakenUsernameReturnsBadRequestAndLeavesNoBranch() throws Exception {
        User existing = new User();
        existing.setUsername("superadmin");
        existing.setEmail("someone@klyroerp.com");
        existing.setPassword(passwordEncoder.encode("Password123!"));
        existing.setRole(Role.ROLE_USER);
        userRepo.save(existing);

        Map<String, String> setupBody = Map.of(
                "username", "superadmin",
                "email", "admin@klyroerp.com",
                "password", "AdminSecret123!"
        );

        mockMvc.perform(post("/api/admin/setup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(setupBody)))
                .andExpect(status().isBadRequest());

        org.junit.jupiter.api.Assertions.assertEquals(0, branchRepo.count());
    }

    @Test
    public void testEnsureSuperAdminCreatesAdditionalAdminWhenOneExists() {
        setupService.createInitialAdmin("firstadmin", "first@klyroerp.com", "AdminSecret123!", null, null, null);

        String result = setupService.ensureSuperAdmin("newadmin", "new@klyroerp.com", "NewSecret123!", null, false);

        org.junit.jupiter.api.Assertions.assertEquals("created", result);
        org.junit.jupiter.api.Assertions.assertEquals(2, userRepo.findByRole(Role.ROLE_ADMIN).size());
        org.junit.jupiter.api.Assertions.assertEquals(1, branchRepo.count());
    }

    @Test
    public void testEnsureSuperAdminResetPromotesAndReenablesExistingUser() throws Exception {
        User locked = new User();
        locked.setUsername("oldadmin");
        locked.setEmail("old@klyroerp.com");
        locked.setPassword(passwordEncoder.encode("Forgotten123!"));
        locked.setRole(Role.ROLE_USER);
        locked.setEnabled(false);
        userRepo.save(locked);

        org.junit.jupiter.api.Assertions.assertEquals("exists",
                setupService.ensureSuperAdmin("oldadmin", null, "Recovered123!", null, false));
        org.junit.jupiter.api.Assertions.assertEquals("reset",
                setupService.ensureSuperAdmin("oldadmin", null, "Recovered123!", null, true));

        LoginRequest login = new LoginRequest();
        login.setUsername("oldadmin");
        login.setPassword("Recovered123!");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"));
    }

    @Test
    public void testProtectedEndpointWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/branches"))
                .andExpect(status().isUnauthorized());
    }
}
