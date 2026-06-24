App<IAppOption>({
  globalData: {
    contentPaddingBottom: 0,
    schedules: []
  },
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

    this.initSchedules()

    wx.login({
      success: res => {
        console.log(res.code)
      },
    })
  },

  initSchedules() {
    const cachedSchedules = wx.getStorageSync('schedules')
    if (cachedSchedules && cachedSchedules.length > 0) {
      this.globalData.schedules = cachedSchedules
    } else {
      const defaultSchedules = [
        { title: '小组会议', date: '2026-07-04', time: '14:00', location: '会议室A301', isCountdown: false },
        { title: '项目评审', date: '2026-07-05', time: '10:00', location: '报告厅2F', isCountdown: true },
        { title: '生日聚会', date: '2026-07-07', time: '18:30', location: '市中心餐厅', isCountdown: false },
        { title: '数据结构实验：深度优先搜索与广度优先搜索，上机测试限时2小时', date: '2026-07-08', time: '08:30', location: '实验楼C102xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', isCountdown: true },
        { title: '英语四级考试', date: '2026-07-09', time: '09:00', location: '教学楼B201', isCountdown: true },
        { title: '社团例会', date: '2026-07-10', time: '19:00', location: '学生活动中心', isCountdown: false },
        { title: '导师面谈', date: '2026-07-11', time: '15:30', location: '理工楼508', isCountdown: false },
        { title: '篮球训练', date: '2026-07-12', time: '16:00', location: '体育馆', isCountdown: false },
        { title: '志愿者活动', date: '2026-07-13', time: '08:00', location: '社区服务中心', isCountdown: false },
        { title: '期中考试复习', date: '2026-07-14', time: '14:00', location: '图书馆3楼', isCountdown: true },
        { title: '高等数学期中考', date: '2026-07-15', time: '10:00', location: '教学楼A101', isCountdown: true },
        { title: '班会', date: '2026-07-16', time: '18:30', location: '教室205', isCountdown: false },
        { title: '编程竞赛', date: '2026-07-17', time: '13:00', location: '计算机实验室', isCountdown: true },
        { title: '学术讲座', date: '2026-07-18', time: '19:00', location: '报告厅1F', isCountdown: false },
        { title: '团队建设', date: '2026-07-19', time: '15:00', location: '户外拓展基地', isCountdown: false },
        { title: '实习面试', date: '2026-07-20', time: '10:00', location: '科技园B座', isCountdown: true },
        { title: '家庭聚餐', date: '2026-07-21', time: '18:00', location: '家乡饭店', isCountdown: false },
        { title: '论文开题', date: '2026-07-22', time: '14:30', location: '研究生院会议室', isCountdown: true },
        { title: '健身私教课', date: '2026-07-23', time: '17:00', location: '健身房', isCountdown: false },
        { title: '毕业典礼彩排', date: '2026-07-24', time: '09:00', location: '大礼堂', isCountdown: true }
      ]
      this.globalData.schedules = defaultSchedules
      wx.setStorageSync('schedules', defaultSchedules)
      wx.showToast({
        title: '记忆被清除了！',
        icon: 'none',
        duration: 2000
      })
    }
  },

  updateSchedules(schedules: any[]) {
    this.globalData.schedules = schedules
    wx.setStorageSync('schedules', schedules)
  }
})
