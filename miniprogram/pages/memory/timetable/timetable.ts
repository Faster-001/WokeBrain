import { enrichCourse, getSemesterWeek, getCoursesForWeek, getPeriodTimeRange, type Course } from '../../../utils/util'

const MIN_WEEK = 1
const MAX_WEEK = 22

const estimateLineCount = (text: string, charactersPerLine: number): number => {
  return Math.max(1, Math.ceil(Array.from(text).length / charactersPerLine))
}

const truncateText = (text: string, charactersPerLine: number, lineLimit: number): string => {
  const characters = Array.from(text)
  const capacity = charactersPerLine * lineLimit
  if (characters.length <= capacity) {
    return text
  }
  if (capacity <= 3) {
    return '...'
  }
  return `${characters.slice(0, Math.max(1, capacity - 3)).join('')}...`
}

const formatWeeks = (weeks: number[]): string => {
  const sortedWeeks = [...weeks].sort((a, b) => a - b)
  if (sortedWeeks.length > 1 && sortedWeeks.every((week, index) => index === 0 || week - sortedWeeks[index - 1] === 2)) {
    const suffix = sortedWeeks[0] % 2 === 0 ? '双周' : '单周'
    return `${sortedWeeks[0]}-${sortedWeeks[sortedWeeks.length - 1]}${suffix}`
  }

  const ranges: string[] = []
  let rangeStart = sortedWeeks[0]
  let previous = sortedWeeks[0]
  for (let index = 1; index < sortedWeeks.length; index += 1) {
    const week = sortedWeeks[index]
    if (week === previous + 1) {
      previous = week
      continue
    }
    ranges.push(rangeStart === previous ? String(rangeStart) : `${rangeStart}-${previous}`)
    rangeStart = week
    previous = week
  }
  ranges.push(rangeStart === previous ? String(rangeStart) : `${rangeStart}-${previous}`)
  return `${ranges.join(',')}周`
}

interface CourseBlock {
  id: string
  weekday: number
  periodStart: number
  periodEnd: number
  segments: Course[]
}

const groupAdjacentCourses = (courses: Course[]): CourseBlock[] => {
  const sortedCourses = [...courses].sort((a, b) => (
    a.weekday - b.weekday || a.periodStart - b.periodStart || a.periodEnd - b.periodEnd
  ))

  return sortedCourses.reduce<CourseBlock[]>((blocks, course) => {
    const previous = blocks[blocks.length - 1]
    const previousSegment = previous
      ? previous.segments[previous.segments.length - 1]
      : undefined
    const isSameCourse = previousSegment
      && previous.weekday === course.weekday
      && previousSegment.name === course.name
      && previousSegment.teacher === course.teacher
      && previousSegment.location === course.location
    const isContinuous = previousSegment && course.periodStart === previousSegment.periodEnd + 1

    if (previous && isSameCourse && isContinuous) {
      previous.periodEnd = course.periodEnd
      previous.segments.push({ ...course })
      return blocks
    }

    blocks.push({
      id: course.id,
      weekday: course.weekday,
      periodStart: course.periodStart,
      periodEnd: course.periodEnd,
      segments: [{ ...course }]
    })
    return blocks
  }, [])
}

const getSegmentLayout = (
  course: Course,
  showStartTime: boolean,
  showEndTime: boolean,
  visibleDayCount: number
) => {
  const rowSpan = course.periodEnd - course.periodStart + 1
  const [startTime, endTime] = getPeriodTimeRange(course.periodStart, course.periodEnd).split('-')
  const weekText = formatWeeks(course.weeks)
  const periodText = `${course.periodStart}-${course.periodEnd}节`
  const charactersPerLine = visibleDayCount <= 5 ? 5 : visibleDayCount === 6 ? 4 : 3
  const contentLineBudget = rowSpan === 1 ? 5 : rowSpan === 2 ? 8 : rowSpan * 5 - 1
  const titleLineLimit = rowSpan === 1 ? 3 : rowSpan === 2 ? 4 : 6
  const teacherLineLimit = rowSpan === 1 ? 2 : rowSpan === 2 ? 2 : 3
  const locationLineLimit = rowSpan === 1 ? 3 : rowSpan === 2 ? 4 : 5

  let courseNameLines = Math.min(titleLineLimit, estimateLineCount(course.name, charactersPerLine))
  let teacherLines = Math.min(teacherLineLimit, estimateLineCount(course.teacher, charactersPerLine))
  let weekLines = Math.min(2, estimateLineCount(weekText, charactersPerLine))
  let periodLines = Math.min(2, estimateLineCount(periodText, charactersPerLine))
  const locationLines = Math.min(locationLineLimit, estimateLineCount(course.location, charactersPerLine))
  let showTeacher = Boolean(course.teacher)
  let showWeeks = true
  let showPeriods = true

  const usedLines = () => (
    courseNameLines
    + locationLines
    + (showTeacher ? teacherLines : 0)
    + (showWeeks ? weekLines : 0)
    + (showPeriods ? periodLines : 0)
    + Number(showStartTime)
    + Number(showEndTime)
  )

  if (usedLines() > contentLineBudget) {
    weekLines = 1
  }
  if (usedLines() > contentLineBudget) {
    periodLines = 1
  }
  if (usedLines() > contentLineBudget) {
    showPeriods = false
  }
  if (usedLines() > contentLineBudget) {
    showWeeks = false
  }
  if (usedLines() > contentLineBudget && courseNameLines > 2) {
    courseNameLines = 2
  }
  if (usedLines() > contentLineBudget) {
    teacherLines = 1
  }
  if (usedLines() > contentLineBudget) {
    showTeacher = false
  }

  const teacherText = showTeacher
    ? truncateText(course.teacher, charactersPerLine, teacherLines)
    : ''

  return {
    ...course,
    rowSpan,
    displayMode: rowSpan === 1 ? 'compact' : rowSpan === 2 ? 'standard' : 'expanded',
    courseNameLines,
    teacherLines,
    weekLines,
    locationLines,
    startTime,
    endTime,
    weekText,
    periodText,
    periodLines,
    showStartTime,
    showEndTime,
    teacherText,
    showTeacher,
    showWeeks,
    showPeriods,
    showLocation: Boolean(course.location)
  }
}

Page({
  data: {
    weekHeader: '',
    displayWeek: 1,
    isSemesterActive: true,
    isCurrentWeek: false,
    canPrev: false,
    canNext: true,
    visibleDays: ['星期一', '星期二', '星期三', '星期四', '星期五'],
    visibleGridColumns: [3, 4, 5, 6, 7],
    gridTemplateColumns: '24px 24px repeat(5, minmax(0, 1fr))',
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
    const activeCourses = getCoursesForWeek(enriched, weekNum)
    const dayLabels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const scheduledWeekdays = new Set(activeCourses.map(course => course.weekday))
    const visibleWeekdays = dayLabels
      .map((label, weekday) => ({ label, weekday }))
      .filter(day => (day.weekday >= 1 && day.weekday <= 5) || scheduledWeekdays.has(day.weekday))
    const coursesForWeek = groupAdjacentCourses(activeCourses).map(block => {
      const rowSpan = block.periodEnd - block.periodStart + 1
      return {
        ...block,
        displayMode: rowSpan === 1 ? 'compact' : rowSpan === 2 ? 'standard' : 'expanded',
        isConnected: block.segments.length > 1,
        segments: block.segments.map((course, index) => getSegmentLayout(
          course,
          index === 0,
          index === block.segments.length - 1,
          visibleWeekdays.length
        ))
      }
    })

    const weekdayToGridColumn = new Map(visibleWeekdays.map((day, index) => [day.weekday, index + 3]))
    const weekCourses = coursesForWeek.map((course: any) => ({
      ...course,
      gridColumn: weekdayToGridColumn.get(course.weekday)
    }))

    const realWeek = getSemesterWeek(semesterConfig, 0)

    this.setData({
      displayWeek: weekNum,
      weekHeader,
      isCurrentWeek: weekNum === realWeek,
      canPrev: weekNum > MIN_WEEK,
      canNext: weekNum < MAX_WEEK,
      visibleDays: visibleWeekdays.map(day => day.label),
      visibleGridColumns: visibleWeekdays.map((_, index) => index + 3),
      gridTemplateColumns: `24px 24px repeat(${visibleWeekdays.length}, minmax(0, 1fr))`,
      weekCourses
    })
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
  }
})
