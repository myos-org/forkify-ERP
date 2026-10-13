# 🍴 Forkify ERP — Restaurant Operations Platform

> The complete multi-branch restaurant management system. Recipes, inventory, procurement, meal planning, QR ordering, customer loyalty and analytics — all in one connected platform.

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%2052-0EA5E9?logo=expo&logoColor=white)](https://expo.dev)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://mysql.com)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Repository Structure](#-repository-structure)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend (Spring Boot)](#1-backend--spring-boot)
  - [Web Frontend (React)](#2-web-frontend--react)
  - [Mobile App (React Native)](#3-mobile-app--react-native--expo)
  - [Landing Page (Next.js)](#4-landing-page--nextjs)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Role-Based Access Control](#-role-based-access-control)
- [QR Menu Flow](#-qr-menu-flow)
- [Database Schema](#-database-schema)
- [Project Stats](#-project-stats)

---

## 🔭 Overview

Forkify ERP is a full-stack, multi-platform restaurant ERP built for multi-branch food businesses. It covers every operational domain:

| Domain | What it covers |
|--------|---------------|
| **Recipe Management** | CRUD, ingredients, steps, nutrition, allergen matrix, cost calculation, version history |
| **Inventory** | Raw materials, finished goods, stock in/out, transfers, wastage, low-stock alerts |
| **Procurement** | Material indent → Purchase order → GRN → Inventory update |
| **Meal Planning** | Weekly plans, ingredient forecasting, push to branches |
| **Menu Management** | Active & seasonal menus, branch-specific pricing, QR code generation |
| **QR Menu Ordering** | Public customer-facing page — no login, live stock status, auto CRM |
| **Sales & Revenue** | Daily sales, margin tracking, finished goods deduction, profitability |
| **Customer CRM** | Loyalty tiers (Bronze/Silver/Gold), points, spend history, auto-registration |
| **Staff & Shifts** | Shift scheduling per branch |
| **Admin** | User management, branch management, audit logs, analytics |
| **AI Assistant** | Groq-powered contextual chat for inventory, sales and recipe insights |

---

## 📁 Repository Structure

```
forkify-erp/
│
├── src/                          # Spring Boot backend (Java 17)
│   └── main/java/com/fooderp/
│       ├── controller/           # 25 REST controllers
│       ├── service/              # 10 service classes
│       ├── entity/               # 31 JPA entities
│       ├── repository/           # 28 Spring Data repositories
│       ├── dto/                  # Request/Response DTOs
│       ├── security/             # JWT filter, UserDetailsImpl
│       └── config/               # SecurityConfig, WebConfig, AuditInterceptor
│
├── food-management/              # React web frontend
│   └── src/
│       ├── components/
│       │   ├── Pages/            # 50+ page components
│       │   ├── Layout/           # Sidebar, Header, PrivateRoute
│       │   ├── AI/               # AI Calorie Assistant
│       │   ├── Menu/             # MenuQRCode modal
│       │   └── routes/           # AppRoutes, FoodERPRoutes, RoleRoute
│       ├── services/             # 12 Axios service modules
│       ├── store/                # Redux (auth + recipe slices)
│       └── hooks/                # useBranch, usePermission
│
├── ForkifyERP 2/                 # React Native mobile app (Expo)
│   ├── app/
│   │   ├── (auth)/               # Login screen
│   │   └── (app)/
│   │       ├── (tabs)/           # Dashboard, Inventory, Recipes, Procurement, More
│   │       ├── inventory/        # 6 inventory screens
│   │       ├── procurement/      # 5 procurement screens
│   │       ├── recipes/          # Recipe detail, add/edit, log production
│   │       ├── sales/            # Daily sales
│   │       ├── customers/        # CRM
│   │       ├── meal-planning/    # Weekly plan
│   │       ├── staff/            # Shift scheduler
│   │       ├── reports/          # Reports
│   │       └── admin/            # Users, branches, audit, analytics
│   └── src/
│       ├── services/             # API service layer
│       ├── store/                # Redux store
│       └── theme/                # Design tokens
│
└── forkify-landing/              # Next.js 16 marketing site
    └── app/
        ├── page.tsx              # Full landing page (single file)
        ├── layout.tsx            # Root layout + metadata
        └── globals.css           # All styles
```

---

## 🏗️ Architecture

```
┌─────────────────────┐    HTTPS/JSON     ┌──────────────────────────┐
│   React Web App     │◄─────────────────►│                          │
│  (food-management)  │   Bearer JWT      │   Spring Boot Backend    │
│  localhost:3000     │                   │   localhost:8080         │
└─────────────────────┘                   │                          │
                                          │  Spring Security + JWT   │
┌─────────────────────┐    HTTPS/JSON     │  28 REST Controllers     │
│ React Native App    │◄─────────────────►│  10 Service Classes      │
│  (ForkifyERP 2)     │   Bearer JWT      │  28 JPA Repositories     │
│  iOS / Android      │                   │  Groq AI Integration     │
└─────────────────────┘                   │                          │
                                          └────────────┬─────────────┘
┌─────────────────────┐                               │ JPA/Hibernate
│ Public QR Menu Page │                   ┌────────────▼─────────────┐
│  /menu/:menuId      │◄──── No Auth ────►│       MySQL 8            │
│  (React, no login)  │                   │   food_erp_db            │
└─────────────────────┘                   │   ~31 tables             │
                                          └──────────────────────────┘
┌─────────────────────┐
│  Next.js Landing    │  Static / SSG
│  forkify-landing/   │  Deploy → Vercel
└─────────────────────┘
```

**Authentication:** Stateless JWT (24h expiry). All protected endpoints require `Authorization: Bearer <token>`. The JWT filter chain runs before every controller. Public endpoints (`/api/auth/**`, `/api/menus/public/**`) are explicitly permit-all.

---

## ✨ Features

### Recipe Management
- Full recipe CRUD with ingredients, preparation steps, cook time, servings
- Real-time cost-per-serving calculation from live ingredient prices
- Nutrition tracking (calories, protein, carbs, fat, fiber)
- Allergen matrix across all recipes
- Version history — every edit creates a JSON snapshot with change summary
- Log Production → deducts raw materials, adds to Finished Goods Stock

### Inventory Management
- Dual inventory: **Raw Materials** (InventoryItem) + **Finished Goods** (FinishedGoodStock)
- Every change creates a `StockTransaction` record (full audit ledger)
- Transaction types: `STOCK_IN`, `STOCK_OUT`, `PRODUCTION`, `WASTAGE`, `TRANSFER_IN`, `TRANSFER_OUT`
- Low-stock alerts when `currentQty < minStockLevel`
- Inter-branch stock transfers with dispatch/receive workflow
- Wastage recording for both ingredients and finished products

### Procurement
| Stage | Status values |
|-------|--------------|
| Material Indent | `PENDING` → `APPROVED` / `REJECTED` → `FULFILLED` |
| Purchase Order | `DRAFT` → `SENT` → `APPROVED` → `PARTIALLY_RECEIVED` → `RECEIVED` |
| GRN | `PENDING` → `COMPLETE` |

- Supplier management with rating system (updated per GRN)
- HQ-approved vendor list visible to all branches
- GRN completion auto-updates `InventoryItem.currentQty`

### QR Menu Ordering (Public)
1. Admin generates QR code from Active Menu page → URL: `/menu/:menuId?branchId=X`
2. Customer scans → sees full menu with **live stock status** (no login required)
3. Items with `availableServings > 0` shown as **Available**; others as **Out of Stock** (still orderable)
4. Customer places order → `SalesEntry` created tagged `[QR-ORDER:QR-YYYYMMDD-XXXX]`
5. Phone number provided → existing customer linked or **new customer auto-created** in CRM
6. Staff sees order in Daily Sales → QR Orders Panel:
   - **Full stock** → "Fulfil Now" (direct sale, deducts finished goods)
   - **Partial stock** → "Sell X in stock" + "Produce Y more"
   - **No stock** → "Log Production" (deducts raw materials, adds finished goods)
7. On fulfilment → loyalty points awarded to customer

### Customer CRM
| Tier | Points required |
|------|----------------|
| BRONZE | 0 – 499 |
| SILVER | 500 – 999 |
| GOLD | 1,000+ |

- 1 loyalty point per ₹10 spent
- Points awarded at order fulfilment (not at placement)
- Auto-registration from QR menu (name + phone number)
- Visit count, last visit, total lifetime spend tracking

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Java | 17 | Language |
| Spring Boot | 3.x | Framework |
| Spring Security | 6.x | Auth + RBAC |
| Spring Data JPA | 3.x | ORM layer |
| Hibernate | 6.x | JPA implementation |
| MySQL | 8.0 | Primary database |
| HikariCP | — | Connection pooling |
| Lombok | — | Boilerplate reduction |
| Groq API | — | AI chat assistant |

### Web Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Redux Toolkit | 2.x | State management |
| React Router | 7.x | Client routing |
| Axios | 1.x | HTTP client |
| Lucide React | 0.56x | Icon library |
| Ant Design | 6.x | UI components |
| SASS | 1.x | Styles |

### Mobile App
| Technology | Version | Purpose |
|---|---|---|
| React Native | — | Mobile framework |
| Expo SDK | 52 | Build toolchain |
| Expo Router | — | File-based navigation |
| Redux Toolkit | — | State management |
| Expo SecureStore | — | JWT storage |

### Landing Page
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16 | SSG framework |
| React | 19 | UI |
| Plain CSS | — | No Tailwind runtime needed |

---

## 🚀 Getting Started

### Prerequisites

- **Java 17+** (`java -version`)
- **Maven 3.8+** or **Gradle** (whichever your Spring project uses)
- **Node.js 18+** (`node -v`)
- **MySQL 8** running locally or remote
- **Expo CLI** for mobile (`npm install -g expo-cli`)

---

### 1. Backend — Spring Boot

#### Create the database
```sql
CREATE DATABASE food_erp_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'myproject_user'@'localhost' IDENTIFIED BY 'StrongPassword@123';
GRANT ALL PRIVILEGES ON food_erp_db.* TO 'myproject_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Configure environment
Copy `.env.example` or set these environment variables:
```bash
export DB_URL=jdbc:mysql://localhost:3306/food_erp_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
export DB_USERNAME=myproject_user
export DB_PASSWORD=StrongPassword@123
export JWT_SECRET=your-secret-key-minimum-32-characters-long
export JWT_EXPIRATION=86400000
```

#### Run
```bash
# From the project root (where pom.xml lives)
./mvnw spring-boot:run

# Or build first
./mvnw clean package -DskipTests
java -jar target/*.jar
```

The API starts on **https://forkify-erp.onrender.com**

> Hibernate is set to `ddl-auto=update` — all tables are created automatically on first run.

#### Create the first (super) admin
Option A — set these env vars on the backend (e.g. Render). On startup the admin is created if that username doesn't exist yet (an HQ branch is created/reused):
```text
SUPERADMIN_USERNAME=admin
SUPERADMIN_EMAIL=admin@forkify.com
SUPERADMIN_PASSWORD=<strong-password>
```
More super admins: log in as an admin → **User Management** → role **Super Admin**.
Locked out of every admin account? Set `SUPERADMIN_USERNAME` to an existing user, a new `SUPERADMIN_PASSWORD` and `SUPERADMIN_RESET=true`, restart, log in, then remove `SUPERADMIN_RESET`.

Option B — call the one-time setup endpoint (only works while no admin exists):
```bash
curl -X POST https://forkify-erp.onrender.com/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@forkify.com","password":"<strong-password>","fullName":"Super Admin"}'
```

---

### 2. Web Frontend — React

```bash
cd food-management
npm install
```

Create `.env` in `food-management/`:
```env
REACT_APP_API_URL=https://forkify-erp.onrender.com/api
```

```bash
npm start
# Opens http://localhost:3000
```

#### Build for production
```bash
npm run build
# Output in /build — serve with nginx or any static host
```

---

### 3. Mobile App — React Native / Expo

```bash
cd "ForkifyERP 2"
npm install
```

Create `.env`:
```env
EXPO_PUBLIC_API_URL=https://forkify-erp.onrender.com/api
```

```bash
# Start Expo dev server
npx expo start

# Run on specific platform
npx expo start --ios
npx expo start --android
```

> For a physical device, replace `localhost` with your machine's local IP address (e.g. `192.168.1.10`).

#### Build for production
```bash
npx expo build:android   # APK
npx expo build:ios       # IPA (requires Apple Developer account)
# Or use EAS Build:
npx eas build --platform all
```

---

### 4. Landing Page — Next.js

```bash
cd forkify-landing
npm install
npm run dev
# Opens http://localhost:3000
```

#### Deploy to Vercel (one command)
```bash
npx vercel --prod
```

---

## 🔐 Environment Variables

### Backend (`src/main/resources/application.properties`)

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | Server port |
| `DB_URL` | `jdbc:mysql://localhost:3306/food_erp_db...` | MySQL JDBC URL |
| `DB_USERNAME` | `myproject_user` | Database username |
| `DB_PASSWORD` | `StrongPassword@123` | Database password |
| `JWT_SECRET` | *(dev only placeholder)* | JWT signing secret — **change in production** |
| `JWT_EXPIRATION` | `86400000` | Token expiry in ms (24h) |
| `JPA_DDL_AUTO` | `update` | Hibernate DDL strategy |
| `JPA_SHOW_SQL` | `false` | Log SQL queries |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins |

### Web Frontend (`food-management/.env`)

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API base URL |

### Mobile App (`ForkifyERP 2/.env`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |

---

## 📡 API Reference

All protected endpoints require: `Authorization: Bearer <jwt_token>`

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/login` | Public | Login → returns JWT |
| `POST` | `/register` | Public | Self-registration (ROLE_USER) |
| `GET` | `/me` | Required | Get current user info |

### Recipes — `/api/recipes`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | Required | List all recipes |
| `POST` | `/` | Required | Create recipe |
| `GET` | `/:id` | Required | Recipe detail |
| `PUT` | `/:id` | Required | Update recipe |
| `DELETE` | `/:id` | Required | Delete recipe |
| `GET` | `/:id/nutrition` | Required | Nutrition facts |
| `GET` | `/:id/cost` | Required | Cost breakdown |
| `POST` | `/:id/produce` | Required | Log production |
| `GET` | `/:id/versions` | Required | Version history |

### Inventory — `/api/inventory`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/?branchId=` | Required | List inventory items |
| `POST` | `/stock-in` | Required | Record stock in |
| `POST` | `/stock-out` | Required | Record stock out |
| `POST` | `/wastage` | Required | Record wastage |
| `GET` | `/low-stock` | Required | Items below minimum |
| `GET` | `/finished-goods` | Required | Finished goods stock |
| `GET` | `/transactions` | Required | Stock transaction ledger |

### Procurement — `/api/procurement`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET/POST` | `/suppliers` | Required | Supplier management |
| `GET/POST` | `/indents` | Required | Material indents |
| `PUT` | `/indents/:id/approve` | Admin | Approve indent |
| `GET/POST` | `/purchase-orders` | Required | Purchase orders |
| `PUT` | `/purchase-orders/:id/status` | Required | Update PO status |
| `GET/POST` | `/grn` | Required | Goods received notes |
| `GET` | `/vendors/approved` | Required | HQ approved vendors |

### Sales — `/api/sales`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/` | Required | Log a sale |
| `GET` | `/?branchId=&date=` | Required | Sales history |
| `GET` | `/summary` | Required | Revenue summary |

### Public QR Menu — `/api/menus/public` *(No auth required)*
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/:menuId?branchId=` | **Public** | Menu with stock status |
| `POST` | `/order` | **Public** | Place QR order |

### Other key endpoints
| Base path | Description |
|---|---|
| `/api/menus` | Menu & menu item management |
| `/api/meal-plans` | Meal planning & forecasting |
| `/api/customers` | Customer CRM |
| `/api/production` | Production logs & FG stock |
| `/api/stock-transfers` | Branch stock transfers |
| `/api/shifts` | Staff shift scheduling |
| `/api/dashboard` | Dashboard KPIs & charts |
| `/api/analytics` | Advanced analytics (Admin) |
| `/api/admin` | User & branch management (Admin) |
| `/api/ai` | AI chat assistant (Groq) |
| `/api/notifications` | System notifications |

---

## 🔑 Role-Based Access Control

Four roles enforced at both route (React `RoleRoute`) and API (`@PreAuthorize`) level:

| Feature | ADMIN | MANAGER | STAFF | USER |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Recipe — View & Log Production | ✓ | ✓ | ✓ | ✓ |
| Recipe — Add / Edit / Delete | ✓ | ✓ | ✗ | ✗ |
| Inventory — View | ✓ | ✓ | ✓ | ✗ |
| Inventory — Stock In / Out | ✓ | ✓ | ✓ | ✗ |
| Inventory — Stock Transfers | ✓ | ✗ | ✗ | ✗ |
| Procurement — Indent / PO / GRN | ✓ | ✓ | ✓ | ✗ |
| Procurement — Approve Vendors | ✓ | ✗ | ✗ | ✗ |
| Sales — Daily Entry | ✓ | ✓ | ✓ | ✗ |
| Meal Planning — Push to Branches | ✓ | ✗ | ✗ | ✗ |
| Staff Shift Scheduling | ✓ | ✓ | ✗ | ✗ |
| User & Branch Management | ✓ | ✗ | ✗ | ✗ |
| Audit Logs & Analytics | ✓ | ✗ | ✗ | ✗ |

---

## 📱 QR Menu Flow

```
Active Menu Page (ERP)
  └── "Generate QR Code" button
       └── QR → URL: /menu/:menuId?branchId=X

Customer scans QR (no login)
  ├── GET /api/menus/public/:menuId?branchId=X
  │     → returns items with inStock = (availableServings > 0)
  ├── Customer adds items to cart
  └── POST /api/menus/public/order
        ├── Phone exists in CRM → link customer (update lastVisit)
        ├── Phone not in CRM   → auto-create Customer record
        ├── No phone           → anonymous order
        └── Creates SalesEntry tagged [QR-ORDER:QR-YYYYMMDD-XXXX]

ERP Daily Sales → QR Orders Panel
  ├── availableServings >= qty → "Fulfil Now" (direct sale + points)
  ├── 0 < available < qty      → "Sell X" + "Produce Y more"
  └── availableServings = 0   → "Log Production" (deducts raw stock → adds FG)

On fulfilment (logSales)
  └── customerId passed → loyaltyPoints += (totalRevenue / 10)
                          totalSpend += revenue
                          visitCount += 1
```

---

## 🗄️ Database Schema

**31 JPA entities** mapping to ~31 MySQL tables:

| Domain | Tables |
|--------|--------|
| Auth | `users` |
| Organization | `branches` |
| Recipes | `recipes`, `recipe_ingredients`, `recipe_steps`, `recipe_versions` |
| Ingredients | `ingredients` |
| Inventory | `inventory_items`, `finished_good_stock`, `stock_transactions`, `wastage_records` |
| Stock Transfers | `stock_transfers`, `stock_transfer_items` |
| Procurement | `suppliers`, `material_indents`, `indent_items`, `purchase_orders`, `po_items`, `goods_received`, `grn_items` |
| Menu | `menus`, `menu_items`, `branch_menu_prices` |
| Meal Planning | `meal_plans`, `meal_plan_items` |
| Production | `production_logs` |
| Sales | `sales_entries` |
| Customers | `customers` |
| Staff | `shifts` |
| System | `audit_logs` |

All tables are auto-created by Hibernate (`ddl-auto=update`). No manual migrations needed for development.

---

## 📊 Project Stats

| Metric | Count |
|--------|-------|
| Backend controllers | 25 |
| JPA entities | 31 |
| Spring Data repositories | 28 |
| Service classes | 10 |
| Web frontend pages | 50+ |
| Mobile app screens | 36 |
| API endpoints | 80+ |
| Platforms | 4 (Web, Mobile, API, Landing) |

---

## 📂 Key File Locations

| File | Purpose |
|------|---------|
| `src/main/java/com/fooderp/config/SecurityConfig.java` | JWT filter chain, CORS, permit-all rules |
| `src/main/java/com/fooderp/security/AuthTokenFilter.java` | JWT validation per request |
| `src/main/java/com/fooderp/service/SalesService.java` | Sales logic + QR order fulfilment + loyalty points |
| `src/main/java/com/fooderp/service/ProductionService.java` | Log production, deduct raw stock, add finished goods |
| `src/main/java/com/fooderp/service/ProcurementService.java` | Full procurement pipeline |
| `src/main/resources/application.properties` | All configuration with env var overrides |
| `food-management/src/components/routes/AppRoutes.js` | All frontend routes incl. public `/menu/:menuId` |
| `food-management/src/components/routes/FoodERPRoutes.js` | Protected ERP routes with role guards |
| `food-management/src/services/api.js` | Axios instance with JWT interceptor + 401 auto-logout |
| `food-management/src/components/Pages/Menu/QRMenuPage.js` | Public QR menu landing page |
| `food-management/src/components/Pages/Sales/DailySales.js` | Daily sales + QR order fulfilment panel |
| `ForkifyERP 2/app/_layout.js` | Mobile root layout + auth initialization |
| `forkify-landing/app/page.tsx` | Complete marketing landing page |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push to branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

### Commit convention
```
feat:     new feature
fix:      bug fix
docs:     documentation only
refactor: code change without feature/fix
style:    formatting, missing semicolons, etc.
```

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for the food & restaurant industry<br/>
  <strong>Forkify ERP</strong> — From kitchen to customer, all connected.
</p>
