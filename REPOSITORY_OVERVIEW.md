# WokeBrain 仓库理解笔记

这是一套微信小程序代码，产品方向是面向大学生日常学习生活的「校园助手」。从当前实现看，它还不是完整的 AI 助手，而是一个已经搭起壳和部分核心页面的原生小程序：底部有「对话 / 记忆 / 设置」三个主入口，其中「记忆」页已经做了日程与课表展示，「设置」页已经做了模型配置界面雏形，「对话」页目前基本还是空壳。

项目当前更像一个早期原型：UI 风格、页面结构、数据模型和本地缓存路径已经形成，但 AI 对话、模型拉取、用户认证、真实后端同步等关键能力还没有接上。

## 一眼看懂

- 类型：微信小程序。
- 技术栈：原生小程序 + TypeScript + WXML/WXSS。
- 渲染/组件配置：`project.config.json` 开启了 TypeScript 编译插件、Skyline 渲染，并在 `app.json` 中使用 `glass-easel` 组件框架。
- 主要功能：本地日程、本地课表、模型/API 配置页、自定义底部导航。
- 数据来源：主要依赖 `wx.Storage` 和 `app.globalData`，没有看到真实后端请求。
- 当前风险：仓库内大量中文字符串已经乱码，部分 TS/WXML 片段看起来存在语法或标签损坏迹象，需要优先修复编码与编译问题。

## 目录骨架

```text
WokeBrain/
├─ miniprogram/
│  ├─ app.ts / app.json / app.wxss
│  ├─ assets/
│  │  └─ WokeBrain.png
│  ├─ components/
│  │  └─ section-card/
│  ├─ custom-tab-bar/
│  ├─ pages/
│  │  ├─ chat/
│  │  ├─ memory/
│  │  │  ├─ schedule/
│  │  │  └─ timetable/
│  │  ├─ settings/
│  │  │  └─ model/
│  │  ├─ index/
│  │  └─ logs/
│  └─ utils/
│     └─ util.ts
├─ typings/
├─ package.json
├─ project.config.json
└─ tsconfig.json
```

文件规模不大，`miniprogram` 下大约有 12 个 TS 文件、10 个 WXML、11 个 WXSS 和 1 个 PNG 资源。`index`、`logs` 仍保留了微信小程序 TypeScript 模板痕迹，真正业务主要集中在 `memory` 和 `settings` 两组页面。

## 小程序框架与运行方式

`project.config.json` 指定 `miniprogramRoot` 为 `miniprogram/`，这是微信开发者工具识别的项目根。配置里开启了：

- `useCompilerPlugins: ["typescript"]`
- `skylineRenderEnable: true`
- `componentFramework: "glass-easel"`，写在 `miniprogram/app.json`
- `lazyCodeLoading: "requiredComponents"`
- `appid: wx20cca8043b5adc65`
- 基础库版本为 `trial`

`tsconfig.json` 是严格模式：`strict`、`noImplicitAny`、`strictNullChecks`、`noUnusedLocals`、`noImplicitReturns` 等都打开了。理论上这是一个偏严谨的 TS 小程序项目，但当前仓库没有安装 `node_modules`，`package.json` 里也没有 `build`、`lint`、`test` 脚本。

## 应用入口与全局数据

`miniprogram/app.ts` 是全局入口。它做了几件事：

- 启动时记录 `logs` 到 `wx.Storage`。
- 读取系统信息，计算底部自定义 tabBar 与安全区所需的 `contentPaddingBottom`。
- 从本地缓存初始化 `schedules`、`courses` 和 `semesterConfig`。
- 如果课程为空，会弹出提示。
- 调用 `wx.login` 并打印 code，但没有继续接后端登录流程。
- 提供 `updateSchedules`、`updateCourses`、`syncAllData` 等全局方法。

当前全局数据结构大致是：

```ts
globalData: {
  contentPaddingBottom: number
  schedules: any[]
  courses: any[]
  semesterConfig: {
    startDate: string
    totalWeeks: number
  }
}
```

`syncAllData()` 会把一批默认日程、默认课程和默认学期配置写入 `wx.Storage`，再同步到 `globalData`。这更像一个开发期的“填充演示数据”按钮，还不是云端同步。

## 数据模型与工具函数

`miniprogram/utils/util.ts` 是核心工具层，定义了三类业务模型：

```ts
interface Schedule {
  id: string
  title: string
  date: string
  time: string
  location: string
  isCountdown: boolean
  weekday?: string
  countdown?: number
}

interface CourseRaw {
  name: string
  teacher: string
  location: string
  periodStart: number
  periodEnd: number
  weekday: number
  weeks: number[]
}

interface SemesterConfig {
  startDate: string
  totalWeeks: number
}
```

工具函数主要覆盖：

- 日期格式化与星期计算。
- 日程 ID 生成、倒计时计算、日程数据补全。
- 课程 ID 生成、课程数据补全。
- 根据学期开始日期计算当前教学周。
- 根据教学周过滤课程。
- 将节次转换为上课时间段。

数据流很简单：

```text
wx.Storage
  ↓ 启动时读取
app.globalData
  ↓ 页面 onShow/onLoad 消费
memory / schedule / timetable 页面
  ↓ 用户点击同步
syncAllData() 写回 Storage 与 globalData
```

## 已经做出来的页面

### 自定义底部导航

`miniprogram/custom-tab-bar` 实现了自定义 tabBar，包含三个入口：

- 对话：`/pages/chat/chat`
- 记忆：`/pages/memory/memory`
- 设置：`/pages/settings/settings`

各 tab 页面在 `onShow` 时调用 `this.getTabBar().setData({ selected: N })` 更新选中态。

### 记忆首页

`pages/memory/memory` 是目前最完整的主页面。它使用 `Component()` 写法，页面里有两个 `section-card`：

- 日程卡片：展示前 3 条日程，包含日期、星期、时间、地点、倒计时。
- 课表卡片：展示今天课程；晚上 20 点后会把明天课程也纳入展示。

页面右上有同步按钮，点击后调用 `app.syncAllData()` 注入默认演示数据。点击日程卡片头部跳到日程详情页，点击课表卡片头部跳到课表页。

### 日程详情

`pages/memory/schedule` 展示全量日程列表，并对地点文本做了跑马灯检测：通过 `wx.createSelectorQuery()` 测量容器和文本宽度，如果文本溢出就设置动画相关字段。

### 课表页

`pages/memory/timetable` 是另一个相对完整的模块。它实现了：

- 1 到 22 周的周切换。
- “本周”按钮。
- 根据学期开始日期计算真实周数。
- 7 天 x 13 节的课表网格。
- 根据 `weekday`、`periodStart`、`periodEnd` 把课程块定位到 CSS Grid 上。
- 教师/地点过长时的跑马灯。

课程渲染公式大致是：

```text
grid-column = weekday + 3
grid-row = periodStart + 2 / periodEnd + 3
```

### 设置页

`pages/settings/settings` 已实现设置列表与两个弹窗：

- 模型管理入口，跳转到 `/pages/settings/model/model`。
- 认证信息弹窗，包含账号、密码、密码显隐切换。
- 关于弹窗。

账号和密码输入会做 ASCII 字符过滤，并限制长度。这说明作者已经开始考虑输入约束，但认证信息目前没有保存、提交或加密处理。

### 模型管理页

`pages/settings/model` 是一个 OpenAI-compatible API 配置界面雏形：

- 输入 `Base URL`。
- 输入 `API Key`，支持显隐切换。
- 展示一组预置模型名。
- 支持自定义模型 ID。
- 支持选择模型。
- 对过长模型名做跑马灯检测。

但 `fetchModels()` 目前只有：

```ts
console.log('TODO: fetch models from API')
```

也就是说，还没有真实请求模型列表，没有保存配置，也没有把选中的模型提供给对话页使用。

### 对话页

`pages/chat/chat` 当前只有 tabBar 选中态逻辑，没有聊天输入、消息列表、请求模型、上下文管理或流式输出。以产品目标看，这是最大的未完成部分。

### 模板残留页面

`pages/index` 和 `pages/logs` 仍是微信小程序模板页面：头像、昵称、日志展示等。它们还被注册在 `app.json` 的 pages 里，但不在底部 tabBar 主路径中，像是尚未清理的脚手架遗留。

## UI 与样式体系

`app.wxss` 定义了全局设计变量，整体是深色背景 + 蓝色主色：

- 背景：`#0a0a0a`、`#111111`、`#161616`
- 主色：`#1e90ff`
- 文本：白色、灰色层级
- 圆角、阴影、间距、字号都有 CSS 变量

页面样式大体遵循这个变量体系。组件上，`section-card` 提供 header/body 双 slot，用于记忆页的日程卡片和课表卡片。

## 当前完成度判断

已经完成或基本完成：

- 微信小程序工程骨架。
- TypeScript 类型环境。
- 自定义 tabBar。
- 深色主题样式体系。
- 通用卡片组件。
- 本地日程数据模型和展示。
- 本地课程/课表数据模型和展示。
- 学期周数计算、按周筛课、课表网格定位。
- 设置页、认证弹窗、关于弹窗。
- 模型配置页 UI。

尚未完成或只是占位：

- AI 对话页。
- OpenAI-compatible 请求逻辑。
- 模型列表拉取。
- API Key、Base URL、模型选择的持久化。
- 用户认证的真实保存/提交。
- 云端同步或后端服务。
- 日程/课程的新增、编辑、删除。
- 权限、错误处理、加载态、空态的系统化处理。
- 模板页清理。
- 自动化构建/测试脚本。

## 需要优先注意的问题

### 1. 中文编码明显损坏

仓库内大量中文字符串显示为乱码，例如页面标题、toast、tab 文案、默认数据、注释等。更关键的是，部分乱码看起来已经破坏了字符串边界或标签结构，而不仅仅是终端显示问题。

建议第一优先级处理编码问题：确认原始文件编码、恢复中文文本，并统一保存为 UTF-8。

### 2. 可能存在编译级语法问题

我在快速阅读时看到几类高风险片段：

- `util.ts` 中日期格式化模板字符串疑似损坏。
- `timetable.ts` 中 `dayLabels` 和 `weekHeader` 模板字符串疑似损坏。
- `memory.wxml` 中部分 `<text>` 关闭标签疑似损坏。
- `app.ts` 默认数据里部分中文字符串附近疑似缺少正常引号。

由于本地没有 `node_modules`，也没有项目脚本，我没有完成正式编译验证。建议修复编码后，用微信开发者工具或本地 TypeScript 编译先跑一遍。

### 3. 产品主线还没闭环

项目名和导航都指向“AI 校园助手”，但当前真正闭环的是“本地记忆页”：日程和课表。模型配置页和对话页之间还没有数据连接，也没有请求层。

下一步如果要推进产品，应优先让这条链路跑通：

```text
设置 Base URL/API Key/模型
  → 持久化配置
  → 对话页读取配置
  → 调用 OpenAI-compatible chat completions
  → 展示消息
```

## 我对这个仓库的整体判断

这是一个已经有明确方向和视觉风格的小程序早期版本。作者先做了校园助手中“记忆”这一块，也就是日程和课表；同时预留了 AI 模型配置入口，说明后续目标是把对话能力接入进来。

目前最有价值的资产不是 AI 部分，而是已经搭好的小程序工程结构、深色 UI 体系、课表网格实现、本地日程/课程数据模型，以及自定义 tabBar。最阻碍继续开发的是编码损坏和缺少可验证的构建流程。把编码和编译修好之后，这个项目适合继续沿着“配置模型 → 做聊天 → 让聊天读写日程/课表记忆”的路线推进。
