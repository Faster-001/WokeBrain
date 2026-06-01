Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/chat/chat",
        text: "对话",
        icon: "chat"
      },
      {
        pagePath: "/pages/memory/memory",
        text: "记忆",
        icon: "memory"
      },
      {
        pagePath: "/pages/settings/settings",
        text: "设置",
        icon: "settings"
      }
    ]
  },
  methods: {
    switchTab(e: any) {
      const url = e.currentTarget.dataset.path
      wx.switchTab({ url })
    }
  }
})