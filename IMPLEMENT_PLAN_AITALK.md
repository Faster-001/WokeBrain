# WokeBrain AI 对话部分 实施计划

> **总目标**：实现 API Key 配置 → 模型选择 → AI 对话的完整闭环，AI 可读取日程/课表，同时为数据库接入、多 Provider、流式输出等扩展预留架构空间。
>
> **设计原则**：每个阶段交付一个**可独立验证的最小闭环**，阶段之间增量叠加，不破坏已有功能。

---

## 总览

```
阶段一：填配置 → 能对话（硬编码模型名）
阶段二：配置持久化 → 重启不丢
阶段三：从 API 拉取模型列表 → 选模型
阶段四：AI 能读日程/课表 → 智能问答
阶段五：打磨体验 → 错误处理 / 引导 / 样式
阶段六：API Key 安全加固 → 加密存储 / 内存保护 / 安全提示
```

### 架构分层

```
页面层 (pages/)  →  服务层 (services/)  →  数据源 (wx.Storage / 未来数据库)
                         ↑
                    类型层 (types/)
```

---

## 进度总览

| 阶段 | 闭环目标 | 状态 | 完成时间 |
|------|----------|------|----------|
| 阶段一：基础对话 | 填 baseUrl+apiKey+模型名 → 发消息 → 收回复 | ✅ 已完成 | 2026-07-12 |
| 阶段二：配置持久化 | 配置存 Storage → 重启自动回填 | ✅ 已完成 | 2026-07-12 |
| 阶段三：模型拉取 | 点按钮 → 从 API 拉模型列表 → 点选 | ✅ 已完成 | 2026-07-12 |
| 阶段四：AI 工具 | AI 调用工具读日程/课表 → 智能回答 | ✅ 已完成 | 2026-07-12 |
| 阶段五：体验打磨 | 错误处理 / 未配置引导 / 样式优化 | ✅ 已完成 | 2026-07-12 |
| 阶段六：API Key 安全 | 加密存储 / 内存保护 / 安全提示 | ✅ 已完成 | 2026-07-12 |

---

## 阶段一：基础对话闭环

> **闭环**：用户在 model 页输入 baseUrl + apiKey + 手动选一个硬编码模型 → 切到 chat 页输入消息 → 收到 AI 回复。

### 1.1 新建 `miniprogram/types/ai.ts`

- [x] `AiConfig` — baseUrl / apiKey / selectedModel
- [x] `ChatMessage` — id / role / content / createdAt / status / error
- [x] `ModelInfo` — id / name
- [x] `AiChatResult` — content / raw

### 1.2 新建 `miniprogram/services/config-store.ts`

- [x] `configStore.get()` — 从 Storage 读取（阶段一可返回内存默认值）
- [x] `configStore.save(config)` — 全量写入
- [x] `configStore.patch(partial)` — 部分更新
- [x] `configStore.isReady()` — 检查三字段是否齐全

### 1.3 新建 `miniprogram/services/ai-client.ts`

- [x] `aiClient.chat(cfg, messages)` — POST /chat/completions（非流式）
- [x] 基础 `wx.request` 封装 + 错误处理

### 1.4 修改 `miniprogram/pages/settings/model/model.ts`

- [x] `onSaveAndFetch` 改为：`configStore.patch({ baseUrl, apiKey })` + 持久化选中模型
- [x] `onModelSelect` 调用 `configStore.patch({ selectedModel })`
- [x] 保留现有硬编码模型列表（阶段三再替换为 API 拉取）

### 1.5 修改 `miniprogram/pages/chat/chat.ts` + `chat.wxml` + `chat.wxss`

- [x] `data.messages: ChatMessage[]` — 消息列表
- [x] `data.inputValue` — 输入框内容
- [x] `onSend` — 拼 user 消息 → `aiClient.chat()` → 追加 assistant 消息
- [x] WXML：消息列表（user 右气泡 / assistant 左气泡）+ 底部输入栏
- [x] WXSS：气泡样式 + 输入栏样式（复用 CSS 变量）

### 1.6 修改 `miniprogram/app.ts` + `typings/index.d.ts`

- [x] `globalData` 加 `aiConfig?: AiConfig | null`
- [x] `IAppOption` 同步加字段

### 验证标准

- [x] model 页填入真实 baseUrl + apiKey，选一个模型，点保存
- [x] chat 页输入"你好"，收到 AI 回复
- [x] 杀进程重启后配置仍在（configStore 已落 Storage）

---

## 阶段二：配置持久化与回填

> **闭环**：配置存 Storage → 重启后 model 页自动回填已保存的配置 → chat 页直接可用。

### 2.1 完善 `config-store.ts`

- [x] `onLoad` 时从 Storage 读取并回填到 `globalData.aiConfig`
- [x] `save` / `patch` 时同步回填 `globalData.aiConfig`

### 2.2 修改 `model.ts`

- [x] `onLoad` / `onShow` 从 `configStore.get()` 回填 baseUrl / apiKey / selectedModel 到输入框和选中态

### 2.3 修改 `app.ts`

- [x] `onLaunch` 调用 `configStore.get()` 初始化 `globalData.aiConfig`

### 验证标准

- [x] 填配置 → 保存 → 杀进程 → 重进 model 页，输入框和选中态都在
- [x] 重进 chat 页直接能对话，无需重新配置

---

## 阶段三：模型列表从 API 拉取

> **闭环**：model 页点"保存 & 获取模型" → 从 `/models` 拉取真实模型列表 → 渲染 → 点选保存。

### 3.1 扩展 `ai-client.ts`

- [x] `aiClient.fetchModels(cfg)` — GET /models，返回 `ModelInfo[]`

### 3.2 修改 `model.ts`

- [x] `onSaveAndFetch` 改为：保存配置 → `fetchModels()` → 用返回结果替换硬编码列表
- [x] 加载态 `loading: boolean` + Toast 错误提示
- [x] 保留"自定义模型"输入项作为兜底

### 3.3 修改 `model.wxml`（如需要）

- [x] 加载中占位提示

### 验证标准

- [x] 填入真实 baseUrl + apiKey → 点按钮 → 模型列表刷新为 API 返回的真实模型
- [x] 选一个模型 → 切到 chat 页 → 对话正常
- [x] API 错误时 Toast 提示，不崩溃

---

## 阶段四：AI 工具 — 读取日程与课表

> **闭环**：用户问"我明天有什么课？" → AI 调用 `get_today_courses` 工具 → 返回课表数据 → AI 生成自然语言回复。

### 4.1 新建 `miniprogram/services/repository.ts`

- [x] `IRepository` 接口 — getSchedules() / getCourses() / getSemesterConfig()
- [x] `LocalRepository` 实现 — 读 wx.Storage / globalData
- [x] `RemoteRepository` 占位 — 未来读后端 API
- [x] `repository` 单例 — get() / switchTo() / resetToLocal()

### 4.2 新建 `miniprogram/services/ai-tools.ts`

- [x] `aiToolDefinitions` — 6 个工具：get_today_schedule / get_today_courses / get_week_schedule / get_week_courses / get_schedule_by_date / get_courses_by_date
- [x] `aiToolExecutor` — 调 repository 拿数据，返回 JSON

### 4.3 扩展 `ai-client.ts`

- [x] `chat()` 增加 `options?: AiChatOptions` 参数
- [x] 工具循环：检测 `tool_calls` → 执行 `toolExecutor` → 追加 tool 消息 → 二次请求
- [x] 最大轮次限制 `maxToolRounds`（默认 5），防止死循环
- [x] 无工具时走原路径，向后兼容

### 4.4 修改 `chat.ts`

- [x] `onSend` 传入 `aiToolDefinitions` + `aiToolExecutor`

### 验证标准

- [x] 问"我今天有什么课？" → AI 调用工具 → 回答包含真实课表内容
- [x] 问"我这周日程有哪些？" → AI 调用工具 → 回答包含真实日程
- [x] 普通对话不受影响

---

## 阶段五：体验打磨

> **闭环**：未配置时引导用户去设置 → API 错误友好提示 → 消息发送态/错误态可视化。

### 5.1 修改 `chat.ts` + `chat.wxml`

- [x] `onLoad` 检查 `configStore.isReady()`，未配置显示引导条 + 跳转按钮
- [x] 发送中显示"思考中..."三点闪烁动画（`status: 'pending'`）
- [x] 失败标记 `status: 'error'` + 重试按钮（`onRetry` 方法）
- [x] 发送/重试成功后自动滚动到底部

### 5.2 修改 `chat.wxss`

- [x] pending 气泡三点闪烁动画（`dot-blink` keyframes）
- [x] error 气泡红色边框 + 重试按钮样式
- [x] 引导条样式

### 5.3 修改 `model.ts` + `model.wxml`

- [x] 保存成功 Toast（阶段三已实现）
- [x] 拉取模型 loading 遮罩（阶段三已实现）

### 验证标准

- [x] 未配置进 chat 页 → 显示"去配置"引导
- [x] 断网发消息 → 显示错误气泡 + 重试
- [x] 发送中 → 显示三点闪烁动画

---

## 阶段六：API Key 安全加固

> **闭环**：API Key 加密落盘 → 内存中仅在必要时解密 → 离开设置页自动隐藏 → 安全提示引导用户。

### 威胁模型

| 攻击场景 | 风险等级 | 说明 |
|---------|---------|------|
| 反编译小程序包 | 高 | 微信小程序可被反编译，源码中的硬编码密钥直接暴露 |
| wx.Storage 明文读取 | 高 | 越狱/root 设备可直接读取 Storage 文件，明文 apiKey 一览无余 |
| 截屏/录屏泄露 | 中 | 用户在设置页展示 apiKey 时被截屏或录屏 |
| 日志泄露 | 中 | `console.log` 或崩溃日志中意外打印 apiKey |
| 内存 dump | 低 | 高级攻击者通过内存 dump 获取运行时密钥，但成本较高 |

### 6.1 新建 `miniprogram/utils/crypto.ts`

- [x] `encrypt(plaintext: string): string` — XOR + 设备指纹加密，输出 `WB1:Base64`
- [x] `decrypt(ciphertext: string): string` — 解密，兼容旧版明文数据
- [x] `generateDeviceKey()` — 基于 model + system + brand + 屏幕尺寸 + 固定盐生成设备绑定密钥
- [x] 自实现 Base64 编解码，不依赖 btoa/atob

### 6.2 修改 `config-store.ts`

- [x] `save()` 时对 `apiKey` 字段加密后再写入 Storage
- [x] `get()` 时从 Storage 读取后解密 `apiKey`
- [x] 内存中 `globalData.aiConfig` 保持明文（运行时使用），仅落盘加密
- [x] 新增 `clearApiKey()` 方法：清除内存中的 apiKey

### 6.3 修改 `model.ts`

- [x] `onHide` / `onUnload` 时自动隐藏 apiKey（`passwordVisible: false`）
- [x] `onHide` 时调用 `configStore.clearApiKey()` 清除内存中的明文 apiKey
- [x] `onShow` 时重新从 Storage 解密恢复 apiKey 到内存
- [x] 新增 `onSecurityTip()` 方法：展示安全提示弹窗
- [x] 移除 `console.log` 中可能泄露模型名称的日志

### 6.4 修改 `model.wxml`

- [x] API Key 输入框下方增加安全提示行："API Key 加密存储于本地，离开页面自动隐藏"
- [x] 点击安全提示行弹出详细安全说明弹窗

### 6.5 修改 `ai-client.ts`

- [x] 确认无 `console.log` 泄露 apiKey（已检查，无日志）

### 验证标准

- [x] Storage 中 apiKey 为密文（`WB1:` 前缀），无法直接读取
- [x] 离开设置页再进入，apiKey 输入框为隐藏状态（密码模式）
- [x] 安全提示弹窗正常展示
- [x] 对话功能不受影响（加密解密透明）
- [x] 旧版明文数据兼容（自动识别，无需迁移）

---

## 扩展预留

| 未来需求 | 预留位置 | 改动方式 |
|---------|---------|---------|
| 流式输出 (SSE) | `ai-client.ts` | 新增 `chatStream()` 方法 |
| 多 Provider | `ai-client.ts` | 按 baseUrl 或 provider 字段分发 |
| 多会话 | `ChatMessage` | 加 `conversationId` 字段 |
| 上下文截断 | `ai-client.ts` | chat 入口加预处理 |
| 错误重试 | `ai-client.ts` | `_request` 包 retry 逻辑 |
| 后端数据库 | `repository.ts` | 新增 `RemoteRepository`，调 `switchTo()` |
| 多账号配置 | `config-store.ts` | 升级为 `AiConfig[]` + `activeId` |
| 更多 AI 工具 | `ai-tools.ts` | 追加 toolDefinitions + executor |
| API Key 安全加固 | `config-store.ts` / `crypto.ts` | 加密存储 + 设备绑定 + 内存保护 |

---

## 文件变更清单

| 文件 | 操作 | 涉及阶段 |
|------|------|----------|
| `miniprogram/types/ai.ts` | 新建 | 一 |
| `miniprogram/services/config-store.ts` | 新建 | 一、二、六 |
| `miniprogram/services/ai-client.ts` | 新建 | 一、三、四 |
| `miniprogram/services/repository.ts` | 新建 | 四 |
| `miniprogram/services/ai-tools.ts` | 新建 | 四 |
| `miniprogram/utils/crypto.ts` | 新建 | 六 |
| `miniprogram/pages/settings/model/model.ts` | 修改 | 一、二、三、五、六 |
| `miniprogram/pages/settings/model/model.wxml` | 修改 | 三、六 |
| `miniprogram/pages/settings/model/model.wxss` | 修改 | 三、六 |
| `miniprogram/pages/chat/chat.ts` | 修改 | 一、四、五 |
| `miniprogram/pages/chat/chat.wxml` | 修改 | 一、五 |
| `miniprogram/pages/chat/chat.wxss` | 修改 | 一、五 |
| `miniprogram/app.ts` | 修改 | 一、二 |
| `typings/index.d.ts` | 修改 | 一 |

> 共 **6 个新文件 + 6 个修改文件**

---

## 工作总结

### 已完成的核心能力

本项目从零搭建了微信小程序的 AI 对话系统，分 6 个阶段逐步交付，每个阶段都是一个可独立验证的最小闭环：

| 能力 | 实现方式 | 关键文件 |
|------|---------|---------|
| **AI 对话** | OpenAI 兼容 API 非流式调用，支持 function calling 工具循环 | `ai-client.ts` |
| **配置管理** | baseUrl + apiKey + selectedModel 三字段，wx.Storage 持久化 | `config-store.ts` |
| **模型拉取** | GET /models 拉取真实模型列表，支持自定义模型兜底 | `model.ts` |
| **智能问答** | 6 个工具覆盖今日/本周/指定日期的日程和课表查询 | `ai-tools.ts` + `repository.ts` |
| **体验打磨** | pending 三点动画、error 重试按钮、未配置引导条、自动滚动 | `chat.ts/wxml/wxss` |
| **安全加固** | XOR + 设备指纹加密落盘，内存保护，离开页面自动隐藏 | `crypto.ts` + `config-store.ts` |

### 架构设计要点

```
┌─────────────────────────────────────────────────────┐
│                    页面层 (pages/)                    │
│  chat.ts ──→ onSend() 传入 tools + executor          │
│  model.ts ──→ onSaveAndFetch() 拉取模型列表           │
└──────────────────────┬──────────────────────────────┘
                       │ 依赖
┌──────────────────────▼──────────────────────────────┐
│                   服务层 (services/)                  │
│  ai-client.ts ── chat() 工具调用循环（最多 5 轮）      │
│  config-store.ts ── 加密存储 / 内存缓存               │
│  ai-tools.ts ── 6 个工具定义 + 执行器                  │
│  repository.ts ── IRepository 抽象（Local/Remote）    │
└──────────────────────┬──────────────────────────────┘
                       │ 依赖
┌──────────────────────▼──────────────────────────────┐
│              类型层 (types/) + 工具层 (utils/)         │
│  ai.ts ── AiConfig / ChatMessage / AiToolCall ...    │
│  crypto.ts ── XOR 加密 + 设备指纹 + Base64            │
│  util.ts ── 课表/日程/学期周计算                       │
└──────────────────────┬──────────────────────────────┘
                       │ 读写
┌──────────────────────▼──────────────────────────────┐
│              数据源 (wx.Storage / globalData)         │
│  aiConfig（加密） / schedules / courses              │
└─────────────────────────────────────────────────────┘
```

**三层分离**的核心价值：页面层不感知数据来源，服务层不感知 UI 细节，数据源可从本地无缝切换到远程。

---

## 未来接口规范

> 以下接口已在当前代码中预留扩展点，后续开发者按规范实现即可接入。

### 1. 流式输出 `aiClient.chatStream()`

**位置**：`miniprogram/services/ai-client.ts`

```typescript
/**
 * 流式对话（SSE）
 * 未来实现：使用 wx.request enableChunked 或 wx.connectSocket 逐 token 返回
 */
async chatStream(
  cfg: AiConfig,
  messages: ChatMessage[],
  options?: AiChatOptions,
  onChunk?: (delta: string) => void  // 每个 token 的回调
): Promise<AiChatResult>
```

**接入方式**：在 `aiClient` 对象中新增方法，chat 页 `onSend` 改为调用 `chatStream`，`onChunk` 回调中逐步更新 assistant 气泡内容。

### 2. 远程数据源 `RemoteRepository`

**位置**：`miniprogram/services/repository.ts`

```typescript
/**
 * 后端 API 数据源
 * 未来实现：替换 LocalRepository，通过 HTTP 请求读取服务端数据
 */
class RemoteRepository implements IRepository {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl
    this.token = token
  }

  async getSchedules(): Promise<Schedule[]>
  async getSchedulesByDate(date: string): Promise<Schedule[]>
  async getSchedulesByDateRange(start: string, end: string): Promise<Schedule[]>
  async getCourses(): Promise<Course[]>
  async getCoursesByWeek(weekNum: number): Promise<Course[]>
  async getCoursesByWeekAndDay(weekNum: number, weekday: number): Promise<Course[]>
  getSemesterConfig(): SemesterConfig
  getCurrentWeek(): number
}
```

**接入方式**：实现上述接口后，在 `app.ts` onLaunch 中调用 `repository.switchTo(new RemoteRepository(url, token))`，其余代码无需改动。

### 3. 多会话管理

**位置**：`miniprogram/types/ai.ts` + `miniprogram/services/config-store.ts`

```typescript
// ChatMessage 新增字段
interface ChatMessage {
  // ...existing fields...
  conversationId: string  // 会话 ID
}

// 新建会话服务
interface ConversationStore {
  getAll(): Conversation[]
  create(title?: string): Conversation
  delete(id: string): void
  getMessages(conversationId: string): ChatMessage[]
  appendMessage(conversationId: string, msg: ChatMessage): void
}
```

**接入方式**：`ChatMessage` 加 `conversationId`，新建 `conversation-store.ts` 管理会话列表，chat 页增加侧滑会话切换 UI。

### 4. 多 Provider 分发

**位置**：`miniprogram/services/ai-client.ts`

```typescript
/**
 * 多 Provider 客户端
 * 未来实现：按 cfg.provider 或 baseUrl 自动分发到对应实现
 */
interface AiProvider {
  name: string
  chat(cfg: AiConfig, messages: ChatMessage[], options?: AiChatOptions): Promise<AiChatResult>
  fetchModels(cfg: AiConfig): Promise<ModelInfo[]>
}

// 注册表
const providers: Record<string, AiProvider> = {
  openai: new OpenAIProvider(),
  deepseek: new DeepSeekProvider(),
  anthropic: new AnthropicProvider(),
}

// aiClient.chat 内部分发
function chat(cfg: AiConfig, messages: ChatMessage[], options?: AiChatOptions) {
  const provider = detectProvider(cfg.baseUrl)  // 按 baseUrl 匹配
  return providers[provider].chat(cfg, messages, options)
}
```

### 5. 上下文截断

**位置**：`miniprogram/services/ai-client.ts`

```typescript
/**
 * 上下文窗口管理
 * 未来实现：在 chat() 入口预处理 messages，截断超长历史
 */
function truncateMessages(
  messages: ChatMessage[],
  maxTokens: number,
  tokenizer?: (text: string) => number
): ChatMessage[] {
  // 保留 system 消息 + 最近 N 条，中间用摘要替代
}
```

**接入方式**：`chat()` 方法 `buildBody` 之前调用 `truncateMessages()`，默认按字符数估算 token，未来可接入精确 tokenizer。

### 6. 更多 AI 工具

**位置**：`miniprogram/services/ai-tools.ts`

```typescript
// 追加工具定义到 aiToolDefinitions 数组
{
  type: 'function',
  function: {
    name: 'create_schedule',
    description: '创建新日程',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: '日程标题' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        time: { type: 'string', description: 'HH:mm' },
        location: { type: 'string', description: '地点' }
      },
      required: ['title', 'date']
    }
  }
}

// 在 aiToolExecutor 的 switch 中追加 case
case 'create_schedule': {
  const { title, date, time, location } = args
  // 调用 repository 写入新日程
  // 返回创建结果 JSON
}
```

**接入方式**：只需追加定义 + executor case，`ai-client.ts` 的工具循环逻辑无需改动。

### 7. 多账号配置

**位置**：`miniprogram/services/config-store.ts`

```typescript
// AiConfig 升级为多账号
interface AiConfigAccount extends AiConfig {
  id: string        // 账号唯一 ID
  label: string     // 显示名称，如"DeepSeek 主号"
  createdAt: number
}

// config-store 升级
interface ConfigStoreV2 {
  getAll(): AiConfigAccount[]
  getActive(): AiConfig              // 当前激活账号
  setActive(id: string): void
  addAccount(config: AiConfigAccount): void
  removeAccount(id: string): void
}
```

**接入方式**：Storage key 从 `aiConfig` 改为 `aiConfigAccounts` + `aiConfigActiveId`，model 页增加账号切换 UI。

### 8. 加密算法升级

**位置**：`miniprogram/utils/crypto.ts`

```typescript
/**
 * 未来可升级为 AES-256
 * 当前 WB1: 前缀标识 XOR 版本，升级后用 WB2: 标识
 * decrypt() 自动识别前缀，平滑迁移
 */
export const cryptoUtil = {
  encrypt(plaintext: string): string {
    // return `WB2:${aesEncrypt(plaintext, deviceKey)}`
  },
  decrypt(ciphertext: string): string {
    if (ciphertext.startsWith('WB2:')) {
      // return aesDecrypt(ciphertext.slice(4), deviceKey)
    }
    if (ciphertext.startsWith('WB1:')) {
      return xorDecrypt(ciphertext.slice(4), deviceKey)  // 旧版兼容
    }
    return ciphertext  // 明文兼容
  }
}
```

**接入方式**：引入 CryptoJS 或微信小程序加密 API，`encrypt` 输出 `WB2:` 前缀，`decrypt` 按前缀自动选择解密算法，旧数据自动迁移。

---

## 实机测试注意事项

### 问题：`request:fail url not in domain list`

实机预览扫码时，微信会**强制校验 request 合法域名白名单**。`project.config.json` 中的 `urlCheck: false` 只在开发者工具模拟器和"真机调试"模式下生效，普通"预览"扫码不生效。

### 解决方案

#### 方案一：配置域名白名单（正式发布必须做）

1. 登录 [微信公众平台](https://mp.weixin.qq.com)（AppID：`wx20cca8043b5adc65`）
2. 进入 **开发管理 → 开发设置 → 服务器域名**
3. 在 **request 合法域名** 中添加：
   ```
   https://api.deepseek.com
   ```
4. 保存后重新预览即可

> ⚠️ 域名必须是 **HTTPS**，且 SSL 证书有效。DeepSeek API 本身就是 HTTPS，直接添加即可。

#### 方案二：用"真机调试"代替"预览"（开发阶段快速测试）

在开发者工具中，不点"预览"，改为点 **"真机调试"** 按钮。真机调试模式会读取 `urlCheck: false`，跳过域名校验，适合开发阶段快速验证。

### 两种方式对比

| | 预览（扫码） | 真机调试 |
|---|---|---|
| 域名校验 | **强制校验**，必须在后台配白名单 | 跟随 `urlCheck: false`，不校验 |
| 适用场景 | 给他人体验、正式发布前验证 | 开发者自己调试功能 |
| 配置要求 | 需在公众平台配域名 | 无需配域名 |

> **建议**：开发阶段用"真机调试"快速迭代，功能稳定后在公众平台配好域名再用"预览"做最终验证。