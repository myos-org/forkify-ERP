# Klyro ERP 2.0 — API Evolution & Client Compatibility Guarantees

## 1. API Evolution Philosophy & Semantic Versioning

Unlike internal web applications where frontend and backend bundles deploy simultaneously, mobile applications (iOS/Android native builds) remain active in the field for months or years across diverse restaurant branch devices.

### 1.1 Non-Negotiable Contract Principles
1. **Never Break Active Field Binaries:** All endpoints and JSON response structures utilized by the React Native mobile app (`Mobile App/ForkifyERP 2`) and Web app (`Frontend/forkify-webApp`) are strictly frozen as stable contracts.
2. **Additive-Only Evolutions:** 
   - New fields added to JSON responses must be optional.
   - New request parameters must default gracefully if omitted.
   - Removing fields, renaming keys, or changing data types is strictly prohibited without a multi-release deprecation path.
3. **Lenient Parsing on Clients:** All Jackson DTOs and client fetch wrappers enforce `@JsonIgnoreProperties(ignoreUnknown = true)` to ensure that adding new response fields never crashes existing client parsers.

---

## 2. Preserved Stable Endpoint Catalog

The following endpoints represent the immutable REST API contract of Klyro ERP:

| Module | HTTP Method | Path | Primary Clients | Contract Status |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/signin` | Web, Mobile | **FROZEN** |
| **Auth** | `POST` | `/api/auth/signup` | Web | **FROZEN** |
| **Auth** | `POST` | `/api/admin/setup` | Web Setup | **FROZEN** |
| **Inventory** | `GET` | `/api/inventory/raw-materials` | Web, Mobile | **FROZEN** |
| **Inventory** | `POST` | `/api/inventory/stock-in` | Web, Mobile | **FROZEN** |
| **Inventory** | `POST` | `/api/inventory/stock-out` | Web, Mobile | **FROZEN** |
| **Inventory** | `GET` | `/api/inventory/stock-transfers` | Web, Mobile | **FROZEN** |
| **Inventory** | `POST` | `/api/inventory/stock-transfers` | Web | **FROZEN** |
| **Inventory** | `PUT` | `/api/inventory/stock-transfers/{id}/dispatch` | Web | **FROZEN** |
| **Inventory** | `PUT` | `/api/inventory/stock-transfers/{id}/receive` | Web | **FROZEN** |
| **Inventory** | `PUT` | `/api/inventory/stock-transfers/{id}/cancel` | Web | **FROZEN** |
| **Procurement** | `GET` | `/api/procurement/indents` | Web | **FROZEN** |
| **Procurement** | `POST` | `/api/procurement/indents` | Web | **FROZEN** |
| **Procurement** | `GET` | `/api/procurement/purchase-orders` | Web, Mobile | **FROZEN** |
| **Procurement** | `POST` | `/api/procurement/purchase-orders` | Web | **FROZEN** |
| **Procurement** | `POST` | `/api/procurement/goods-receipts` | Web, Mobile | **FROZEN** |
| **Recipes** | `GET` | `/api/recipes` | Web, Mobile | **FROZEN** |
| **Recipes** | `POST` | `/api/recipes` | Web | **FROZEN** |
| **Recipes** | `PUT` | `/api/recipes/{id}` | Web | **FROZEN** |
| **Recipe Versions** | `GET` | `/api/recipe-versions/recipe/{recipeId}` | Web | **FROZEN** |
| **Recipe Versions** | `POST` | `/api/recipe-versions/{versionId}/restore` | Web | **FROZEN** |
| **Reports** | `GET` | `/api/reports/sales` | Web, Mobile | **FROZEN** |
| **Reports** | `GET` | `/api/reports/inventory` | Web, Mobile | **FROZEN** |
| **Reports** | `GET` | `/api/reports/cost` | Web | **FROZEN** |
| **Reports** | `GET` | `/api/reports/wastage` | Web | **FROZEN** |
| **Reports** | `GET` | `/api/reports/branches` | Web | **FROZEN** |
| **Reports** | `GET` | `/api/reports/supplier` | Web | **FROZEN** |

---

## 3. Client Telemetry & Version Headers

Every mobile and web client request passes identification headers enabling operational routing and deprecation tracking:

```http
GET /api/inventory/raw-materials HTTP/1.1
Host: api.klyro.com
Authorization: Bearer eyJhbGci...
X-Client-Platform: android
X-Client-Version: 2.1.0
X-Correlation-Id: corr_4567-89ab-cdef
```

Spring interceptors log client version distributions and alert operations teams if obsolete client versions are attempting deprecated operations.

---

## 4. Formal Deprecation & Sunset Policy

If an endpoint or payload schema must be retired:

1. **RFC 8594 Standard Headers:** The server attaches `Deprecation` and `Sunset` headers:
   ```http
   HTTP/1.1 200 OK
   Deprecation: @1773014400
   Sunset: Wed, 11 Nov 2026 00:00:00 GMT
   Link: <https://docs.klyro.com/api/v2/migration>; rel="sunset"
   ```
2. **Minimum 180-Day Notice:** No endpoint is decommissioned in under 6 months from initial deprecation announcement.
3. **Graceful Error Response:** When sunset arrives, calls receive `410 GONE` containing a structured payload redirecting to the replacement API URI.
