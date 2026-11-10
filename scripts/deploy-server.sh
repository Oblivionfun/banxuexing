#!/usr/bin/env bash
# 部署到已有 nginx 的 Linux 服务器（不用 Docker）：独立 Node 24 + systemd + nginx 新端口反向代理。
# 用法：scripts/deploy-server.sh root@服务器IP [对外端口，默认 8000]
# 服务器上的 /opt/banxuexing/.env 和 /opt/banxuexing/data 不会被覆盖。
set -euo pipefail
cd "$(dirname "$0")/.."

host="${1:-}"
public_port="${2:-8000}"
app_port=3310
node_version=v24.19.0
base=/opt/banxuexing

if [[ -z "$host" ]]; then
  echo "用法：scripts/deploy-server.sh user@host [对外端口]" >&2
  exit 1
fi

echo "==> 同步代码"
ssh "$host" "mkdir -p $base/src"
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude data --exclude '.env*' --exclude .vercel \
  --exclude .git --exclude .impeccable --exclude test-results --exclude playwright-report \
  ./ "${host}:${base}/src/"

public_ip="${host#*@}"

ssh "$host" bash -s -- "$base" "$node_version" "$app_port" "$public_port" "$public_ip" <<'REMOTE'
set -euo pipefail
base="$1"; node_version="$2"; app_port="$3"; public_port="$4"; public_ip="$5"
export npm_config_registry=https://registry.npmmirror.com

echo "==> 准备 Node ${node_version}（与系统自带的 Node 隔离）"
if [[ ! -x "$base/node/bin/node" ]] || [[ "$("$base/node/bin/node" -v)" != "$node_version" ]]; then
  tmp=$(mktemp -d)
  curl -fsSL "https://registry.npmmirror.com/-/binary/node/${node_version}/node-${node_version}-linux-x64.tar.xz" -o "$tmp/node.tar.xz"
  rm -rf "$base/node" && mkdir -p "$base/node"
  tar -xJf "$tmp/node.tar.xz" -C "$base/node" --strip-components=1
  rm -rf "$tmp"
fi
export PATH="$base/node/bin:$PATH"

if ! id banxuexing >/dev/null 2>&1; then
  useradd --system --home "$base" --shell /usr/sbin/nologin banxuexing
fi
mkdir -p "$base/data"
chown -R banxuexing:banxuexing "$base/data"

if [[ ! -f "$base/.env" ]]; then
  echo "==> 生成 .env（只在第一次部署时生成）"
  cat > "$base/.env" <<ENV
SITE_URL=http://${public_ip}:${public_port}
SHARE_TOKEN=$(node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))")
ADMIN_PASSCODE=bxx$(node -e "console.log(require('crypto').randomInt(100000,999999))")
SESSION_SECRET=$(openssl rand -hex 32)
DATA_DIR=$base/data
ENV
  chmod 600 "$base/.env"
fi

echo "==> 安装依赖并构建"
cd "$base/src"
npm ci --no-audit --no-fund --loglevel=error
NEXT_TELEMETRY_DISABLED=1 npx next build

echo "==> 切换到新版本"
release="$base/releases/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$release"
cp -a .next/standalone/. "$release/"
cp -a .next/static "$release/.next/static"
cp -a public "$release/public"
cp -a drizzle "$release/drizzle"
mkdir -p "$release/scripts" && cp scripts/backup.mjs "$release/scripts/"
ln -sfn "$release" "$base/current"

# 构建产物已复制，清掉依赖和缓存，磁盘紧张
rm -rf "$base/src/node_modules" "$base/src/.next"
npm cache clean --force >/dev/null 2>&1 || true
ls -1dt "$base"/releases/* | tail -n +3 | xargs -r rm -rf

cat > /etc/systemd/system/banxuexing.service <<UNIT
[Unit]
Description=伴学星学习档案
After=network.target

[Service]
User=banxuexing
Group=banxuexing
WorkingDirectory=$base/current
EnvironmentFile=$base/.env
Environment=NODE_ENV=production PORT=$app_port HOSTNAME=127.0.0.1 TZ=Asia/Shanghai NEXT_TELEMETRY_DISABLED=1
ExecStart=$base/node/bin/node server.js
Restart=always
RestartSec=3
MemoryMax=1G

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/nginx/sites-available/banxuexing <<NGINX
server {
    listen $public_port;
    listen [::]:$public_port;
    server_name _;

    client_max_body_size 120m;
    # 上传直接流给应用，不在 nginx 临时目录里落盘
    proxy_request_buffering off;

    location / {
        proxy_pass http://127.0.0.1:$app_port;
        proxy_http_version 1.1;
        # 必须带端口：Server Actions 会核对 Origin 与转发的 Host，不一致就拒绝（登录、保存都会失败）
        proxy_set_header Host \$http_host;
        proxy_set_header X-Forwarded-Host \$http_host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
NGINX
ln -sfn /etc/nginx/sites-available/banxuexing /etc/nginx/sites-enabled/banxuexing
nginx -t
systemctl daemon-reload
systemctl enable banxuexing >/dev/null 2>&1
systemctl restart banxuexing
systemctl reload nginx

cat > /etc/cron.d/banxuexing-backup <<CRON
0 3 * * * banxuexing cd $base/current && DATA_DIR=$base/data BACKUP_KEEP_DAYS=7 $base/node/bin/node scripts/backup.mjs >> $base/data/backup.log 2>&1
CRON

for _ in $(seq 1 30); do
  if curl -fsS -m 3 "http://127.0.0.1:$public_port/api/health" >/dev/null; then
    echo "==> 上线完成：$(grep SITE_URL "$base/.env" | cut -d= -f2)"
    df -h / | tail -1
    exit 0
  fi
  sleep 1
done
echo "服务没有在 30 秒内启动，请看 journalctl -u banxuexing -n 50" >&2
exit 1
REMOTE
