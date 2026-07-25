# Deploy: Battery String Studio teaching site (Pi + Cloudflare)

Mirrors ChooseYouCoaching: Pi runner → Docker (nginx) → Caddy → Cloudflare Tunnel.

Workers (contact + studio-api) stay on **Cloudflare Workers** — deploy separately with Wrangler.

| Branch | Site | Host port |
|--------|------|-----------|
| `staging` | `https://staging.batterystringstudio.com` | `8088` |
| `main` / `master` | `https://batterystringstudio.com` | `8087` |

## URLs (env)

| Variable | Purpose |
|----------|---------|
| `REACT_APP_WEBSITE_DOMAIN` | Canonical site URL |
| `REACT_APP_CONTACT_ENDPOINT` | Contact worker URL |
| `REACT_APP_STUDIO_API` | Studio/booking API base |
| `REACT_APP_LAB_URL` | Link to Lab |
| `REACT_APP_SCALES_URL` | Link to Scales |
| `REACT_APP_STUDIO_EMAIL` | Public email |

Seed on Pi: `cp env.production.example ~/bss/studio/prod/.env`

## Runner

Labels: `self-hosted`, `linux`, `ARM64`, `bss`  
Deploy dirs: `~/bss/studio/{prod|staging}`

## Related hostnames

| Host | Port | Repo |
|------|------|------|
| batterystringstudio.com | 8087 | musician-profile |
| staging.batterystringstudio.com | 8088 | musician-profile |
| lab.batterystringstudio.com | 8089 | battery-string-lab |
| scales.batterystringstudio.com | 8093 | battery-string-scales |

Caddy: `ograno_dev/deploy/caddy/Caddyfile.bss-routes`

## Cloudflare setup (checklist)

See **CLOUDFLARE.md** in this repo.
