#!/usr/bin/env bash
# Deploy a committed revision of this repository as the bayt-al-ghaf systemd service.
#
#   deploy/deploy.sh                 build HEAD into a new release, migrate, switch, restart
#   deploy/deploy.sh --ref <rev>     deploy another commit, tag or branch
#   deploy/deploy.sh --no-start      prepare and switch the release, but do not (re)start
#   deploy/deploy.sh --rollback      switch back to the previous release and restart
#
# Each release is built in its own folder while the current one keeps serving, so the
# site is only down for the restart. First run: NODE_SOURCE=/path/to/node-v22 (an unpacked
# Node.js distribution) installs the service's private runtime. See docs/deployment.md.
set -euo pipefail

readonly SERVICE=bayt-al-ghaf
readonly BASE_DIR=/opt/bayt-al-ghaf
readonly CONFIG_DIR=/etc/bayt-al-ghaf
readonly APP_USER=baytalghaf
readonly KEEP_RELEASES=${KEEP_RELEASES:-3}
readonly DOCS_EXPORT_DIR=${DOCS_EXPORT_DIR:-/root/bayt-al-ghaf-docs}
REPO_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
readonly REPO_DIR

ref=HEAD start=true mode=deploy
while [[ $# -gt 0 ]]; do
  case $1 in
    --ref) ref=${2:?--ref needs a value}; shift 2 ;;
    --no-start) start=false; shift ;;
    --rollback) mode=rollback; shift ;;
    -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1 (see --help)" >&2; exit 2 ;;
  esac
done

log() { printf '==> %s\n' "$*"; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run as root"
[[ -f $CONFIG_DIR/app.env ]] || die "missing $CONFIG_DIR/app.env (copy deploy/app.env.example and fill it in)"

# Reads the service configuration into the current (sub)shell.
load_env() { set -a; . "$CONFIG_DIR/app.env"; set +a; }
port=$(load_env; echo "${PORT:-3000}")
export NEXT_TELEMETRY_DISABLED=1

healthy() {
  local _
  for _ in $(seq 1 60); do
    curl -fsS -m 3 "http://127.0.0.1:$port/api/health" 2>/dev/null | grep -q '"status":"ok"' && return 0
    sleep 1
  done
  return 1
}

switch_to() {
  ln -sfn "$1" "$BASE_DIR/current.tmp"
  mv -Tf "$BASE_DIR/current.tmp" "$BASE_DIR/current"
}

restart_healthy() {
  systemctl restart "$SERVICE"
  healthy
}

# Newest release older than the one currently served (release names start with a timestamp).
previous_release() {
  local current
  current=$(readlink -f "$BASE_DIR/current")
  find "$BASE_DIR/releases" -mindepth 1 -maxdepth 1 -type d | sort | awk -v c="$current" '$0 < c' | tail -n 1
}

if [[ $mode == rollback ]]; then
  target=$(previous_release)
  [[ -n $target ]] || die "no previous release to roll back to"
  log "rolling back to $(basename "$target") (database migrations are not reverted)"
  switch_to "$target"
  restart_healthy || die "service unhealthy after rollback; see: journalctl -u $SERVICE -n 100"
  log "healthy on port $port"
  exit 0
fi

mkdir -p "$BASE_DIR/releases"

# Node.js runtime private to the service; the system's own node is never touched.
if [[ -n ${NODE_SOURCE:-} ]]; then
  [[ -x $NODE_SOURCE/bin/node && -d $NODE_SOURCE/lib/node_modules/npm ]] \
    || die "NODE_SOURCE must be an unpacked Node.js distribution (bin/node, lib/node_modules/npm)"
  case $(readlink -f "$NODE_SOURCE") in /|/usr|/usr/local) die "NODE_SOURCE must not be a system prefix" ;; esac
  wanted=$("$NODE_SOURCE/bin/node" -v)
  [[ ${wanted#v} =~ ^(2[0-9]|[3-9][0-9])\. ]] || die "Node.js 20.9+ required (NODE_SOURCE has $wanted)"
  if [[ ! -x $BASE_DIR/node/bin/node || $("$BASE_DIR/node/bin/node" -v) != "$wanted" ]]; then
    log "installing Node.js $wanted runtime to $BASE_DIR/node"
    rm -rf "$BASE_DIR/node.tmp"
    cp -a "$NODE_SOURCE" "$BASE_DIR/node.tmp"
    rm -rf "$BASE_DIR/node"
    mv "$BASE_DIR/node.tmp" "$BASE_DIR/node"
  fi
fi
[[ -x $BASE_DIR/node/bin/node ]] || die "no Node.js runtime in $BASE_DIR/node; run once with NODE_SOURCE=/path/to/node-v22-linux-x64"
export PATH="$BASE_DIR/node/bin:$PATH"

if ! id -u "$APP_USER" >/dev/null 2>&1; then
  log "creating system user $APP_USER"
  useradd --system --user-group --home-dir "$BASE_DIR" --no-create-home --shell /usr/sbin/nologin "$APP_USER"
fi

rev=$(git -C "$REPO_DIR" rev-parse --verify --quiet "$ref^{commit}") || die "unknown revision: $ref"
[[ -z $(git -C "$REPO_DIR" status --porcelain) ]] || log "note: uncommitted changes in $REPO_DIR are not deployed"
release="$BASE_DIR/releases/$(date +%Y%m%d-%H%M%S)-${rev:0:7}"
trap 'log "deployment failed; removing $(basename "$release")"; rm -rf -- "$release"' ERR

log "building release $(basename "$release") ($(git -C "$REPO_DIR" log -1 --format=%s "$rev"))"
mkdir -p "$release"
git -C "$REPO_DIR" archive "$rev" | tar -x -C "$release"
printf '%s\n' "$rev" > "$release/REVISION"
cd "$release"

log "installing dependencies"
npm ci --no-audit --no-fund --loglevel=error

log "applying database migrations"
(load_env; npx prisma migrate deploy)

# Seeding only an empty database: re-seeding would overwrite prices and availability
# that staff have changed in the back office.
items=$(load_env; node -e '
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient();
  db.menuItem.count().then((n) => { console.log(n); return db.$disconnect(); })
    .catch((e) => { console.error(e.message); process.exit(1); });')
if [[ $items == 0 ]]; then
  [[ -f $CONFIG_DIR/initial-accounts.env ]] \
    || die "empty database: create $CONFIG_DIR/initial-accounts.env (SEED_ADMIN_*, SEED_STAFF_*) first"
  log "empty database: seeding reference data and back-office accounts"
  (load_env; set -a; . "$CONFIG_DIR/initial-accounts.env"; set +a; unset SEED_AGENT_API_KEY; npm run -s db:seed -- --no-sample)
fi

log "building the application"
(load_env; npm run -s build)
chown -R "$APP_USER:$APP_USER" .next

install -m 0644 "deploy/systemd/$SERVICE.service" "/etc/systemd/system/$SERVICE.service"
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null 2>&1
trap - ERR

previous=$(readlink -f "$BASE_DIR/current" 2>/dev/null || true)
switch_to "$release"
log "current -> $(basename "$release")"

if $start; then
  log "restarting $SERVICE"
  if ! restart_healthy; then
    if [[ -n $previous && -d $previous ]]; then
      log "new release is unhealthy; switching back to $(basename "$previous")"
      switch_to "$previous"
      restart_healthy || true
    fi
    die "deployment failed the health check; see: journalctl -u $SERVICE -n 100"
  fi
  log "healthy on port $port"
else
  log "not started (--no-start); start it with: systemctl start $SERVICE"
fi

current=$(readlink -f "$BASE_DIR/current")
find "$BASE_DIR/releases" -mindepth 1 -maxdepth 1 -type d | sort -r | tail -n +$((KEEP_RELEASES + 1)) |
  while read -r old; do
    [[ $old == "$current" ]] || rm -rf -- "$old"
  done

"$release/deploy/export-docs.sh" "$DOCS_EXPORT_DIR"
log "deployed ${rev:0:7}"
