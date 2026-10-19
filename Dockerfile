FROM node:20-alpine

WORKDIR /app/apps/identity

# Dependencias de producción
COPY apps/identity/package*.json ./
RUN npm ci --only=production

# Generar cliente Prisma (requerido en tiempo de ejecución)
COPY apps/identity/prisma ./prisma
RUN npx prisma generate

# Código compilado del backend
COPY apps/identity/dist ./dist

ENV NODE_ENV=production

# Render asigna el puerto dinámicamente vía variable de entorno PORT.
ENV PORT=4001

EXPOSE 4001

# Ejecutar migraciones de base de datos antes de iniciar el servidor.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
