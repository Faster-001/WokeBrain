/**
 * AI 客户端 — 封装 OpenAI 兼容 API 调用
 * 对外暴露 fetchModels / chat，屏蔽 wx.request 细节。
 *
 * 阶段四：chat() 支持 tools 参数 + 自动工具调用循环
 */
import { AiConfig, ChatMessage, ModelInfo, AiChatResult, AiChatOptions, AiToolCall, AiToolResult } from '../types/ai'

/** 构建请求头 */
function buildHeaders(cfg: AiConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${cfg.apiKey}`
  }
}

/** 规范化 baseUrl：去掉尾部斜杠 */
function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

/**
 * 封装 wx.request 为 Promise
 * @internal
 */
function request(
  url: string,
  method: 'GET' | 'POST',
  header: Record<string, string>,
  data?: unknown
): Promise<WechatMiniprogram.RequestSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method,
      header,
      data: data as any,
      success: resolve,
      fail: reject
    })
  })
}

export const aiClient = {
  /**
   * 获取模型列表
   * GET /models
   */
  async fetchModels(cfg: AiConfig): Promise<ModelInfo[]> {
    const res = await request(
      `${normalizeBase(cfg.baseUrl)}/models`,
      'GET',
      buildHeaders(cfg)
    )
    const body = res.data as any
    const list: any[] = body?.data || []
    return list.map((m: any) => ({
      id: m.id || '',
      name: m.id || ''
    }))
  },

  /**
   * 发送对话请求（非流式）
   * POST /chat/completions
   *
   * 阶段一：基础对话，不含 tools
   * 阶段四：支持 tools 参数 + 自动工具调用循环
   */
  async chat(
    cfg: AiConfig,
    messages: ChatMessage[],
    options?: AiChatOptions
  ): Promise<AiChatResult> {
    const maxRounds = options?.maxToolRounds ?? 5
    const tools = options?.tools
    const toolExecutor = options?.toolExecutor

    // 构建请求体
    const buildBody = (msgs: ChatMessage[]) => {
      const body: Record<string, unknown> = {
        model: cfg.selectedModel,
        messages: msgs.map(m => {
          const apiMsg: Record<string, unknown> = {
            role: m.role,
            content: m.content
          }
          // assistant 消息携带 tool_calls
          if (m.role === 'assistant' && m.tool_calls && m.tool_calls.length > 0) {
            apiMsg.tool_calls = m.tool_calls
          }
          // tool 消息携带 tool_call_id
          if (m.role === 'tool' && m.tool_call_id) {
            apiMsg.tool_call_id = m.tool_call_id
          }
          return apiMsg
        })
      }
      if (tools && tools.length > 0) {
        body.tools = tools
      }
      return body
    }

    // 发送单次请求
    const doRequest = async (msgs: ChatMessage[]) => {
      const res = await request(
        `${normalizeBase(cfg.baseUrl)}/chat/completions`,
        'POST',
        buildHeaders(cfg),
        buildBody(msgs)
      )
      return res.data as any
    }

    // 无工具模式：直接返回
    if (!tools || tools.length === 0 || !toolExecutor) {
      const body = await doRequest(messages)
      const content = body?.choices?.[0]?.message?.content || ''
      return { content }
    }

    // 有工具模式：循环处理 tool_calls
    const conversationMessages = [...messages]
    let finalContent = ''

    for (let round = 0; round < maxRounds; round++) {
      const body = await doRequest(conversationMessages)
      const choice = body?.choices?.[0]
      const msg = choice?.message

      // 如果 AI 直接返回文本（无工具调用），结束循环
      if (!msg?.tool_calls || msg.tool_calls.length === 0) {
        finalContent = msg?.content || ''
        break
      }

      // 记录 assistant 消息（含 tool_calls）
      const toolCalls: AiToolCall[] = msg.tool_calls
      conversationMessages.push({
        id: `a_${Date.now()}_${round}`,
        role: 'assistant',
        content: msg.content || '',
        createdAt: Date.now(),
        status: 'success',
        tool_calls: toolCalls
      })

      // 执行每个工具调用
      const toolResults: AiToolResult[] = []
      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(tc.function.arguments || '{}')
        } catch {
          // arguments 解析失败，使用空对象
        }
        try {
          const result = await toolExecutor(tc.function.name, args)
          toolResults.push({
            tool_call_id: tc.id,
            role: 'tool',
            content: result
          })
        } catch (err: any) {
          toolResults.push({
            tool_call_id: tc.id,
            role: 'tool',
            content: JSON.stringify({ error: err?.message || '工具执行失败' })
          })
        }
      }

      // 将工具结果追加到对话
      for (const tr of toolResults) {
        conversationMessages.push({
          id: `t_${Date.now()}_${round}`,
          role: 'tool',
          content: tr.content,
          createdAt: Date.now(),
          status: 'success',
          tool_call_id: tr.tool_call_id
        })
      }
    }

    // 如果循环结束仍未获得文本（达到最大轮次），返回最后一条 assistant 内容
    if (!finalContent) {
      finalContent = '（工具调用已完成，但未生成文本回复）'
    }

    return { content: finalContent }
  }
}
