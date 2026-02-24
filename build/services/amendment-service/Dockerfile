# amendment-service/Dockerfile — multi-stage build
# Build context must be the monorepo root (build/)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/domain/package.json ./packages/domain/
COPY services/amendment-service/package.json ./services/amendment-service/

RUN npm ci --include=optional || npm install

COPY packages/domain ./packages/domain
COPY services/amendment-service ./services/amendment-service

RUN npm run build -w @tax-core/domain --if-present || true
RUN npx tsc -p services/amendment-service/tsconfig.json

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/domain ./packages/domain
COPY --from=builder /app/services/amendment-service/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
