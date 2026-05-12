# Install dependencies only when needed
FROM node:18-alpine AS deps
# libc6-compat for Node native modules; openssl for Prisma query engine
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM node:18-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
# We use a dummy URL for build time if DATABASE_URL is required by schema,
# but usually prisma generate doesn't need it.
RUN npx prisma generate

# NEXT_PUBLIC_* vars must be present at build time to be inlined into the client bundle.
ARG NEXT_PUBLIC_HUB_DOMAIN=wikis.robogeex.com
ENV NEXT_PUBLIC_HUB_DOMAIN=$NEXT_PUBLIC_HUB_DOMAIN

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM node:18-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV production
ARG NEXT_PUBLIC_HUB_DOMAIN=wikis.robogeex.com
ENV NEXT_PUBLIC_HUB_DOMAIN=$NEXT_PUBLIC_HUB_DOMAIN
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

ENV PORT 8080
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
