# Klyro ERP 2.0 — Caching Strategy & Redis Architecture

## 1. Multi-Tier Caching Architecture

To achieve sub-5ms read latencies and protect the MySQL primary database under heavy lunch/dinner operational peaks, Klyro implements a multi-tier caching architecture.

```
[ HTTP Request ]
       |
       v
+-------------------------------------------------------+
|  L1 Cache: Hibernate First-Level Session Cache        |
|  - In-process, scoped to single @Transactional method |
|  - Eliminates duplicate queries within one request   |
+-------------------------------------------------------+
       | Cache Miss
       v
+-------------------------------------------------------+
|  L2 Cache: Distributed Redis 7.2 Cluster             |
|  - Shared across all modular monolith app nodes       |
|  - Serialized JSON / JDK binary storage               |
|  - Multi-tenant namespace isolation                   |
+-------------------------------------------------------+
       | Cache Miss
       v
+-------------------------------------------------------+
|  Primary Datastore: MySQL 8.0 (InnoDB)                |
|  - Authoritative ACID truth                           |
+-------------------------------------------------------+
```

---

## 2. Key Namespace Conventions & Multi-Tenant Isolation

All Redis keys in Klyro ERP are strictly namespaced to guarantee zero cross-tenant contamination, deterministic invalidation, and easy key inspection:

$$\text{Key Pattern} = \texttt{klyro:}\{\text{tenantId}\}\texttt{:}\{\text{module}\}\texttt{:}\{\text{entity}\}\texttt{:}\{\text{identifier}\}$$

### Example Keys:
- `klyro:tenant_01:recipes:item:42` (Individual recipe model)
- `klyro:tenant_01:recipes:list:branch:10` (Branch recipe list)
- `klyro:tenant_01:menus:active:branch:10` (Active QR menu for branch 10)
- `klyro:tenant_01:suppliers:item:8` (Supplier master profile)
- `klyro:tenant_01:reports:sales_summary:branch:10:2026-10-12` (Aggregated daily sales report)

---

## 3. TTL (Time-To-Live) Policies by Data Volatility

Data in an ERP system has widely differing volatility profiles. Using uniform TTLs leads to either stale data or useless database pressure:

| Domain / Entity | Volatility | Caching Pattern | Configured TTL | Invalidation Trigger |
|---|---|---|---|---|
| **Master Recipes** | Low | Cache-Aside (`@Cacheable`) | `24 Hours` | Updated via `RecipeService.updateRecipe` |
| **Allergens & Categories** | Very Low | Cache-Aside | `7 Days` | Updated via Admin Master Data API |
| **Branch Active Menu** | Medium | Write-Through | `1 Hour` | Menu activated / deactivated |
| **Supplier Profiles** | Low | Cache-Aside | `24 Hours` | Profile edited |
| **Reports & Analytics** | Medium | Cache-Aside | `15 Minutes` | Scheduled cron / daily close |
| **Current Inventory Stock** | Critical | **NO CACHE** (Direct DB + Lock) | `0 Seconds` | Immediate consistency required |
| **User Roles & Tokens** | Low | Cache-Aside | `30 Minutes` | User suspension / role modification |

---

## 4. Spring Boot Redis Configuration

```java
@Configuration
@EnableCaching
public class RedisCacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.activateDefaultTyping(
            LaissezFaireSubTypeValidator.instance, 
            ObjectMapper.DefaultTyping.NON_FINAL, 
            JsonTypeInfo.As.PROPERTY
        );

        GenericJackson2JsonRedisSerializer jsonSerializer = 
            new GenericJackson2JsonRedisSerializer(objectMapper);

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30))
            .disableCachingNullValues()
            .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(jsonSerializer));

        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();
        
        // Recipes: 24h
        cacheConfigs.put("recipes", defaultConfig.entryTtl(Duration.ofHours(24)));
        // Active Menus: 1h
        cacheConfigs.put("activeMenus", defaultConfig.entryTtl(Duration.ofHours(1)));
        // Reports: 15m
        cacheConfigs.put("reports", defaultConfig.entryTtl(Duration.ofMinutes(15)));

        return RedisCacheManager.builder(connectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(cacheConfigs)
            .build();
    }
}
```

---

## 5. Cache Eviction & Invalidation Patterns

### 5.1 Declarative Spring `@CacheEvict`
When a recipe or menu is updated, the stale cache entries must be evicted immediately:

```java
@Service
public class RecipeService {

    @Cacheable(value = "recipes", key = "#id")
    public Recipe getRecipeById(Long id) {
        return recipeRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Recipe not found: " + id));
    }

    @CacheEvict(value = "recipes", key = "#id")
    @Transactional
    public Recipe updateRecipe(Long id, RecipeDTO dto) {
        // Business logic and database update
    }
}
```

### 5.2 Event-Driven Cache Eviction via Kafka
When multiple application nodes run behind a load balancer, local caches can get desynchronized. Klyro publishes a `DomainEvent.CACHE_EVICT` over Apache Kafka when master records change, instructing every node to evict the corresponding key.

---

## 6. Cache Stampede Prevention (Dog-Piling)

When a hot cache key expires (e.g., the Sunday brunch menu with 500 concurrent QR menu scans), a "thundering herd" of requests can hit the database simultaneously.

### Distributed Mutex Solution:
```java
@Service
public class MenuCacheService {

    @Autowired
    private StringRedisTemplate redisTemplate;

    public Menu getActiveMenuWithLock(Long branchId) {
        String cacheKey = "klyro:tenant_01:menus:active:branch:" + branchId;
        String cachedData = redisTemplate.opsForValue().get(cacheKey);

        if (cachedData != null) {
            return deserialize(cachedData);
        }

        // Acquire 5-second distributed lock to recompute
        String lockKey = "lock:" + cacheKey;
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(lockKey, "locked", Duration.ofSeconds(5));

        if (Boolean.TRUE.equals(acquired)) {
            try {
                Menu menu = menuRepository.findActiveByBranchId(branchId);
                redisTemplate.opsForValue().set(cacheKey, serialize(menu), Duration.ofHours(1));
                return menu;
            } finally {
                redisTemplate.delete(lockKey);
            }
        } else {
            // Wait 50ms and retry from cache
            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            return getActiveMenuWithLock(branchId);
        }
    }
}
```

---

## 7. Metrics & Observability

Micrometer automatically collects and reports cache performance metrics to Prometheus:
- `cache.gets{cache="recipes", result="hit"}`
- `cache.gets{cache="recipes", result="miss"}`
- `cache.puts{cache="recipes"}`
- `cache.evictions{cache="recipes"}`

Alerts trigger if the cache hit ratio for `recipes` or `activeMenus` falls below **80%** over a 15-minute sliding window.
