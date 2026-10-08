# Project Management System (PMS)

A unified Project Management System with a single backend and PostgreSQL database shared between Web and Mobile clients.

## Architecture Overview

- **Backend:** NestJS 12 (pure ESM, NodeNext module resolution)
- **Database ORM:** Prisma 7.10.0 (using `@prisma/adapter-pg` driver adapter, `prisma.config.ts`, and PostgreSQL 17)
- **Web App (Planned):** React + Vite + TypeScript + Tailwind/shadcn (`apps/web` - not yet implemented)
- **Mobile App (Planned):** Expo React Native + TypeScript (`apps/mobile` - not yet implemented)
- **Shared API Client (Planned):** `@pms/api-client` generated from Swagger/OpenAPI specifications
- **Logging & Diagnostics:** Structured logging via Pino (`nestjs-pino`) with sensitive credential redaction
- **Containerization:** Docker Compose with PostgreSQL 17 and root-context multi-stage API build

> **Status Notice:**
> Currently, the foundational backend setup (`apps/api`) and database architecture have been initialized. Authentication, projects, tasks, dashboard, web frontend, and mobile apps are incrementally added in subsequent stages.

---

## Repository Structure

```text
project-management-system/
├── apps/
│   ├── api/             # NestJS 12 backend (ESM, Prisma 7, PostgreSQL)
│   ├── web/             # Web frontend (placeholder, independent app)
│   └── mobile/          # Expo mobile app (independent, isolated dependencies)
├── packages/
│   └── api-client/      # Shared generated TypeScript client (placeholder)
├── docs/                # Architecture and specifications
├── docker/              # Docker configuration files
├── .github/             # GitHub CI / workflows
├── .env.example         # Authoritative environment variable template
├── .gitattributes       # Line-ending normalization (LF)
├── .gitignore           # Ignored files
├── docker-compose.yml   # Multi-service container orchestration
├── package.json         # Root npm workspace configuration (apps/api, packages/*)
├── DECISIONS.md         # Architecture Decisions Record (ADR)
├── AGENTS.md            # Workflow rules and boundary guidelines
└── README.md
```

---

## Prerequisites

- **Node.js:** v24.14+ (ESM support)
- **npm:** 11+
- **Docker Desktop:** Installed and running (for PostgreSQL and containerized deployment)

---

## Environment Setup

1. Copy the environment configuration template:
   ```bash
   cp .env.example .env
   ```
2. Verify or adjust the parameters:
   - `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgrespassword@localhost:5432/pms_dev?schema=public`)
   - `JWT_SECRET`: Secret key for JWT signing (minimum 16 characters)
   - `JWT_EXPIRES_IN`: Access token expiration (default: `1d`)
   - `CORS_ORIGIN`: Comma-separated allowed origins (default: `http://localhost:5173,http://localhost:3000`)
   - `TRUST_PROXY_HOPS`: Integer count of trusted reverse proxy hops (default: `0`)
   - `PORT`: HTTP server port (default: `3000`)

---

## Installation & Local Development

### 1. Install Dependencies
Run from repository root:
```bash
npm install
```

### 2. Start PostgreSQL Container
Start only PostgreSQL via Docker Compose:
```bash
docker compose up -d postgres
```

### 3. Generate Prisma Client and Run Migrations
From root:
```bash
npm run prisma:generate
npm run prisma:migrate
```
*(Or navigate to `apps/api` and run `npx prisma generate` / `npx prisma migrate dev`)*

### 4. Start API Server in Development Mode
```bash
npm run start:dev
```
The API starts at `http://localhost:3000/api`.

---

## Docker Orchestration

To run the entire system (PostgreSQL + API) in Docker:
```bash
docker compose up --build
```
- PostgreSQL health is verified before the API container boots.
- The API container automatically executes `npx prisma migrate deploy` prior to launching the production server.

---

## Health Check Endpoint

- **Endpoint:** `GET /api/health`
- **Behavior:** Queries the database using `SELECT 1` through Prisma 7 driver adapter.
- **Example Response:**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-08T12:00:00.000Z",
    "uptime": 15.2,
    "database": {
      "status": "up",
      "latencyMs": 4
    }
  }
  ```

---

## Swagger / OpenAPI Documentation

Interactive Swagger documentation is served at:
`http://localhost:3000/api/docs`

---

## Testing

Run unit and integration tests:
```bash
npm run test
```

Run end-to-end (e2e) tests (including the database-backed health check test):
```bash
npm run test:e2e
```
