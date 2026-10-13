# Klyro ERP 2.0 — Production Observability & Telemetry

## 1. Observability Architecture Overview

Klyro ERP's observability strategy is built on the **Three Pillars of Observability**: Metrics, Distributed Tracing, and Structured Logging.

```
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
 [ METRICS ]             [ TRACING ]              [ LOGS ]
  Micrometer +            OpenTelemetry +          Logback JSON +
  Spring Actuator         MDC Correlation IDs      Loki / ELK
  -> Prometheus           -> W3C TraceContext      -> PII Masked
```

---

## 2. Spring Boot Actuator Configuration

Production actuator endpoints are secured and exposed for scraping by internal Prometheus instances:

```properties
# Actuator Security & Endpoint Exposure
management.endpoints.web.exposure.include=health,info,metrics,prometheus
management.endpoint.health.show-details=when_authorized
management.endpoint.health.probes.enabled=true
management.endpoint.prometheus.enabled=true

# Health Indicators
management.health.db.enabled=true
management.health.redis.enabled=true
management.health.diskspace.enabled=true
```

### Health Check Probes for Kubernetes / Container Orchestrators
- **Liveness Probe:** `GET /actuator/health/liveness` (Returns HTTP 200 if JVM process is responsive).
- **Readiness Probe:** `GET /actuator/health/readiness` (Verifies MySQL pool connectivity and Redis ping before receiving traffic).

---

## 3. Micrometer Custom Business Metrics

Beyond standard JVM memory and CPU metrics, Klyro exports targeted domain meters:

```java
@Component
public class KlyroMetrics {

    private final MeterRegistry registry;
    private final Counter orderCreatedCounter;
    private final Timer inventoryLockTimer;

    public KlyroMetrics(MeterRegistry registry) {
        this.registry = registry;

        this.orderCreatedCounter = Counter.builder("klyro.orders.created.total")
            .description("Total number of orders successfully placed")
            .register(registry);

        this.inventoryLockTimer = Timer.builder("klyro.inventory.lock.duration")
            .description("Time spent holding pessimistic DB locks during stock deductions")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
    }

    public void recordOrderCreated(String branchId) {
        Counter.builder("klyro.orders.created.total")
            .tag("branch", branchId)
            .register(registry)
            .increment();
    }

    public void recordInventoryLockTime(long durationMs) {
        inventoryLockTimer.record(durationMs, TimeUnit.MILLISECONDS);
    }
}
```

---

## 4. Correlation IDs & Distributed Tracing

Every incoming request is tagged with a correlation identifier to enable end-to-end trace reconstruction across frontend, backend, outbox, and Kafka consumers.

### 4.1 Correlation ID Servlet Filter
```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        MDC.put(MDC_KEY, correlationId);
        response.setHeader(CORRELATION_ID_HEADER, correlationId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
```

---

## 5. Structured JSON Logging & PII Masking

In production environments, plain text console logs are replaced with structured JSON encoding for direct indexing into Elasticsearch or Grafana Loki.

### 5.1 Logback Configuration (`logback-spring.xml`)
```xml
<configuration>
    <appender name="JSON_CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LoggingEventCompositeJsonEncoder">
            <providers>
                <timestamp><timeZone>UTC</timeZone></timestamp>
                <pattern>
                    <pattern>
                        {
                            "severity": "%level",
                            "service": "klyro-erp-backend",
                            "traceId": "%mdc{correlationId}",
                            "logger": "%logger",
                            "thread": "%thread",
                            "message": "%message"
                        }
                    </pattern>
                </pattern>
                <stackTrace/>
            </providers>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON_CONSOLE"/>
    </root>
</configuration>
```

### 5.2 PII Masking Rules
Log statements automatically sanitize sensitive fields:
- `password`, `token`, `secret`, `authorization`, `creditCard`.
- Regex filters replace sensitive values with `***MASKED***` prior to JSON serialization.

---

## 6. Critical Alerting Rules (PromQL)

| Alert Name | PromQL Expression | Threshold | Severity |
|---|---|---|---|
| **HighErrorRate** | `sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m])) * 100` | `> 1.0%` for 3m | Critical |
| **HikariConnectionStarvation** | `hikaricp_connections_pending{pool="KlyroHikariCP"}` | `> 5` for 1m | Critical |
| **InventoryLockContention** | `histogram_quantile(0.99, sum(rate(klyro_inventory_lock_duration_seconds_bucket[5m])) by (le))` | `> 2.5s` for 2m | Warning |
| **KafkaConsumerLagSpike** | `kafka_consumer_lag{consumergroup=~"cg-.*"}` | `> 5000` for 5m | Warning |
