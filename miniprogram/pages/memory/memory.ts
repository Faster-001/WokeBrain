import { enrichSchedule, formatDate, enrichCourse, getSemesterWeek, getPeriodTimeRange, type CourseRaw } from '../../utils/util'

Component({
  data: {
    scrollViewHeight: 0,
    contentPaddingBottom: 0,
    schedules: [] as any[],
    courses: [] as any[],
    semesterOutOfRange: false
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
      this.loadCourses()
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
    loadCourses() {
      const app = getApp<IAppOption>()
      const allCourses = app.globalData.courses || []
      if (allCourses.length === 0) {
        this.setData({ courses: [], semesterOutOfRange: false })
        return
      }

      const semesterConfig = app.globalData.semesterConfig || { startDate: '2026/03/02', totalWeeks: 20 }
      const weekNum = getSemesterWeek(semesterConfig, 0)
      if (weekNum < 1 || weekNum > 22) {
        this.setData({ courses: [], semesterOutOfRange: true })
        return
      }

      const now = new Date()
      const todayWeekday = now.getDay()
      const currentHour = now.getHours()
      const showTomorrow = currentHour >= 20

      const targetWeekdays = [todayWeekday]
      if (showTomorrow) {
        targetWeekdays.push((todayWeekday + 1) % 7)
      }

      const filtered = allCourses
        .filter((c: CourseRaw) => targetWeekdays.includes(c.weekday) && c.weeks.includes(weekNum))
        .map((c: CourseRaw, i: number) => {
          const enriched = enrichCourse(c, i)
          return {
            ...enriched,
            timeRange: getPeriodTimeRange(c.periodStart, c.periodEnd)
          }
        })
        .sort((a, b) => (a.weekday - b.weekday) || (a.periodStart - b.periodStart))

      this.setData({ courses: filtered, semesterOutOfRange: false })
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
        this.loadCourses()
      }, 600)
    }
  }
})
