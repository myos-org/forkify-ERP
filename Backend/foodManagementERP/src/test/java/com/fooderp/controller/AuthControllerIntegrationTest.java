package com.fooderp.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fooderp.dto.LoginRequest;
import com.fooderp.dto.RegisterRequest;
import com.fooderp.entity.Branch;
import com.fooderp.entity.Role;
import com.fooderp.entity.User;
import com.fooderp.repository.BranchRepository;
import com.fooderp.repository.UserRepository;
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
    public void testProtectedEndpointWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/branches"))
                .andExpect(status().isUnauthorized());
    }
}
