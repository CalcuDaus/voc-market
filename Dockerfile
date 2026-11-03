# ==========================================
# VOC-Market Multi-Stage Production Dockerfile
# Runtime: Bun + ElysiaJS + Svelte 5 (Vite)
# ==========================================

# Stage 1: Build Frontend Assets
FROM oven/bun:1-debian AS builder
WORKDIR /app

# Cache dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy source code and build production client
COPY . .
RUN bun run build

# Stage 2: Production Runner
FROM oven/bun:1-debian AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json bun.lock* ./
RUN bun install --production

# Copy compiled frontend assets from builder
COPY --from=builder /app/dist ./dist

# Copy backend source files, seed data, and configs
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Ensure script permissions and required upload folders exist
RUN chmod +x ./docker-entrypoint.sh \
    && mkdir -p public/images \
                public/uploads/avatars \
                public/uploads/posts \
                public/uploads/proofs \
                public/uploads/schools \
                public/uploads/requests \
                public/uploads/challenges \
                public/uploads/og

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]

