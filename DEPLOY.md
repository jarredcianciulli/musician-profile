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

## Studio API after hold/leads changes

```bash
cd workers/studio-api && npx wrangler deploy
```

Stripe webhook must receive `checkout.session.expired` (enable in Stripe Dashboard if not already).
