#!/usr/bin/env bash
# 把代码同步到服务器并重新构建启动。服务器上的 .env 和 data/ 不会被覆盖。
# 用法：scripts/deploy.sh root@服务器IP [/opt/banxuexing]
set -euo pipefail
cd "$(dirname "$0")/.."

host="${1:-}"
dir="${2:-/opt/banxuexing}"
if [[ -z "$host" ]]; then
  echo "用法：scripts/deploy.sh user@host [部署目录]" >&2
  exit 1
fi

rsync -az --delete \
  --exclude node_modules --exclude .next --exclude data --exclude .env \
  --exclude .git --exclude .impeccable --exclude test-results --exclude playwright-report \
  ./ "${host}:${dir}/"

ssh "$host" bash -s -- "$dir" <<'REMOTE'
set -euo pipefail
cd "$1"
if [[ ! -f .env ]]; then
  echo "服务器上还没有 .env：请先 cp .env.example .env 并填写（见 部署说明.md）" >&2
  exit 1
fi
mkdir -p data
chown -R 1001:1001 data 2>/dev/null || sudo chown -R 1001:1001 data
docker compose up -d --build
docker compose ps
REMOTE
