package com.fooderp.service;

import com.fooderp.entity.Branch;
import com.fooderp.entity.Role;
import com.fooderp.entity.User;
import com.fooderp.repository.BranchRepository;
import com.fooderp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates super admins: the first one on a fresh database (POST /api/admin/setup)
 * and env-configured ones on startup (SuperAdminBootstrap).
 */
@Service
public class SetupService {

    @Autowired UserRepository   userRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired PasswordEncoder  passwordEncoder;

    public boolean adminExists() {
        return !userRepository.findByRole(Role.ROLE_ADMIN).isEmpty();
    }

    /**
     * @throws IllegalStateException    if an admin already exists
     * @throws IllegalArgumentException if input is missing/invalid or username/email is taken
     */
    @Transactional
    public User createInitialAdmin(String username, String email, String password,
                                   String fullName, String branchName, String city) {
        if (adminExists())
            throw new IllegalStateException("Setup already completed. An admin already exists.");
        return createAdmin(username, email, password, fullName, branchName, city);
    }

    /**
     * Makes sure the given user exists as an enabled admin, even if other admins exist.
     * An existing user is left untouched unless reset is true, in which case it is
     * promoted to admin, re-enabled and gets the given password.
     */
    @Transactional
    public String ensureSuperAdmin(String username, String email, String password,
                                   String fullName, boolean reset) {
        if (isBlank(username))
            throw new IllegalArgumentException("Username is required.");

        User existing = userRepository.findByUsername(username.trim()).orElse(null);
        if (existing == null) {
            createAdmin(username, email, password, fullName, null, null);
            return "created";
        }
        if (!reset) return "exists";

        if (isBlank(password) || password.length() < 6)
            throw new IllegalArgumentException("Password is required (min 6 characters).");
        existing.setRole(Role.ROLE_ADMIN);
        existing.setEnabled(true);
        existing.setPassword(passwordEncoder.encode(password));
        userRepository.save(existing);
        return "reset";
    }

    private User createAdmin(String username, String email, String password,
                             String fullName, String branchName, String city) {
        if (isBlank(username) || username.trim().length() < 3)
            throw new IllegalArgumentException("Username is required (min 3 characters).");
        if (isBlank(email) || !email.contains("@"))
            throw new IllegalArgumentException("A valid email is required.");
        if (isBlank(password) || password.length() < 6)
            throw new IllegalArgumentException("Password is required (min 6 characters).");

        username = username.trim();
        email    = email.trim();

        if (userRepository.existsByUsername(username))
            throw new IllegalArgumentException("Username '" + username + "' is already taken.");
        if (userRepository.existsByEmail(email))
            throw new IllegalArgumentException("Email '" + email + "' is already in use.");

        // Reuse an existing HQ branch (e.g. left over from an earlier failed attempt)
        Branch hq = branchRepository.findAll().stream()
                .filter(b -> b.getType() == Branch.BranchType.HQ)
                .findFirst()
                .orElse(null);
        if (hq == null) {
            hq = new Branch();
            hq.setName(!isBlank(branchName) ? branchName : "HQ — Central");
            hq.setCity(!isBlank(city)       ? city       : "Head Office");
            hq.setType(Branch.BranchType.HQ);
            hq = branchRepository.save(hq);
        }

        User admin = new User();
        admin.setUsername(username);
        admin.setEmail(email);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setFullName(!isBlank(fullName) ? fullName : "Super Admin");
        admin.setRole(Role.ROLE_ADMIN);
        admin.setBranch(hq);
        return userRepository.save(admin);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
