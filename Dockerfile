# Bayt Al Ghaf — production image (Next.js + Hono API + Prisma).
# Build:  docker build -t bayt-al-ghaf .
# Run:    see docker-compose.yml (profile "app") or README.md.
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
ENV NODE_ENV=production PORT=3000
COPY --from=build /app /app
RUN chmod +x docker/entrypoint.sh && useradd --system --uid 1001 app && chown -R app /app/.next
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["./docker/entrypoint.sh"]
