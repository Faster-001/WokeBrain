/**
 * AI 配置存取服务
 * 唯一与 wx.Storage 打交道的 AI 配置入口，页面不直接操作 Storage。
 *
 * 阶段六：apiKey 加密落盘，内存中保持明文供运行时使用。
 */
import { AiConfig } from '../types/ai'
import { cryptoUtil } from '../utils/crypto'

const STORAGE_KEY = 'aiConfig'

/** 空配置默认值 */
const DEFAULT_CONFIG: AiConfig = {
  baseUrl: '',
  apiKey: '',
  selectedModel: ''
}

export const configStore = {
  /** 从 Storage 读取配置，自动解密 apiKey */
  get(): AiConfig {
    const cached = wx.getStorageSync(STORAGE_KEY)
    if (cached && typeof cached === 'object') {
      const config = { ...DEFAULT_CONFIG, ...cached }
      // 解密 apiKey（兼容旧版明文数据）
      if (config.apiKey) {
        config.apiKey = cryptoUtil.decrypt(config.apiKey)
      }
      return config
    }
    return { ...DEFAULT_CONFIG }
  },

  /** 全量写入配置，apiKey 加密后落盘 */
  save(config: AiConfig): void {
    const toStore = { ...config }
    // 加密 apiKey 后再写入 Storage
    if (toStore.apiKey) {
      toStore.apiKey = cryptoUtil.encrypt(toStore.apiKey)
    }
    wx.setStorageSync(STORAGE_KEY, toStore)
    // 同步回填 globalData 缓存（保持明文）
    const app = getApp<IAppOption>()
    if (app && app.globalData) {
      app.globalData.aiConfig = config
    }
  },

  /** 部分更新配置（不覆盖其他字段） */
  patch(partial: Partial<AiConfig>): AiConfig {
    const current = this.get()
    const next = { ...current, ...partial }
    this.save(next)
    return next
  },

  /** 检查配置是否齐全（baseUrl + apiKey + selectedModel 均非空） */
  isReady(): boolean {
    const c = this.get()
    return !!(c.baseUrl && c.apiKey && c.selectedModel)
  },

  /**
   * 清除内存中的 apiKey（保留 baseUrl 和 selectedModel）
   * 用于页面隐藏时减少 apiKey 在内存中的暴露时间
   */
  clearApiKey(): void {
    const app = getApp<IAppOption>()
    if (app && app.globalData && app.globalData.aiConfig) {
      app.globalData.aiConfig = {
        ...app.globalData.aiConfig,
        apiKey: ''
      }
    }
  }
}
