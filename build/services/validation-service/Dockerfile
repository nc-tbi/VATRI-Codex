# validation-service/Dockerfile — multi-stage build (stateless service)
# Build context must be the monorepo root (build/)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY packages/domain/package.json ./packages/domain/
COPY services/validation-service/package.json ./services/validation-service/

RUN npm ci --include=optional || npm install

COPY packages/domain ./packages/domain
COPY services/validation-service ./services/validation-service

RUN npm run build -w @tax-core/domain --if-present || true
RUN npx tsc -p services/validation-service/tsconfig.json

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/domain ./packages/domain
COPY --from=builder /app/services/validation-service/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
