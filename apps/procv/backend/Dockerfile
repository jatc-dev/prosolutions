# Usamos una imagen de Node más completa (Debian) en lugar de Alpine
FROM node:20-slim

# Instalar dependencias del sistema: OpenSSL para Prisma y librerias para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libgbm-dev \
    libxkbcommon0 \
    libx11-6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar desde la raiz del monorepo usando el lockfile canonico.
# Se copian los manifiestos de todos los workspaces para que npm pueda
# validar el package-lock raiz antes de instalar el workspace del backend.
COPY package.json package-lock.json ./
COPY apps/procv/package.json ./apps/procv/package.json
COPY apps/procv/backend/package.json ./apps/procv/backend/package.json
COPY apps/procv/frontend/package.json ./apps/procv/frontend/package.json
COPY apps/core/package.json ./apps/core/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm ci --include=dev --workspace=apps/procv/backend --include-workspace-root

# Copiamos el backend en su ruta de workspace para mantener la resolucion
# de dependencias desde /app/node_modules.
COPY apps/procv/backend/ ./apps/procv/backend/
WORKDIR /app/apps/procv/backend

# Generar el cliente Prisma y compilar TypeScript
RUN rm -rf /app/node_modules/.prisma
RUN npx prisma generate
RUN npm run build

# Puerto de Render (inyectado dinámicamente vía variable de entorno PORT)
EXPOSE 10000

CMD ["sh", "-c", "npm run start:migrate"]
