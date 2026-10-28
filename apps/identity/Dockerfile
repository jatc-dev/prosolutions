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
COPY scripts ./scripts
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

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

ENV NODE_ENV=production

# Render asigna el puerto dinámicamente vía variable de entorno PORT.
# No establecer PORT aquí para permitir que Render lo asigne.
EXPOSE 10000

# Las migraciones de producción se ejecutan como tarea administrativa explícita,
# no con el usuario de runtime al iniciar cada instancia.
CMD ["node", "dist/index.js"]
