FROM node:20-alpine

WORKDIR /app

# Dependencias de producción
COPY package*.json ./
RUN npm ci --only=production

# Generar cliente Prisma (requerido en tiempo de ejecución)
COPY prisma ./prisma
RUN npx prisma generate

# Código compilado del backend
COPY dist ./dist

ENV NODE_ENV=production

# Render asigna el puerto dinámicamente vía variable de entorno PORT.
# El valor 4001 es solo un default local; en Render se sobrescribe con el puerto asignado.
ENV PORT=4001

EXPOSE 4001

# Ejecutar migraciones de base de datos antes de iniciar el servidor.
# Esto asegura que el esquema de Identity esté listo antes de recibir tráfico.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
