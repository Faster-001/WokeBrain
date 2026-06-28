import { enrichCourse, getSemesterWeek, getCoursesForWeek, type Course } from '../../../utils/util'

Page({
  data: {
    weekStart: '',
    weekEnd: '',
    weekOffset: 0,
    isCurrentWeek: true,
    currentWeekNum: 1,
    semesterTotalWeeks: 20,
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
    this.showWeek(0)
  },

  showWeek(offset: number) {
    const now = new Date()
    now.setDate(now.getDate() + offset * 7)
    const day = now.getDay()
    const sunday = new Date(now)
    sunday.setDate(now.getDate() - day)
    const saturday = new Date(sunday)
    saturday.setDate(sunday.getDate() + 6)

    const fmt = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}/${m}/${dd}`
    }

    const app = getApp<IAppOption>()
    const semesterConfig = app.globalData.semesterConfig || { startDate: '2026/03/02', totalWeeks: 20 }
    const weekNum = getSemesterWeek(semesterConfig, offset)
    const rawCourses = app.globalData.courses || []
    const enriched = rawCourses.map((c: any, i: number) => enrichCourse(c, i))
    const weekCourses = getCoursesForWeek(enriched, weekNum)

    this.setData({
      weekOffset: offset,
      weekStart: fmt(sunday),
      weekEnd: fmt(saturday),
      isCurrentWeek: offset === 0,
      currentWeekNum: weekNum,
      semesterTotalWeeks: semesterConfig.totalWeeks,
      weekCourses
    })
  },

  onPrevWeek() {
    const offset = this.data.weekOffset - 1
    this.showWeek(offset)
  },

  onThisWeek() {
    this.showWeek(0)
  },

  onNextWeek() {
    const offset = this.data.weekOffset + 1
    this.showWeek(offset)
  }
})
