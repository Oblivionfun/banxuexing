---
version: 1
slug: "app-site-page-tsx"
primary_target: "app/(site)/page.tsx"
related_targets: ["app/admin"]
---

## Scope

伴学星学习档案的全部界面：家长/老师查看端（首页、课表、科目、单节纪要、资料册）和工作人员管理端。模式：Operate（家长端兼顾 Read）。

## Audience and job

家长在手机微信里 10 秒内看懂本周课程和老师布置的任务；老师找到并下载资料；工作人员在手机上快速录入。

## Direction contract

THESIS: 学习档案就是一本被老师批改过的作业本。界面拒绝"后台仪表盘 + 满屏卡片"的类目默认，改用课程表的列节奏组织时间，用批改红笔标出老师的话。

OWN-WORLD: 蓝黑墨水色 #2340A8 铺满顶栏作为外壳；冷白纸面 #F4F6F9，内容面纯白，1px 格线 #E3E6EB；正文墨 #14161A。9 个学科色以浅底填满课表格子（OKLCH L0.95 C0.03），文字用同色相深色（L0.42 C0.08）。批改红 #D2402F 只属于老师布置的内容。MiSans 一族到底，数字用等宽数字。

STORY: 家长先看到今天和本周的课，再看到红笔圈出的"老师布置"，最后按科目翻资料和纪要。老师从科目进入资料册，一键打包下载。

FIRST VIEWPORT: 手机 390 宽：墨蓝顶栏（伴学星 + 学生称呼）；其下 7 天日期条，今天用墨蓝实心圆；当天课程以学科浅底格子列出（时间、科目、老师、状态）；下方紧接红笔区"老师最近布置"，每条带手写感红色下划线。桌面 1440：左侧为周课程表网格（周一到周日七列），右侧为红笔布置与最近纪要。

FORM: 用户在已批准的开发规划中锁定的方向（作业本与红笔），未运行 concept-seed；seed key: pinned-by-plan。签名动作：红笔批注（老师布置条目的手写感 SVG 下划线与勾）。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Constraints

- 只用标准控件：原生日期/时间/下拉选择（微信内最稳），标准按钮、Tabs、表单。
- 不用卡片堆叠、不用彩色左边框、不用 emoji、不用全大写标签和眉标。
- 动效只反馈操作（150-250ms），遵守 prefers-reduced-motion。

## Unresolved

- 学生称呼与 9 科老师名单待何亮星提供。
