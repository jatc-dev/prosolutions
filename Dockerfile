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

ENV NODE_ENV=production
ENV PORT=4001

EXPOSE 4001

CMD ["sh", "-c", "if [ -n \"$DIRECT_DATABASE_URL\" ]; then DATABASE_URL=\"$DIRECT_DATABASE_URL\" npx prisma migrate deploy; else npx prisma migrate deploy; fi && exec node dist/index.js"]
