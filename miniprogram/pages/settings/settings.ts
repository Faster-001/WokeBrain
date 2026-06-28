Component({
  data: {
    scrollViewHeight: 0,
    contentPaddingBottom: 0,
    groups: [
      {
        title: '模型',
        items: [
          { id: 'modelManage', title: '模型管理', type: 'arrow' },
          { id: 'auth', title: '认证信息', type: 'arrow' }
        ]
      },
      {
        title: '关于',
        items: [
          { id: 'about', title: '关于「蜗壳脑袋」', type: 'arrow' }
        ]
      }
    ],
    authDialogVisible: false,
    authUsername: '',
    authPassword: '',
    passwordVisible: false,
    showAbout: false
  },
  lifetimes: {
    attached() {
      const app = getApp<IAppOption>()
      const sysInfo = wx.getSystemInfoSync()
      this.setData({
        scrollViewHeight: sysInfo.windowHeight,
        contentPaddingBottom: app.globalData.contentPaddingBottom || 0
      })
    }
  },
  methods: {
    onShow() {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({ selected: 2 })
      }
    },
    onArrowTap(e: WechatMiniprogram.CustomEvent) {
      const { itemIndex, groupIndex } = e.currentTarget.dataset
      const item = this.data.groups[groupIndex].items[itemIndex]
      if (item.id === 'modelManage') {
        wx.navigateTo({ url: '/pages/settings/model/model' })
      } else if (item.id === 'auth') {
        this.setData({ authDialogVisible: true })
      } else if (item.id === 'about') {
        this.setData({ showAbout: true })
      }
    },
    onAuthDialogClose() {
      this.setData({ authDialogVisible: false, authUsername: '', authPassword: '', passwordVisible: false })
    },
    onAuthConfirm() {
      const { authUsername, authPassword } = this.data
      console.log('Auth confirmed:', { username: authUsername, password: authPassword })
      this.setData({ authDialogVisible: false, authUsername: '', authPassword: '', passwordVisible: false })
    },
    onAuthUsernameInput(e: WechatMiniprogram.Input) {
      const sanitized = e.detail.value.replace(/[^\x21-\x7E]/g, '').slice(0, 50)
      this.setData({ authUsername: sanitized })
      return sanitized
    },
    onAuthPasswordInput(e: WechatMiniprogram.Input) {
      const sanitized = e.detail.value.replace(/[^\x21-\x7E]/g, '').slice(0, 50)
      this.setData({ authPassword: sanitized })
      return sanitized
    },
    onTogglePasswordVisible() {
      this.setData({ passwordVisible: !this.data.passwordVisible })
    },
    onDialogMaskTap() {
      if (this.data.authDialogVisible) {
        this.onAuthDialogClose()
      }
      if (this.data.showAbout) {
        this.setData({ showAbout: false })
      }
    },
    onAboutClose() {
      this.setData({ showAbout: false })
    },
    preventBubble() {}
  }
})
