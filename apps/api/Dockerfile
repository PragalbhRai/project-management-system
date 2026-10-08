# Multi-stage Dockerfile for NestJS API in Monorepo
FROM node:24-alpine AS builder

WORKDIR /app

# Copy workspace package manifests
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/api-client/package.json ./packages/api-client/

# Install all dependencies across the workspace
RUN npm ci

# Copy API configurations, schema, and source files
COPY apps/api/tsconfig*.json ./apps/api/
COPY apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/
COPY apps/api/src ./apps/api/src/

# Generate Prisma Client and compile TypeScript
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# Production runtime stage
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy manifests for production install
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY packages/api-client/package.json ./packages/api-client/

# Install production dependencies
RUN npm ci --omit=dev

# Copy generated client, build output, prisma config, and migrations
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/generated ./apps/api/src/generated
COPY apps/api/prisma.config.ts ./apps/api/
COPY apps/api/prisma ./apps/api/prisma/

WORKDIR /app/apps/api

EXPOSE 3000

# Execute deterministic database migrations prior to launching API process
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
