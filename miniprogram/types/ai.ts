/**
 * AI 相关类型定义
 * 供服务层 (services/) 和页面层 (pages/) 共同引用
 */

/** AI 配置（持久化在 wx.Storage） */
export interface AiConfig {
  /** OpenAI 兼容端点，如 https://api.openai.com/v1 */
  baseUrl: string
  /** API 密钥，如 sk-... */
  apiKey: string
  /** 选中的模型 id，如 gpt-4o */
  selectedModel: string
}

/** 单条聊天消息 */
export interface ChatMessage {
  /** 唯一标识 */
  id: string
  /** 角色：system / user / assistant / tool */
  role: 'system' | 'user' | 'assistant' | 'tool'
  /** 消息内容 */
  content: string
  /** 创建时间戳 */
  createdAt: number
  /** 消息状态：pending 发送中 / success 成功 / error 失败 */
  status?: 'pending' | 'success' | 'error'
  /** 错误信息（status 为 error 时填充） */
  error?: string
  /** 工具调用列表（role=assistant 时可选） */
  tool_calls?: AiToolCall[]
  /** 工具调用 ID（role=tool 时必填，关联对应的 tool_call） */
  tool_call_id?: string
}

/** 模型信息（来自 GET /models） */
export interface ModelInfo {
  /** 模型 id，如 gpt-4o */
  id: string
  /** 显示名称 */
  name: string
}

/** AI 调用结果 */
export interface AiChatResult {
  /** AI 回复内容 */
  content: string
  /** 原始响应，便于调试/扩展 */
  raw?: WechatMiniprogram.RequestSuccessCallbackResult
}

// ========== 阶段四：工具调用相关类型 ==========

/** OpenAI 兼容的工具定义 */
export interface AiToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** AI 返回的工具调用 */
export interface AiToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

/** 工具执行结果 */
export interface AiToolResult {
  tool_call_id: string
  role: 'tool'
  content: string
}

/** chat 方法的扩展参数 */
export interface AiChatOptions {
  /** 工具定义列表，传入后启用 function calling */
  tools?: AiToolDefinition[]
  /** 工具执行器：接收工具名和参数，返回结果字符串 */
  toolExecutor?: (name: string, args: Record<string, unknown>) => Promise<string> | string
  /** 最大工具调用轮次，防止死循环，默认 5 */
  maxToolRounds?: number
}
