# Klyro ERP 2.0 — Deployment & CI/CD Engineering

## 1. CI/CD Pipeline Architecture (`.github/workflows/ci.yml`)

Klyro ERP uses GitHub Actions to enforce strict automated quality gates on every commit and pull request across all subprojects.

```
                  [ Push / Pull Request to main ]
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
         v                       v                       v
[ backend-test ]         [ web-frontend ]         [ landing-page ]
- Java 17 OpenJDK        - Node.js 20             - Node.js 20
- Maven dependency cache - npm test               - next build
- H2 In-Memory DB        - CI=false npm run build - Turbopack static
- 22 JUnit 5 Tests       - Lint & bundle check      generation
         |                       |                       |
         +-----------------------+-----------------------+
                                 |
         +-----------------------+-----------------------+
         |                                               |
         v                                               v
[ mobile-validation ]                           [ docker-compose-check ]
- Node.js 20                                    - Docker engine
- Expo CLI                                      - docker compose config
- app.json schema check                         - Multi-container topology
                                 |
                                 v
                     [ Production Release Gate ]
                     - Build OCI Docker Images
                     - Push to AWS ECR / Registry
```

---

## 2. Multi-Environment Promotion Lifecycle

| Environment | Host Infrastructure | Datastores | Deployment Trigger | Purpose |
|---|---|---|---|---|
| **Local Dev** | Developer Workstation | Local Docker Compose (MySQL 8, Redis 7, Kafka 3.7) | Manual / git pull | Rapid local feature iteration |
| **Staging** | AWS ECS / EKS (Staging Cluster) | Amazon RDS MySQL Multi-AZ, ElastiCache Redis | Automated on merge to `develop` | End-to-end regression, QA review |
| **Production** | AWS ECS Fargate Multi-AZ | RDS Aurora MySQL, ElastiCache Redis, MSK Kafka | Tagged release `v*.*.*` + Manual Approval | Live client operational traffic |

---

## 3. Zero-Downtime Blue/Green Deployment Strategy

Because restaurant operations run continuously from early morning prep to late-night close, downtime during software deployments is prohibited.

```
                      [ Incoming Traffic: AWS ALB ]
                                   |
                  +----------------+----------------+
                  | (100% Traffic)                  | (0% Traffic)
                  v                                 v
        [ Green Environment (Active) ]     [ Blue Environment (Idle) ]
        - App Version: v2.1.0             - Deploy App Version: v2.2.0
        - Serving requests                - Run DB migrations (Expand)
                                          - Execute health check probe
                                                    |
                                       Readiness passes HTTP 200
                                                    |
                  +---------------------------------+
                  | (Switch Route)
                  v
        [ Blue Environment (Active) ]     [ Green Environment (Standby) ]
        - 100% Traffic routed to v2.2.0    - Drains remaining sessions
                                          - Kept warm for 30m rollback
```

### 3.1 Health Check Gates
Before the Application Load Balancer switches router weights:
1. Container returns `HTTP 200` on `/actuator/health/readiness`.
2. Synthetic smoke test executes:
   - Login with system probe credentials.
   - Query branch inventory balance.
   - Verify Redis cache connection.
3. If any step fails within 120 seconds, the deployment is aborted and blue containers are terminated.

---

## 4. Database Schema Migration Discipline (Expand/Contract)

To avoid breaking active application instances during Blue/Green transitions, database schema changes must be forward and backward compatible.

### The Expand/Contract Pattern:
1. **Phase 1 (Expand):** Add new columns as `NULLABLE` or with default values. Do not delete or rename existing columns.
2. **Phase 2 (Dual Write / App Deploy):** Deploy new application code that reads from old or new columns and writes to both.
3. **Phase 3 (Contract):** Once all active instances run the new release, drop old columns and apply `NOT NULL` constraints in a subsequent migration release.

---

## 5. Automated Rollback Protocol

If an unexpected regression escapes staging into production:

1. **Automated Trigger:** If the CloudWatch / Prometheus alarm `HighErrorRate` (> 0.5% 5xx errors over 2 minutes) fires during the first 15 minutes of traffic switch:
   - Route 53 / ALB instantly redirects 100% of traffic back to the standby Green container fleet.
   - PagerDuty notification is dispatched to on-call engineering.
2. **Manual Abort:** Engineers can trigger instant rollback via GitHub Actions workflow dispatch:
   ```bash
   gh workflow run rollback.yml -f target_version=v2.1.0
   ```

---

## 6. Cloud Platform Specific Guides

- **Render Deployment & Troubleshooting**: See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md) for step-by-step setup on Render, MySQL container provisioning, external cloud MySQL configuration (Aiven/Railway), and troubleshooting JDBC/Hikari `EOFException` connection errors.
