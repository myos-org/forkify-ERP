# KLYRO ERP — Remaining Issues, Environmental Limitations, and Non-Blockers

This document details remaining operational constraints, external infrastructure requirements, and documented non-blocking items identified during the Phase 1 audit and repair process.

---

## 1. External Infrastructure & Credential Dependencies

### 1.1 Groq Cloud AI Integration (`GROQ_API_KEY`)
- **Status:** Handled via safe defaults; feature operates in graceful degradation mode.
- **Description:** The backend `AiAssistantService.java` communicates with `https://api.groq.com/openai/v1/chat/completions` using the `llama3-70b-8192` model.
- **Operational Impact:** When `GROQ_API_KEY` is not provided in the environment, the backend defaults to an empty key instead of crashing on startup. Endpoints that invoke AI assistance gracefully return a clear message indicating that AI services require configuration.
- **Remediation Strategy:** Provision a production Groq API key in production secrets manager (e.g. AWS Secrets Manager, GitHub Secrets) when AI copilot capabilities are enabled.

### 1.2 MySQL 8 Dialect Specifics vs In-Memory H2
- **Status:** Mitigated via `H2 in MySQL mode` (`MODE=MySQL`) for automated tests.
- **Description:** `MealPlan` entity contains a column named `year`. In strict ANSI SQL / default H2, `year` is a reserved keyword unless quoted or run in MySQL compatibility mode.
- **Operational Impact:** In MySQL 8 production environments, `year` is handled normally. In test environments, H2 MySQL mode ensures compatibility.

---

## 2. Platform & Toolchain Observations (Non-Blockers)

### 2.1 React 19 Peer Dependency Warnings in CRA
- **Status:** Non-blocker; mitigated with `--legacy-peer-deps`.
- **Description:** `Frontend/forkify-webApp` uses React 19 with Create React App (`react-scripts 5.0.1`) and Ant Design 6. Certain third-party packages specify React 18 peer dependencies.
- **Operational Impact:** Builds and tests succeed with `--legacy-peer-deps`. In a future milestone, migrating from CRA to Vite will modernize the bundling pipeline and eliminate legacy dependency flags.

### 2.2 Expo Mobile App Physical Device Build Requirements
- **Status:** Non-blocker; CI workflow validates public app configuration.
- **Description:** Building native `.apk` or `.aab` artifacts requires EAS (Expo Application Services) credentials or local Android SDK toolchains (`gradlew`).
- **Operational Impact:** The CI pipeline runs static validation (`npx expo config --type public`) and dependency integrity checks. Native cloud builds should be executed via EAS Build with dedicated signing keys.

---

## 3. Recommended Remediation Order for Next Phases

1. **Brand Identity & Design System Rollout (Phase 2):**
   - Apply Klyro design tokens (Midnight Navy `#101828` + Electric Blue `#2563EB`).
   - Deliver real SVG logo assets across web and mobile.
   - Implement dark theme and clean visual hierarchy.
2. **Backend Engineering & Scaling (Phase 3):**
   - Redis caching for high-volume catalog and reporting endpoints.
   - Kafka event-driven workflows with transactional outbox and idempotency keys.
   - Concurrency locking on inventory transactions.
   - Docker Compose infrastructure and automated CI/CD pipeline execution.
