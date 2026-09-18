#!/bin/sh
# 读取 GitHub 最新 Release，把 FOLIO_VERSION 写进 .env，拉取镜像并重启。
#
#   ./scripts/update-from-release.sh
#   ./scripts/update-from-release.sh --check
#   FOLIO_GITHUB_REPO=xxww0098/folio ./scripts/update-from-release.sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"

REPO="${FOLIO_GITHUB_REPO:-xxww0098/folio}"
COMPOSE="${COMPOSE:-docker compose}"
CHECK_ONLY=0
if [ "${1:-}" = "--check" ] || [ "${1:-}" = "-n" ]; then
  CHECK_ONLY=1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "need curl" >&2
  exit 1
fi

TAG=$(curl -fsSL -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/releases/latest" \
  | sed -n 's/.*"tag_name":[[:space:]]*"\([^"]*\)".*/\1/p' \
  | head -n 1)

if [ -z "$TAG" ]; then
  echo "no GitHub Release found for ${REPO}" >&2
  echo "first install: docker compose up -d --build" >&2
  exit 1
fi

ENV_FILE="$ROOT/.env"
CURRENT=""
if [ -f "$ENV_FILE" ]; then
  CURRENT=$(sed -n 's/^FOLIO_VERSION=//p' "$ENV_FILE" | head -n 1)
fi

echo "repo     ${REPO}"
echo "current  ${CURRENT:-unset}"
echo "latest   ${TAG}"
echo "image    ghcr.io/${REPO}:${TAG}"

if [ "$CHECK_ONLY" -eq 1 ]; then
  if [ "$CURRENT" = "$TAG" ]; then
    echo "already on latest Release"
    exit 0
  fi
  echo "update available: ${CURRENT:-unset} -> ${TAG}"
  exit 0
fi

if [ ! -f "$ENV_FILE" ]; then
  if [ -f "$ROOT/.env.example" ]; then
    cp "$ROOT/.env.example" "$ENV_FILE"
  else
    touch "$ENV_FILE"
  fi
fi

if grep -q '^FOLIO_VERSION=' "$ENV_FILE"; then
  TMP=$(mktemp)
  sed "s/^FOLIO_VERSION=.*/FOLIO_VERSION=${TAG}/" "$ENV_FILE" > "$TMP"
  mv "$TMP" "$ENV_FILE"
else
  printf '\nFOLIO_VERSION=%s\n' "$TAG" >> "$ENV_FILE"
fi

export FOLIO_VERSION="$TAG"
$COMPOSE pull folio
$COMPOSE up -d
echo "updated to ${TAG}"
