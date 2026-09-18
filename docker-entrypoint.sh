#!/bin/sh
set -eu
cd /app

echo "[folio] applying migrations…"
i=0
until node scripts/migrate.mjs; do
  i=$((i + 1))
  if [ "$i" -ge 12 ]; then
    echo "[folio] migrate failed after ${i} attempts" >&2
    exit 1
  fi
  echo "[folio] postgres not ready, retry ${i}/12…"
  sleep 2
done

echo "[folio] checking backend entrance…"
node scripts/ensure-entrance.mjs

PORT="${PORT:-8080}"
HOST="${HOST:-0.0.0.0}"
echo "[folio] listening on ${HOST}:${PORT} (version ${VITE_FOLIO_VERSION:-unknown})"

# srvx resolves --static relative to the --entry file unless --dir is set.
# Passing a cwd-relative static path without --dir 404s every /assets/* file
# and the UI renders as unstyled HTML (default blue links, no layout).
exec npx --no-install srvx serve --prod \
  --host "$HOST" \
  --port "$PORT" \
  --dir "$PWD" \
  --static "$PWD/.vercel/output/static" \
  --entry .vercel/output/functions/__server.func/index.mjs
