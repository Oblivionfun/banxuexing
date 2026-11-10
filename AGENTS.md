# 伴学星 学习档案

一名学生的学习档案网站：家长和老师用查看链接看课表、纪要和资料，工作人员用管理口令录入。

**动手前先读 [docs/项目约定.md](docs/项目约定.md)**，里面有目录分层、功能与代码对照和写法约定。功能有变化，同一次提交里更新 `docs/功能说明.md`；架构或写法有变化，更新项目约定。

不可违反：

- 不做老师专属入口，也不做账号体系；家长和老师共用查看链接。
- 管理端写操作只放在 `app/admin/*-actions.ts`，按 `requireAdmin` → zod 校验 → 写库 → `logActivity` → `revalidatePath` 的顺序写。
- 改表只能用 drizzle-kit 生成新迁移；已有迁移不改不删；新列一律 `notNull` 并带默认值。
- 群消息识别、大模型整理的结果只是草稿，写入前必须经过工作人员确认。
- 颜色、字号只用 `DESIGN.md` 的 token；批改红只用于老师布置的事。重复出现的界面抽成组件，先查 `components/` 有没有现成的。
- `.env*`、`data/` 和个人信息不进 git。线上服务器是共享的，只动伴学星自己的目录和服务；发布前先备份。
- 提交前跑 `npm run typecheck && npm run lint && npm test`；改了页面或流程，再跑 `npm run build && npm run test:e2e`。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
