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

# Generar cliente Prisma y compilar TypeScript
RUN npx prisma generate
RUN npm run build

# --- ETAPA DE EJECUCIÓN ---
FROM node:20-alpine AS runner
WORKDIR /app

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

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
