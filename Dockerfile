FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Install all deps for building
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/sdk/package.json packages/sdk/
COPY packages/server/package.json packages/server/
COPY packages/server-sdk/package.json packages/server-sdk/
COPY packages/dashboard/package.json packages/dashboard/
RUN pnpm install --frozen-lockfile

# Build all packages
FROM deps AS build
COPY . .
RUN pnpm build

# Production: install only server runtime deps with proper pnpm layout
FROM base AS prod
ENV NODE_ENV=production
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/server/package.json packages/server/
RUN pnpm install --prod --frozen-lockfile --filter @yourfp/server

# Copy built artifacts (server + static SDK + dashboard)
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=build /app/packages/dashboard/dist ./packages/dashboard/dist

EXPOSE 3000
WORKDIR /app/packages/server
CMD ["node", "dist/index.js"]
