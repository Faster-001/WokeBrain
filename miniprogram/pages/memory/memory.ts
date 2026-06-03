Component({
  data: {
    scrollViewHeight: 0,
    contentPaddingBottom: 0,
    schedules: [
      { id: 1, date: '6月4日', weekday: '周四', title: '小组会议', time: '14:00', isCountdown: false, countdown: 0 },
      { id: 2, date: '6月5日', weekday: '周五', title: '项目评审', time: '10:00', isCountdown: true, countdown: 2 },
      { id: 3, date: '6月7日', weekday: '周日', title: '生日聚会', time: '18:30', isCountdown: false, countdown: 0 }
    ],
    courses: [
      { id: 1, timeRange: '08:00-09:35', name: '高等数学', location: '教学楼A301' },
      { id: 2, timeRange: '10:05-11:40', name: '大学英语', location: '教学楼B205' },
      { id: 3, timeRange: '14:00-15:35', name: '数据结构', location: '实验楼C102' }
    ]
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
        this.getTabBar().setData({ selected: 1 })
      }
    },
    goToSchedule() {
      wx.navigateTo({ url: '/pages/memory/schedule/schedule' })
    },
    goToTimetable() {
      wx.navigateTo({ url: '/pages/memory/timetable/timetable' })
    }
  }
})
