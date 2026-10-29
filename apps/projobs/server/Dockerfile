FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/projobs/package.json ./apps/projobs/package.json
COPY apps/projobs/server/package.json ./apps/projobs/server/package.json

RUN npm ci --include=dev --workspace=@prosolutions/projobs-server --include-workspace-root

COPY apps/projobs/server/ ./apps/projobs/server/
WORKDIR /app/apps/projobs/server

RUN npm run build

ENV NODE_ENV=production

EXPOSE 10000

CMD ["sh", "-c", "exec node dist/server.js"]
