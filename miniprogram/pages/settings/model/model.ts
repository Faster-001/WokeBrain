Page({
  data: {
    baseUrl: '',
    apiKey: '',
    passwordVisible: false,
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
    selectedModelId: null,
    customModelId: ''
  },

  onLoad() {
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
    this.fetchModels()
  },

  fetchModels() {
    console.log('TODO: fetch models from API')
  },

  onModelSelect(e: WechatMiniprogram.TouchEvent) {
    const modelId = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    this.setData({ selectedModelId: modelId })
    if (index === this.data.models.length - 1) {
      console.log('Custom model selected, id:', this.data.customModelId)
    } else {
      console.log('Model selected:', this.data.models.find(m => m.id === modelId))
    }
  },

  onCustomModelInput(e: WechatMiniprogram.Input) {
    const sanitized = e.detail.value.replace(/[^\x21-\x7E]/g, '').slice(0, 100)
    this.setData({ customModelId: sanitized })
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