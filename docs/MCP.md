# 给 Codex / 本地 AI 的 MCP 接入

管理端有一套给本地 AI 工具用的受控接口。AI 可以查科目、资料册和课程，把电脑上的文件批量传到资料册，先生成排课建议、确认后再写入课表。

第一版是**本地 MCP + 公共 HTTP API**：

- MCP 进程跑在使用者电脑上，通过 `BXX_BASE_URL` 访问网站。
- 上传时 MCP 直接读本机文件，适合“把桌面这个文件夹传上去”。
- 管理端令牌按人发放，操作记录会显示 `AI（名字）`。

> 目前网站是 `http://113.249.117.200:8000`，令牌和页面一样走 HTTP。等域名和 HTTPS 就绪后，把 `BXX_BASE_URL` 换成 `https://域名` 即可；更高安全要求见文末。

## 一、给同事（Codex）

把 `docs/CODEX_HANDOFF.md` 里的提示词发给对方，连同：

- 一个专属的 `MCP_TOKENS` 令牌
- 允许 AI 读取的目录，例如 `~/Desktop:~/Downloads`

对方的 Codex 会完成下载、写配置、加 MCP、跑通验证。对方不需要会写代码。

## 二、给同事发令牌

服务器 `/opt/banxuexing/.env` 支持两种写法。

一个人一个令牌（推荐）：

```bash
MCP_TOKENS=小王:64位十六进制令牌,小李:另一个64位令牌
```

旧的单令牌写法继续可用：

```bash
MCP_TOKEN=64位十六进制令牌
MCP_TOKEN_LABEL=佳萌的Mac
```

生成令牌：

```bash
openssl rand -hex 32
```

改完 `.env` 后重启：

```bash
systemctl restart banxuexing
```

撤销某个人：从 `MCP_TOKENS` 里删掉那一段，重启。操作记录会显示对应名字。

## 三、Codex 一键配置（对方电脑）

把这一条发给同事，只替换令牌：

```bash
curl -fsSL http://113.249.117.200:8000/codex-setup.sh | bash -s -- <令牌>
```

Windows 同事用 PowerShell：

```powershell
irm http://113.249.117.200:8000/codex-setup.ps1 | iex
```

脚本会自动下载单文件 MCP、写 `~/.config/banxuexing-mcp/env`（Windows 写进 Codex 的 `env` 表）、把 `banxuexing` 加到 `~/.codex/config.toml`、追加一条“拖文件就上传”的全局说明，并验证连接。

要求 Node 18+；没有的话脚本会先 `brew install node`（macOS）或 `winget`（Windows）。更短的中文交接单见 `docs/CODEX_HANDOFF.md`。

OpenCode 的配置见 `docs/CODEX_HANDOFF.md` 末尾，字段名是 `servers`（旧版是 `mcp`）。

## 四、工具

| 工具 | 作用 | 会写库 |
| --- | --- | --- |
| `get_context` | 学生、今天、科目、类别、上传限制、允许目录 | 否 |
| `list_subjects` | 科目 ID、老师、每周节数 | 否 |
| `list_material_sets` | 已有资料册和文件数 | 否 |
| `list_lessons` | 按日期/科目查课 | 否 |
| `get_lesson` | 一节课的纪要、作业、附件 | 否 |
| `propose_schedule` | 算出某周可行时间、冲突和排不进去的原因 | 否 |
| `scan_folder` | 列出允许目录里的文件 | 否 |
| `ensure_material_set` | 找到或新建资料册 | 是 |
| `upload_files` | 逐个上传本地文件 | 是 |
| `create_lessons` | 确认后写入课表 | 是 |

## 五、常用说法

- “把桌面上‘数学第三章’文件夹里的照片传到数学课本，标题用‘数学课本 第三章’。”
- “看看下载目录里有哪些 PDF，先列出来，别传。”
- “下周三晚上给数学排一节课，先给我看时间，确认了再写。”
- “这周还有哪些课没写纪要？”

AI 会先调 `get_context` 和列表工具；上传前用 `scan_folder`；排课必须把 `propose_schedule` 的结果给工作人员看，确认后才调用 `create_lessons`。

## 六、安全边界

- 令牌只放在服务器 `.env` 和本机环境文件，不进 git。
- 一人一个令牌，操作记录能区分是谁的 AI；离职/换电脑就删掉对应令牌。
- `upload_files` 只能读 `BXX_UPLOAD_ROOTS` 里的路径。
- 单文件上限 100 MB，类型按文件内容判断；重复文件按 sha256 跳过。
- 不提供删除、彻底删除、企业微信推送。
- 排课有冲突时默认拒绝；必须工作人员明确同意才传 `allowOverlap: true`。
- 课程纪要、群消息整理仍然走现有确认页，不由 MCP 自动写入。
- 网站目前是 HTTP。令牌等同于管理权限，别发到公开群；更严格的做法是走 SSH 隧道或等 HTTPS。

### 更高安全（可选）

如果只想让本机访问，可在服务器 nginx 给 `/api/mcp` 加 `allow 127.0.0.1; deny all;`，然后本机开隧道：

```bash
ssh -N -L 3310:127.0.0.1:3310 root@113.249.117.200
```

并把 `BXX_BASE_URL` 改成 `http://127.0.0.1:3310`。这条不是第一版默认路径，因为同事每次都要先开隧道。

## 七、排错

| 现象 | 处理 |
| --- | --- |
| 返回 503 | 服务器没有配置令牌，或改完没重启 |
| 返回 401 | 本机 `BXX_MCP_TOKEN` 和服务器不一致，或令牌已被撤销 |
| 返回 429 | 触发限流，等一分钟 |
| “只能读取这些目录里的文件” | 把目录加进 `BXX_UPLOAD_ROOTS`，或换到允许目录 |
| Codex 里看不到工具 | `codex mcp get banxuexing` 看配置；确认 `node` 可用；重开 Codex |
| `propose_schedule` 没有可用时间 | 先在管理端“排课助手”填学生/老师的可上课时间 |
| 上传大文件失败 | 检查服务器磁盘空间和 nginx 的 120 MB 限制 |
