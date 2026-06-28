export const formatTime = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return (
    [year, month, day].map(formatNumber).join('/') +
    ' ' +
    [hour, minute, second].map(formatNumber).join(':')
  )
}

const formatNumber = (n: number) => {
  const s = n.toString()
  return s[1] ? s : '0' + s
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const getWeekday = (dateStr: string): string => {
  const date = new Date(dateStr)
  return WEEKDAYS[date.getDay()]
}

export const getDaysUntil = (dateStr: string): number => {
  const target = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

export interface Schedule {
  id: string
  title: string
  date: string
  time: string
  location: string
  isCountdown: boolean
  weekday?: string
  countdown?: number
  needMarquee?: boolean
  marqueeDistance?: number
}

export const generateId = (date: string, time: string, index: number): string => {
  const datePart = date.replace(/-/g, '')
  const timePart = time.replace(':', '')
  const indexPart = (index + 1).toString().padStart(2, '0')
  return `${datePart}-${timePart}-${indexPart}`
}

export const enrichSchedule = (schedule: Omit<Schedule, 'id'>, index: number): Schedule => {
  const weekday = getWeekday(schedule.date)
  const daysUntil = getDaysUntil(schedule.date)
  const id = generateId(schedule.date, schedule.time, index)
  return {
    ...schedule,
    id,
    weekday,
    countdown: daysUntil > 0 ? daysUntil : 0
  }
}

export interface CourseRaw {
  name: string
  teacher: string
  location: string
  periodStart: number
  periodEnd: number
  weekday: number
  weeks: number[]
}

export interface Course extends CourseRaw {
  id: string
}

export interface SemesterConfig {
  startDate: string
  totalWeeks: number
}

const WEEKDAY_MAP = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export const getWeekdayLabel = (weekday: number): string => {
  return WEEKDAY_MAP[weekday] || ''
}

export const generateCourseId = (weekday: number, periodStart: number, periodEnd: number, index: number): string => {
  const wd = String(weekday)
  const ps = String(periodStart).padStart(2, '0')
  const pe = String(periodEnd).padStart(2, '0')
  const idx = String(index + 1).padStart(2, '0')
  return `${wd}${ps}${pe}-${idx}`
}

export const enrichCourse = (course: CourseRaw, index: number): Course => {
  return {
    ...course,
    id: generateCourseId(course.weekday, course.periodStart, course.periodEnd, index)
  }
}

export const getSemesterWeek = (semesterConfig: SemesterConfig, weekOffset: number): number => {
  const startDate = new Date(semesterConfig.startDate.replace(/\//g, '-'))
  const now = new Date()
  const currentSunday = new Date(now)
  currentSunday.setDate(now.getDate() - now.getDay() + weekOffset * 7)
  currentSunday.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((currentSunday.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const weekNum = Math.floor(diffDays / 7) + 1
  return weekNum
}

export const getCoursesForWeek = (courses: Course[], weekNum: number): Course[] => {
  return courses.filter(c => c.weeks.includes(weekNum))
}
