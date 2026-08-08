# Deploy: Battery String Studio teaching site (Pi + Cloudflare)

Mirrors ChooseYouCoaching: Pi runner → Docker (Next.js `next start`) → Caddy → Cloudflare Tunnel.

Workers (contact + studio-api) stay on **Cloudflare Workers** — deploy separately with Wrangler.

| Branch | Site | Host port | Studio API | Stripe |
|--------|------|-----------|------------|--------|
| `staging` | `https://staging.batterystringstudio.com` | `8088` → container `3000` | `studio-api-staging` (test) | **test** keys |
| `main` / `master` | `https://batterystringstudio.com` | `8087` → container `3000` | `studio-api` / `booking-api` | **live** keys |

## URLs (env)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_WEBSITE_DOMAIN` | Canonical site URL |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | Contact worker URL |
| `NEXT_PUBLIC_STUDIO_API` | Studio/booking API base |
| `NEXT_PUBLIC_LAB_URL` | Link to Lab |
| `NEXT_PUBLIC_METHOD_URL` | Link to Method |
| `NEXT_PUBLIC_STUDIO_EMAIL` | Public email |

Seed on Pi: `cp env.production.example ~/bss/studio/prod/.env`  
Deploy workflow migrates legacy `REACT_APP_*` keys to `NEXT_PUBLIC_*` when missing.  
Staging deploys force `NEXT_PUBLIC_STUDIO_API` to the staging Worker (Stripe test).

## Runner

Labels: `self-hosted`, `linux`, `ARM64`, `bss`  
Deploy dirs: `~/bss/studio/{prod|staging}`

## Related hostnames

| Host | Port | Repo |
|------|------|------|
| batterystringstudio.com | 8087 | musician-profile |
| staging.batterystringstudio.com | 8088 | musician-profile |
| lab.batterystringstudio.com | 8089 | battery-string-lab |
| method.batterystringstudio.com | 8093 | battery-string-scales |

Caddy: `ograno_dev/deploy/caddy/Caddyfile.bss-routes`

## Cloudflare setup (checklist)

See **CLOUDFLARE.md** in this repo.

## Flyer tracking

QR / print URLs: `https://batterystringstudio.com/f/{code}` (e.g. `/f/bowan-qr-01`).  
Hits are counted in studio-api KV; view counts in `/admin`.

Ad / lead URLs: `https://batterystringstudio.com/lead?f={code}&utm_source=…`

## Marketing / SEO checklist

1. Free **Google Business Profile** complete + verified (see CLOUDFLARE.md §7)
2. NAP consistency: same name/phone/area on site, GBP, socials
3. Set real `NEXT_PUBLIC_FACEBOOK_URL` / `NEXT_PUBLIC_INSTAGRAM_URL` on the Pi `.env` (replace placeholders)
4. Search Console + Bing — submit sitemap after prod deploy
5. Ongoing: Google reviews

## Studio API — production (live Stripe)

```bash
cd workers/studio-api
npx wrangler secret put BREVO_API_KEY
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put STRIPE_SECRET_KEY          # sk_live_…
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler deploy
```

Custom domain: `booking-api.batterystringstudio.com`  
Webhook (live): `https://booking-api.batterystringstudio.com/studio/booking/webhook`

## Studio API — staging (Stripe test)

Separate Worker + KV so test bookings never touch prod holds.

```bash
cd workers/studio-api
# One-time: KV already created (see wrangler.toml env.staging)
npx wrangler secret put STRIPE_SECRET_KEY --env staging      # sk_test_… (BSS Dashboard → Test mode)
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging  # from test webhook signing secret
npx wrangler secret put BREVO_API_KEY --env staging
npx wrangler secret put ADMIN_TOKEN --env staging
npx wrangler deploy --env staging
```

| | Staging | Production |
|--|---------|------------|
| Worker | `studio-api-staging` | `studio-api` |
| API URL (default) | `https://studio-api-staging.batterystringstudio.workers.dev` | `https://booking-api.batterystringstudio.com` |
| Optional custom domain | `booking-api-staging.batterystringstudio.com` (CF Workers Domains + DNS) | `booking-api.batterystringstudio.com` |
| `WEBSITE_DOMAIN` | staging.batterystringstudio.com | batterystringstudio.com |
| Stripe | **test** | **live** |
| KV | separate staging namespace | prod `STUDIO_KV` |

### Stripe test webhook

**Use the workers.dev URL** (custom hostname needs DNS; may not resolve yet):

1. Stripe Dashboard → **Test mode** → Developers → Webhooks → Add endpoint  
2. URL: `https://studio-api-staging.batterystringstudio.workers.dev/studio/booking/webhook`  
3. Events: `checkout.session.completed`, `checkout.session.expired`  
4. Copy signing secret → `wrangler secret put STRIPE_WEBHOOK_SECRET --env staging`

If the webhook URL was set to `booking-api-staging.batterystringstudio.com` and that host does not resolve, Stripe never delivers events — update the endpoint to workers.dev above.

Confirm Brevo sender `jarred@batterystringstudio.com` is verified. Failed sends store `emailError` on the booking in `/admin` (and do **not** set `emailsSentAt`, so a later confirm can retry).

Smoke on staging: `/trial` → pay with `4242…` → emails + `/admin` booking. Cancel mid-checkout → hold frees.

Vars already in `wrangler.toml`: `FROM_EMAIL` / `TO_EMAIL` / `FROM_NAME`.

**Emails sent on:** trial paid, subscription paid, `/lead` form (studio alert + client auto-reply). Soft-fail if Brevo is unset.

## Launch checklist (ops)

1. Prod Stripe webhook includes `checkout.session.completed` **and** `checkout.session.expired`
2. Staging Worker has **test** Stripe secrets + test webhook (above)
3. Worker secrets (prod): `BREVO_API_KEY`, `ADMIN_TOKEN`, Stripe live, Google Calendar, street — `/admin` login works
4. Brevo sender `jarred@batterystringstudio.com` verified
5. Pi `.env`: real `NEXT_PUBLIC_FACEBOOK_URL` / `NEXT_PUBLIC_INSTAGRAM_URL` → redeploy
6. Google Business Profile verified (service-area, booking URL `/trial`) — see CLOUDFLARE.md §7
7. Search Console → submit `https://batterystringstudio.com/sitemap.xml`
8. Smoke prod: trial pay (two emails), subscribe cancel (slot frees + lead), `/lead` (two emails)
