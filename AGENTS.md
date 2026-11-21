# 伴学星 学习档案

一名学生的学习档案网站：家长和老师用查看链接看课表、纪要和资料，工作人员用管理口令录入。技术栈 Next.js 16 App Router、React 19、SQLite/Drizzle、Tailwind v4，自托管。

**动手前先读 [docs/项目约定.md](docs/项目约定.md)**，里面有目录分层、功能与代码对照和写法约定。功能有变化，同一次提交里更新 `docs/功能说明.md`；架构或写法有变化，更新项目约定。

## 本地起步

```bash
npm install
npm run dev        # http://localhost:3000，首次启动自动建表并补种子数据
```

- 开发模式可以不建 `.env.local`：默认 `SHARE_TOKEN=devShareToken0123456789`、`ADMIN_PASSCODE=123456`（见 `lib/env.ts`）。生产模式缺 `SHARE_TOKEN` / `ADMIN_PASSCODE` / `SESSION_SECRET` 会直接启动失败。
- 数据库在 `data/db/app.db`，上传文件也在 `data/` 下；`data/` 已进 `.gitignore`。

## 命令

- 提交前：`npm run typecheck && npm run lint && npm test`；改了页面或流程再加 `npm run build && npm run test:e2e`。
- 单个单元测试：`npm test -- tests/time.test.ts`。Vitest 只收集 `tests/**/*.test.ts`，并把 `server-only` 换成空模块（`vitest.config.mts`）。
- 端到端：**必须先 `npm run build`**，`test:e2e` 不会自动构建。它把 `.next/standalone` 复制到仓库外启动（3300 端口、全新的 `test-results/e2e-data`，不动开发数据），本机需要装 Chrome（`channel: "chrome"`），用例串行。单个用例：`npx playwright test e2e/smoke.spec.ts -g "关键词"`。
- 改表：改 `lib/db/schema.ts` → `npm run db:generate -- --name 描述` → 提交 `drizzle/*.sql` 和 `drizzle/meta`。已有迁移不改不删，新列一律 `notNull().default(...)`。不用手动 migrate：`getDb()` 启动时自动执行迁移（`lib/db/index.ts`）。
- 发布：先备份线上数据库，再 `scripts/deploy-server.sh root@服务器IP`，细节见 `docs/部署说明.md`。

## 不可违反

- 不做老师专属入口，也不做账号体系；家长和老师共用查看链接。
- 管理端写操作只放在 `app/admin/*-actions.ts`，按 `requireAdmin` → zod 校验 → 写库 → `logActivity` → `revalidatePath` 的顺序写。新领域新建 `xxx-actions.ts`，不要再往 `actions.ts` 里堆。
- 读走 `lib/queries.ts`，页面里不写 SQL；`"use server"` 文件只导出 async 函数，共享同步工具放 `lib/`。
- `lib/` 里的纯逻辑（`time`、`lesson`、`group-message`、`summary-parser` 等）不碰数据库，新增或修改时必须配单元测试。
- 群消息识别、大模型整理的结果只是草稿，写入前必须经过工作人员确认。
- 颜色、字号只用 `DESIGN.md` 的 token，不写十六进制颜色；批改红只用于老师布置的事。重复出现的界面先查 `components/` 有没有现成的。
- `.env*`、`data/` 和个人信息不进 git；`DEMO_MODE` 生成的演示数据必须标明"示例"。
- 线上服务器是共享的，只动 `/opt/banxuexing`、nginx 的 `banxuexing` 站点、systemd 的 `banxuexing` 服务和 `/etc/cron.d/banxuexing-backup`。

## Next.js 16

- 不要新建 `middleware.ts`：本版本用 `proxy.ts`。`/api/upload` 被刻意排除在 matcher 外，否则请求体会在 10MB 处被截断，上传接口自己校验口令。
- 页面全部动态渲染，没有开 `cacheComponents`；不要自己加缓存层。route handler 里的跳转用 `lib/http.ts` 的 `relativeRedirect`（经过 nginx 后 `request.url` 是内网地址）。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
