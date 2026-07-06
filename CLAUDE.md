# CLAUDE.md — WokeBrain (蜗壳脑袋)

## 项目概述

WokeBrain 是一款面向大学生用户的一站式校园助手 **微信小程序**，提供 AI 对话、日程管理、课程表等功能。使用原生微信小程序框架 + TypeScript + Skyline 渲染引擎。

- **AppID**: `wx20cca8043b5adc65`
- **基础库**: `trial`

---

## 技术栈

| 层面 | 技术 |
|------|------|
| 语言 | TypeScript (strict mode) |
| 渲染引擎 | Skyline (`skylineRenderEnable: true`) |
| 组件框架 | glass-easel |
| UI 体系 | 深色主题 + CSS 自定义属性 |
| 数据持久化 | `wx.Storage` (同步 API) |
| 配置 | `project.config.json` + `tsconfig.json` (strict) |

---

## 项目结构

```
WokeBrain/
├── miniprogram/
│   ├── app.ts                     # 入口：生命周期、全局数据、同步逻辑
│   ├── app.json                   # 路由、TabBar、窗口配置
│   ├── app.wxss                   # 全局样式：CSS 变量体系、工具类
│   ├── assets/WokeBrain.png       # 应用图标
│   ├── components/
│   │   └── section-card/          # 通用卡片组件 (header/body 双插槽)
│   ├── custom-tab-bar/            # 自定义底部导航栏 (对话/记忆/设置)
│   ├── utils/util.ts              # 工具函数 + 日程/课表数据模型 + 学期计算
│   └── pages/
│       ├── chat/                  # 对话页 (空壳)
│       ├── memory/                # 记忆主页 (Tab 页)
│       │   ├── memory.*           #   日程+课表卡片 + 同步按钮
│       │   ├── schedule/          #   日程列表详情
│       │   └── timetable/         #   课表 Grid 视图
│       ├── settings/              # 设置页 (Tab 页)
│       │   ├── settings.*         #   模型/认证/关于
│       │   └── model/             #   模型选择与 API 配置
│       ├── index/                 # 模板页 (未使用)
│       └── logs/                  # 模板页 (未使用)
├── typings/index.d.ts             # IAppOption 全局类型
├── tsconfig.json                  # strict null checks, no implicit any
└── project.config.json            # 微信开发者工具配置
```

---

## CSS 变量体系

定义于 [app.wxss](miniprogram/app.wxss)，作用于 `page` 伪根：

### 背景色阶梯
`--color-bg-primary: #0a0a0a` (底色) → `--color-bg-secondary: #111` → `--color-bg-tertiary: #1a1a1a` → `--color-bg-card: #161616`

### 主色系
`--color-primary: #1e90ff` (品牌蓝) → `--color-primary-dark: #0066cc` → `--color-primary-light: #4da6ff` → `--color-primary-alpha: rgba(30,144,255,0.1)` → `--color-primary-alpha-2/3: 0.2/0.3`

### 文字色阶
`--color-text-primary: #fff` → `--color-text-secondary: #999` → `--color-text-tertiary: #666` → `--color-text-disabled: #444`

### 间距
`--spacing-xs: 5px` → `--spacing-sm: 10px` → `--spacing-md: 15px` → `--spacing-lg: 20px` → `--spacing-xl: 30px`

### 字号
`--font-xs: 10px` → `--font-md: 14px` → `--font-3xl: 24px`

### 其他
`--radius-sm/md/lg/xl/full`, `--shadow-sm/md/lg/primary`, `--transition-fast/normal/slow`, `--gradient-primary/card`

**开发规范**: 所有样式必须使用 CSS 变量，禁止硬编码颜色/间距值。

---

## 数据架构

```
wx.Storage (持久化)           app.globalData (内存)          页面 (消费端)
─────────────────            ──────────────────             ─────────
schedules         ←→ init    schedules: any[]    →  memory.ts loadSchedules()
courses           ←→ init    courses: any[]      →  memory.ts loadCourses()
semesterConfig    ←→ init    semesterConfig      →  schedule.ts loadSchedules()
                                                    →  timetable.ts showWeek()
```

- **启动**: `initSchedules()` / `initCourses()` 仅从 Storage 读取缓存，**不自动回填硬编码数据**
- **启动检测**: courses 为空 → Toast "记忆似乎被清除了TAT~"
- **同步**: memory 页同步按钮触发 `syncAllData()` → 写入 20 条日程 + 3 门课程 + 学期配置到 Storage 和 globalData
- **持久化**: 目前仅使用 `wx.Storage`，存在被系统清理的风险（未实现 FileSystem 备份）

### 日程数据结构 (Schedule)
```typescript
{ title, date: "YYYY/MM/DD", time: "HH:MM", location, isCountdown: boolean }
// 运行时由 enrichSchedule() 注入: id, weekday, countdown
```

### 课程数据结构 (CourseRaw)
```typescript
{ name, teacher, location, periodStart: 1-13, periodEnd: 1-13, weekday: 0-6, weeks: number[] }
// 运行时由 enrichCourse() 注入: id
```

### 学期配置 (SemesterConfig)
```typescript
{ startDate: "2026/03/02", totalWeeks: 20 }
```

### 关键工具函数 ([util.ts](miniprogram/utils/util.ts))

| 函数 | 用途 |
|------|------|
| `getSemesterWeek(config, offset)` | 计算学期第几周，以 startDate 所在周日为第 1 周基准 |
| `getCoursesForWeek(courses, weekNum)` | 按教学周筛选课程 |
| `getPeriodTimeRange(start, end)` | 节次 → 时间区间字符串 |
| `enrichSchedule(s, index)` / `enrichCourse(c, index)` | 注入 id、weekday、countdown 等计算字段 |
| `formatDate("YYYY/MM/DD")` | → "M月D日" |
| `getDaysUntil("YYYY/MM/DD")` | 计算剩余天数 |

---

## 各页面状态

### 记忆主页 (memory) — Component() + 自定义 TabBar
- [x] 同步按钮 (云下载 SVG 图标，右上角，蓝色主题)
- [x] 日程卡片: 前 3 条，含倒计时天数
- [x] 课表卡片: `loadCourses()` 显示今日课程，20:00 后追加明日
- [x] 点击卡片箭头 → navigateTo schedule/timetable
- [x] 学期范围外 → "学期已结束/尚未开始"
- [ ] 日程未按日期筛选 (取全部前 3 条)

### 日程详情 (schedule) — Page()
- [x] 全量日程列表，倒计时高亮 (蓝色发光边框)
- [x] 地点跑马灯 (JS 测量 → CSS animation)

### 课表 (timetable) — Page()
- [x] 15行×9列 CSS Grid (24px | 24px | 1fr×7)
- [x] 周数导航 (左右箭头 + "本周"按钮，1-22 周范围限制)
- [x] 日期头: 周日-周六，格式 "M月D日 ~ M月D日 · 第N周"
- [x] 左侧纵向标签: 上午/下午/晚上 (writing-mode: vertical-rl)
- [x] 课程块 Grid 自动定位 (grid-row: periodStart+2 / periodEnd+3, grid-column: weekday+3)
- [x] 课程块: 蓝色渐变玻璃面板，名称动态行数 (`maxLines = rowSpan × 3`)，教师/地点跑马灯
- [x] 周数范围限制 1-22，超出时显示第 1 周，本周按钮 toast 提示
- [x] 边界箭头隐藏 (nav-placeholder 占位)

### 设置 (settings) — Component()
- [x] 模型管理 → navigateTo model
- [x] 认证弹窗 (账号/密码，密码显隐切换，输入 ASCII 过滤)
- [x] 关于弹窗 (图标 + 名称 + 描述 + 确定按钮)
- [x] 多弹窗互斥 (mask 点击关闭对应弹窗)

### 模型管理 (model) — Page()
- [x] Base URL / API Key 输入框
- [x] 20 个预设模型列表 + 自定义模型
- [x] 跑马灯检测
- [ ] `fetchModels()` 未实现 (TODO)
- [ ] 选择未持久化

### 对话 (chat) — Component() (空壳)
- 仅设置 TabBar 选中，无业务逻辑

---

## 开发指南

### 新建页面
1. 在 `miniprogram/pages/<name>/` 创建 `name.ts`, `name.wxml`, `name.wxss`, `name.json`
2. 在 `app.json` 的 `pages` 数组中注册路径
3. Tab 页面使用 `Component()`，子页面使用 `Page()`
4. Tab 页面需在 `onShow` 中调用 `this.getTabBar().setData({ selected: N })`
5. 页面样式使用全局 CSS 变量，不硬编码颜色值

### 读取全局数据
```typescript
const app = getApp<IAppOption>()
const courses = app.globalData.courses
const semesterConfig = app.globalData.semesterConfig
```

### 跑马灯实现模式
1. WXML: `<view class="xxx-wrapper"><text class="xxx {{needMarquee ? 'xxx-marquee' : ''}}" style="{{...}}">...</text></view>`
2. WXSS: wrapper `overflow: hidden` + `justify-content: center` (默认) → `.marquee-active { justify-content: flex-start }`
3. TS: `checkMarquee()` → setTimeout 100ms → `createSelectorQuery` 测量 wrapper/text 宽度 → 设置 `needMarquee` / `marqueeDistance`
4. CSS animation: `@keyframes` 8s 无限，首尾停顿 (10%/90%)，`transform: translateX(var(--marquee-distance))`

### 课表 Grid 定位公式
- `grid-column = weekday + 3` (0=周日→第3列, 6=周六→第9列)
- `grid-row = periodStart + 2 / periodEnd + 3` (第3行=第1节)
- `maxLines = (periodEnd - periodStart + 1) × 3`

### 学期周数计算规则
- 第 1 周 = `startDate` 所在周的周日 (如 2026/03/01) 开始的 7 天
- 有效范围: 1-22 周
- 课程 `weeks` 为开课周号数组，如 `[1,2,3,5,7,8,9,11,...]`

### 注意事项
- 禁止硬编码颜色/间距: 使用全局 CSS 变量
- 输入框安全: 所有用户输入需经过 ASCII 范围过滤 (`/^[\x21-\x7E]{0,N}$/`) + 截断
- `wx.setStorageSync` 阻塞 JS 线程，当前数据量小可以接受；若数据量增大应改用异步 API
- 不要自动生成文档或注释除非用户明确要求
