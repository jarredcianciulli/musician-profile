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
| `lab` | same tunnel |
| `lab-staging` | same tunnel |
| `scales` | same tunnel |
| `scales-staging` | same tunnel |
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
| `lab.batterystringstudio.com` | `http://127.0.0.1:80` |
| `lab-staging.batterystringstudio.com` | `http://127.0.0.1:80` |
| `scales.batterystringstudio.com` | `http://127.0.0.1:80` |
| `scales-staging.batterystringstudio.com` | `http://127.0.0.1:80` |

All go to **Caddy on :80**. Caddy picks the app by `Host` header (`Caddyfile.bss-routes`).

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

Contact + studio booking workers currently use `api.jarredcianciulli.com`. For BSS production:

1. In each worker `wrangler.toml`, set routes / `WEBSITE_DOMAIN` to `batterystringstudio.com`.
2. Add custom domain `api.batterystringstudio.com` to the Workers.
3. Put matching URLs in `~/bss/studio/prod/.env`:

```bash
REACT_APP_CONTACT_ENDPOINT=https://api.batterystringstudio.com/contact
REACT_APP_STUDIO_API=https://api.batterystringstudio.com
REACT_APP_WEBSITE_DOMAIN=https://batterystringstudio.com
REACT_APP_LAB_URL=https://lab.batterystringstudio.com
REACT_APP_SCALES_URL=https://scales.batterystringstudio.com
```

Redeploy the studio site after changing `.env` (`docker compose up -d --build` in `~/bss/studio/prod`).

## 5. Optional: skip Caddy for one host

You can point a tunnel hostname straight at `http://127.0.0.1:8089` (lab) instead of `:80`. Prefer Caddy Host routes so one tunnel entry stays enough.
