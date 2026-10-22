# --- ETAPA DE BUILD ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

# Copiar manifiestos e instalar todas las dependencias (incluyendo devDependencies)
COPY apps/identity/package*.json ./
RUN npm ci

# Copiar el esquema de Prisma, código fuente y configuración de TypeScript
COPY apps/identity/prisma ./prisma
COPY apps/identity/src ./src
COPY apps/identity/tsconfig.json ./
COPY apps/identity/tsconfig.build.json ./
COPY apps/identity/scripts ./scripts

# Generar cliente de Prisma y compilar TypeScript
RUN npx prisma generate
RUN npm run build

# --- ETAPA DE PRODUCCIÓN ---
FROM node:20-alpine AS runner
WORKDIR /app

COPY apps/identity/package*.json ./
RUN npm ci --only=production

# Copiar Prisma y el código compilado desde la etapa builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production

EXPOSE 4001

CMD ["sh", "-c", "node scripts/migrate-production.mjs && exec node dist/index.js"]
