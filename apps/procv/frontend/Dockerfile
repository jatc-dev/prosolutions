# Use Node.js 18 as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files (el contexto de build es la raíz del monorepo)
COPY apps/procv/frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source and the shared UI package (@prosolutions/ui)
COPY apps/procv/frontend/ ./
COPY packages/ui /packages/ui

# Build the application
RUN npm run build

# Install a simple static server
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
