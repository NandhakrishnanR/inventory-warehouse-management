# Enterprise Multi-Location Inventory & Warehouse Management ERP

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green?logo=node.js)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

An enterprise-grade, web-based Enterprise Resource Planning (ERP) platform architected for complex, multi-facility manufacturing and distribution enterprises. Built to handle multi-tier warehouse topologies, double-entry stock ledgers, full procurement lifecycles, goods receiving with inspection, inter-warehouse transfers, cycle count reconciliations, multi-tiered approval chains, and immutable audit logs.

---

## Table of Contents

1. [Project Overview & Purpose](#1-project-overview--purpose)
2. [Complete Technology Stack](#2-complete-technology-stack)
3. [System Architecture & Design Decisions](#3-system-architecture--design-decisions)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Setup & Installation Instructions](#5-setup--installation-instructions)
   - [Method A: Docker Compose (Recommended)](#method-a-docker-compose-recommended)
   - [Method B: Local Development Setup](#method-b-local-development-setup)
   - [Running Automated Integration Tests](#running-automated-integration-tests)
6. [Core Modules & Functional Capabilities](#6-core-modules--functional-capabilities)
7. [User Roles, Responsibilities & Credentials](#7-user-roles-responsibilities--credentials)
8. [User Access Matrix (RBAC) & Documentation](#8-user-access-matrix-rbac--documentation)
9. [Important Configurations & Dependencies](#9-important-configurations--dependencies)
10. [Database Schema & Entity Model](#10-database-schema--entity-model)

---

## 1. Project Overview & Purpose

Modern multi-site logistics and manufacturing enterprises struggle with fragmented spreadsheets, phantom inventory, overselling, untracked transit shrinkage, and disconnected procurement workflows. 

The **Enterprise Inventory & Warehouse Management ERP** solves these operational challenges by delivering:

- **End-to-End Visibility**: Complete physical hierarchy tracking from Global Corporation down to Regions, Cities, Sites, Physical Warehouses, Zones, Racks, and individual Bins.
- **Double-Entry Stock Accounting**: Every unit movement (receipt, intake, pick, issue, transfer, or variance adjustment) writes an atomic, non-destructive row to an immutable transaction ledger.
- **ACID Transactional Integrity**: All inventory adjustments use PostgreSQL atomic transactions (`$transaction`), strictly preventing negative balances, race conditions, or orphaned movement records.
- **Segregation of Duties & RBAC**: Strict role-based permission enforcement ensuring that personnel who request inventory cannot authorize purchases, and warehouse personnel cannot unilaterally adjust stock without manager review.
- **Multi-Level Approval Engine**: Configurable, threshold-based sign-offs for departmental requisitions, supplier purchase orders, stock transfers, and count variance reconciliation.
- **Complete Audit Trail**: Immutable logging capturing actor ID, timestamp, entity name, reference, and full before/after JSON state snapshots for compliance and SOX/ISO audits.

---

## 2. Complete Technology Stack

| Category | Technology | Version | Purpose & Usage in Project |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React.js** | `^18.3.1` | Single Page Application (SPA) with responsive component hierarchy |
| **Frontend Language** | **TypeScript** | `^5.7.2` | Compile-time strict typing across forms, API contracts, and models |
| **Frontend Build Tool** | **Vite** | `^6.0.3` | Ultra-fast HMR dev server and optimized production Rollup bundling |
| **Styling & UI Design** | **Tailwind CSS** | `^3.4.17` | Utility-first responsive CSS, modern glassmorphism, and dark mode |
| **Server State / Cache**| **TanStack React Query** | `^5.62.8` | Declarative asynchronous data fetching, cache synchronization, and mutations |
| **Routing** | **React Router DOM** | `^7.1.0` | Client-side declarative routing, protected routes, and layouts |
| **Icons & Typography** | **Lucide React** | `^0.468.0` | High-quality, lightweight SVG iconography |
| **HTTP Client** | **Axios** | `^1.7.9` | Request/response interceptors for automatic JWT injection and 401 handling |
| **Backend Runtime** | **Node.js** | `v22.x` | High-throughput asynchronous V8 server runtime |
| **Backend Framework** | **Express.js** | `^4.21.2` | RESTful API routing, middleware chaining, and HTTP request handling |
| **Backend Language** | **TypeScript** | `^5.7.2` | Strict end-to-end typing for controllers, routes, schemas, and services |
| **ORM & Database Client**| **Prisma ORM** | `^5.22.0` | Schema migrations, type-safe queries, composite unique keys, and transactions |
| **Primary Database** | **PostgreSQL** | `15-alpine` | ACID-compliant relational storage, foreign key cascades, and check constraints |
| **Validation Library** | **Zod** | `^3.24.1` | Runtime request body and parameter validation with automatic type coercion |
| **Security & Auth** | **JSON Web Token (JWT)** | `^9.0.2` | Stateless signed tokens carrying user ID, roles, and warehouse scopes |
| **Password Hashing** | **bcryptjs** | `^2.4.3` | Cryptographic salted hashing for secure credential storage |
| **API Documentation** | **Swagger UI Express** | `^5.0.1` | Interactive OpenAPI 3.0 specification viewer at `/api/docs` |
| **Testing Suite** | **Vitest & Supertest** | `^2.1.8 / ^7.0.0` | Fast unit and end-to-end integration test runner against API endpoints |
| **Containerization** | **Docker & Docker Compose**| `Compose v2` | Containerized orchestration for Postgres, Backend, and Frontend services |
| **Office Automation** | **openpyxl & Pillow** | `3.1.5 / 12.3` | Programmatic Excel spreadsheet and visual matrix generation |

---

## 3. System Architecture & Design Decisions

### 3.1 Architectural Pattern: Domain-Driven Modular Monolith
The system is built as a **Domain-Driven Modular Monolith**:
- **Why this approach**: Avoids the latency, distributed transaction overhead (two-phase commit/Saga), and network failure modes of distributed microservices while maintaining strict internal domain boundaries.
- **Module Encapsulation**: Each business capability (e.g., `procurement`, `warehouse`, `transfer`, `inventory`) encapsulates its own routes, controller, and Zod schemas inside `backend/src/modules/`.
- **Atomic Double-Entry Transactions**: Critical inventory actions run within `prisma.$transaction(...)`. If any balance check or location update fails, the entire transaction rolls back cleanly, guaranteeing zero data corruption.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React SPA Client (Vite)                         │
│  Dashboard • Warehouse Tree • Balances • Ledger • Procurement • Audits │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON (Axios + JWT)
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Express.js Modular API Server (Node 22)               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Middlewares: Auth (JWT) • RBAC (Roles & Perms) • Warehouse Scope │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌────────────┬─────────────┬─────────────┬────────────┬────────────┐  │
│  │ Warehouse  │  Inventory  │ Procurement │ Transfers  │ Approvals  │  │
│  │  Module    │   Module    │   Module    │   Module   │   Module   │  │
│  └────────────┴─────────────┴─────────────┴────────────┴────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Shared Infrastructure: Audit Logger • Notification • Prisma ORM  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Connection Pool (ACID SQL)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    PostgreSQL 15 Relational Database                   │
│   56 Normalized Tables • Relational FKs • Unique Constraints • Indexes │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Project Folder Structure

```
enterprise-inventory-warehouse-management-ERP/
├── .gitignore                          # Git ignore rules for node_modules, dist, .env
├── docker-compose.yml                  # Multi-container orchestration (Postgres, API, Client)
├── README.md                           # Master project documentation
│
├── docs/                               # Project Documentation & Artifacts
│   ├── User_Access_Matrix.xlsx         # Multi-sheet Excel RBAC Matrix (Catalog & Logins)
│   ├── user_access_matrix_preview.png  # High-resolution visual preview of the RBAC Matrix
│   └── generate_matrix.py              # Generator script for Excel & visual artifacts
│
├── backend/                            # Node.js + Express + Prisma API
│   ├── Dockerfile                      # Multi-stage production container build
│   ├── package.json                    # Backend dependencies and run scripts
│   ├── tsconfig.json                   # TypeScript configuration
│   ├── .env.example                    # Template environment variables
│   ├── .env                            # Active development environment settings
│   │
│   ├── prisma/
│   │   ├── schema.prisma               # Prisma data models (56 tables across 12 groups)
│   │   └── seed.ts                     # Enterprise database seed (users, roles, topology)
│   │
│   ├── src/
│   │   ├── app.ts                      # Express application configuration and middleware
│   │   ├── server.ts                   # HTTP listener entrypoint (Port 5002)
│   │   ├── config/                     # Configuration and environment loaders
│   │   ├── middleware/                 # Auth (JWT), RBAC checks, error handler
│   │   │   ├── auth.ts                 # JWT verification and user payload extraction
│   │   │   ├── rbac.ts                 # Role, permission, and warehouse scoping gates
│   │   │   └── errorHandler.ts         # Global centralized error formatting
│   │   │
│   │   ├── modules/                    # Domain-Driven Functional Modules
│   │   │   ├── approval/               # Multi-level approval engine
│   │   │   ├── auth/                   # Login, user registration, token refresh
│   │   │   ├── inventory/              # Balance lookups, direct intake, material issues
│   │   │   ├── procurement/            # Requisitions, RFQs, purchase orders
│   │   │   ├── product/                # SKU, categories, UoMs, barcodes
│   │   │   ├── receiving/              # Goods inward, inspection, GRNs, putaway
│   │   │   ├── reports/                # Valuation, turnover, stock aging, CSV exports
│   │   │   ├── stock-count/            # Physical count sessions, variance reconciliation
│   │   │   ├── transfer/               # Inter-warehouse transfer dispatch and receipt
│   │   │   └── warehouse/              # Topologies, zones, racks, bin CRUD & status
│   │   │
│   │   ├── routes/                     # Central API route index mounting
│   │   └── shared/                     # Cross-cutting concerns (audit, prisma, swagger)
│   │       ├── audit.ts                # Immutable audit log writer
│   │       ├── prisma.ts               # Singleton PrismaClient instance
│   │       └── swagger.ts              # OpenAPI 3.0 Swagger schema definitions
│   │
│   └── tests/                          # Integration Test Suite
│       └── erp.test.ts                 # End-to-end tests for auth, ledger, and workflows
│
├── frontend/                           # React 18 + Vite + Tailwind Client
│   ├── Dockerfile                      # Production Nginx frontend build
│   ├── package.json                    # Frontend dependencies and run scripts
│   ├── vite.config.ts                  # Vite build config with backend proxy (`/api`)
│   ├── tailwind.config.js              # Theme colors, glassmorphism utilities
│   ├── tsconfig.json                   # TypeScript compiler configuration
│   │
│   └── src/
│       ├── main.tsx                    # React application root DOM mount
│       ├── App.tsx                     # Route hierarchy and authenticated layout wrapper
│       ├── index.css                   # Global styles, glass cards, typography
│       ├── components/                 # Reusable UI components
│       │   ├── Navbar.tsx              # Top navigation, persona switcher, notifications
│       │   └── Sidebar.tsx             # Main ERP operations sidebar navigation
│       │
│       ├── context/                    # Application React Contexts
│       │   ├── AuthContext.tsx         # User authentication, RBAC helpers, permissions
│       │   └── ThemeContext.tsx        # Dark / Light theme toggling
│       │
│       ├── pages/                      # Operational Screen Views
│       │   ├── Dashboard.tsx           # Operational KPIs, quick stats, ledger feed
│       │   ├── WarehouseHierarchy.tsx  # Interactive tree, Bin/Rack/Zone CRUD, inspector
│       │   ├── Products.tsx            # Product catalog, SKU creation, UoM manager
│       │   ├── InventoryBalances.tsx   # Bin-level balance grid, manual intake modal
│       │   ├── StockLedger.tsx         # Double-entry ledger viewer and audit export
│       │   ├── Procurement.tsx         # Purchase Requisition and PO lifecycle management
│       │   ├── ReceivingPutaway.tsx    # GRN delivery inspection and bin putaway queues
│       │   ├── Transfers.tsx           # 2-step transfer dispatch and discrepancy receipt
│       │   ├── StockCounts.tsx         # Cycle count initiation, counting, variance posting
│       │   ├── ApprovalInbox.tsx       # Centralized approval queue for pending requests
│       │   ├── Reports.tsx             # Financial valuation, stock aging, turnover
│       │   ├── AuditLogs.tsx           # Immutable audit trail with before/after diffs
│       │   ├── UsersManagement.tsx     # Staff directory, role assignments, location access
│       │   └── Login.tsx               # Authentication portal with 1-click persona logins
│       │
│       ├── services/                   # Network Services
│       │   └── api.ts                  # Axios client with interceptors
│       └── types/                      # TypeScript domain models and interfaces
│
└── notes/                              # Build scripts and workflow documentation
```

---

## 5. Setup & Installation Instructions

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Docker & Docker Desktop**: Installed and running (if using Docker)
- **Git**: Installed for repository management
- **PostgreSQL**: `v15.x` (only required if running natively without Docker)

---

### Method A: Docker Compose (Recommended)

Docker Compose provisions the PostgreSQL database, applies schema pushes, compiles the backend API, and serves the frontend in a fully isolated container environment.

1. **Clone and navigate to repository**:
   ```bash
   git clone <repository_url>
   cd enterprise-inventory-warehouse-management-ERP
   ```

2. **Launch all services**:
   ```bash
   docker compose up --build -d
   ```

3. **Apply database migrations and populate seed data**:
   ```bash
   docker compose exec backend npm run prisma:seed
   ```

4. **Access the application**:
   - **Frontend UI**: [http://localhost:5173](http://localhost:5173)
   - **Backend API**: [http://localhost:5001](http://localhost:5001)
   - **Swagger API Documentation**: [http://localhost:5001/api/docs](http://localhost:5001/api/docs)
   - **PostgreSQL Database**: Accessible on host port `5434`

5. **Stop services**:
   ```bash
   docker compose down
   ```

---

### Method B: Local Development Setup

If developing locally without containerizing the Node application:

#### 1. Start PostgreSQL Database
You can use the lightweight Docker PostgreSQL container:
```bash
docker compose up -d postgres
```
*(PostgreSQL will run on port `5434` as configured in `docker-compose.yml`)*

#### 2. Configure Backend Environment
Navigate to `backend/` and inspect `.env`:
```env
DATABASE_URL="postgresql://erp_user:erp_password@localhost:5434/enterprise_erp?schema=public"
JWT_SECRET="enterprise_super_secret_jwt_key_2026_inventory_erp"
PORT=5002
CORS_ORIGIN="http://localhost:5173"
NODE_ENV="development"
```

#### 3. Install Backend Dependencies & Initialize Database
```bash
cd backend
npm install

# Push Prisma schema directly to PostgreSQL
npm run prisma:push

# Populate initial enterprise companies, warehouses, roles & demo users
npm run prisma:seed

# Start the backend development server with hot-reloading
npm run dev
```
*Backend will start on: `http://localhost:5002` (Swagger at `http://localhost:5002/api/docs`)*

#### 4. Configure & Start Frontend
In a separate terminal, navigate to `frontend/`:
```bash
cd frontend
npm install

# Start Vite development server
npm run dev
```
*Frontend will start on: `http://localhost:5173`*

---

### Running Automated Integration Tests

The project includes an automated test suite verifying authentication, RBAC enforcement, ledger atomicity, transfer allocations, cycle count variances, and valuation formulas:

```bash
cd backend
npm test
```

---

## 6. Core Modules & Functional Capabilities

### 1. Authentication & Security
- **JWT-Based Authentication**: Signed authorization bearer tokens carrying user identity, assigned roles, and permitted warehouse IDs.
- **Password Security**: Salted cryptographic password hashing with `bcryptjs`.
- **Session Scoping**: Granular facility access scoping (`assignedWarehouses`) preventing unauthorized personnel from accessing other branches.

### 2. Multi-Tier Warehouse & Topology
- **Configurable 7-Tier Hierarchy**: `Company` → `Region` → `City` → `Site/Branch` → `Warehouse` → `Zone` → `Rack` → `Bin`.
- **Bin & Rack Management**: Full Add, Update, and Delete operations.
- **ERP Deletion Safeguards**: Deletion is permanently blocked if a bin has on-hand stock or historical ledger records; bins can be deactivated instead to preserve data integrity.
- **Bin Classifications**: Distinct bin types including `STORAGE`, `RECEIVING`, `PICKING`, `QUARANTINE`, `DISPATCH`, and `STAGING`.

### 3. Product Master Catalog
- **Comprehensive Master Data**: Tracking SKU codes, names, categories, units of measure (UoM), barcodes, and standard valuation costs.
- **Inventory Thresholds**: Min/max reorder levels and lead times triggering replenishment warnings.

### 4. Inventory Balances & Real-Time Tracking
- **Multi-State Inventory Quantities**: Real-time breakdown of:
  $$\text{Available Qty} = \text{On-Hand} - \text{Reserved} - \text{Damaged} - \text{Quarantined}$$
- **Direct Controlled Inflow**: Authorized personnel can post verified initial or emergency stock inward with mandatory batch numbers and ledger records.

### 5. Immutable Stock Movement Ledger
- **Double-Entry Journal**: Every transaction writes non-destructive, permanent ledger rows tracking `transactionType` (`RECEIPT`, `ISSUE`, `TRANSFER_DISPATCH`, `TRANSFER_RECEIVE`, `ADJUSTMENT_UP`, `ADJUSTMENT_DOWN`), source bin, destination bin, batch number, and performing user.
- **Zero Phantom Stock**: Strict historical ledger audit compliance.

### 6. Procurement & Purchase Requisitions (PR)
- **Departmental Requisitions**: Staff can raise material requisitions with itemized quantities and priority levels.
- **Workflow Interlocking**: Requisitions automatically enter the approval pipeline before purchasing can proceed.

### 7. Purchase Orders (PO) & Vendor Management
- **Vendor Master**: Supplier profiles with payment terms, contacts, and lead times.
- **PO Authorisation**: Purchase orders are generated against qualified requisitions with budget verification.

### 8. Goods Receiving (GRN) & Putaway
- **3-Way Inspection**: Deliveries are verified against PO lines, sorting delivered quantities into *Accepted*, *Damaged*, or *Rejected*.
- **Putaway Queues**: Accepted goods generate putaway tasks directing warehouse staff to specific storage bins.

### 9. Inter-Facility Stock Transfers
- **2-Step Transfer Process**:
  1. **Dispatch**: Verifies source bin availability, moves units into `IN_TRANSIT` state, and logs carrier tracking.
  2. **Receipt**: Destination warehouse verifies incoming physical units.
- **Discrepancy Logging**: Shortages (e.g., 50 units sent, 49 arrived) are automatically written as discrepancy records in the ledger rather than silently lost.

### 10. Physical Stock Counts & Variance Reconciliation
- **Flexible Count Methodologies**: Wall-to-Wall Physical Counts, ABC Cycle Counts, and Spot Checks.
- **Blind / Snapshot Counting**: System snapshots quantities; staff enters physical counts.
- **Variance Posting**: System computes surplus/shortage and generates `ADJUSTMENT` transactions upon manager sign-off.

### 11. Reusable Multi-Level Approval Engine
- **Configurable Chains**: Multi-tiered approval chains supporting threshold-based routing (e.g. Department Manager sign-off followed by Finance approval).
- **Approval Inbox**: Centralized dashboard to view, approve, reject, or comment on pending actions.

### 12. Reports & Valuation Analytics
- **Valuation Engines**: Real-time inventory asset valuation based on FIFO / Weighted-Average unit cost.
- **Operational Analytics**: Stock aging buckets (0-30, 31-60, 61-90, 90+ days), turnover velocity, and one-click CSV report exports.

### 13. Immutable System Audit Trail
- **Actor Tracing**: Every database insert, update, or deactivation automatically logs the acting user, timestamp, IP, entity type, and full before/after JSON diffs.

---

## 7. User Roles, Responsibilities & Credentials

The system comes pre-seeded with 8 specialized personas covering every enterprise department. 

> **Default Password for all seeded accounts**: `Password123!`

| Role Code | Role Name | Seeded Username | Corporate Email | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **`ADMIN`** | System Administrator | `admin` | `admin@apexerp.com` | Root system control, user provisioning, global RBAC permissions, and configuration. |
| **`INVENTORY_MANAGER`** | Inventory Manager | `inv_manager` | `inventory.manager@apexerp.com` | Multi-facility inventory valuation, cycle count approvals, and stock ledger reconciliation. |
| **`WAREHOUSE_MANAGER`** | Warehouse Manager | `wh_manager` | `warehouse.manager@apexerp.com` | Bin/rack topology management, transfer dispatches, GRN approvals, and receiving oversight. |
| **`WAREHOUSE_STAFF`** | Warehouse Staff | `wh_staff` | `warehouse.staff@apexerp.com` | Floor putaway tasks, picking, transfer physical handling, and cycle count entry. |
| **`PROCUREMENT_OFFICER`**| Procurement Officer | `proc_officer` | `procurement@apexerp.com` | Purchase requisitions, supplier RFQs, quotation comparisons, and PO issuance. |
| **`DEPARTMENT_MANAGER`** | Department Manager | `dept_manager` | `dept.head@apexerp.com` | Departmental material requests, PR authorisations within threshold limits. |
| **`FINANCE_APPROVER`** | Finance Approver | `fin_approver` | `finance@apexerp.com` | Budget sign-offs, PO authorizations, valuation reviews, and financial CSV exports. |
| **`AUDITOR`** | Internal Auditor | `auditor` | `auditor@apexerp.com` | Read-only inspection of immutable stock ledgers, system audit trails, and compliance logs. |

*(Note: The web navbar includes an instant **1-Click Persona Switcher** for rapid demonstration of different role views without manually logging out).*

---

## 8. User Access Matrix (RBAC) & Documentation

A separate, dedicated spreadsheet has been generated inside the `docs/` folder:

📁 **[`docs/User_Access_Matrix.xlsx`](docs/User_Access_Matrix.xlsx)**

### What is Included in the Excel File:
1. **Sheet 1 ("User Access Matrix")**: Comprehensive 2D grid covering all 13 modules and operations (**View**, **Create**, **Edit**, **Delete**, **Approve**, **Export**) across the 8 enterprise roles with color-coded `ALLOW` and `RESTRICTED` status.
2. **Sheet 2 ("Permissions Catalog")**: Complete dictionary of all 26 granular database permission codes (e.g. `warehouse:manage`, `inventory:adjust`, `transfer:dispatch`).
3. **Sheet 3 ("User Personas & Logins")**: Reference directory of demo credentials, assigned departments, and operational scopes.

### Visual Preview of the Access Matrix:

![User Access Matrix Preview](docs/user_access_matrix_preview.png)

---

## 9. Important Configurations & Dependencies

### Environment Variables (`backend/.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://erp_user:erp_password@localhost:5434/enterprise_erp?schema=public` | PostgreSQL connection string with host port and schema |
| `JWT_SECRET` | `enterprise_super_secret_jwt_key_2026_inventory_erp` | HMAC secret key used for signing and verifying JWT tokens |
| `PORT` | `5002` | Local development port for the Express backend API |
| `CORS_ORIGIN`| `http://localhost:5173` | Permitted origin for CORS cross-site requests from the React client |
| `NODE_ENV` | `development` / `production` | Execution environment mode |

### Port Allocation Reference

| Service | Host Port | Container Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | `5173` | `80` (Docker) / `5173` (Local) | React Single Page Application |
| **Backend REST API** | `5002` (Dev) / `5001` (Docker) | `5001` | Express REST API & Swagger UI |
| **PostgreSQL Database**| `5434` | `5432` | Relational database instance |

---

## 10. Database Schema & Entity Model

The relational database architecture is defined in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma), comprising 56 tables organized across 12 core entity groups:

```mermaid
erDiagram
    COMPANIES ||--o{ REGIONS : contains
    REGIONS ||--o{ CITIES : contains
    CITIES ||--o{ SITES : contains
    SITES ||--o{ WAREHOUSES : hosts
    WAREHOUSES ||--o{ WAREHOUSE_ZONES : divides
    WAREHOUSE_ZONES ||--o{ WAREHOUSE_RACKS : structures
    WAREHOUSE_RACKS ||--o{ WAREHOUSE_BINS : contains
    
    PRODUCTS ||--o{ STOCK_BALANCES : tracks
    WAREHOUSES ||--o{ STOCK_BALANCES : stores
    WAREHOUSE_BINS ||--o{ STOCK_BALANCES : locates
    
    PRODUCTS ||--o{ STOCK_MOVEMENTS : records
    WAREHOUSES ||--o{ STOCK_MOVEMENTS : movements
    
    PURCHASE_REQUISITIONS ||--o{ PURCHASE_REQUISITION_ITEMS : includes
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : includes
    PURCHASE_ORDERS ||--o{ GOODS_RECEIPTS : receives
    GOODS_RECEIPTS ||--o{ GOODS_RECEIPT_ITEMS : inspects
    GOODS_RECEIPT_ITEMS ||--o{ PUTAWAY_TASKS : assigns
    
    STOCK_TRANSFERS ||--o{ STOCK_TRANSFER_ITEMS : contains
    STOCK_TRANSFERS ||--o{ TRANSFER_DISPATCHES : dispatches
    STOCK_TRANSFERS ||--o{ TRANSFER_RECEIPTS : receives
    
    STOCK_COUNTS ||--o{ STOCK_COUNT_ITEMS : compares
    STOCK_COUNTS ||--o{ STOCK_ADJUSTMENTS : generates
    
    APPROVAL_WORKFLOWS ||--o{ APPROVAL_STEPS : defines
    APPROVAL_WORKFLOWS ||--o{ APPROVAL_INSTANCES : executes
    APPROVAL_INSTANCES ||--o{ APPROVAL_ACTIONS : records
```

---

## License
This project is open-source software licensed under the [MIT License](LICENSE).
