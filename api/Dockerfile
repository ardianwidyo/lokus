# LOKUS API — Cloud Run container.
#
# Two stages so the runtime image carries no dev dependencies and no test
# fixtures. The workspace layout means the build context is the repo root:
# api depends on packages/core, which npm links through the workspace.

FROM node:20-slim AS deps
WORKDIR /app

# Manifests first, so a source-only change reuses the cached install layer.
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY api/package.json ./api/
COPY web/package.json ./web/
COPY eval/package.json ./eval/

# --omit=dev: the runtime needs fastify and jose, not vitest.
# --ignore-scripts: no dependency may run arbitrary code during an image build.
RUN npm ci --omit=dev --ignore-scripts --workspace @lokus/api --include-workspace-root


FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/core ./packages/core
COPY api/package.json ./api/
COPY api/src ./api/src

# Runs unprivileged. The node image ships a `node` user for exactly this.
USER node

EXPOSE 8080

# Direct exec of the entrypoint, so SIGTERM reaches Node and the graceful
# shutdown in api/src/index.js actually runs on a Cloud Run revision swap.
CMD ["node", "api/src/index.js"]
