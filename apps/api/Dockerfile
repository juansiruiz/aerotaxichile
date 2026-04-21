# ─── API Dockerfile (multi-stage, pnpm workspace) ────────────────────────────
# Build: docker build -f apps/api/Dockerfile -t aerotaxi-api .
#   (ejecutar desde la raíz del monorepo)

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /app

# ─── Stage 1: Install deps (cacheable) ───────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/api/package.json                ./apps/api/package.json
COPY packages/db/package.json             ./packages/db/package.json
COPY packages/shared/package.json         ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Copy source ────────────────────────────────────────────────────
FROM base AS source
COPY --from=deps /app/node_modules                        ./node_modules
COPY --from=deps /app/apps/api/node_modules               ./apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules            ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules        ./packages/shared/node_modules
COPY . .

# ─── Stage 3: Production image ───────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=4000

# Copiar solo lo necesario para correr la API
COPY --from=source /app/node_modules                      ./node_modules
COPY --from=source /app/package.json                      ./package.json
COPY --from=source /app/pnpm-workspace.yaml               ./pnpm-workspace.yaml
COPY --from=source /app/apps/api                          ./apps/api
COPY --from=source /app/packages/db                       ./packages/db
COPY --from=source /app/packages/shared                   ./packages/shared

# Carpeta de uploads persistente
RUN mkdir -p /app/apps/api/public/uploads && \
    chown -R node:node /app

USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["pnpm", "start:prod"]
