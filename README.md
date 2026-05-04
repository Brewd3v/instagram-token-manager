# Instagram Token Manager (Coolify / Docker)

Node.js port of the Cloudflare Workers Instagram Token Manager. Manages Instagram long-lived access tokens with OAuth flow, auto-refresh, and a web dashboard.

## Stack

- Node.js 20 + TypeScript
- Hono (HTTP)
- better-sqlite3 (local SQLite, persisted via Docker volume)
- node-cron (Monday 09:00 refresh check)
- dotenv

## Routes

| Route | Description |
|---|---|
| `GET /` | Dashboard — status, username, expiry, last refresh |
| `GET /connect` | Start Instagram OAuth flow |
| `GET /callback` | Exchange code, store token |
| `GET /token.json` | `{"token":"...","expires_at":"...","username":"..."}` |
| `GET /token.js` | `const InstagramToken = "...";` |
| `POST /disconnect` | Delete stored token |

## Local Dev

```bash
cp .env.example .env
# fill in .env
npm install
npm run dev
```

## Docker Compose (local)

```bash
cp .env.example .env
# fill in .env
docker compose up --build
```

App available at `http://localhost:3000`.

## Coolify Deployment

### 1. Add Service

In Coolify: **New Resource → Docker Compose** → paste the contents of `docker-compose.yml` (or point to the repo).

### 2. Set Environment Variables

In Coolify's **Environment Variables** UI, add:

| Variable | Value |
|---|---|
| `INSTAGRAM_APP_ID` | Your Meta app ID |
| `INSTAGRAM_APP_SECRET` | Your Meta app secret |
| `WORKER_URL` | `https://your-coolify-domain.com` |
| `ALLOWED_DOMAINS` | Optional comma-separated domains to restrict `/token.*` endpoints |
| `DB_PATH` | `/data/tokens.db` (default — leave as-is) |
| `PORT` | `3000` (default — leave as-is) |

### 3. Persistent Volume

Coolify maps the `tokens_data` volume automatically when using Docker Compose. SQLite persists across restarts.

### 4. Port & Domain

- Map port `3000` in Coolify's port settings.
- Add your domain under **Domains** — Coolify handles TLS via Let's Encrypt.

### 5. Instagram App Setup

In Meta Developer Console:

1. Add `https://your-coolify-domain.com/callback` as a **Valid OAuth Redirect URI**.
2. Ensure `instagram_business_basic` permission is added.
3. App must be in **Live** mode (or add test users for Development mode).

## Auto-Refresh

Cron runs every Monday at 09:00 (container timezone). Tokens with < 30 days until expiry are refreshed. Output logged to stdout — visible in Coolify's service logs.
