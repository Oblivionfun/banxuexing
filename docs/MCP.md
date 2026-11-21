# 本地 AI（MCP）接入

管理端有一套给本地 AI 工具用的受控接口。AI 可以查科目、资料册和课程，把电脑上的文件批量传到资料册，先生成排课建议、确认后再写入课表。

它不是公网开放接口：MCP server 跑在工作人员电脑上，通过令牌访问网站的 `/api/mcp`；第一版用 SSH 隧道，避免令牌走明文 HTTP。

## 一、服务器准备

1. 生成令牌：

   ```bash
   openssl rand -hex 32
   ```

2. 在服务器 `/opt/banxuexing/.env` 里加两行：

   ```bash
   MCP_TOKEN=上一步生成的令牌
   MCP_TOKEN_LABEL=佳萌的电脑
   ```

3. 重启服务：

   ```bash
   systemctl restart banxuexing
   ```

4. 确认已启用：

   ```bash
   curl -s http://127.0.0.1:3310/api/mcp/context \
     -H "Authorization: Bearer 上一步生成的令牌"
   ```

   返回 `{"ok":true,...}` 即正常；没配令牌时返回 503。

## 二、本机连接（SSH 隧道）

网站目前是 `http://IP:8000`，不要把令牌直接发到公网。先在本机开一条隧道：

```bash
ssh -N -L 3310:127.0.0.1:3310 root@113.249.117.200
```

保持这个终端开着。MCP 配置里的地址用 `http://127.0.0.1:3310`。

以后有了 HTTPS，只需把 `BXX_BASE_URL` 改成 `https://域名`，其他不变。

## 三、本机环境变量

不要把令牌写进仓库。建议放在 `~/.config/banxuexing-mcp/env`，权限设为 600：

```bash
mkdir -p ~/.config/banxuexing-mcp
chmod 700 ~/.config/banxuexing-mcp
```

```bash
# ~/.config/banxuexing-mcp/env
BXX_BASE_URL=http://127.0.0.1:3310
BXX_MCP_TOKEN=服务器 .env 里的 MCP_TOKEN
BXX_UPLOAD_ROOTS=/Users/xingyu/Desktop:/Users/xingyu/Downloads
```

`BXX_UPLOAD_ROOTS` 是 AI 允许读取的目录，用冒号分隔；不配置时只能查询，不能上传。

## 四、OpenCode 配置

`opencode.jsonc`（旧版字段叫 `mcp`，内容相同）：

```jsonc
{
  "servers": {
    "banxuexing": {
      "type": "local",
      "command": [
        "/bin/zsh",
        "-lc",
        "set -a; source \"$HOME/.config/banxuexing-mcp/env\"; set +a; exec /Users/xingyu/personal/伴学星/node_modules/.bin/tsx /Users/xingyu/personal/伴学星/mcp/index.ts"
      ],
      "timeout": { "startup": 30000 }
    }
  }
}
```

路径按实际仓库位置调整。改完重开 OpenCode，在 MCP 列表里应能看到 `banxuexing` 的 10 个工具。

## 五、Claude Desktop 配置

```json
{
  "mcpServers": {
    "banxuexing": {
      "command": "/bin/zsh",
      "args": [
        "-lc",
        "set -a; source \"$HOME/.config/banxuexing-mcp/env\"; set +a; exec /Users/xingyu/personal/伴学星/node_modules/.bin/tsx /Users/xingyu/personal/伴学星/mcp/index.ts"
      ]
    }
  }
}
```

## 六、工具

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

## 七、常用说法

- “把桌面上‘数学第三章’文件夹里的照片传到数学课本，标题用‘数学课本 第三章’。”
- “看看我下载目录里有哪些 PDF，先列出来，别传。”
- “下周三晚上给数学排一节课，先给我看时间，确认了再写。”
- “这周还有哪些课没写纪要？”

AI 会先调 `get_context` 和列表工具；上传前用 `scan_folder`；排课必须把 `propose_schedule` 的结果给工作人员看，确认后才调用 `create_lessons`。

## 八、安全边界

- 令牌只放在服务器 `.env` 和本机环境文件，不进 git。
- nginx 已把 `/api/mcp` 限制为服务器本机访问，外部直接请求返回 403；第一版走 SSH 隧道，不要把 `BXX_BASE_URL` 指向公网 HTTP。
- `upload_files` 只能读 `BXX_UPLOAD_ROOTS` 里的路径。
- 单文件上限 100 MB，类型按文件内容判断；重复文件按 sha256 跳过。
- 不提供删除、彻底删除、企业微信推送。
- AI 建课和上传都会写入操作记录，`actor` 显示为 `AI（标签）`。
- 排课有冲突时默认拒绝；必须工作人员明确同意才传 `allowOverlap: true`。
- 课程纪要、群消息整理仍然走现有确认页，不由 MCP 自动写入。

## 九、排错

| 现象 | 处理 |
| --- | --- |
| 返回 503 | 服务器没有配置 `MCP_TOKEN`，或改完没重启 |
| 返回 401 | 本机 `BXX_MCP_TOKEN` 和服务器不一致 |
| 返回 429 | 触发限流，等一分钟 |
| “只能读取这些目录里的文件” | 把目录加进 `BXX_UPLOAD_ROOTS`，或换到允许目录 |
| OpenCode 里看不到工具 | 检查命令路径、`node_modules/.bin/tsx` 是否存在，重开 OpenCode |
| `propose_schedule` 没有可用时间 | 先在管理端“排课助手”填学生/老师的可上课时间 |
| 上传大文件失败 | 检查隧道和 nginx 的 120 MB 限制，以及服务器磁盘空间 |
