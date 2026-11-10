#!/usr/bin/env bash
# 端到端测试用：以生产模式启动 standalone 构建，每次使用全新的数据目录。需要先 next build。
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf test-results/e2e-data
mkdir -p test-results/e2e-data
rsync -a --delete .next/static/ .next/standalone/.next/static/
rsync -a --delete public/ .next/standalone/public/

cd .next/standalone
export NODE_ENV=production
export PORT=3300
export HOSTNAME=127.0.0.1
export DATA_DIR="$(cd ../../test-results/e2e-data && pwd)"
export SITE_URL=http://127.0.0.1:3300
export SHARE_TOKEN=e2eShareToken_0123456789
export ADMIN_PASSCODE=e2e-pass-123
export SESSION_SECRET=e2e-session-secret-0123456789abcdef0123456789
exec node server.js
