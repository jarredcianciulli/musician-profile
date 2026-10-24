# Cloudflare setup for Battery String Studio

You already use this pattern for Choose You: **Tunnel → Caddy :80 on the Pi → Docker host ports**.

## 1. DNS (Cloudflare dashboard)

Zone: `batterystringstudio.com` (add the domain to Cloudflare if it is not already).

Create **CNAME** (or tunnel-managed) records, proxied (orange cloud):

| Name | Target |
|------|--------|
| `@` (apex) | your Cloudflare Tunnel hostname / `cfargotunnel.com` route |
| `www` | same tunnel |
| `staging` | same tunnel |
| `account` | same tunnel (student portal — no marketing nav) |
| `account-staging` | same tunnel |
| `lab` | same tunnel |
| `lab-staging` | same tunnel |
| `method` | same tunnel |
| `method-staging` | same tunnel |
| `api` | *(optional)* Workers custom domain — see §4 |

SSL/TLS mode: **Flexible** (matches Organo/ChooseYou: HTTPS at Cloudflare, HTTP to Caddy).

Keep `www` on Cloudflare (do not point it at Brevo brand CNAME).

## 2. Cloudflare Tunnel public hostnames

In Zero Trust → Networks → Tunnels → your Pi tunnel → Public Hostname:

| Public hostname | Service |
|-----------------|---------|
| `batterystringstudio.com` | `http://127.0.0.1:80` |
| `www.batterystringstudio.com` | `http://127.0.0.1:80` |
| `staging.batterystringstudio.com` | `http://127.0.0.1:80` |
| `account.batterystringstudio.com` | `http://127.0.0.1:80` |
| `account-staging.batterystringstudio.com` | `http://127.0.0.1:80` |
| `lab.batterystringstudio.com` | `http://127.0.0.1:80` |
| `lab-staging.batterystringstudio.com` | `http://127.0.0.1:80` |
| `method.batterystringstudio.com` | `http://127.0.0.1:80` |
| `method-staging.batterystringstudio.com` | `http://127.0.0.1:80` |

All go to **Caddy on :80**. Caddy picks the app by `Host` header (`Caddyfile.bss-routes`).

### Student account subdomain

Same Next.js containers as the marketing site (prod `8087`, staging `8088`). Add Host routes in `Caddyfile.bss-routes`:

```
account.batterystringstudio.com {
  reverse_proxy 127.0.0.1:8087
}
account-staging.batterystringstudio.com {
  reverse_proxy 127.0.0.1:8088
}
```

App middleware serves `/account` (and rewrites `/` → `/account`) on those hosts, and redirects other paths to the marketing site.

Set on the Pi `.env` (and rebuild):

```
NEXT_PUBLIC_ACCOUNT_DOMAIN=https://account.batterystringstudio.com
NEXT_PUBLIC_MARKETING_DOMAIN=https://batterystringstudio.com
```

Staging:

```
NEXT_PUBLIC_ACCOUNT_DOMAIN=https://account-staging.batterystringstudio.com
NEXT_PUBLIC_MARKETING_DOMAIN=https://staging.batterystringstudio.com
```

Worker magic links use `ACCOUNT_DOMAIN` in `workers/studio-api/wrangler.toml` (already set for prod + staging). Redeploy Workers after changing it.

## 3. Pi: Caddy + runner + first deploy

```bash
# On the Pi — ensure Caddy has the BSS routes file (from ograno_dev deploy)
# Then recreate Caddy so it imports Caddyfile.bss-routes

# Add label `bss` to your self-hosted runner (GitHub → Settings → Actions → Runners)

mkdir -p ~/bss/studio/prod ~/bss/lab/prod ~/bss/scales/prod
mkdir -p ~/bss/studio/staging ~/bss/lab/staging ~/bss/scales/staging
```

Push `master` on each repo (or merge staging → master). Watch Actions on the Pi runner.

Smoke test on the Pi:

```bash
curl -sI -H 'Host: lab.batterystringstudio.com' http://127.0.0.1:80 | head -5
curl -sI http://127.0.0.1:8089/health
```

## 4. API workers (separate from the sites)

Contact + studio booking workers.

**studio-api** (slots, trial Checkout, subscriptions):

```bash
cd workers/studio-api
npx wrangler kv namespace create STUDIO_KV   # paste id into wrangler.toml
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put STUDIO_STREET_ADDRESS
npx wrangler secret put GOOGLE_CALENDAR_ID
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_PRIVATE_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put BREVO_API_KEY   # booking + lead emails (same key as contact worker)
npx wrangler secret put SLACK_WEBHOOK_URL   # Incoming Webhook — student login + admin portal alerts
npx wrangler deploy
```

`FROM_EMAIL` / `TO_EMAIL` / `FROM_NAME` are wrangler vars. Confirmations fire on trial paid, subscription paid, and `/lead` (studio + client).

Custom domain: `booking-api.batterystringstudio.com` (Workers Domains).  
`api.batterystringstudio.com` stays on the tunnel/Caddy stack.  
CORS: apex, www, staging, localhost.  
Stripe webhook: `https://booking-api.batterystringstudio.com/studio/booking/webhook`  
Flyer QR: `https://batterystringstudio.com/trial`

### studio-api staging (Stripe **test** mode)

Separate Worker so sandbox Checkout never uses live keys or prod KV:

```bash
cd workers/studio-api
npx wrangler kv namespace create STUDIO_KV --env staging   # already done; id in wrangler.toml
npx wrangler secret put STRIPE_SECRET_KEY --env staging      # sk_test_…
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
npx wrangler secret put BREVO_API_KEY --env staging
npx wrangler secret put ADMIN_TOKEN --env staging
npx wrangler secret put SLACK_WEBHOOK_URL --env staging   # optional; same or separate channel
npx wrangler deploy --env staging
```

| | Staging | Production |
|--|---------|------------|
| Worker | `studio-api-staging` | `studio-api` |
| Default URL | `https://studio-api-staging.batterystringstudio.workers.dev` | `https://booking-api.batterystringstudio.com` |
| Optional hostname | `booking-api-staging.batterystringstudio.com` (Workers Domains + DNS) | `booking-api…` |
| Stripe | test | live |

Test webhook: `https://studio-api-staging.batterystringstudio.workers.dev/studio/booking/webhook`
Events: `checkout.session.completed`, `checkout.session.expired`.

Success-URL fallbacks (if webhook lags): trial `GET /studio/booking/session`, subscribe `GET /studio/subscription/session`.

Staging site `NEXT_PUBLIC_STUDIO_API` must point at the staging Worker (deploy workflow sets this on `staging` branch).

Site `REACT_APP_*` on Pi `~/bss/studio/prod/.env`:

```bash
REACT_APP_CONTACT_ENDPOINT=https://api.jarredcianciulli.com/contact
REACT_APP_STUDIO_API=https://booking-api.batterystringstudio.com
REACT_APP_WEBSITE_DOMAIN=https://batterystringstudio.com
REACT_APP_LAB_URL=https://lab.batterystringstudio.com
REACT_APP_METHOD_URL=https://method.batterystringstudio.com
REACT_APP_STUDIO_EMAIL=jarred@batterystringstudio.com
```

Redeploy the studio site after changing `.env` (`docker compose up -d --build` in `~/bss/studio/prod`).

## 5. Optional: skip Caddy for one host

You can point a tunnel hostname straight at `http://127.0.0.1:8089` (lab) instead of `:80`. Prefer Caddy Host routes so one tunnel entry stays enough.

## 6. Cloudflare Web Analytics + Zaraz (funnel insights)

PII (name, email, phone, slot) stays in **studio-api KV → `/admin` Leads**. Do **not** send emails/phones into analytics events.

### Web Analytics

1. Cloudflare dashboard → **Web Analytics** → Add site `batterystringstudio.com` (and staging if useful).
2. Use the **beacon** snippet or enable via the zone (Automatic setup when the hostname is on Cloudflare).
3. Confirm page views on prod after deploy.

### Zaraz → GA4 (or CF-only)

1. Zone → **Zaraz** → enable.
2. Add a tool (Google Analytics 4 recommended) with your Measurement ID.
3. Map custom events fired by the site (`src/utils/analytics.ts` prefers `window.zaraz.track`, falls back to `gtag`):

| Event | When |
|-------|------|
| `subscribe_opened` | Weekly subscribe flow opened |
| `subscribe_step` | Subscribe wizard step (1–5) |
| `subscribe_checkout_start` | Redirect to Stripe |
| `subscribe_cancel` | Returned from Stripe cancel |
| `subscribe_complete` | `/subscribe/success` |
| `trial_opened` | Trial flow opened (desktop overlay or `/trial`) |
| `trial_step` | Trial wizard step (1–4) |
| `trial_checkout_start` | Redirect to Stripe |
| `trial_cancel` | Returned from Stripe cancel |
| `trial_complete` | Trial paid / confirmed |
| `lead_form_submit` | `/lead` form success |

4. In Zaraz, create triggers on those event names if you want them in GA4 reports.

## 7. Google Business Profile (free — not Ads / not Workspace)

Voice and “near me” answers come mainly from **GBP + reviews + LocalBusiness schema**, not an Alexa Skill.

Complete the profile (service-area / hide street address to match the site):

| Field | Value |
|-------|--------|
| Business name | Battery String Studio |
| Category | Music school / Violin lessons / Music instructor |
| Location | **Service-area** (Bowan Village / Charleston) — do not publish full street unless you want walk-ins |
| Phone | `(610) 340-8827` |
| Website | `https://batterystringstudio.com` |
| Booking URL | `https://batterystringstudio.com/trial` |
| Description | Private violin and viola lessons in the Bowan Village / Charleston area with Jarred Cianciulli. $35 trial lessons; weekly subscriptions. All ages. |
| Logo | `public/brand/bss-stripe-icon.png` (512×512) — mark fills square for Checkout |
| Cover | `public/brand/lockup-horizontal.png` or a teaching photo |

Then: finish verification → add photos → ask for Google reviews → Search Console submit `https://batterystringstudio.com/sitemap.xml`.

## 8. Search Console / Bing

After SEO ship:

1. [Google Search Console](https://search.google.com/search-console) → property `batterystringstudio.com` → Sitemaps → `https://batterystringstudio.com/sitemap.xml`
2. Optional: Bing Webmaster Tools → same sitemap
3. Staging should send `noindex` when `NEXT_PUBLIC_WEBSITE_DOMAIN` contains `staging`
