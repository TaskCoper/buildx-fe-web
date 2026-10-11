FROM node:24-alpine AS dependencies

RUN corepack enable
WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
ENV HUSKY=0
RUN pnpm install --frozen-lockfile

FROM node:24-alpine AS build

RUN corepack enable
WORKDIR /usr/src/app

COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .

# Public variables and Next.js rewrites are fixed when the image is built.
ARG BMT_API_ORIGIN=https://bmt-api.vnzdna.com
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ARG NEXT_PUBLIC_API_TIMEOUT=30000
ARG NEXT_PUBLIC_APP_NAME="BuildX AI"
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_USE_MOCK_AUTH=false
ARG NEXT_PUBLIC_USE_MOCK_API=false
ARG NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED=false
ARG NEXT_PUBLIC_VIETMAP_API_KEY=""

ENV BMT_API_ORIGIN=${BMT_API_ORIGIN} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_API_TIMEOUT=${NEXT_PUBLIC_API_TIMEOUT} \
    NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_PUBLIC_USE_MOCK_AUTH=${NEXT_PUBLIC_USE_MOCK_AUTH} \
    NEXT_PUBLIC_USE_MOCK_API=${NEXT_PUBLIC_USE_MOCK_API} \
    NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED=${NEXT_PUBLIC_ESTIMATE_PIPELINE_ENABLED} \
    NEXT_PUBLIC_VIETMAP_API_KEY=${NEXT_PUBLIC_VIETMAP_API_KEY} \
    NEXT_TELEMETRY_DISABLED=1 \
    HUSKY=0

RUN pnpm build

FROM node:24-alpine AS runner

WORKDIR /usr/src/app

# Keep the authenticated image adapter on the same API origin as the built /api/v1 rewrite.
ARG BMT_API_ORIGIN=https://bmt-api.vnzdna.com
ENV NODE_ENV=production \
    BMT_API_ORIGIN=${BMT_API_ORIGIN} \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /usr/src/app/public ./public

# VIETMAP_API_KEY is injected by Compose at runtime, never stored in the image.
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
