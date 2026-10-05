# syntax=docker/dockerfile:1
#
# Backend (NestJS) image. Build from the repo root so the workspace lockfile is in context:
#   docker build -f apps/backend/Dockerfile -t rochas-backend .

ARG NODE_VERSION=24-alpine
ARG TURBO_VERSION=2.11.7

# --- prune: keep only the backend workspace and its lockfile entries ---
FROM node:${NODE_VERSION} AS pruner
ARG TURBO_VERSION
WORKDIR /repo
ENV TURBO_TELEMETRY_DISABLED=1
RUN npm install -g turbo@${TURBO_VERSION}
COPY . .
RUN turbo prune @rochas-surf-school/backend --docker

# --- deps: full install (dev deps needed for `nest build`) ---
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY --from=pruner /repo/out/json/ ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

# --- build: compile TypeScript to dist/ ---
FROM deps AS builder
COPY --from=pruner /repo/out/full/ ./
RUN npm run build -w @rochas-surf-school/backend

# --- prod-deps: runtime dependencies only ---
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
COPY --from=pruner /repo/out/json/ ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --no-audit --no-fund

# --- runtime ---
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app ./
COPY --from=builder --chown=node:node /app/apps/backend/dist ./apps/backend/dist
WORKDIR /app/apps/backend
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
