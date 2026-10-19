# --- ETAPA DE COMPILACIÓN ---
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar manifiestos e instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar archivos fuente del módulo
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Generar cliente Prisma y compilar TypeScript
RUN npx prisma generate
RUN npm run build

# --- ETAPA DE EJECUCIÓN ---
FROM node:20-alpine AS runner
WORKDIR /app

# Instalar OpenSSL requerido por Prisma Client engine
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install --omit=dev

# Copiar Prisma y dist compilado desde la etapa builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

# Ejecutar migraciones (no bloqueante) y iniciar el servidor
CMD ["sh", "-c", "npx prisma migrate deploy || true && node dist/index.js"]
