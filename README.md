# Shot on Stats

Minimal full-stack connection scaffold for a future football analytics app. The current project intentionally contains only a React health-check page and one Express API endpoint that verifies an external MySQL connection.

## MySQL setup

Create a free-tier MySQL database with one of these providers:

- [Railway](https://railway.com/) — create a MySQL service and copy its `MYSQL_URL`/connection URL.
- [Clever Cloud](https://www.clever-cloud.com/) — create a free MySQL add-on and copy the connection details.
- [PlanetScale](https://planetscale.com/) — create a database and copy its connection string from the Connect screen.

Copy `.env.example` to `.env` if needed, then put the connection string in `DATABASE_URL`. Do not commit `.env`. You can instead leave `DATABASE_URL` empty and set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` separately.

The server connects to MySQL before it starts listening. `GET /api/health` returns:

```json
{ "status": "ok", "db": "connected" }
```

If MySQL is unavailable, the endpoint returns HTTP 503 with a readable error.

## Run locally in Replit

1. Add the real MySQL values to `.env`.
2. Start the API workflow: `artifacts/api-server: API Server`.
3. Start the web workflow: `artifacts/shot-on-stats: web`.
4. Open the web preview. It calls `/api/health` on load and displays the current connection status.

You can also run the package commands from the shell:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/shot-on-stats run dev
```

## API keys for later

The placeholders `API_FOOTBALL_KEY`, `CLUBELO_BASE_URL`, and `AI_API_KEY` are included for future features. Add the real API-Football and AI provider values to `.env` only when those integrations are built. No API calls use them yet.

## Current scope

There are no prediction algorithms, simulations, database tables, data models, or feature routes in this scaffold.