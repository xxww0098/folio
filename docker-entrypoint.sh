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

echo "[folio] initializing host…"
node scripts/ensure-init.mjs

PORT="${PORT:-8080}"
HOST="${HOST:-0.0.0.0}"
echo "[folio] listening on ${HOST}:${PORT} (version ${VITE_FOLIO_VERSION:-unknown})"

# srvx's Node adapter assigns request.waitUntil. Invoke it with real node,
# never bun's node shim (v0.1.7). --dir is required so --static is not
# resolved relative to the --entry file (otherwise /assets/* 404s).
exec node ./node_modules/srvx/bin/srvx.mjs serve --prod \
  --host "$HOST" \
  --port "$PORT" \
  --dir "$PWD" \
  --static "$PWD/.vercel/output/static" \
  --entry .vercel/output/functions/__server.func/index.mjs
