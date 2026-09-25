#!/bin/bash
#
# startall.sh – One command to run the whole PointzPlus stack locally.
#
#   1. Pre-flight checks (node, psql, PostgreSQL, env files, dependencies)
#   2. Creates the database and applies migrations (idempotent)
#   3. Starts the Express API + background sync worker
#   4. Waits until the API is genuinely healthy
#   5. Starts Expo (Ctrl+C stops everything)
#
# Usage:
#   ./startall.sh                 # API + Expo dev server
#   ./startall.sh --web           # open in web browser
#   ./startall.sh --android       # open on Android emulator
#   ./startall.sh --ios           # open on iOS simulator
#   ./startall.sh --no-migrate    # skip database migrations
#   ./startall.sh --api-only      # run just the backend
#   ./startall.sh --logs          # tail the API log
#   ./startall.sh --help
#
set -euo pipefail

cd "$(dirname "$0")"

# ── Config ───────────────────────────────────────────────────────
DB_NAME="${DB_NAME:-pointzplus}"
DEFAULT_PORT=3001
LOG_DIR="logs"
API_LOG="$LOG_DIR/api.log"

RUN_MIGRATIONS=1
EXPO_TARGET=""
API_ONLY=0
TAIL_LOGS=0

# ── Output helpers ───────────────────────────────────────────────
if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'
  BLUE=$'\033[34m'; CYAN=$'\033[36m'; BOLD=$'\033[1m'; NC=$'\033[0m'
else
  RED=""; GREEN=""; YELLOW=""; BLUE=""; CYAN=""; BOLD=""; NC=""
fi

info() { printf '%s\n' "${CYAN}==>${NC} $*"; }
ok()   { printf '%s\n' "${GREEN}  ✓${NC} $*"; }
warn() { printf '%s\n' "${YELLOW}  !${NC} $*"; }
fail() { printf '%s\n' "${RED}  ✗${NC} $*" >&2; }
die()  { fail "$*"; exit 1; }

# ── Arguments ────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --web)        EXPO_TARGET="--web" ;;
    --android)    EXPO_TARGET="--android" ;;
    --ios)        EXPO_TARGET="--ios" ;;
    --no-migrate) RUN_MIGRATIONS=0 ;;
    --api-only)   API_ONLY=1 ;;
    --logs)       TAIL_LOGS=1 ;;
    -h|--help)    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)            die "Unknown option: $1  (try --help)" ;;
  esac
  shift
done

# ── Cleanup ──────────────────────────────────────────────────────
SERVER_PID=""
cleanup() {
  trap - EXIT INT TERM HUP
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    info "Stopping API server (pid $SERVER_PID)..."
    # The server handles SIGTERM: stops the worker, closes the pool.
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      sleep 0.25
    done
    if kill -0 "$SERVER_PID" 2>/dev/null; then
      kill -9 "$SERVER_PID" 2>/dev/null || true
    fi
    ok "API server stopped."
  fi
}
# EXIT covers normal exit; INT is Ctrl+C; TERM/HUP cover `kill` and a closed
# terminal, so the API is never left orphaned holding port 3001.
trap cleanup EXIT INT TERM HUP

printf '\n%s\n' "${BOLD}PointzPlus – full local stack${NC}"
printf '%s\n\n' "${BLUE}Express API + PostgreSQL + Expo${NC}"

# ── 1. Pre-flight ────────────────────────────────────────────────
info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || die "Node.js not found. Install Node 20+ and retry."
command -v npm  >/dev/null 2>&1 || die "npm not found. Install Node 20+ and retry."
command -v psql >/dev/null 2>&1 || die "PostgreSQL client (psql) not found. Install it and retry."
ok "node $(node --version), npm $(npm --version), psql present"

command -v pg_isready >/dev/null 2>&1 || die "pg_isready not found. Is PostgreSQL installed?"
if ! pg_isready -q 2>/dev/null; then
  warn "PostgreSQL is not accepting connections."
  warn "Start it, then re-run this script:"
  warn "  macOS (Homebrew):  brew services start postgresql@16"
  warn "  Docker:            docker compose up -d db"
  exit 1
fi
ok "PostgreSQL is running"

# ── 2. Environment files ─────────────────────────────────────────
info "Checking environment files..."

mint_secret() {
  openssl rand -hex 32 2>/dev/null \
    || node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
}

if [ ! -f .env ]; then
  cp .env.example .env
  warn "Created .env from .env.example (API host auto-detects per platform)."
else
  ok ".env present"
fi

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  # The server refuses to boot without a real secret, so mint one now.
  sed "s/^JWT_SECRET=.*/JWT_SECRET=$(mint_secret)/" server/.env > server/.env.tmp
  mv server/.env.tmp server/.env
  chmod 600 server/.env
  ok "Created server/.env with a generated JWT_SECRET"
else
  ok "server/.env present"
fi

# A blank JWT_SECRET is the one thing that hard-fails the server at boot.
if grep -qE '^JWT_SECRET= *$' server/.env; then
  sed "s/^JWT_SECRET=.*/JWT_SECRET=$(mint_secret)/" server/.env > server/.env.tmp
  mv server/.env.tmp server/.env
  chmod 600 server/.env
  warn "server/.env had an empty JWT_SECRET – generated one."
fi

# ── 3. Dependencies ──────────────────────────────────────────────
info "Checking dependencies..."
if [ ! -d node_modules ]; then
  warn "Installing app dependencies (first run)…"
  npm install
fi
if [ ! -d server/node_modules ]; then
  warn "Installing server dependencies (first run)…"
  ( cd server && npm install )
fi
ok "Dependencies present"

# ── 4. Database + migrations ─────────────────────────────────────
if [ "$RUN_MIGRATIONS" -eq 1 ]; then
  info "Preparing PostgreSQL database '$DB_NAME'…"
  ./setup-database.sh || die "Database setup failed. Fix the errors above and re-run."
  ok "Database ready"
else
  info "Skipping migrations (--no-migrate)."
fi

# ── 5. Start the API ─────────────────────────────────────────────
info "Starting Express API…"

# Honour PORT from server/.env if it was changed.
SERVER_PORT="$(grep -E '^PORT=' server/.env 2>/dev/null | head -1 | cut -d= -f2 | tr -d '[:space:]' || true)"
SERVER_PORT="${SERVER_PORT:-$DEFAULT_PORT}"

mkdir -p "$LOG_DIR"
: > "$API_LOG"

( cd server && exec node index.js ) >>"$API_LOG" 2>&1 &
SERVER_PID=$!
info "API starting (pid $SERVER_PID, log: $API_LOG)"

# Wait for a real health check, not merely an open port.
READY=0
for _ in $(seq 1 60); do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    printf '\n'
    fail "The API exited during startup. Last log lines:"
    tail -n 25 "$API_LOG" >&2
    exit 1
  fi
  if curl -fsS --max-time 2 "http://localhost:$SERVER_PORT/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  printf '\n'
  fail "The API did not become healthy within 30s. Last log lines:"
  tail -n 25 "$API_LOG" >&2
  exit 1
fi
ok "API healthy at http://localhost:$SERVER_PORT (database connected)"

if [ "$TAIL_LOGS" -eq 1 ]; then
  info "Tailing $API_LOG…"
  tail -f "$API_LOG" &
fi

# ── 6. Expo ──────────────────────────────────────────────────────
if [ "$API_ONLY" -eq 1 ]; then
  printf '\n'
  ok "API-only mode. Running until you press Ctrl+C."
  printf '%s\n' "  API:  http://localhost:$SERVER_PORT"
  printf '%s\n' "  Log:  $API_LOG"
  wait "$SERVER_PID"
  exit 0
fi

printf '\n'
if [ -n "$EXPO_TARGET" ]; then
  info "Starting Expo (${EXPO_TARGET#--})…"
  # shellcheck disable=SC2086
  npx expo start "$EXPO_TARGET"
else
  info "Starting Expo… press ${BOLD}a${NC} for Android, ${BOLD}i${NC} for iOS, ${BOLD}w${NC} for web."
  npx expo start
fi

