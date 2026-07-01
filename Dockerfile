FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Install all deps (hoisted layout from .npmrc)
FROM base AS deps
COPY .npmrc package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json tsconfig.base.json ./
COPY packages/sdk/package.json packages/sdk/
COPY packages/server/package.json packages/server/
COPY packages/server-sdk/package.json packages/server-sdk/
COPY packages/dashboard/package.json packages/dashboard/
RUN pnpm install --frozen-lockfile

# Build all packages
FROM deps AS build
COPY . .
RUN pnpm build

# Production stage - single deployable image
FROM base AS prod
ENV NODE_ENV=production
WORKDIR /app

# Copy install state (hoisted node_modules + lockfile)
COPY --from=deps /app/node_modules ./node_modules
COPY .npmrc package.json pnpm-workspace.yaml ./
COPY packages/server/package.json packages/server/

# Copy built artifacts
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=build /app/packages/dashboard/dist ./packages/dashboard/dist

EXPOSE 3000
WORKDIR /app/packages/server
CMD ["node", "dist/index.js"]
