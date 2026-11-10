#!/usr/bin/env bash
# 端到端测试用：以生产模式启动 standalone 构建，每次使用全新的数据目录。需要先 next build。
# 构建产物复制到项目目录之外再启动：否则 Node 会向上找到项目根目录的 node_modules，
# 掩盖 standalone 漏打依赖的问题（线上没有这层 node_modules）。
set -euo pipefail
cd "$(dirname "$0")/.."
project="$(pwd)"

runtime="${TMPDIR:-/tmp}/bxx-e2e-standalone"
rm -rf "$runtime"
mkdir -p "$runtime"
cp -a .next/standalone/. "$runtime/"
cp -a .next/static "$runtime/.next/static"
cp -a public "$runtime/public"

rm -rf test-results/e2e-data
mkdir -p test-results/e2e-data

cd "$runtime"
export NODE_ENV=production
export PORT=3300
export HOSTNAME=127.0.0.1
export DATA_DIR="$project/test-results/e2e-data"
export SITE_URL=http://127.0.0.1:3300
export SHARE_TOKEN=e2eShareToken_0123456789
export ADMIN_PASSCODE=e2e-pass-123
export SESSION_SECRET=e2e-session-secret-0123456789abcdef0123456789
exec node server.js
