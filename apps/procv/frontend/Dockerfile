# Node.js 20 frontend image; build context is the monorepo root.
FROM node:22-alpine

WORKDIR /app

# Copy the root lockfile and every package manifest matched by the workspace layout.
COPY package.json package-lock.json ./
COPY apps/procv/package.json ./apps/procv/package.json
COPY apps/procv/frontend/package.json ./apps/procv/frontend/package.json
COPY apps/procv/backend/package.json ./apps/procv/backend/package.json
COPY apps/core/package.json ./apps/core/package.json
COPY packages/ui/package.json ./packages/ui/package.json

# Install the frontend workspace from the single root lockfile.
RUN npm ci --include=dev --workspace=apps/procv/frontend --include-workspace-root

# Copy frontend source and the shared UI workspace.
COPY apps/procv/frontend/ ./apps/procv/frontend/
COPY packages/ui/ ./packages/ui/

WORKDIR /app/apps/procv/frontend

# Build the application.
RUN npm run build

# Install a simple static server.
RUN npm install -g serve
EXPOSE 10000

CMD ["sh", "-c", "serve -s dist -l $PORT"]
