import { enrichSchedule, formatDate } from '../../utils/util'

Component({
  data: {
    scrollViewHeight: 0,
    contentPaddingBottom: 0,
    schedules: [] as any[],
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
      this.loadSchedules()
    },
    loadSchedules() {
      const app = getApp<IAppOption>()
      const allSchedules = app.globalData.schedules || []
      const enrichedSchedules = allSchedules.slice(0, 3).map((s: any, index: number) => {
        const enriched = enrichSchedule(s, index)
        return {
          ...enriched,
          date: formatDate(s.date)
        }
      })
      this.setData({ schedules: enrichedSchedules })
    },
    goToSchedule() {
      wx.navigateTo({ url: '/pages/memory/schedule/schedule' })
    },
    goToTimetable() {
      wx.navigateTo({ url: '/pages/memory/timetable/timetable' })
    },
    onSyncTap() {
      wx.showLoading({ title: '同步中，请稍后…', mask: true })
      const app = getApp<IAppOption>()
      app.syncAllData()
      setTimeout(() => {
        wx.hideLoading()
        wx.showToast({
          title: '同步完成！',
          icon: 'success',
          duration: 1500
        })
        this.loadSchedules()
      }, 600)
    }
  }
})
