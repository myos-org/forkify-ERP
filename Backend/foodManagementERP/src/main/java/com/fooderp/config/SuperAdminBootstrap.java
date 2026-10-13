package com.fooderp.config;

import com.fooderp.service.SetupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Ensures the super admin from SUPERADMIN_USERNAME / SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
 * exists on startup — created if missing, even when other admins already exist.
 * With SUPERADMIN_RESET=true an existing user is promoted, re-enabled and its password reset
 * (recovery when no admin can log in). Remove the env vars once done.
 */
@Component
public class SuperAdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminBootstrap.class);

    @Autowired SetupService setupService;

    @Value("${app.superadmin.username:}") private String username;
    @Value("${app.superadmin.email:}")    private String email;
    @Value("${app.superadmin.password:}") private String password;
    @Value("${app.superadmin.full-name:Super Admin}") private String fullName;
    @Value("${app.superadmin.reset:false}") private boolean reset;

    @Override
    public void run(ApplicationArguments args) {
        if (username.isBlank() || password.isBlank()) return;

        try {
            switch (setupService.ensureSuperAdmin(username, email, password, fullName, reset)) {
                case "created" -> log.info("Super admin '{}' created.", username.trim());
                case "reset"   -> log.warn("Super admin '{}' reset (promoted, enabled, password changed). " +
                                           "Unset SUPERADMIN_RESET now.", username.trim());
                default        -> log.info("Super admin '{}' already exists; nothing to do.", username.trim());
            }
        } catch (RuntimeException e) {
            log.error("Super admin bootstrap failed: {}", e.getMessage());
        }
    }
}
