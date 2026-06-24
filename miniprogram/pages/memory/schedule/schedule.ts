import { enrichSchedule, formatDate } from '../../../utils/util'

Page({
  data: {
    scrollViewHeight: 0,
    schedules: [] as any[]
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      scrollViewHeight: sysInfo.windowHeight
    })
    this.loadSchedules()
  },

  onShow() {
    this.loadSchedules()
  },

  loadSchedules() {
    const app = getApp<IAppOption>()
    const allSchedules = app.globalData.schedules || []
    const enrichedSchedules = allSchedules.map((s: any, index: number) => {
      const enriched = enrichSchedule(s, index)
      return {
        ...enriched,
        date: formatDate(s.date),
        needMarquee: false,
        marqueeDistance: 0
      }
    })
    this.setData({ schedules: enrichedSchedules })
    this.checkMarquee()
  },

  checkMarquee() {
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.selectAll('.location-wrapper').boundingClientRect()
      query.selectAll('.schedule-location').boundingClientRect()
      query.exec((res) => {
        if (res[0] && res[1]) {
          const wrappers = res[0]
          const texts = res[1]
          const schedules = this.data.schedules.map((schedule, index) => {
            if (wrappers[index] && texts[index]) {
              const needMarquee = texts[index].width > wrappers[index].width
              return {
                ...schedule,
                needMarquee,
                marqueeDistance: needMarquee ? texts[index].width - wrappers[index].width : 0
              }
            }
            return schedule
          })
          this.setData({ schedules })
        }
      })
    }, 100)
  }
})
