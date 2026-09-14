FROM node:22-alpine AS client-build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY client/ ./client/
COPY shared/ ./shared/
COPY vite.config.ts ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY tailwind.config.ts postcss.config.js ./
COPY components.json ./

RUN npm run build:client

FROM node:22-alpine AS server-build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY server/ ./server/
COPY shared/ ./shared/
COPY nest-cli.json ./
COPY tsconfig.json tsconfig.node.json tsconfig.app.json ./

RUN npm run build:server

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=server-build /app/dist ./dist
COPY --from=client-build /app/dist/client ./dist/client

RUN mkdir -p uploads

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/auth/heartbeat 2>/dev/null || exit 1

CMD ["node", "dist/server/main.js"]
