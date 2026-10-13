# Klyro ERP 2.0 — Event-Driven Workflows & Kafka Architecture

## 1. Event Streaming Architecture Overview

While synchronous HTTP handles client-facing request-response flows, Klyro ERP uses **Apache Kafka 3.7** (KRaft mode) for asynchronous cross-domain workflows, notifications, audit logging, and reporting rollups.

```
+-----------------------------------------------------------------------------------+
|                            DOMAIN PRODUCERS (OUTBOX)                              |
|   Procurement Service   |   Inventory Service   |   Sales / Orders Service        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                              APACHE KAFKA TOPICS                                  |
|                                                                                   |
|  Topic: klyro.procurement.events   [Partitioned by po_id]                         |
|  Topic: klyro.inventory.events     [Partitioned by raw_material_id]               |
|  Topic: klyro.orders.events        [Partitioned by branch_id]                     |
|  Topic: klyro.production.events    [Partitioned by branch_id]                     |
+-----------------------------------------------------------------------------------+
               |                                 |                       |
               v                                 v                       v
     +-------------------+             +-------------------+   +--------------------+
     | Consumer Group:   |             | Consumer Group:   |   | Consumer Group:    |
     | cg-stock-deduct   |             | cg-notifications  |   | cg-report-rollup   |
     | (Deducts recipe   |             | (Alerts managers, |   | (Updates analytics |
     | ingredients)      |             | sends emails)     |   | dashboards)        |
     +-------------------+             +-------------------+   +--------------------+
```

---

## 2. Topic Topology & Partitioning Strategy

Kafka guarantees total ordering **only within a partition**. Therefore, partition keys are deliberately chosen based on the business entity that requires sequential processing:

| Topic Name | Partition Key | Partitions | Retention | Purpose |
|---|---|---|---|---|
| `klyro.inventory.events` | `raw_material_id` | 12 | 14 Days | Stock adjustments, wastage logs, low-stock warnings |
| `klyro.procurement.events` | `po_id` | 6 | 30 Days | Indent approvals, PO issuance, GRN receipts |
| `klyro.orders.events` | `branch_id` | 12 | 7 Days | Table QR orders, POS checkout, status updates |
| `klyro.production.events` | `branch_id` | 6 | 14 Days | Batch cooking logs, yields, BOM deductions |
| `klyro.audit.events` | `tenant_id` | 12 | 365 Days | Full non-repudiation administrative audit trail |

---

## 3. Standardized CloudEvents Schema

All domain events adhere to the **CloudEvents 1.0** specification, ensuring language neutrality, trace propagation, and robust schema evolution:

```json
{
  "specversion": "1.0",
  "id": "evt_7f8a9b0c-1234-4567-89ab-cdef01234567",
  "source": "/klyro/service/procurement",
  "type": "com.klyro.procurement.goods_received.v1",
  "time": "2026-10-12T19:45:00.000Z",
  "datacontenttype": "application/json",
  "tenantid": "tenant_enterprise_01",
  "correlationid": "corr_abc123xyz789",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "data": {
    "grnId": 402,
    "poId": 105,
    "branchId": 3,
    "supplierId": 14,
    "receivedItems": [
      {
        "rawMaterialId": 52,
        "rawMaterialName": "Basmati Rice 20kg",
        "orderedQuantity": 10.0,
        "receivedQuantity": 10.0,
        "unit": "BAG",
        "unitPrice": 45.00
      }
    ],
    "poStatusAfterReceipt": "RECEIVED",
    "receivedByUserId": 18
  }
}
```

---

## 4. Consumer Group Architecture & Manual Acknowledgments

Automatic offset commits (`enable.auto.commit = true`) risk message loss during JVM crashes. Klyro mandates **manual acknowledgment** after successful database mutation:

```java
@Configuration
public class KafkaConsumerConfig {

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> kafkaListenerContainerFactory(
            ConsumerFactory<String, String> consumerFactory) {
        ConcurrentKafkaListenerContainerFactory<String, String> factory = 
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        factory.setConcurrency(3);
        return factory;
    }
}
```

### Idempotent Consumer Listener:
```java
@Service
public class InventoryStockEventListener {

    @Autowired
    private InventoryService inventoryService;

    @KafkaListener(
        topics = "klyro.procurement.events", 
        groupId = "cg-inventory-stock-in", 
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void handleGoodsReceived(ConsumerRecord<String, String> record, Acknowledgment ack) {
        try {
            GoodsReceivedEvent event = parseEvent(record.value());
            // Update physical inventory in local DB
            inventoryService.processIncomingGRNStock(event);
            // Explicit manual commit upon DB transaction success
            ack.acknowledge();
        } catch (DuplicateEventException e) {
            // Idempotent duplicate: ack and skip
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to process event offset: {}", record.offset(), e);
            throw e; // Handled by Dead Letter Topic error handler
        }
    }
}
```

---

## 5. Dead-Letter Topic (DLT) & Retry Backoff Strategy

Failures during message processing are managed with Spring Kafka's `DefaultErrorHandler`:

```java
@Bean
public DefaultErrorHandler errorHandler(KafkaTemplate<String, Object> template) {
    // 3 retries with exponential backoff: 1s, 2s, 4s
    ExponentialBackOffWithMaxRetries backOff = new ExponentialBackOffWithMaxRetries(3);
    backOff.setInitialInterval(1000L);
    backOff.setMultiplier(2.0);
    backOff.setMaxInterval(8000L);

    DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(template,
        (record, exception) -> new TopicPartition(record.topic() + ".DLT", record.partition()));

    return new DefaultErrorHandler(recoverer, backOff);
}
```

### DLT Triage Workflow:
1. Failed messages are published to `klyro.procurement.events.DLT` with full diagnostic exception headers (`x-exception-message`, `x-original-topic`, `x-original-offset`).
2. Operations teams monitor `kafka_consumer_lag` and DLT queue counts.
3. An administrative replay CLI re-queues verified messages after bug remediation.
