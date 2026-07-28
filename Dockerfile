# Uruz ᚢ — container image
#
# Built to run as a Rune in Yggdrasil Panel, but it is an ordinary Next.js
# container: any Docker host will do.
#
# Two things shape this file:
#   * Node 24+ is required for the built-in `node:sqlite` module, which is the
#     whole local data layer. No native build tools, no better-sqlite3.
#   * Next's standalone output means the runtime image carries a traced server
#     bundle instead of node_modules.
#
# All state lives in /data (the volume Yggdrasil mounts). Nothing is written
# inside the image at runtime.

# ---------------------------------------------------------------- deps ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Include devDependencies: the build needs TypeScript and Tailwind.
RUN npm ci

# --------------------------------------------------------------- build ----
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ------------------------------------------------------------- runtime ----
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    # Persist the database on the mounted volume, never inside the image.
    URUZ_SQLITE_PATH=/data/uruz.sqlite \
    # Auto-login is a development convenience and must never be on in a
    # container that is reachable from a network.
    URUZ_DEV_AUTOLOGIN=false

# wget is used by the container healthcheck below.
RUN apk add --no-cache wget

# The standalone bundle, plus the two things Next does not trace into it.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Yggdrasil runs containers as the panel's uid:gid so files stay editable from
# the Files tab, and it chowns /data after install. Create the directory here
# so a plain `docker run` (without the panel) also works.
RUN mkdir -p /data && chmod 777 /data

VOLUME ["/data"]
EXPOSE 3000

# Reports unhealthy before the app can serve, which is what an orchestrator
# needs to distinguish "still booting" from "broken".
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health || exit 1

CMD ["node", "server.js"]
