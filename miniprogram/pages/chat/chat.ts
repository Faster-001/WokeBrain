import { configStore } from '../../services/config-store'
import { aiClient } from '../../services/ai-client'
import { ChatMessage } from '../../types/ai'
import { aiToolDefinitions, aiToolExecutor } from '../../services/ai-tools'

Component({
  data: {
    messages: [] as ChatMessage[],
    inputValue: '',
    sending: false,
    configReady: false,
    contentPaddingBottom: 0,
    scrollViewHeight: 0,
    scrollIntoViewId: ''
  },
  lifetimes: {
    attached() {
      const app = getApp<IAppOption>()
      const sysInfo = wx.getSystemInfoSync()
      this.setData({
        contentPaddingBottom: app.globalData.contentPaddingBottom || 0,
        scrollViewHeight: sysInfo.windowHeight
      })
    }
  },
  methods: {
    onShow() {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: 0 })
      }
      // 每次显示时检查配置状态
      this.setData({ configReady: configStore.isReady() })
    },

    onInput(e: WechatMiniprogram.Input) {
      this.setData({ inputValue: e.detail.value })
    },

    async onSend() {
      const text = this.data.inputValue.trim()
      if (!text || this.data.sending) return

      if (!configStore.isReady()) {
        wx.showToast({ title: '请先配置 API', icon: 'none' })
        return
      }

      const cfg = configStore.get()
      const userMsg: ChatMessage = {
        id: `u_${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: Date.now(),
        status: 'success'
      }
      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        status: 'pending'
      }

      const messages = [...this.data.messages, userMsg, assistantMsg]
      this.setData({
        messages,
        inputValue: '',
        sending: true
      })
      this.scrollToBottom()

      try {
        const result = await aiClient.chat(
          cfg,
          this.data.messages.filter(m => m.status !== 'pending'),
          {
            tools: aiToolDefinitions,
            toolExecutor: aiToolExecutor
          }
        )
        // 更新 assistant 消息
        const updated = this.data.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: result.content, status: 'success' as const }
            : m
        )
        this.setData({ messages: updated })
        this.scrollToBottom()
      } catch (err: any) {
        const errorMsg = err?.errMsg || err?.message || '请求失败'
        const updated = this.data.messages.map(m =>
          m.id === assistantMsg.id
            ? { ...m, status: 'error' as const, error: errorMsg }
            : m
        )
        this.setData({ messages: updated })
      } finally {
        this.setData({ sending: false })
      }
    },

    /** 重试失败的消息 */
    async onRetry(e: WechatMiniprogram.TouchEvent) {
      const msgId = e.currentTarget.dataset.id as string
      if (!msgId || this.data.sending) return

      const msgIndex = this.data.messages.findIndex(m => m.id === msgId)
      if (msgIndex < 0) return

      // 找到该 assistant 消息之前的最后一条 user 消息
      let userContent = ''
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (this.data.messages[i].role === 'user') {
          userContent = this.data.messages[i].content
          break
        }
      }
      if (!userContent) return

      // 将当前 assistant 消息重置为 pending
      const messages = this.data.messages.map(m =>
        m.id === msgId
          ? { ...m, content: '', status: 'pending' as const, error: undefined }
          : m
      )
      this.setData({ messages, sending: true })

      const cfg = configStore.get()
      try {
        const result = await aiClient.chat(
          cfg,
          messages.filter(m => m.status !== 'pending'),
          {
            tools: aiToolDefinitions,
            toolExecutor: aiToolExecutor
          }
        )
        const updated = this.data.messages.map(m =>
          m.id === msgId
            ? { ...m, content: result.content, status: 'success' as const }
            : m
        )
        this.setData({ messages: updated })
      } catch (err: any) {
        const errorMsg = err?.errMsg || err?.message || '重试失败'
        const updated = this.data.messages.map(m =>
          m.id === msgId
            ? { ...m, status: 'error' as const, error: errorMsg }
            : m
        )
        this.setData({ messages: updated })
      } finally {
        this.setData({ sending: false })
      }
    },

    /** 滚动到消息列表底部 */
    scrollToBottom() {
      setTimeout(() => {
        const msgs = this.data.messages
        if (msgs.length > 0) {
          this.setData({
            scrollIntoViewId: `msg-${msgs[msgs.length - 1].id}`
          })
        }
      }, 100)
    },

    goToSettings() {
      wx.navigateTo({ url: '/pages/settings/model/model' })
    }
  }
})