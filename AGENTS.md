# AI Agent & Developer Guidelines

## Absolute Workflow Rules
1. **Never perform destructive actions** (e.g., dropping databases, resetting schemas, removing migrations, or force-overwriting unrelated files) without explicit human confirmation.
2. **Read documentation first:** Check this file (`AGENTS.md`) and any task specifications before modifying code.
3. **Do not fabricate requirements:** If requirement documents do not exist in the repository, do not invent them. Refer exclusively to authoritative instructions provided by the user.
4. **Use stable versions:** Always pin or select production-stable versions. Do not use release candidates or pre-release tags unless specifically requested.

## Monorepo Boundaries
- `apps/api`: NestJS backend. Part of root npm workspaces. Pure ESM (`"type": "module"`).
- `apps/web`: Web frontend (React + Vite). Kept independent from root workspaces until implementation starts.
- `apps/mobile`: Mobile app (Expo React Native). **Must NEVER be added to root npm workspaces** to prevent React / React Native dependency collisions.
- `packages/api-client`: Shared TypeScript client. Included in root npm workspaces.

## Development & Code Quality Standards
- **Strict TypeScript:** No `any` unless strictly unavoidable. Explicit return types for public methods.
- **NodeNext Resolution:** All relative imports within `apps/api` must use explicit `.js` extensions.
- **Prisma 7 Conventions:** Schema datasource must not have `url`. URLs belong in `prisma.config.ts`. PrismaPg adapter must be used for database connectivity.
- **Redaction & Security:** Never log tokens, passwords, authorization headers, or database credentials.
- **API Error Contract:** All errors must adhere to `{ statusCode, message, error, requestId }`.
- **Database Migrations:** Production deployment must execute `prisma migrate deploy`, never `prisma db push`.
