App<IAppOption>({
  globalData: {},
  onLaunch() {
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    const sysInfo = wx.getSystemInfoSync()
    const tabBarHeight = 60
    const tabBarBottom = 35
    const extraGap = 10
    const safeAreaBottom = sysInfo.screenHeight - sysInfo.safeArea.bottom

    this.globalData.contentPaddingBottom = tabBarBottom + tabBarHeight + extraGap + safeAreaBottom

    wx.login({
      success: res => {
        console.log(res.code)
      },
    })
  },
})
