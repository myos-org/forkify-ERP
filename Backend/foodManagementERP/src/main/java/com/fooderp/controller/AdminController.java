package com.fooderp.controller;

import com.fooderp.dto.RegisterRequest;
import com.fooderp.dto.UserResponse;
import com.fooderp.entity.AuditLog;
import com.fooderp.entity.Branch;
import com.fooderp.entity.Role;
import com.fooderp.entity.User;
import com.fooderp.repository.AuditLogRepository;
import com.fooderp.repository.BranchRepository;
import com.fooderp.repository.UserRepository;
import com.fooderp.service.AuditService;
import com.fooderp.service.SetupService;
import jakarta.validation.Valid;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired UserRepository      userRepository;
    @Autowired BranchRepository    branchRepository;
    @Autowired PasswordEncoder      passwordEncoder;
    @Autowired AuditLogRepository   auditLogRepository;
    @Autowired AuditService         auditService;
    @Autowired SetupService         setupService;

    // ── GET /api/admin/users?role=&branchId= ─────────────────────────────────
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Long branchId) {

        List<User> users = userRepository.findAll();

        if (role != null && !role.isBlank()) {
            try {
                Role r = Role.valueOf(role);
                users = users.stream().filter(u -> u.getRole() == r).collect(Collectors.toList());
            } catch (IllegalArgumentException ignored) {}
        }
        if (branchId != null) {
            users = users.stream()
                    .filter(u -> u.getBranch() != null && u.getBranch().getId().equals(branchId))
                    .collect(Collectors.toList());
        }

        return ResponseEntity.ok(users.stream().map(UserResponse::from).collect(Collectors.toList()));
    }

    // ── GET /api/admin/users/{id} ────────────────────────────────────────────
    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(u -> ResponseEntity.ok(UserResponse.from(u)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/admin/users ────────────────────────────────────────────────
    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@Valid @RequestBody RegisterRequest req) {
        if (userRepository.existsByUsername(req.getUsername()))
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        if (userRepository.existsByEmail(req.getEmail()))
            return ResponseEntity.badRequest().body("Error: Email is already in use!");

        User user = new User();
        user.setUsername(req.getUsername());
        user.setEmail(req.getEmail());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setFullName(req.getFullName());

        Role role = Role.ROLE_USER;
        if (req.getRole() != null) {
            try { role = Role.valueOf(req.getRole()); }
            catch (IllegalArgumentException ignored) {}
        }
        user.setRole(role);

        if (req.getBranchId() != null) {
            Branch branch = branchRepository.findById(req.getBranchId())
                    .orElseThrow(() -> new RuntimeException("Branch not found: " + req.getBranchId()));
            user.setBranch(branch);
        }

        User saved = userRepository.save(user);
        auditService.log("CREATE", "User", saved.getId(), saved.getUsername(), "User created by admin");
        return ResponseEntity.ok(UserResponse.from(saved));
    }

    // ── PUT /api/admin/users/{id} ────────────────────────────────────────────
    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long id,
                                        @RequestBody UpdateUserRequest req) {
        return userRepository.findById(id)
                .map(user -> {
                    if (req.getRole() != null) {
                        try { user.setRole(Role.valueOf(req.getRole())); }
                        catch (IllegalArgumentException ignored) {}
                    }
                    if (req.getBranchId() != null)
                        branchRepository.findById(req.getBranchId()).ifPresent(user::setBranch);
                    if (req.getFullName() != null) user.setFullName(req.getFullName());
                    if (req.getEnabled()  != null) user.setEnabled(req.getEnabled());
                    User saved = userRepository.save(user);
                    auditService.log("UPDATE", "User", saved.getId(), saved.getUsername(), "User updated by admin");
                    return ResponseEntity.ok(UserResponse.from(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── PUT /api/admin/users/{id}/enable ─────────────────────────────────────
    // Re-enables a previously disabled user account
    @PutMapping("/users/{id}/enable")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> enableUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setEnabled(true);
                    User saved = userRepository.save(user);
                    auditService.log("UPDATE", "User", saved.getId(), saved.getUsername(), "User re-enabled by admin");
                    return ResponseEntity.ok(UserResponse.from(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE /api/admin/users/{id} (soft delete) ───────────────────────────
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> disableUser(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setEnabled(false);
                    userRepository.save(user);
                    auditService.log("DELETE", "User", user.getId(), user.getUsername(), "User disabled by admin");
                    return ResponseEntity.ok("User disabled successfully");
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── GET /api/admin/audit-logs ─────────────────────────────────────────────
    // Proxies to AuditService.search() with optional filters
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAuditLogs(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        List<AuditLog> logs = auditService.search(username, action, entityType, from, to);
        return ResponseEntity.ok(logs.stream().map(this::toAuditResponse).collect(Collectors.toList()));
    }

    // ── GET /api/admin/branches/summary ──────────────────────────────────────
    // Returns each branch with its user count — used by BranchManagement.js
    @GetMapping("/branches/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getBranchesSummary() {
        return ResponseEntity.ok(
                branchRepository.findAll().stream().map(b -> Map.of(
                        "id",        b.getId(),
                        "name",      b.getName() != null   ? b.getName()   : "",
                        "city",      b.getCity() != null   ? b.getCity()   : "",
                        "type",      b.getType() != null   ? b.getType().name() : "BRANCH",
                        "active",    b.isActive(),
                        "userCount", userRepository.countByBranchId(b.getId())
                )).collect(Collectors.toList())
        );
    }

    // ── POST /api/admin/setup ─────────────────────────────────────────────────
    // One-time bootstrap: creates the HQ branch and the first (super) admin.
    @PostMapping("/setup")
    public ResponseEntity<?> initialSetup(@RequestBody SetupRequest req) {
        try {
            setupService.createInitialAdmin(req.getUsername(), req.getEmail(), req.getPassword(),
                    req.getFullName(), req.getBranchName(), req.getCity());
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
        return ResponseEntity.ok("Setup complete! HQ branch and admin user created. " +
                "You can now log in and create more branches and users via /api/admin/users.");
    }

    // ── Audit log response mapper ─────────────────────────────────────────────
    private Map<String, Object> toAuditResponse(AuditLog log) {
        return Map.of(
                "id",         log.getId(),
                "username",   log.getUsername() != null   ? log.getUsername()  : "",
                "action",     log.getAction()   != null   ? log.getAction()    : "",
                "entityType", log.getEntityType()!= null  ? log.getEntityType(): "",
                "entityId",   log.getEntityId() != null   ? log.getEntityId()  : 0L,
                "entityName", log.getEntityName()!= null  ? log.getEntityName(): "",
                "details",    log.getDetails()  != null   ? log.getDetails()   : "",
                "httpMethod", log.getHttpMethod()!= null  ? log.getHttpMethod(): "",
                "endpoint",   log.getEndpoint() != null   ? log.getEndpoint()  : "",
                "createdAt",  log.getCreatedAt()!= null   ? log.getCreatedAt().toString() : ""
        );
    }

    // ── Inner DTOs ────────────────────────────────────────────────────────────
    @Data
    public static class UpdateUserRequest {
        private String  role;
        private Long    branchId;
        private String  fullName;
        private Boolean enabled;
    }

    @Data
    public static class SetupRequest {
        private String username;
        private String email;
        private String password;
        private String fullName;
        private String branchName;
        private String city;
    }
}