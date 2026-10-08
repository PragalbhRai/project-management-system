# Architectural Decisions Record (ADR)

## Confirmed Architecture

### 1. Framework: NestJS 12 (ESM)
- **Decision:** NestJS 12 configured with native ECMAScript Modules (`"type": "module"`) and TypeScript `NodeNext` resolution.
- **Rationale:** NestJS provides enterprise-grade modular architecture, dependency injection, and decorator-driven OpenAPI metadata. Native ESM is required for first-class integration with modern ecosystem tools including Prisma 7 and Vitest without synthetic bundling bridges.

### 2. ORM: Prisma 7.10.0 (Production Stable)
- **Decision:** Pinned to Prisma 7.10.0 (excluding Prisma 8 release candidates). Uses the new TypeScript-based `prisma-client` generator, separate `prisma.config.ts`, and `@prisma/adapter-pg` driver adapter.
- **Rationale:** Prisma 7 decouples configuration from the schema file, removes legacy Rust-based query engine binaries in favor of Node/WASM drivers, and provides strictly typed database access.

### 3. Database: PostgreSQL 17
- **Decision:** PostgreSQL with normalized relational schema, explicit foreign keys, indexes on high-frequency filters, and snake_case column/table naming.
- **Rationale:** Reliable ACID transactions, native date semantics (`@db.Date`), and relational constraints (including `CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)`).

### 4. Shared Backend Architecture
- **Decision:** ONE backend (`apps/api`) and ONE PostgreSQL database serving both web (`apps/web`) and mobile (`apps/mobile`) clients.
- **Rationale:** Prevents logic duplication across platforms. The single source of truth ensures business logic and authentication rules are applied uniformly.

### 5. API Contract & Client Generation
- **Decision:** Swagger / OpenAPI exposed at `/api/docs`. An API client package (`packages/api-client`) will be generated directly from OpenAPI specs to serve both web and mobile.
- **Rationale:** Ensures type-safe end-to-end communication without hand-written REST API client code drift.

### 6. Authentication & Token Revocation Strategy
- **Decision:** Stateless JWT access tokens with a database-backed token revocation list (`revoked_tokens` table with unique `jti`, indexed expiration, and cascade deletion).
- **Rationale:** Provides fast stateless token verification while still enabling deterministic user logout and token invalidation on demand.

### 7. Authorization Strategy
- **Decision:** Resource ownership-based authorization. Users can only read, mutate, and delete projects and tasks they own or belong to.
- **Rationale:** Prevents horizontal privilege escalation (IDOR vulnerabilities).

### 8. Monorepo & Workspace Strategy
- **Decision:** npm workspaces encompass `apps/api` and `packages/*`. `apps/mobile` (Expo React Native) is strictly kept outside root workspaces. `apps/web` is kept independent until web implementation begins.
- **Rationale:** React Native / Expo projects suffer from dependency hoisting conflicts (e.g., duplicated React versions) when co-located in shared workspace roots. Isolating mobile dependencies prevents build breaks.

### 9. Query Strategy: Avoiding Raw SQL
- **Decision:** Prisma ORM methods are used for all application queries. Raw SQL is strictly limited to database-level constraints (such as the Project date CHECK constraint) and lightweight connectivity verification (`SELECT 1`).
- **Rationale:** Avoids SQL injection vectors and maintains strong compile-time type safety.

### 10. Minimalist Infrastructure: No Unnecessary Additions
- **Decision:** We explicitly do NOT include Redis, Traefik, Sentry, or message queues.
- **Rationale:** The application scale for this assessment does not warrant distributed caching or message brokers. Adding unneeded infrastructure increases deployment complexity, resource consumption, and potential points of failure without immediate architectural necessity.
