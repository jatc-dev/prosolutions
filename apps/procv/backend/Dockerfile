# ProCV backend. Build context: repository root.
#
# Two stages so the runtime image carries no devDependencies (TypeScript,
# Jest, ESLint...). Dependencies come from the root package-lock.json via
# `npm ci`, the same install CI runs, so what CI tests is what ships.

# ---------------------------------------------------------------------------
# Shared base: Debian slim (Prisma needs OpenSSL) + workspace manifests.
# All workspace manifests are copied so npm can validate the root lockfile.
# ---------------------------------------------------------------------------
FROM node:22-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/core/package.json ./apps/core/package.json
COPY apps/identity/package.json ./apps/identity/package.json
COPY apps/procv/package.json ./apps/procv/package.json
COPY apps/procv/backend/package.json ./apps/procv/backend/package.json
COPY apps/procv/frontend/package.json ./apps/procv/frontend/package.json
COPY apps/projobs/package.json ./apps/projobs/package.json
COPY packages/ui/package.json ./packages/ui/package.json

# ---------------------------------------------------------------------------
# Build: full dependencies, Prisma client and TypeScript compilation.
# ---------------------------------------------------------------------------
FROM base AS build
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --include=dev --workspace=apps/procv/backend --include-workspace-root
COPY apps/procv/backend/ ./apps/procv/backend/
WORKDIR /app/apps/procv/backend
RUN npx prisma generate && npm run build

# ---------------------------------------------------------------------------
# Runtime: production dependencies, Chromium libraries for Puppeteer (PDF),
# the generated Prisma client and the compiled output.
# ---------------------------------------------------------------------------
FROM base AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Production install; puppeteer's postinstall downloads Chromium here.
RUN npm ci --omit=dev --workspace=apps/procv/backend --include-workspace-root \
    && npm cache clean --force

COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
WORKDIR /app/apps/procv/backend
COPY apps/procv/backend/prisma ./prisma
COPY apps/procv/backend/scripts ./scripts
COPY --from=build /app/apps/procv/backend/dist ./dist
RUN mkdir -p uploads/logos

# Fail the build (instead of the first user export) if Chromium or one of its
# system libraries is missing: launch Puppeteer and render a real PDF.
RUN node -e "require('puppeteer').launch({args:['--no-sandbox','--disable-setuid-sandbox']}).then(async(b)=>{const p=await b.newPage();await p.setContent('<h1>ProCV</h1>');const pdf=await p.pdf();await b.close();console.log('Puppeteer PDF smoke test OK:',pdf.length,'bytes');}).catch((e)=>{console.error('Puppeteer PDF smoke test FAILED',e);process.exit(1);})"

# Render injects PORT at runtime.
EXPOSE 10000
CMD ["npm", "start"]
