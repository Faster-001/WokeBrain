import { configStore } from '../../../services/config-store'
import { aiClient } from '../../../services/ai-client'

Page({
  data: {
    baseUrl: '',
    apiKey: '',
    passwordVisible: false,
    loading: false,
    models: [
      { id: 1, name: 'gpt-5.5', needMarquee: false },
      { id: 2, name: 'deepseek-v4-flash', needMarquee: false },
      { id: 3, name: 'qwen-3.5-turbo', needMarquee: false },
      { id: 4, name: 'claude-4-opus', needMarquee: false },
      { id: 5, name: 'gemini-3.0-pro', needMarquee: false },
      { id: 6, name: 'llama-4-70b', needMarquee: false },
      { id: 7, name: 'mistral-large-3', needMarquee: false },
      { id: 8, name: 'yi-3.5-large', needMarquee: false },
      { id: 9, name: 'glm-5-plus', needMarquee: false },
      { id: 10, name: 'moonshot-v3-128k', needMarquee: false },
      { id: 11, name: 'gpt-5.5-turbo', needMarquee: false },
      { id: 12, name: 'deepseek-v4-coder', needMarquee: false },
      { id: 13, name: 'qwen-3.5-vl', needMarquee: false },
      { id: 14, name: 'claude-4-sonnet', needMarquee: false },
      { id: 15, name: 'gemini-3.0-flash', needMarquee: false },
      { id: 16, name: 'llama-4-8b', needMarquee: false },
      { id: 17, name: 'mistral-medium-3', needMarquee: false },
      { id: 18, name: 'yi-3.5-medium', needMarquee: false },
      { id: 19, name: 'glm-5-airxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', needMarquee: false },
      { id: 20, name: '_custom_', needMarquee: false }
    ],
    selectedModelId: null as number | null,
    customModelId: ''
  },

  onLoad() {
    this.restoreConfig()
  },

  onShow() {
    // 从其他页面返回时也刷新配置回填
    this.restoreConfig()
    // 每次进入页面默认隐藏 apiKey
    this.setData({ passwordVisible: false })
  },

  onHide() {
    // 离开页面时隐藏 apiKey 并清除内存中的明文
    this.setData({ passwordVisible: false })
    configStore.clearApiKey()
  },

  onUnload() {
    // 页面卸载时同样清除
    this.setData({ passwordVisible: false })
    configStore.clearApiKey()
  },

  /** 安全提示弹窗 */
  onSecurityTip() {
    wx.showModal({
      title: 'API Key 安全说明',
      content: '你的 API Key 采用设备绑定加密存储，仅保存在本地，不会上传到任何服务器。\n\n• 离开此页面后自动隐藏\n• 存储时加密，无法被直接读取\n• 请勿在公共设备上保存 API Key\n• 定期更换 API Key 更安全',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  /** 从 configStore 回填 baseUrl / apiKey / selectedModel 到 UI */
  restoreConfig() {
    const cfg = configStore.get()
    const patch: Record<string, any> = {
      baseUrl: cfg.baseUrl,
      apiKey: cfg.apiKey
    }
    // 回填选中的模型
    if (cfg.selectedModel) {
      const foundIndex = this.data.models.findIndex(m => m.name === cfg.selectedModel)
      if (foundIndex >= 0) {
        patch.selectedModelId = this.data.models[foundIndex].id
      } else {
        // 未在预设列表中 → 选中"自定义"并回填
        patch.selectedModelId = this.data.models[this.data.models.length - 1].id
        patch.customModelId = cfg.selectedModel
      }
    }
    this.setData(patch)
    this.checkMarquee()
  },

  onBaseUrlInput(e: WechatMiniprogram.Input) {
    const sanitized = e.detail.value.replace(/[^\x21-\x7E]/g, '').slice(0, 100)
    this.setData({ baseUrl: sanitized })
    return sanitized
  },

  onApiKeyInput(e: WechatMiniprogram.Input) {
    const sanitized = e.detail.value.replace(/[^\x21-\x7E]/g, '').slice(0, 100)
    this.setData({ apiKey: sanitized })
    return sanitized
  },

  onToggleApiKeyVisible() {
    this.setData({ passwordVisible: !this.data.passwordVisible })
  },

  onSaveAndFetch() {
    const { baseUrl, apiKey } = this.data
    if (!baseUrl || !apiKey) {
      wx.showToast({ title: '请填写 Base URL 和 API Key', icon: 'none' })
      return
    }
    configStore.patch({ baseUrl, apiKey })
    this.fetchModels()
  },

  async fetchModels() {
    if (this.data.loading) return
    this.setData({ loading: true })
    wx.showLoading({ title: '获取模型中...', mask: true })
    try {
      const cfg = configStore.get()
      const remoteModels = await aiClient.fetchModels(cfg)
      if (remoteModels.length === 0) {
        wx.showToast({ title: '未获取到模型', icon: 'none' })
        return
      }
      // 用 API 返回的模型替换硬编码列表，末尾追加"自定义模型"项
      const newModels = remoteModels.map((m, i) => ({
        id: i + 1,
        name: m.name,
        needMarquee: false
      }))
      newModels.push({ id: newModels.length + 1, name: '_custom_', needMarquee: false })

      // 保留之前选中的模型（如果在新列表中存在）
      const prevSelected = configStore.get().selectedModel
      let newSelectedId: number | null = null
      let newCustomModelId = this.data.customModelId
      if (prevSelected) {
        const foundIndex = newModels.findIndex(m => m.name === prevSelected)
        if (foundIndex >= 0) {
          newSelectedId = newModels[foundIndex].id
        } else {
          newSelectedId = newModels[newModels.length - 1].id
          newCustomModelId = prevSelected
        }
      }

      this.setData({
        models: newModels,
        selectedModelId: newSelectedId,
        customModelId: newCustomModelId
      })
      this.checkMarquee()
      wx.showToast({ title: '获取成功', icon: 'success', duration: 1500 })
    } catch (err: any) {
      const errMsg = err?.errMsg || err?.message || '获取模型失败'
      wx.showToast({ title: errMsg.slice(0, 30), icon: 'none', duration: 3000 })
    } finally {
      this.setData({ loading: false })
      wx.hideLoading()
    }
  },

  onModelSelect(e: WechatMiniprogram.TouchEvent) {
    const modelId = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    this.setData({ selectedModelId: modelId })

    // 确定选中的模型名称并持久化
    let selectedModelName = ''
    if (index === this.data.models.length - 1) {
      // 自定义模型
      selectedModelName = this.data.customModelId
    } else {
      const model = this.data.models.find(m => m.id === modelId)
      selectedModelName = model ? model.name : ''
    }
    if (selectedModelName) {
      configStore.patch({ selectedModel: selectedModelName })
    }
  },

  onCustomModelInput(e: WechatMiniprogram.Input) {
    const sanitized = e.detail.value.replace(/[^\x21-\x7E]/g, '').slice(0, 100)
    this.setData({ customModelId: sanitized })
    // 如果当前选中的是自定义模型，实时持久化
    if (this.data.selectedModelId === this.data.models[this.data.models.length - 1].id && sanitized) {
      configStore.patch({ selectedModel: sanitized })
    }
    return sanitized
  },

  checkMarquee() {
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.selectAll('.model-name-wrapper').boundingClientRect()
      query.selectAll('.model-name').boundingClientRect()
      query.exec((res) => {
        if (res[0] && res[1]) {
          const wrappers = res[0]
          const texts = res[1]
          const models = this.data.models.map((model, index) => {
            if (index < this.data.models.length - 1 && wrappers[index] && texts[index]) {
              const needMarquee = texts[index].width > wrappers[index].width
              return {
                ...model,
                needMarquee,
                marqueeDistance: needMarquee ? texts[index].width - wrappers[index].width : 0
              }
            }
            return model
          })
          this.setData({ models })
        }
      })
    }, 100)
  }
})