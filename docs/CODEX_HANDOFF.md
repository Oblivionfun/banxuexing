# 伴学星上传：给同事的一句话

把下面这段发给同事，只改 `<令牌>`：

```text
请运行这条命令，装好后新开一个 Codex 会话：

curl -fsSL http://113.249.117.200:8000/codex-setup.sh | bash -s -- <令牌>

以后我把文件拖进对话框，说“帮我上传到数学课本”就行。
```

对方点允许即可。脚本会自动：

- 检查/安装 Node
- 下载伴学星 MCP
- 写本机配置和 Codex MCP 配置
- 验证令牌能否连上

不需要仓库、不需要 npm install、不需要 SSH 隧道、不需要手动改 TOML。

## 装好后怎么用

把文件直接拖进 Codex 对话框，然后说：

```text
帮我上传到数学课本
```

科目或资料册没说清楚时，Codex 会先列出来问你。也可以一次拖多个文件，或者说：

```text
帮我传到数学，标题用“数学课本 第三章”，重复的跳过。
```

排课：

```text
下周给数学排一节课，先给我看时间，确认了再写。
```

## 发令牌

服务器 `/opt/banxuexing/.env`：

```bash
MCP_TOKENS=小王:64位令牌,小李:另一个64位令牌
```

生成令牌：

```bash
openssl rand -hex 32
```

改完 `systemctl restart banxuexing`。内部人员也可以共用一个令牌，但操作记录里只会显示同一个名字。

## 出问题

- **命令下载失败**：确认服务器已发布 `codex-setup.sh` 和 `banxuexing-mcp.mjs`。
- **401**：令牌不对或被撤销，换一个。
- **Codex 看不到 banxuexing 工具**：重开 Codex；运行 `codex mcp get banxuexing` 检查。
- **上传时提示只能读取某些目录**：默认允许 `~/Desktop` 和 `~/Downloads`；要加目录，重跑命令并加第二个参数：

  ```bash
  curl -fsSL http://113.249.117.200:8000/codex-setup.sh | bash -s -- <令牌> "$HOME/Desktop:$HOME/Downloads:$HOME/Documents"
  ```

- **Windows**：当前脚本按 macOS 写（`/bin/zsh`、Homebrew）；Windows 需要另做一版。

## 附：OpenCode

如果对方用 OpenCode，不用跑上面的脚本，直接在 `~/.config/opencode/opencode.jsonc` 的 `servers` 下加：

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

并先按 `docs/MCP.md` 准备 `~/.config/banxuexing-mcp/env` 和单文件 MCP。
