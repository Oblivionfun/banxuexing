#!/usr/bin/env bash
# 伴学星 Codex 一键配置：下载单文件 MCP、写本机配置、验证连接。
# 用法：curl -fsSL http://113.249.117.200:8000/codex-setup.sh | bash -s -- <令牌> [允许目录]
set -euo pipefail

BASE_URL="${BXX_BASE_URL:-http://113.249.117.200:8000}"
TOKEN="${1:-}"
ROOTS="${2:-$HOME/Desktop:$HOME/Downloads}"

if [ -z "$TOKEN" ] || [ "${#TOKEN}" -lt 32 ]; then
  echo "用法：curl -fsSL $BASE_URL/codex-setup.sh | bash -s -- <令牌> [允许目录]"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "没有 Node，先用 Homebrew 安装…"
    brew install node
  else
    echo "需要 Node 18+，请先安装 https://nodejs.org 或 brew install node"
    exit 1
  fi
fi
node -e 'if (Number(process.versions.node.split(".")[0]) < 18) { console.error("需要 Node 18+"); process.exit(1) }'

if ! command -v codex >/dev/null 2>&1; then
  echo "没有找到 codex 命令，请先安装 Codex"
  exit 1
fi

echo "下载伴学星 MCP…"
BUNDLE="$HOME/.local/share/banxuexing/banxuexing-mcp.mjs"
ENV_FILE="$HOME/.config/banxuexing-mcp/env"
CONFIG="$HOME/.codex/config.toml"
mkdir -p "$(dirname "$BUNDLE")" "$(dirname "$ENV_FILE")" "$HOME/.codex"
curl -fsSL "$BASE_URL/banxuexing-mcp.mjs" -o "$BUNDLE"
if [ "$(wc -c < "$BUNDLE" | tr -d ' ')" -lt 100000 ]; then
  echo "下载的 MCP 文件不完整，请稍后重试"
  exit 1
fi

umask 077
{
  printf 'BXX_BASE_URL=%s\n' "$BASE_URL"
  printf 'BXX_MCP_TOKEN=%s\n' "$TOKEN"
  printf 'BXX_UPLOAD_ROOTS="%s"\n' "$ROOTS"
} > "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "写入 Codex 配置…"
if [ -f "$CONFIG" ]; then
  cp "$CONFIG" "$CONFIG.bak-$(date +%Y%m%d-%H%M%S)"
fi
node - "$CONFIG" <<'NODE'
const fs = require("fs");
const file = process.argv[2];
const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const out = [];
let skip = false;
for (const line of text.split(/\r?\n/)) {
  if (/^\[mcp_servers\.banxuexing(?:\.[^\]]+)?\]\s*$/.test(line)) {
    skip = true;
    continue;
  }
  if (skip && /^\[/.test(line)) skip = false;
  if (!skip) out.push(line);
}
fs.writeFileSync(file, out.join("\n").replace(/\n*$/, "\n"));
NODE
cat >> "$CONFIG" <<'EOF'

[mcp_servers.banxuexing]
command = "/bin/zsh"
args = ["-lc", 'set -a; source "$HOME/.config/banxuexing-mcp/env"; set +a; exec node "$HOME/.local/share/banxuexing/banxuexing-mcp.mjs"']
startup_timeout_sec = 30.0
tool_timeout_sec = 300.0
EOF

# 让 Codex 在用户拖入文件时知道该调用哪些工具，不影响其他项目。
AGENTS="$HOME/.codex/AGENTS.md"
touch "$AGENTS"
if ! grep -q "BEGIN banxuexing" "$AGENTS"; then
  cat >> "$AGENTS" <<'EOF'

<!-- BEGIN banxuexing -->
当用户拖入文件或给出本地路径并要求上传时，使用 banxuexing MCP：先用 scan_folder 确认文件，再用 upload_files。科目或资料册不明确时，先调用 list_subjects / list_material_sets 询问，不要猜。上传前复述目标；不要删除任何内容。
<!-- END banxuexing -->
EOF
fi

echo "验证连接…"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
if ! curl -fsS -m 10 "$BASE_URL/api/mcp/context" -H "Authorization: Bearer $BXX_MCP_TOKEN" >/dev/null; then
  echo "配置已写入，但连接失败。请检查网络或令牌，然后重试。"
  exit 1
fi

echo
echo "配置完成。新开一个 Codex 会话，把文件拖进去说："
echo "  帮我上传到数学课本"
echo "（科目或资料册没说清楚时，Codex 会先问你。）"
