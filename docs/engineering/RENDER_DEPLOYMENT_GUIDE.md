# Klyro ERP — Render Deployment & Database Setup Guide

This guide explains how to deploy the **Klyro ERP Spring Boot Backend** on [Render](https://render.com) and resolve database connectivity issues such as:
```text
Caused by: com.mysql.cj.jdbc.exceptions.CommunicationsException: Communications link failure
Caused by: java.io.EOFException: Can not read response from server. Expected to read 4 bytes, read 0 bytes before connection was unexpectedly lost.
```

---

## 1. Root Cause Analysis: Why Did `EOFException` Occur?

In the MySQL Client-Server Wire Protocol, when a client opens a TCP socket to a MySQL server, the server is required to immediately transmit an **Initial Handshake Packet** (greeting). The header is exactly **4 bytes** (3 bytes payload length + 1 byte packet sequence ID).

When the MySQL JDBC driver opens the TCP connection and calls `readFully(header, 0, 4)`, but the socket is abruptly closed or resets before sending those 4 bytes, the driver throws:
`java.io.EOFException: Can not read response from server. Expected to read 4 bytes, read 0 bytes before connection was unexpectedly lost.`

On Render, this occurs due to one of the following reasons:

1. **Localhost Fallback (No Database Configured):**
   Render runs Web Services inside isolated container sandboxes. If no database environment variables are configured in the Render Dashboard, Spring Boot defaults to `localhost:3306`. Because no MySQL server runs inside the web container, the connection is immediately rejected.

2. **Render Database Engine Mismatch (PostgreSQL vs. MySQL):**
   Render only offers managed **PostgreSQL** databases, **not MySQL**. If you created a database using Render's *"New -> PostgreSQL"* button and pasted that database URL or port (5432) into the Spring Boot backend, the MySQL driver attempts to communicate with a PostgreSQL server. PostgreSQL does not speak MySQL wire protocol and does not send the 4-byte greeting, causing `EOFException`.

3. **Cloud MySQL Enforces SSL/TLS (`useSSL=true`):**
   Managed cloud MySQL providers (Aiven, Railway, AWS RDS, PlanetScale) mandate SSL/TLS encryption. If `useSSL=false` is used, the cloud database gateway closes the connection during handshake.

4. **Firewall / IP Allowlist Restriction:**
   Render web services use dynamic outbound IP addresses. If your external MySQL instance restricts incoming connections by IP whitelist, the firewall drops the connection packet immediately. External databases must allow `0.0.0.0/0`.

---

## 2. Choosing a MySQL Database for Render

Because Render does not provide managed MySQL, choose one of the following two recommended options:

### Option A: External Cloud MySQL (Recommended — Free & Production Ready)

Use a free cloud-hosted MySQL 8 database service:
- **[Aiven for MySQL](https://aiven.io)** (Free tier available, high availability, SSL enabled)
- **[Railway](https://railway.app)** (Instant MySQL container with public connection string)
- **[Clever Cloud](https://clever-cloud.com)** (Free MySQL shared instance)

#### Connection String Format for Cloud MySQL:
```text
jdbc:mysql://<HOSTNAME>:<PORT>/<DATABASE_NAME>?useSSL=true&requireSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC
```

---

### Option B: Deploy MySQL on Render as a Private Docker Service

You can run MySQL directly inside Render alongside your web service using Docker:

1. In the **Render Dashboard**, click **New +** -> **Private Service**.
2. Select **Existing Image** and enter:
   ```text
   mysql:8.0
   ```
3. Set **Name**: `klyro-mysql`
4. Add **Disks (Persistent Storage)**:
   - **Name**: `mysql-data`
   - **Mount Path**: `/var/lib/mysql`
   - **Size**: `5 GB` or higher
5. Add the following **Environment Variables**:
   | Key | Value | Note |
   |---|---|---|
   | `MYSQL_ROOT_PASSWORD` | `<secure-root-password>` | Root user password |
   | `MYSQL_DATABASE` | `food_erp_db` | Initial schema name |
   | `MYSQL_USER` | `klyro_user` | Application user |
   | `MYSQL_PASSWORD` | `<secure-user-password>` | Application password |

6. Click **Create Private Service**. Render creates an internal private service with hostname `klyro-mysql:3306` (accessible only to your Render services in the same region).

---

## 3. Configuring the Render Web Service (Spring Boot Backend)

Now configure your Spring Boot Web Service on Render:

### Environment Variables Checklist

Navigate to your Backend Web Service -> **Environment** tab, and set:

| Key | Example (Option A: External MySQL) | Example (Option B: Render Private MySQL) | Description |
|---|---|---|---|
| `DB_URL` | `jdbc:mysql://<host>:<port>/<db>?useSSL=true&allowPublicKeyRetrieval=true&serverTimezone=UTC` | `jdbc:mysql://klyro-mysql:3306/food_erp_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC` | Full JDBC connection string |
| `DB_USERNAME` | `avnadmin` (or your cloud user) | `klyro_user` | MySQL database user |
| `DB_PASSWORD` | `<your-cloud-db-password>` | `<your-private-db-password>` | MySQL database password |
| `JWT_SECRET` | `klyro-erp-production-grade-super-secret-jwt-key-2026-secure!` | `klyro-erp-production-grade-super-secret-jwt-key-2026-secure!` | Min 32 chars for HMAC-SHA256 |
| `ALLOWED_ORIGINS` | `https://your-frontend.onrender.com,http://localhost:3000` | `*` | Allowed CORS origins |
| `PORT` | `8080` *(Render sets this automatically)* | `8080` *(Render sets this automatically)* | Web container listen port |
| `GROQ_API_KEY` | *(Optional: gsk_... for AI features)* | *(Optional: gsk_... for AI features)* | Groq LLM API Key |

> [!TIP]
> Alternatively, you can specify individual parameters instead of `DB_URL`:
> - `DB_HOST`: Hostname (e.g., `klyro-mysql` or `mysql.aivencloud.com`)
> - `DB_PORT`: `3306` (or external port)
> - `DB_NAME`: `food_erp_db`
> - `DB_SSL`: `true` (for external cloud) or `false` (for internal private service)

---

## 4. Render Build & Run Settings

- **Root Directory**: `Backend/foodManagementERP`
- **Environment**: `Java` (or `Docker`)
  - If **Java**:
    - **Build Command**: `mvn clean package -DskipTests`
    - **Start Command**: `java -Dserver.port=$PORT -jar target/food-erp-1.0-SNAPSHOT.jar`
  - If **Docker**:
    - Select Dockerfile path: `./Dockerfile`
    - Start Command: automatic (`java -jar app.jar`)

---

## 5. Verification Checklist

After deploying, verify the deployment logs in Render:

1. **HikariCP Connection Pool Initialized**:
   ```text
   HikariPool-1 - Starting...
   HikariPool-1 - Added connection com.mysql.cj.jdbc.ConnectionImpl@...
   HikariPool-1 - Start completed.
   ```
2. **Hibernate Schema Verification**:
   ```text
   org.hibernate.orm.connections.pooling - HHH10001005: Database info:
     database: MySQL (version 8.0.x)
   ```
3. **Application Bootstrapped**:
   ```text
   Tomcat started on port(s): 10000 (http) with context path ''
   Started FoodErpApplication in 8.421 seconds
   ```
4. **Bootstrap Admin Account**:
   Perform a `POST` request to initialize your admin user:
   ```bash
   curl -X POST https://<your-service>.onrender.com/api/admin/setup \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Super Admin",
       "email": "admin@klyro.com",
       "password": "AdminSecurePassword123!"
     }'
   ```
   Expected response: `200 OK` or `201 Created` with admin token.
