# obligation-service/Dockerfile — multi-stage build
# Build context must be the monorepo root (build/) so packages/domain is accessible
FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY packages/domain/package.json ./packages/domain/
COPY services/obligation-service/package.json ./services/obligation-service/

# Install all workspace deps
RUN npm ci --include=optional || npm install

# Copy source
COPY packages/domain ./packages/domain
COPY services/obligation-service ./services/obligation-service

# Build domain package first, then the service
RUN npm run build -w @tax-core/domain --if-present || true
RUN npx tsc -p services/obligation-service/tsconfig.json

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/domain ./packages/domain
COPY --from=builder /app/services/obligation-service/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
