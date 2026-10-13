package com.fooderp.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Public health check — used by the keep-alive pinger and external uptime monitors.
 */
@RestController
public class HealthController {

    @Autowired JdbcTemplate jdbcTemplate;

    @GetMapping("/api/health")
    public ResponseEntity<?> health() {
        String db;
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            db = "UP";
        } catch (Exception e) {
            db = "DOWN";
        }
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "db",     db,
                "time",   Instant.now().toString()
        ));
    }
}
