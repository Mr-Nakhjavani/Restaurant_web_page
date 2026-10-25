# Server deployment (systemd)

How Bayt Al Ghaf runs as a service on a Linux host with systemd: what is where, the first-time setup, redeploying and day-to-day operation. For a container deployment instead, see [Running with Docker](../README.md#running-with-docker).

## Layout

| Path | Contents |
| --- | --- |
| `/opt/bayt-al-ghaf/releases/<date>-<time>-<commit>/` | One folder per deployed commit, built by `deploy/deploy.sh`. The last 3 are kept. |
| `/opt/bayt-al-ghaf/current` | Symlink to the release being served |
| `/opt/bayt-al-ghaf/node/` | Node.js runtime used only by this service (the system's `node` is never changed) |
| `/etc/bayt-al-ghaf/app.env` | Service configuration and secrets, root-only (template: [`deploy/app.env.example`](../deploy/app.env.example)) |
| `/etc/bayt-al-ghaf/initial-accounts.env` | Back-office accounts created when the database is first seeded, root-only |
| `/etc/systemd/system/bayt-al-ghaf.service` | The unit, installed from [`deploy/systemd/bayt-al-ghaf.service`](../deploy/systemd/bayt-al-ghaf.service) |
| `/root/bayt-al-ghaf-docs/` and `/root/bayt-al-ghaf-docs.zip` | All documentation, refreshed after every deployment |
| `/root/bayt-al-ghaf-rag/` and `/root/bayt-al-ghaf-rag.zip` | The RAG / GraphRAG corpus (`rag-corpus/`), refreshed after every deployment |

The service runs as the system user `baytalghaf`. It can read its release, write only the release's `.next` folder (image cache), and cannot see `/root` or `/home`. It restarts automatically 5 seconds after any exit and starts at boot.

## First-time setup

1. **Database.** Give the deployment its own role and database. With the PostgreSQL container from `docker-compose.yml`, run this from the repository folder:

   ```bash
   docker compose exec -T db psql -U bayt -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE bayt_live LOGIN PASSWORD '<password>'" -c "CREATE DATABASE bayt_al_ghaf_live OWNER bayt_live"
   ```

   The first migration enables `btree_gist`, a trusted extension that the database owner may create.

2. **Configuration.** Create `/etc/bayt-al-ghaf/app.env` from the template, mode `600`, and fill in `DATABASE_URL`, `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS` and `ADMIN_SESSION_SECRET` (`openssl rand -hex 32`).

3. **Initial accounts.** Create `/etc/bayt-al-ghaf/initial-accounts.env`, mode `600`:

   ```
   SEED_ADMIN_EMAIL="admin@baytalghaf.example"
   SEED_ADMIN_PASSWORD="<strong password>"
   SEED_STAFF_EMAIL="staff@baytalghaf.example"
   SEED_STAFF_PASSWORD="<strong password>"
   ```

4. **Deploy.** The first run also installs the service's Node.js runtime from an unpacked Node.js 20.9+ distribution (for example `node-v22.x-linux-x64` from nodejs.org):

   ```bash
   NODE_SOURCE=/path/to/node-v22-linux-x64 deploy/deploy.sh
   ```

   It creates the user, builds the release, applies migrations, seeds the empty database (reference data and the two accounts, no sample bookings), installs and enables the unit, starts it and waits for `/api/health`.

5. **API key for the voice assistant.** Sign in to `/admin` → API keys, or call `POST /api/v1/admin/api-keys` with `{"name": "...", "scopes": ["agent"]}` as an admin. The key is shown once.

## Redeploying

Commit the change, then run:

```bash
deploy/deploy.sh
```

Only committed code is deployed. The new release is built in its own folder while the current one keeps serving. Migrations are applied before the switch, so they must stay compatible with the running release. After the restart the script waits for `/api/health`; if the new release is unhealthy it switches back to the previous one. Downtime is the restart itself, about 1–2 seconds.

The seed runs only on an empty database, because re-seeding would overwrite prices and availability that staff changed in the back office.

## Operating

| Task | Command |
| --- | --- |
| Status | `systemctl status bayt-al-ghaf` |
| Logs (JSON lines with request IDs) | `journalctl -u bayt-al-ghaf -f` |
| Health | `curl -s http://127.0.0.1:3000/api/health` |
| Restart / stop / start | `systemctl restart bayt-al-ghaf` (or `stop`, `start`) |
| Deployed commit | `cat /opt/bayt-al-ghaf/current/REVISION` |
| Roll back to the previous release | `deploy/deploy.sh --rollback` (code only; migrations are not reverted) |
| Refresh the documentation export | `deploy/export-docs.sh` |
| Regenerate and export the RAG corpus | `npm run rag:build && deploy/export-rag.sh` |
| Back up the database | `docker compose exec -T db pg_dump -U bayt bayt_al_ghaf_live > bayt_al_ghaf_live.sql` |

## Notes

- **Plain HTTP.** The service listens on `PORT` on all interfaces without TLS. For internet-facing use, put a TLS reverse proxy in front, set `TRUST_PROXY=true`, and update `APP_BASE_URL` and `CORS_ALLOWED_ORIGINS` to the HTTPS address.
- **The database lives in the Docker volume** of the compose project. `docker compose down` keeps it; `docker compose down -v` deletes it. The container restarts by itself (`restart: unless-stopped`).
- **Never run `npm run build` inside a release folder that is being served.** Development work belongs in the repository checkout. Its dev server needs a port other than the service's: `PORT=3001 npm run dev`.
- Rate limits and verification lockouts are kept in memory, so they reset when the service restarts.
