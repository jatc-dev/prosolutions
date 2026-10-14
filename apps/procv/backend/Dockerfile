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

# Copiamos package.json y instalamos dependencias primero
COPY package*.json ./
RUN npm ci

# --- PASO CRUCIAL ---
# Copiamos TODO el código (incluyendo la carpeta prisma/)
# ANTES de correr el generate
COPY . .

# Limpiamos cualquier cliente de Prisma anterior y generamos uno nuevo
RUN rm -rf node_modules/.prisma
RUN npx prisma generate

# Compilamos el código de TypeScript
RUN npm run build

# Puerto de Render
EXPOSE 10000

CMD ["node", "dist/index.js"]