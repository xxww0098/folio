# syntax=docker/dockerfile:1

# JS build is arch-independent. Run it on the host arch (BUILDPLATFORM) so
# GitHub Actions does not qemu-emulate bun / vite for linux/arm64.
FROM --platform=$BUILDPLATFORM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM --platform=$BUILDPLATFORM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/bun.lock ./bun.lock
COPY . .
ARG VITE_AUTH_ENABLED=true
ARG VITE_FOLIO_EMAIL_PASSWORD=true
ARG VITE_FOLIO_VERSION=0.1.0
ENV VITE_AUTH_ENABLED=$VITE_AUTH_ENABLED \
    VITE_FOLIO_EMAIL_PASSWORD=$VITE_FOLIO_EMAIL_PASSWORD \
    VITE_FOLIO_VERSION=$VITE_FOLIO_VERSION \
    PATH="/app/node_modules/.bin:$PATH"
RUN bun scripts/with-app-env.mjs vite build

FROM oven/bun:1 AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/.vercel ./.vercel
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin folio \
  && chown -R folio:folio /app
USER folio
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=5s --start-period=45s --retries=5 \
  CMD /bin/sh -c 'curl -fsS "http://127.0.0.1:${PORT:-8080}/favicon.svg" >/dev/null && curl -fsS "http://127.0.0.1:${PORT:-8080}/api/mcp" >/dev/null'
ENTRYPOINT ["/entrypoint.sh"]
