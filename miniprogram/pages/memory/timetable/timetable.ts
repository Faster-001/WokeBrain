import { enrichCourse, getSemesterWeek, getCoursesForWeek, type Course } from '../../../utils/util'

const MIN_WEEK = 1
const MAX_WEEK = 22

Page({
  data: {
    weekHeader: '',
    displayWeek: 1,
    isSemesterActive: true,
    isCurrentWeek: false,
    canPrev: false,
    canNext: true,
    dayLabels: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    periodGroups: [
      { label: '上午', startRow: 3, endRow: 8 },
      { label: '下午', startRow: 8, endRow: 13 },
      { label: '晚上', startRow: 13, endRow: 16 }
    ],
    morningPeriods: [1, 2, 3, 4, 5],
    afternoonPeriods: [6, 7, 8, 9, 10],
    eveningPeriods: [11, 12, 13],
    totalCols: 9,
    totalRows: 15,
    weekCourses: [] as Course[]
  },

  onLoad() {
    const app = getApp<IAppOption>()
    const semesterConfig = app.globalData.semesterConfig || { startDate: '2026/03/02', totalWeeks: 20 }
    const realWeek = getSemesterWeek(semesterConfig, 0)
    if (realWeek >= MIN_WEEK && realWeek <= MAX_WEEK) {
      this.setData({ isSemesterActive: true })
      this.showWeek(realWeek)
    } else {
      this.setData({ isSemesterActive: false })
      this.showWeek(MIN_WEEK)
    }
  },

  showWeek(weekNum: number) {
    const app = getApp<IAppOption>()
    const semesterConfig = app.globalData.semesterConfig || { startDate: '2026/03/02', totalWeeks: 20 }
    const startDate = new Date(semesterConfig.startDate.replace(/\//g, '-'))
    const startSunday = new Date(startDate)
    startSunday.setDate(startDate.getDate() - startDate.getDay())

    const weekSunday = new Date(startSunday)
    weekSunday.setDate(startSunday.getDate() + (weekNum - MIN_WEEK) * 7)
    const weekSaturday = new Date(weekSunday)
    weekSaturday.setDate(weekSunday.getDate() + 6)

    const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`
    const weekHeader = `${fmt(weekSunday)} ~ ${fmt(weekSaturday)} · 第${weekNum}周`

    const rawCourses = app.globalData.courses || []
    const enriched = rawCourses.map((c: any, i: number) => enrichCourse(c, i))
    const weekCourses = getCoursesForWeek(enriched, weekNum).map((c: any) => {
      const rowSpan = c.periodEnd - c.periodStart + 1
      return { ...c, maxLines: rowSpan * 3 }
    })

    const realWeek = getSemesterWeek(semesterConfig, 0)

    this.setData({
      displayWeek: weekNum,
      weekHeader,
      isCurrentWeek: weekNum === realWeek,
      canPrev: weekNum > MIN_WEEK,
      canNext: weekNum < MAX_WEEK,
      weekCourses
    })
    this.checkMarquee()
  },

  onPrevWeek() {
    if (this.data.canPrev) {
      this.showWeek(this.data.displayWeek - 1)
    }
  },

  onThisWeek() {
    if (!this.data.isSemesterActive) {
      wx.showToast({ title: '学期已结束/尚未开始', icon: 'none', duration: 2000 })
      return
    }
    const app = getApp<IAppOption>()
    const semesterConfig = app.globalData.semesterConfig || { startDate: '2026/03/02', totalWeeks: 20 }
    const realWeek = getSemesterWeek(semesterConfig, 0)
    this.showWeek(realWeek)
  },

  onNextWeek() {
    if (this.data.canNext) {
      this.showWeek(this.data.displayWeek + 1)
    }
  },

  checkMarquee() {
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.selectAll('.course-marquee-wrapper').boundingClientRect()
      query.selectAll('.course-teacher').boundingClientRect()
      query.selectAll('.course-location').boundingClientRect()
      query.exec((res) => {
        const wrappers = res[0] || []
        const teachers = res[1] || []
        const locations = res[2] || []
        const courses = this.data.weekCourses as any[]

        let changed = false
        for (let i = 0; i < courses.length; i++) {
          const ti = i * 2
          const li = i * 2 + 1
          const tWrapper = wrappers[ti]
          const lWrapper = wrappers[li]
          const tText = teachers[i]
          const lText = locations[i]

          if (tWrapper && tText && tText.width > tWrapper.width) {
            courses[i] = { ...courses[i], teacherMarquee: true, teacherMarqueeDist: tText.width - tWrapper.width }
            changed = true
          }
          if (lWrapper && lText && lText.width > lWrapper.width) {
            courses[i] = { ...courses[i], locationMarquee: true, locationMarqueeDist: lText.width - lWrapper.width }
            changed = true
          }
        }
        if (changed) {
          this.setData({ weekCourses: courses })
        }
      })
    }, 100)
  }
})
