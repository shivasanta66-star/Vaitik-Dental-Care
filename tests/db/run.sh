#!/usr/bin/env bash
# Runs the migrations, seed and SQL checks against a throwaway local Postgres 16.
# Usage: tests/db/run.sh   (needs initdb/pg_ctl/psql on PATH or in /usr/lib/postgresql/16/bin)
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
export PATH="$PGBIN:$PATH"
DIR=$(mktemp -d)
PORT=${PGPORT_TEST:-54329}
if [ "$(id -u)" = 0 ]; then RUN="runuser -u postgres --"; else RUN=""; fi
trap '$RUN pg_ctl -D "$DIR/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
[ -n "$RUN" ] && chown -R postgres "$DIR"
$RUN initdb -D "$DIR/data" -U postgres -A trust >/dev/null
$RUN pg_ctl -D "$DIR/data" -o "-p $PORT -k $DIR -c timezone=UTC" -l "$DIR/log" start -w >/dev/null
PSQL="psql -h $DIR -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q"
$PSQL -f tests/db/supabase_stub.sql
for f in supabase/migrations/*.sql; do $PSQL -f "$f"; done
$PSQL -f supabase/seed.sql
$PSQL -f supabase/seed.sql   # seed must be re-runnable
$PSQL -f tests/db/checks.sql
echo "All database checks passed."
