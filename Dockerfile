FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/sdk/package.json packages/sdk/
COPY packages/server/package.json packages/server/
COPY packages/server-sdk/package.json packages/server-sdk/
COPY packages/dashboard/package.json packages/dashboard/
RUN pnpm install --frozen-lockfile || pnpm install

# Build
FROM deps AS build
COPY . .
RUN pnpm build

# Production
FROM base AS prod
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/dashboard/dist ./packages/dashboard/dist
COPY --from=build /app/packages/server/package.json ./packages/server/package.json
COPY package.json pnpm-workspace.yaml ./

EXPOSE 3000
WORKDIR /app/packages/server
CMD ["node", "dist/index.js"]
