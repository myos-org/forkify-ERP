# Klyro ERP 2.0 — Transactional Outbox & Idempotency Architecture

## 1. The Dual-Write Hazard & The Transactional Outbox Pattern

In distributed enterprise architectures, executing a database write and publishing a message to Apache Kafka in the same method introduces the **Dual-Write Hazard**:
1. If the database commits but the network to Kafka drops, the message is lost forever (inconsistent downstream state).
2. If Kafka receives the message but the database transaction rolls back, downstream consumers process a "phantom" ghost event.

```
                    +-------------------------------------+
                    |   Spring @Transactional Service     |
                    +-------------------------------------+
                                       |
                   Single ACID Transaction Boundary
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
         +-------------------+                   +-------------------+
         | Business Mutation |                   | Insert into Table |
         | (e.g. deduct stock|                   |  outbox_events    |
         |  or create PO)    |                   |  (PENDING status) |
         +-------------------+                   +-------------------+
```

---

## 2. Outbox Database Schema & Implementation

### 2.1 Table DDL Specification
```sql
CREATE TABLE outbox_events (
    id VARCHAR(36) PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload JSON NOT NULL,
    headers JSON NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    published_at TIMESTAMP(3) NULL,
    INDEX idx_outbox_status_created (status, created_at)
) ENGINE=InnoDB;
```

### 2.2 Atomic Service Outbox Writer
```java
@Service
@Transactional
public class ProcurementService {

    @Autowired
    private PurchaseOrderRepository poRepository;
    @Autowired
    private OutboxEventRepository outboxRepository;

    public PurchaseOrder receiveGoods(Long poId, GoodsReceiptDTO dto) {
        PurchaseOrder po = poRepository.findById(poId)
            .orElseThrow(() -> new ResourceNotFoundException("PO not found: " + poId));

        // 1. Mutate business state
        po.applyGoodsReceipt(dto);
        PurchaseOrder savedPo = poRepository.save(po);

        // 2. Insert outbox record within the exact same database transaction
        OutboxEvent event = OutboxEvent.builder()
            .id(UUID.randomUUID().toString())
            .aggregateType("PurchaseOrder")
            .aggregateId(savedPo.getId().toString())
            .eventType("com.klyro.procurement.goods_received.v1")
            .payload(serializeToJson(new GoodsReceivedEvent(savedPo, dto)))
            .status("PENDING")
            .createdAt(Instant.now())
            .build();

        outboxRepository.save(event);
        return savedPo;
    }
}
```

### 2.3 Resilient Outbox Polling Publisher
To publish pending events to Kafka without blocking application threads, a background worker runs every 500ms using MySQL 8's non-blocking `SKIP LOCKED` row locks:

```java
@Component
public class OutboxPublisherJob {

    @Autowired
    private OutboxEventRepository outboxRepository;
    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Scheduled(fixedDelay = 500)
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEvent> pending = outboxRepository.findTop100PendingForUpdateSkipLocked();

        for (OutboxEvent event : pending) {
            try {
                String topic = resolveTopicForAggregate(event.getAggregateType());
                kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload()).get(2, TimeUnit.SECONDS);

                event.setStatus("PUBLISHED");
                event.setPublishedAt(Instant.now());
            } catch (Exception e) {
                event.setRetryCount(event.getRetryCount() + 1);
                if (event.getRetryCount() > 5) {
                    event.setStatus("FAILED");
                }
                log.error("Outbox publish failed for event: {}", event.getId(), e);
            }
        }
    }
}
```

---

## 3. Distributed Idempotency Key Architecture

Network timeouts on mobile connections frequently cause users or apps to retry HTTP `POST` requests. Without idempotency guards, retries lead to duplicate purchase orders, double inventory deductions, and conflicting ledger records.

### 3.1 Idempotency Key Protocol
Clients send a unique UUID in the HTTP header:
$$\texttt{X-Idempotency-Key: 9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d}$$

### 3.2 State Machine
```
           +-----------------------------+
           | Incoming Request with Key   |
           +-----------------------------+
                          |
             Check Key Status in Redis/DB
                          |
      +-------------------+-------------------+
      |                   |                   |
[ KEY EXISTS:         [ KEY EXISTS:        [ KEY NOT FOUND:
  IN_PROGRESS ]         COMPLETED ]          ACQUIRE LOCK ]
      |                   |                   |
Return 409 Conflict   Return Cached 200/201  Insert IN_PROGRESS
"Request processing"  Saved Response Body    Execute Service Logic
                                              Update COMPLETED
```

### 3.3 Spring Idempotency Interceptor
```java
@Component
public class IdempotencyInterceptor implements HandlerInterceptor {

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!HttpMethod.POST.matches(request.getMethod()) && !HttpMethod.PUT.matches(request.getMethod())) {
            return true;
        }

        String key = request.getHeader("X-Idempotency-Key");
        if (key == null || key.isBlank()) {
            return true; // Optional for non-critical endpoints, required on financial routes
        }

        String redisKey = "idempotency:" + key;
        String cachedResponse = redisTemplate.opsForValue().get(redisKey);

        if (cachedResponse != null) {
            if ("IN_PROGRESS".equals(cachedResponse)) {
                response.setStatus(HttpStatus.CONFLICT.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"error\": \"Duplicate mutation currently in progress. Please retry shortly.\"}");
                return false;
            } else {
                // Return cached response verbatim
                IdempotentResponse saved = deserialize(cachedResponse);
                response.setStatus(saved.getStatusCode());
                response.setContentType("application/json");
                response.getWriter().write(saved.getBody());
                return false;
            }
        }

        // Set key to IN_PROGRESS with 60-second execution lock
        redisTemplate.opsForValue().set(redisKey, "IN_PROGRESS", Duration.ofSeconds(60));
        return true;
    }
}
```

### 3.4 Key Storage & Expiration Policy
- **TTL Duration:** 24 Hours.
- **Payload Capture:** The HTTP status code and response body are captured in a `@ControllerAdvice` or Servlet Response Wrapper and cached in Redis.
- **Fingerprinting:** A SHA-256 hash of the request body is stored alongside the key. If a request arrives with the same key but a different payload, the server rejects it with `422 UNPROCESSABLE_ENTITY` to prevent replay tampering.
