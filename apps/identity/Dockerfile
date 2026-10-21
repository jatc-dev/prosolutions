# --- ETAPA DE COMPILACIÓN ---
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

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

# Render asigna el puerto dinámicamente vía variable de entorno PORT.
# No establecer PORT aquí para permitir que Render lo asigne.
EXPOSE 10000

# Ejecutar migraciones antes de iniciar el servidor para no servir un esquema incompleto.
CMD ["sh", "-c", "if [ -n \"$DIRECT_DATABASE_URL\" ]; then DATABASE_URL=\"$DIRECT_DATABASE_URL\" npx prisma migrate deploy; else npx prisma migrate deploy; fi && exec node dist/index.js"]
