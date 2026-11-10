#!/usr/bin/env bash
# 从备份恢复数据库，并从对象存储补回缺失的上传文件。
# 用法：scripts/restore.sh data/backups/app-2026-11-10-03-00.db
set -euo pipefail
cd "$(dirname "$0")/.."

backup="${1:-}"
if [[ -z "$backup" || ! -f "$backup" ]]; then
  echo "用法：scripts/restore.sh <备份文件路径>" >&2
  ls -1t data/backups/*.db 2>/dev/null | head -5 | sed 's/^/  可用：/' >&2 || true
  exit 1
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "停止应用…"
docker compose stop app

if [[ -f data/db/app.db ]]; then
  keep="data/db/app.db.before-restore-$(date +%Y%m%d-%H%M%S)"
  cp data/db/app.db "$keep"
  echo "当前数据库已另存为 $keep"
fi
rm -f data/db/app.db-wal data/db/app.db-shm
cp "$backup" data/db/app.db

if [[ -n "${BACKUP_REMOTE:-}" ]] && command -v rclone >/dev/null; then
  echo "从 ${BACKUP_REMOTE} 补回上传文件…"
  rclone copy "${BACKUP_REMOTE}/uploads" data/uploads --ignore-existing
fi

chown -R 1001:1001 data 2>/dev/null || sudo chown -R 1001:1001 data

echo "启动应用…"
docker compose start app
for _ in $(seq 1 20); do
  if docker compose exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "恢复完成，服务正常"
    exit 0
  fi
  sleep 2
done
echo "服务没有在 40 秒内恢复，请检查 docker compose logs app" >&2
exit 1
