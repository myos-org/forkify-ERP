# Klyro ERP 2.0 — Implementation Roadmap & Execution Plan

## 1. Executive Summary & Phased Delivery Model

The transformation of Klyro ERP into a high-scale, resilient enterprise platform is organized across **12 strategic milestones**. Milestones 1 and 2 establish operational stability and unified brand identity, while Milestones 3 through 12 execute deep engineering hardening across concurrency, caching, event streaming, and multi-region deployment.

```
[M1: Audit & Bug Fixes] ----> [M2: Rebrand & Design System]
           |                                |
           v                                v
[M3: DB Concurrency & Indexing] -> [M4: Redis Caching] -> [M5: Kafka Outbox]
                                                                  |
                                                                  v
[M8: Security Hardening] <--- [M7: Observability] <--- [M6: Idempotency]
           |
           v
[M9: Stress Testing] ------> [M10: Multi-Tenancy] ----> [M11: Mobile Sync]
                                                                  |
                                                                  v
                                                     [M12: Blue/Green Prod]
```

---

## 2. Milestone Breakdown & Technical Work Packages

### Milestone 1: Baseline Stabilization & Automated Testing [COMPLETED]
- **Deliverables:** Fixed 12 critical defects across backend (security bypass, PO reception, recipe cascade updates, transfer refunds, missing reports) and mobile (inventory report routing). Established 22 end-to-end integration tests in JUnit 5 (`mvn test` 100% passing).
- **Quality Gate:** Automated CI passes with 0 failures, 0 regressions.

### Milestone 2: Brand Identity & Unified Design System [COMPLETED]
- **Deliverables:** Official SVG vector identity (`klyro-symbol`, `klyro-logo-horizontal`, `klyro-logo-dark`, `klyro-app-icon`, `klyro-favicon`). Implemented Midnight Navy (`#101828`) + Electric Blue (`#2563EB`) design system with dark mode tokens across Web, Mobile, and Landing apps.
- **Quality Gate:** WCAG 2.2 AA contrast compliance verified; Web and Landing production builds succeed with 0 errors.

### Milestone 3: Database Indexing & Concurrency Control
- **Scope:** 
  - Add missing composite database indexes on `(branch_id, created_at)`, `(recipe_id, version_number)`, `(po_id, status)`.
  - Implement `@Version` optimistic locking on master records (Recipes, Menus, Suppliers).
  - Implement `LockModeType.PESSIMISTIC_WRITE` on high-contention inventory updates (`RawMaterial.currentStock`).
- **Dependencies:** M1.
- **Acceptance Criteria:** Zero lost updates under 100 concurrent checkout transactions; deadlocks < 0.01%.

### Milestone 4: Redis Multi-Tier Caching Architecture
- **Scope:**
  - Integrate Spring Cache abstraction backed by Redis 7.2.
  - Implement cache-aside for master data (`@Cacheable(value = "recipes", key = "#id")`).
  - Configure Redis write-through cache for branch menus.
  - Establish TTL tiers (Master data: 24h, Branch menus: 1h, Reports: 15m).
- **Dependencies:** M3.
- **Acceptance Criteria:** Recipe read latency p95 drops from 45ms to < 4ms; cache hit ratio > 85%.

### Milestone 5: Event-Driven Kafka Bus & Transactional Outbox
- **Scope:**
  - Deploy KRaft-based Apache Kafka 3.7 cluster.
  - Create database table `outbox_events` within the relational schema.
  - Implement transactional outbox writer within application service boundaries.
  - Configure Spring Kafka publishers with guaranteed at-least-once delivery.
- **Dependencies:** M3, M4.
- **Acceptance Criteria:** Database commits and event dispatches are strictly atomic; zero ghost events on transaction rollback.

### Milestone 6: Distributed Idempotency & Mutation Safety
- **Scope:**
  - Implement `X-Idempotency-Key` filter for POST/PUT mutations.
  - Store idempotency records in Redis with 24-hour expiration.
  - Prevent duplicate charge, stock deduction, and purchase order submissions.
- **Dependencies:** M4, M5.
- **Acceptance Criteria:** Rapid double-click or network retry returns identical cached response without re-executing business logic.

### Milestone 7: Full-Stack Observability & Telemetry
- **Scope:**
  - Enable Spring Boot Actuator `/actuator/prometheus` endpoint.
  - Configure Micrometer meters for inventory contention wait times, HikariCP pool usage, and Kafka lag.
  - Implement correlation ID filter (`X-Correlation-Id`) with Logback JSON structured logging.
- **Dependencies:** M1–M6.
- **Acceptance Criteria:** End-to-end request tracing visible in logs with persistent correlation IDs.

### Milestone 8: Application Security Hardening & Rate Limiting
- **Scope:**
  - Implement token bucket rate limiting via Bucket4j and Redis (100 req/min for standard endpoints, 5 req/min for auth).
  - Enforce OWASP Top 10 defenses: Content Security Policy (CSP), strict CORS headers, sanitization filters.
- **Dependencies:** M1, M4.
- **Acceptance Criteria:** Penetration test verifies protection against brute force and unauthorized tenant data traversal.

### Milestone 9: High-Load Stress Testing & Benchmarks
- **Scope:**
  - Build automated Locust and k6 performance suites.
  - Execute stress runs simulating 10,000 req/min across inventory queries and 2,000 concurrent QR orders.
- **Dependencies:** M3–M8.
- **Acceptance Criteria:** Error rate < 0.1% at peak throughput; system recovers gracefully without memory leaks.

### Milestone 10: Multi-Tenant Architecture & Data Isolation
- **Scope:**
  - Enforce tenant discriminators across all JPA entities.
  - Configure Hibernate filter for automated `WHERE tenant_id = :currentTenant` injection.
- **Dependencies:** M3, M8.
- **Acceptance Criteria:** Automated integration tests confirm complete mathematical impossibility of cross-tenant data leakage.

### Milestone 11: Mobile Native Sync & Offline Resilience
- **Scope:**
  - Implement local SQLite cache with WatermelonDB or Expo SQLite on mobile clients.
  - Queue mutations created while offline and replay with idempotency keys upon network reconnection.
- **Dependencies:** M6.
- **Acceptance Criteria:** Mobile users can log production and check inventory counts without active internet connection.

### Milestone 12: Production Blue/Green Deployment & Zero-Downtime Rollout
- **Scope:**
  - Implement automated Blue/Green deployment pipeline in GitHub Actions.
  - Database schema forward-compatibility validation (Flyway expand/contract pattern).
- **Dependencies:** M1–M11.
- **Acceptance Criteria:** Zero downtime during production cluster upgrades.

---

## 3. Risk Register & Mitigation Strategy

| Risk ID | Description | Severity | Likelihood | Mitigation Strategy |
|---|---|---|---|---|
| **R-01** | High concurrency lock contention on inventory stock | High | Medium | Transition from table locks to row-level `PESSIMISTIC_WRITE` + Redis atomic increment buffers. |
| **R-02** | Kafka consumer lag causing delayed stock reconciliation | Medium | Low | Configure autoscaling consumer groups and dead-letter queues (DLQ) with exponential backoff. |
| **R-03** | Cache stampede on popular menu updates | Medium | Medium | Implement probabilistic early expiration and distributed mutex locks during cache warm-up. |
| **R-04** | Database connection pool exhaustion during peak lunch shifts | High | Low | Right-size HikariCP (`maximum-pool-size: 30`, timeout: 5000ms) with aggressive leak detection. |

---

## 4. Rollback & Emergency Procedures

1. **Automated Health Probes:** Any deployment failing Actuator readiness check (`/actuator/health/readiness`) within 60 seconds automatically triggers an immediate traffic abort and roll-back to the prior green container revision.
2. **Database Schema Versioning:** All Flyway migrations follow the Expand/Contract pattern: columns are added as nullable or default-valued before application code uses them; old columns are dropped only in subsequent releases.
