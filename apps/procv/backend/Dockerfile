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
RUN npm ci --include=dev --workspace=apps/procv/backend --include-workspace-root
COPY apps/procv/backend/ ./apps/procv/backend/
WORKDIR /app/apps/procv/backend
RUN npx prisma generate && npm run build

# ---------------------------------------------------------------------------
# Runtime: production dependencies, the generated Prisma client and the
# compiled output. PDF and Word are generated in the browser, so the image
# needs no Chromium.
# ---------------------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
RUN npm ci --omit=dev --workspace=apps/procv/backend --include-workspace-root \
    && npm cache clean --force

COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
WORKDIR /app/apps/procv/backend
COPY apps/procv/backend/prisma ./prisma
COPY apps/procv/backend/scripts ./scripts
COPY --from=build /app/apps/procv/backend/dist ./dist
RUN mkdir -p uploads/logos

# Render injects PORT at runtime.
EXPOSE 10000
CMD ["npm", "start"]
