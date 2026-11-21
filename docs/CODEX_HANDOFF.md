# 伴学星 MCP：Codex 交接单

给同事发这段提示词，让对方的 Codex 自己配置。对方只需要会打开 Codex、粘贴、点允许。

发送前把三处占位符换掉：

- `<令牌>`：管理员单独发的 64 位令牌
- `<允许目录>`：例如 `/Users/小王/Desktop:/Users/小王/Downloads`
- 如果服务器地址变了，替换 `http://113.249.117.200:8000`

---

## 复制给 Codex 的提示词

```text
你是 Codex，请在这台 Mac 上帮我配置“伴学星”MCP。按顺序执行；遇到网络或写文件权限时请允许。

1. 检查 Node：运行 `node -v`。如果低于 v18 或没有 node，先运行 `brew install node`，再继续。
2. 下载单文件 MCP：
   mkdir -p "$HOME/.local/share/banxuexing"
   curl -fsSL http://113.249.117.200:8000/banxuexing-mcp.mjs -o "$HOME/.local/share/banxuexing/banxuexing-mcp.mjs"
   下载后确认文件大于 100KB。
3. 写本机环境文件（不要把令牌打印到对话里）：
   mkdir -p "$HOME/.config/banxuexing-mcp"
   chmod 700 "$HOME/.config/banxuexing-mcp"
   umask 077
   printf 'BXX_BASE_URL=%s\n' 'http://113.249.117.200:8000' > "$HOME/.config/banxuexing-mcp/env"
   printf 'BXX_MCP_TOKEN=%s\n' '<令牌>' >> "$HOME/.config/banxuexing-mcp/env"
   printf 'BXX_UPLOAD_ROOTS=%s\n' '<允许目录>' >> "$HOME/.config/banxuexing-mcp/env"
   chmod 600 "$HOME/.config/banxuexing-mcp/env"
4. 备份并配置 Codex：
   cp "$HOME/.codex/config.toml" "$HOME/.codex/config.toml.bak-$(date +%Y%m%d-%H%M%S)"
   codex mcp remove banxuexing 2>/dev/null || true
   往 ~/.codex/config.toml 末尾追加：

   [mcp_servers.banxuexing]
   command = "/bin/zsh"
   args = ["-lc", 'set -a; source "$HOME/.config/banxuexing-mcp/env"; set +a; exec node "$HOME/.local/share/banxuexing/banxuexing-mcp.mjs"']
   startup_timeout_sec = 30.0
   tool_timeout_sec = 300.0

5. 验证配置和网络：
   codex mcp get banxuexing
   set -a; source "$HOME/.config/banxuexing-mcp/env"; set +a
   curl -fsS -m 10 http://113.249.117.200:8000/api/mcp/context -H "Authorization: Bearer $BXX_MCP_TOKEN" > /tmp/bxx-mcp-check.json
   node -e "const d=require('/tmp/bxx-mcp-check.json'); console.log('OK', d.data.student.name, d.data.subjects.length)"
   最后删掉 /tmp/bxx-mcp-check.json。

6. 完成后告诉我：配置成功，并提醒我“新开一个 Codex 会话”再使用。不要输出令牌。
```

---

## 配置完成后怎么用

新开一个 Codex 会话，先说：

```text
用 banxuexing 的 get_context 确认能连上，然后告诉我今天有哪些课。
```

能返回学生、日期和科目，就说明配置成功。

上传示例：

```text
用 banxuexing 看一下 ~/Desktop/数学第三章 里有哪些文件，先列给我，不要上传。
```

确认文件无误后：

```text
把这些照片传到数学课本，标题用“数学课本 第三章”。重复的跳过。
```

排课示例：

```text
用 banxuexing 看下周数学有哪些可行时间，先给我看，不要写。确认后我再让你写。
```

---

## 常见问题

- **下载 404**：服务器还没发布 `banxuexing-mcp.mjs`，让管理员重新发布。
- **401**：令牌不对或被撤销，找管理员换一个。
- **Codex 看不到工具**：`codex mcp get banxuexing` 看配置；确认 `node` 可用；重开 Codex。
- **只能读取这些目录**：把目录加进 `~/.config/banxuexing-mcp/env` 的 `BXX_UPLOAD_ROOTS`，冒号分隔。
- **上传很慢/超时**：Codex 的工具超时已设为 300 秒；特别大的文件建议先压缩或分批。

---

## 附：OpenCode 配置

如果对方用 OpenCode，把 `~/.config/opencode/opencode.jsonc` 的 `servers` 下加：

```jsonc
"banxuexing": {
  "type": "local",
  "command": [
    "/bin/zsh",
    "-lc",
    "set -a; source \"$HOME/.config/banxuexing-mcp/env\"; set +a; exec node \"$HOME/.local/share/banxuexing/banxuexing-mcp.mjs\""
  ],
  "timeout": { "startup": 30000 }
}
```

旧版 OpenCode 的字段叫 `mcp`，内容相同。
