# 伴学星学习档案

一名学生的学习档案网站。家长和老师在微信里点开查看链接，就能看到课表、每节课的纪要和老师布置的事，也能下载各科资料；工作人员在 `/admin` 用管理口令上传资料、录入纪要、排课。

技术栈：Next.js 16（App Router）、React 19、SQLite（Drizzle ORM）、Tailwind CSS v4。

## 本地开发

```bash
npm install
cp .env.example .env.local   # 填 SHARE_TOKEN、ADMIN_PASSCODE、SESSION_SECRET
npm run dev                   # http://localhost:3000
```

- 家长端：打开 `/s/<SHARE_TOKEN>`，之后直接访问首页即可。
- 管理端：打开 `/admin`，输入管理口令。
- 数据库和上传文件在 `data/`，首次启动时自动建表。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run typecheck` / `npm run lint` / `npm test` | 类型检查、代码检查、单元测试 |
| `npm run build && npm run test:e2e` | 生产构建，并在独立目录里跑端到端测试 |
| `npm run db:generate -- --name 描述` | 改了 `lib/db/schema.ts` 后生成迁移 |
| `scripts/deploy-server.sh root@服务器IP` | 发布到线上服务器 |

## 文档

- [docs/项目约定.md](docs/项目约定.md)：目录分层、功能与代码对照、写法约定（改代码前先读）
- [docs/功能说明.md](docs/功能说明.md)：各页面能做什么
- [docs/部署说明.md](docs/部署说明.md)：线上环境、发布、备份与恢复
- [PRODUCT.md](PRODUCT.md)、[DESIGN.md](DESIGN.md)：产品定位与设计系统
