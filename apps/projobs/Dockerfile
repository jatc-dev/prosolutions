FROM node:20-alpine

RUN apk add --no-cache python3

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/projobs/package.json ./apps/projobs/package.json

RUN npm ci --include=dev --workspace=@prosolutions/projobs --include-workspace-root

COPY apps/projobs/ ./apps/projobs/
WORKDIR /app/apps/projobs

RUN npm run build

ENV NODE_ENV=production

EXPOSE 10000

CMD ["sh", "-c", "exec node scripts/serve.mjs"]
