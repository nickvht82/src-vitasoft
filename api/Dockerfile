# syntax=docker/dockerfile:1

# Multi-stage build for @vitasoft/api (NestJS + Fastify, ESM).
# Built from the repo root context so workspace packages resolve:
#   docker build -f api/Dockerfile -t vitasoft-api .

ARG NODE_VERSION=24-bookworm-slim

# ---- deps: install the full workspace (dev deps included, for building) ----
FROM node:${NODE_VERSION} AS deps
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY core ./core
COPY api ./api
RUN pnpm install --frozen-lockfile

# ---- build: generate Prisma client + compile all needed packages ----
FROM deps AS build
WORKDIR /repo
RUN pnpm --filter @vitasoft/database run build \
 && pnpm --filter @vitasoft/logger run build \
 && pnpm --filter @vitasoft/config run build \
 && pnpm --filter @vitasoft/http-kit run build \
 && pnpm --filter @vitasoft/api run build \
 && pnpm deploy --filter=@vitasoft/api --prod /app

# ---- runtime: slim, non-root, ESM entrypoint ----
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
COPY --from=build /repo/api/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
