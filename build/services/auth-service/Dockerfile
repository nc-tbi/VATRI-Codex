# auth-service/Dockerfile — multi-stage build (no DB/Kafka dependencies)
# Build context must be the monorepo root (build/)
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY services/auth-service/package.json ./services/auth-service/

RUN npm ci --include=optional || npm install

COPY services/auth-service ./services/auth-service

RUN npx tsc -p services/auth-service/tsconfig.json

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/services/auth-service/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
