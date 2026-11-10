---
name: 伴学星
description: 作业本与红笔视觉世界——课表列节奏 + 批改红笔标出老师的话
colors:
  paper: "#f4f6f9"
  surface: "#ffffff"
  rule: "#e3e6eb"
  rule-strong: "#cfd4dc"
  ink: "#14161a"
  ink-2: "#4a505a"
  ink-3: "#6b7280"
  brand: "#2340a8"
  brand-hover: "#1b3289"
  brand-tint: "#e8edfa"
  mark: "#d2402f"
  mark-tint: "#fcefed"
  notebook-line: "#dfe5f1"
  paper-grid: "#e9edf4"
  success: "#1f7a4d"
  success-tint: "#e8f4ee"
  warning: "#9a5b06"
  warning-tint: "#fbf1e1"
  danger: "#b42318"
  danger-tint: "#fdeceb"
  secondary: "#eef1f5"
typography:
  display:
    fontFamily: "\"MiSans VF\", \"PingFang SC\", \"HarmonyOS Sans SC\", system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 4vw, 2.0625rem)"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "\"MiSans VF\", \"PingFang SC\", \"HarmonyOS Sans SC\", system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "\"MiSans VF\", \"PingFang SC\", \"HarmonyOS Sans SC\", system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "\"MiSans VF\", \"PingFang SC\", \"HarmonyOS Sans SC\", system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: "0.01em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  touch: "44px"
  field-min-height: "2.75rem"
  container-x: "1rem"
  container-x-sm: "1.5rem"
components:
  button-default:
    backgroundColor: "{colors.brand}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    height: "{spacing.touch}"
    padding: "0 1rem"
  button-default-hover:
    backgroundColor: "{colors.brand-hover}"
    textColor: "#ffffff"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "{spacing.touch}"
    padding: "0 1rem"
  button-mark:
    backgroundColor: "{colors.mark-tint}"
    textColor: "{colors.mark}"
    rounded: "{rounded.lg}"
    height: "{spacing.touch}"
  field-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "{spacing.field-min-height}"
    padding: "0.5rem 0.75rem"
---

# Design System: 伴学星

## Overview

**Creative North Star: "被老师批改过的作业本"**

学习档案不是后台仪表盘，也不是满屏卡片的资料站。界面用课程表的**列节奏**组织时间：家长先看到今天与本周的课，再看到红笔圈出的「老师布置」，最后按科目翻资料与纪要。外壳是墨蓝顶栏（`brand`），纸面是冷灰方格底（`paper-grid`）托住纯白内容区（`surface`），格线与横线（`rule` / `notebook-line`）替代阴影分层。

MiSans VF 从顶栏到底栏统一正文与标题；数字与课表时间使用 `tabular` 等宽数字。动效只反馈操作（约 150ms），红笔 SVG 在首屏画出一次（650ms / 380ms，`prefers-reduced-motion` 下全局压至近零）。家长端与教师资料端共用同一套 token；管理端在同一纸面上用下划线 Tab 与 `field` 控件录入。

**Key Characteristics:**

- 墨蓝 `#2340A8` 顶栏 + 冷纸方格背景 + 1px 格线，不用卡片堆叠与投影景深
- 九科 OKLCH 学科色只用于课表格子与科目标记（`--h` + `subj-*` 工具类）
- 批改红 `#D2402F` 专属老师布置、红笔标题与作业本区标签
- 触控与主按钮高度 44px（`h-11`），表单 `field` 固定 16px 字号
- 桌面 `lg`（1024px）起展示七列周课表；手机为七天日期条 + 当日课列表

## Colors

冷暖纸面托住墨蓝外壳与批改红，中性墨阶承担正文层级。

### Primary

- **墨蓝品牌（Ink Blue）**（`#2340A8` / `--brand`）：顶栏 `BrandBar`、主按钮 `default`、链接与聚焦环（`--ring`）、今日日期实心圆与选中描边。悬停 `#1B3289`（`--brand-hover`）。
- **墨蓝浅底（Brand Wash）**（`#E8EDFA` / `--brand-tint`）：今日课表列淡底、选区高亮、`field` 聚焦外发光。

### Secondary

- **批改红（Red Pen）**（`#D2402F` / `--mark`）：`RedPenHeading`、作业本区 `AssignmentList` 标签、`button` 的 `mark` 变体文字色。浅底 `#FCEFED`（`--mark-tint`）作 mark 按钮背景。
- **语义绿 / 琥珀 / 红（Status）**：`success` / `warning` / `danger` 及对应 `-tint` 用于状态提示与 `destructive` 控件，不用于装饰。

### Tertiary

- **学科 OKLCH 盘**：色相来自 `SUBJECT_HUES`（25°–340°，相邻 ≥30°，避开墨蓝 ~265°）。组件内联 `--h`，经 `subj-tint`（L0.955 C0.03）、`subj-tint-strong`、`subj-ink`（L0.42 C0.08）、`subj-swatch`、`subj-border` 表达。仅用于学科识别，不作全站第二主色。

### Neutral

- **冷纸（Cool Paper）**（`#F4F6F9` / `--paper`）：页面背景、`paper-grid` 底色、禁用输入背景。
- **内容白（Surface）**（`#FFFFFF` / `--surface`）：课表格外壳、表单、文章主内容。
- **格线（Rule）**（`#E3E6EB` / `--rule`；强 `#CFD4DC` / `--rule-strong`）：边框、表格线、`outline` 按钮描边。
- **墨阶（Ink Ramp）**：`#14161A` 正文、`#4A505A` 次要、`#6B7280` 辅助与占位。

### Named Rules

**The Red Pen Only Rule.** `--mark` 只出现在老师布置、红笔批注组件与 `mark` 按钮变体；课表、导航、资料列表不得用批改红做装饰。

**The Subject Hue Rule.** 学科色只能通过 `subjectStyle(hue)` 与 `subj-*` 出现在课格子、科目标签、科目页头；全站 chrome 保持墨蓝 + 中性墨。

## Typography

**Display / Body Font:** MiSans VF（`misans/lib/Normal/MiSansVF.min.css`），回退 PingFang SC、HarmonyOS Sans SC、系统 sans。

**Character:** 清晰、偏教育系统排版；标题与正文同一族，靠字重与字号区分层级，不用展示用衬线或全大写眉标。

### Hierarchy

- **Display**（600，`text-2xl`→`text-3xl` 响应式，行高 1.2–1.25）：学生档案首页标题、科目页 `h1`。
- **Headline**（600，`text-lg` / 1.1875rem）：红笔区 `RedPenHeading`、管理 `FormSection` 标题。
- **Title**（600，`text-base`–`text-xl`）：课表格内科目名、区块小标题。
- **Body**（400，`1rem` / 行高 1.65）：全局 `body`；纪要 `prose-note` 行高 1.75，长文限宽约 `68ch`。
- **Label**（500，`text-sm` / 0.8125rem–0.9375rem，`tracking-[0.01em]`）：表单标签、导航项、日期条星期字。

### Named Rules

**The Tabular Time Rule.** 课表时间、日期数字、有序列表序号使用 `tabular`（`font-variant-numeric: tabular-nums`），保证列对齐。

**The Sixteen Pixel Field Rule.** 所有 `field` 与主按钮默认字号为 16px（`text-base`），避免 iOS 微信内聚焦放大。

## Layout

- **容器**：家长端 `main` 水平居中 `max-w-7xl`（80rem），水平内边距 `px-4` / `sm:px-6`；窄表单页 `max-w-2xl`，课节详情 `max-w-3xl`。
- **顶栏**：`BrandBar` 粘性 `h-14`，内层同样 `max-w-7xl`。
- **首页栅格**：移动优先；`lg` 起主栏展示 `WeekGrid` 七列课表，`xl` 将红笔侧栏收到右侧单栏；`lg:hidden` / `hidden lg:block` 切换移动日期条与桌面网格。
- **课表**：`WeekStrip` 七等分列、`min-h-11 min-w-11` 日期触控格；`WeekGrid` 七列 `border-rule` 分栏，列内 `LessonBlock` 纵向堆叠 `gap-1.5`。
- **节奏**：区块间距常见 `gap-6`–`gap-10`；表单组 `space-y-5`；管理导航项 `py-3.5`。

## Elevation & Depth

系统默认**平面**：深度靠纸面 / 白面 / 格线 / 学科浅底区分，不用卡片投影栈。唯一常见「升起」是 `field` 聚焦时 `box-shadow: 0 0 0 3px var(--brand-tint)`；管理端个别分段选中态有 `0 1px 2px rgba(20,22,26,0.08)` 微阴影，不作全站 elevation 词汇。

### Named Rules

**The Flat Timetable Rule.** 课表与资料列表用边框与背景色分层，禁止默认卡片阴影与彩色左边框装饰条。

## Shapes

- **圆角**：按钮、课格子、输入为 `rounded-lg`（8px）；小控件 `rounded-md`（6px）；日期条内圆 `rounded-full`；学科色点 `rounded-[3px]`。
- **边框**：1px `border-rule` / `border-rule-strong`；课表格外框 `rounded-lg border`。
- **纸面纹理**：家长端根布局 `paper-grid`（28px 方格）；老师布置区 `notebook`（2rem 周期横线，对齐 `leading-8` 列表）。

## Components

### Buttons

- **Character：** 扎实、可追溯——主操作用墨蓝实心，次要描边，老师相关操作用 `mark` 浅红底。
- **Shape：** `rounded-lg`，默认 `h-11`（44px），`sm` `h-9`，`lg` `h-12`；`icon` `size-11`。
- **Primary（default）：** `bg-brand` / 白字，hover `brand-hover`，过渡 150ms。
- **Outline / Secondary / Ghost / Destructive / Mark / Link：** 见 `components/ui/button.tsx`；`link` 无高度限制、品牌色下划线。
- **Focus：** 全局 `:focus-visible` 2px `brand` 外描边，offset 2px。

### Chips / Tags

- **SubjectTag：** `subj-tint` + `subj-ink`，内嵌 `SubjectSwatch`，`rounded-md px-2 py-0.5 text-sm`。
- **SubjectSwatch：** `subj-swatch`，默认 `size-2.5 rounded-[3px]`，可作日期条下方色点。

### Cards / Containers

- **课表格外壳：** `border-rule bg-surface rounded-lg`，列间 `border-l`。
- **LessonBlock：** 整格 `subj-tint rounded-md`，hover `brightness-[0.97]`；取消课 `opacity-60` + 删除线。
- **内容区：** 纪要等可用 `border border-rule bg-surface rounded-lg px-4 sm:px-6`，仍是无阴影平面盒。

### Inputs / Fields

- **`@utility field`：** 全宽、`min-height: 2.75rem`、8px 圆角、`border-rule-strong`、聚焦 `brand` 描边 + 3px 品牌浅光；`aria-invalid` 用 `danger` 描边。
- **Field / FormSection：** 标签 `text-sm font-medium text-ink-2`；区块 `border-t border-rule pt-6`。

### Navigation

- **SiteNav（家长顶栏）：** 白字半透明项，`aria-current` 页 `bg-white/15`；`h-9 rounded-md px-3`。
- **AdminNav：** 纸面底 `border-b`，活跃项 `text-brand` + 底部 `h-0.5` 品牌下划线（非 Tab 胶囊）。

### 红笔批注（签名组件）

- **RedPenUnderline / RedPenTick：** SVG `text-mark`，`redpen-stroke` 路径绘制动画。
- **RedPenHeading：** `text-lg font-semibold text-mark` + 下划线 + 勾。
- **AssignmentList：** `notebook` 背景 + `dt` 标签 `text-mark`。

## Do's and Don'ts

### Do:

- **Do** 用 `WeekGrid` / `WeekStrip` + `LessonBlock` 组织时间，而不是卡片墙。
- **Do** 在学科相关 UI 上传入 `hue` 并使用 `subj-tint` / `subj-ink`，保持 OKLCH 配方一致。
- **Do** 老师布置与强调使用 `RedPenHeading`、`AssignmentList` 或 `mark` 按钮变体。
- **Do** 保持触控目标 ≥44px（`h-11`、`min-h-11 min-w-11` 日期格）。
- **Do** 状态过渡约 `duration-150`，并保留 `prefers-reduced-motion` 降级。

### Don't:

- **Don't** 用批改红装饰导航、课表格线或非老师话术内容。
- **Don't** 堆叠阴影卡片、彩色左边框、emoji 眉标或全大写标签（与方向约束一致）。
- **Don't** 用学科色粉刷顶栏、正文或全站按钮（学科色仅识别用途）。
- **Don't** 在表单控件使用小于 16px 的字号（避免移动端缩放）。
