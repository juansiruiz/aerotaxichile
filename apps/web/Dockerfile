# ─── Web (Next.js) Dockerfile — standalone output ───────────────────────────
# Build: docker build -f apps/web/Dockerfile -t aerotaxi-web .
#   (ejecutar desde la raíz del monorepo)

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /app

# ─── Stage 1: Install deps ───────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json                ./apps/web/package.json
COPY packages/shared/package.json         ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules                        ./node_modules
COPY --from=deps /app/apps/web/node_modules               ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules        ./packages/shared/node_modules
COPY . .

# Las NEXT_PUBLIC_* se inyectan en build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_VAPID_PUBLIC_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_VAPID_PUBLIC_KEY=$NEXT_PUBLIC_VAPID_PUBLIC_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_STANDALONE=true

RUN pnpm --filter @aerotaxi/web build

# ─── Stage 3: Runtime (imagen mínima) ────────────────────────────────────────
FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Next.js standalone incluye solo lo estrictamente necesario
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder /app/apps/web/public           ./apps/web/public

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
