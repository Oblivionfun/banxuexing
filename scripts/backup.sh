#!/usr/bin/env bash
# 每日备份：数据库在线备份 + 上传文件和备份同步到对象存储（腾讯云 COS 等 rclone 支持的存储）。
# crontab 示例：0 3 * * * /opt/banxuexing/scripts/backup.sh >> /var/log/banxuexing-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo "[$(date '+%F %T')] 开始备份"
docker compose exec -T app node scripts/backup.mjs

if [[ -z "${BACKUP_REMOTE:-}" ]]; then
  echo "未配置 BACKUP_REMOTE，跳过异地同步（只保留了本机备份）"
  exit 0
fi
if ! command -v rclone >/dev/null; then
  echo "没有安装 rclone，无法异地同步" >&2
  exit 1
fi

# 上传文件按内容哈希命名、不会被覆盖，用 copy 而不是 sync：本机磁盘出问题时不会连带删掉远端
rclone copy data/uploads "${BACKUP_REMOTE}/uploads" --transfers 4 --checkers 8
rclone copy data/backups "${BACKUP_REMOTE}/backups"
rclone delete "${BACKUP_REMOTE}/backups" --min-age "${BACKUP_REMOTE_KEEP:-60d}" || true

echo "[$(date '+%F %T')] 备份完成"
