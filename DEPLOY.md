# Deploy: Battery String Studio teaching site (Pi + Cloudflare)

Mirrors ChooseYouCoaching: Pi runner → Docker (Next.js `next start`) → Caddy → Cloudflare Tunnel.

Workers (contact + studio-api) stay on **Cloudflare Workers** — deploy separately with Wrangler.

| Branch | Site | Host port |
|--------|------|-----------|
| `staging` | `https://staging.batterystringstudio.com` | `8088` → container `3000` |
| `main` / `master` | `https://batterystringstudio.com` | `8087` → container `3000` |

## URLs (env)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_WEBSITE_DOMAIN` | Canonical site URL |
| `NEXT_PUBLIC_CONTACT_ENDPOINT` | Contact worker URL |
| `NEXT_PUBLIC_STUDIO_API` | Studio/booking API base (`booking-api…`) |
| `NEXT_PUBLIC_LAB_URL` | Link to Lab |
| `NEXT_PUBLIC_METHOD_URL` | Link to Method |
| `NEXT_PUBLIC_STUDIO_EMAIL` | Public email |

Seed on Pi: `cp env.production.example ~/bss/studio/prod/.env`  
Deploy workflow migrates legacy `REACT_APP_*` keys to `NEXT_PUBLIC_*` when missing.

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

## Studio API (holds, leads, Brevo)

```bash
cd workers/studio-api
npx wrangler secret put BREVO_API_KEY   # same key as brevo-contact-worker
npx wrangler secret put ADMIN_TOKEN
npx wrangler deploy
```

Vars already in `wrangler.toml`: `FROM_EMAIL` / `TO_EMAIL` / `FROM_NAME`.

**Emails sent on:** trial paid, subscription paid, `/lead` form (studio alert + client auto-reply). Soft-fail if Brevo is unset.

## Launch checklist (ops)

1. Stripe webhook includes `checkout.session.completed` **and** `checkout.session.expired`
2. Worker secrets: `BREVO_API_KEY`, `ADMIN_TOKEN`, Stripe, Google Calendar, street — `/admin` login works
3. Brevo sender `jarred@batterystringstudio.com` verified
4. Pi `.env`: real `NEXT_PUBLIC_FACEBOOK_URL` / `NEXT_PUBLIC_INSTAGRAM_URL` → redeploy
5. Google Business Profile verified (service-area, booking URL `/trial`) — see CLOUDFLARE.md §7
6. Search Console → submit `https://batterystringstudio.com/sitemap.xml`
7. Smoke: trial pay (two emails), subscribe cancel (slot frees + lead), `/lead` (two emails)
