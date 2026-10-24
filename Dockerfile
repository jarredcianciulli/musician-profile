# Multi-stage Next.js (standalone) — teaching site
# Pin patched LTS (Oct 21 2026 Node security releases: Brotli RCE, TLS/DNS).
# Node 20 is EOL and does not receive those fixes.
FROM node:24.22.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.22.1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_CONTACT_ENDPOINT=https://api.jarredcianciulli.com/contact
ARG NEXT_PUBLIC_STUDIO_API=https://booking-api.batterystringstudio.com
ARG NEXT_PUBLIC_WEBSITE_DOMAIN=https://batterystringstudio.com
ARG NEXT_PUBLIC_ACCOUNT_DOMAIN=https://account.batterystringstudio.com
ARG NEXT_PUBLIC_MARKETING_DOMAIN=https://batterystringstudio.com
ARG NEXT_PUBLIC_LAB_URL=https://lab.batterystringstudio.com
ARG NEXT_PUBLIC_METHOD_URL=https://method.batterystringstudio.com
ARG NEXT_PUBLIC_STUDIO_EMAIL=jarred@batterystringstudio.com

ENV NEXT_PUBLIC_CONTACT_ENDPOINT=$NEXT_PUBLIC_CONTACT_ENDPOINT \
    NEXT_PUBLIC_STUDIO_API=$NEXT_PUBLIC_STUDIO_API \
    NEXT_PUBLIC_WEBSITE_DOMAIN=$NEXT_PUBLIC_WEBSITE_DOMAIN \
    NEXT_PUBLIC_ACCOUNT_DOMAIN=$NEXT_PUBLIC_ACCOUNT_DOMAIN \
    NEXT_PUBLIC_MARKETING_DOMAIN=$NEXT_PUBLIC_MARKETING_DOMAIN \
    NEXT_PUBLIC_LAB_URL=$NEXT_PUBLIC_LAB_URL \
    NEXT_PUBLIC_METHOD_URL=$NEXT_PUBLIC_METHOD_URL \
    NEXT_PUBLIC_STUDIO_EMAIL=$NEXT_PUBLIC_STUDIO_EMAIL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM node:24.22.1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
