/**
 * AI 工具定义与执行器
 *
 * 设计意图：
 * - aiToolDefinitions 定义 OpenAI function calling 格式的工具列表
 * - aiToolExecutor 将工具名映射到 repository 调用，返回 JSON 字符串
 * - 新增工具只需追加定义 + executor case，不影响现有逻辑
 */
import { AiToolDefinition } from '../types/ai'
import { repository } from './repository'
import { getPeriodTimeRange, getWeekdayLabel } from '../utils/util'

// ========== 工具定义 ==========

export const aiToolDefinitions: AiToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_today_schedule',
      description: '获取今天的日程安排列表，包含标题、时间、地点等信息',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_today_courses',
      description: '获取今天的课程表，包含课程名称、教师、地点、节次、时间范围',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_week_schedule',
      description: '获取本周（周一至周日）的所有日程安排',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_week_courses',
      description: '获取本周的所有课程，按星期几分组',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_schedule_by_date',
      description: '获取指定日期的日程安排',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: '日期，格式 YYYY-MM-DD，如 2026-07-12'
          }
        },
        required: ['date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_courses_by_date',
      description: '获取指定日期的课程。会自动根据学期配置计算该日期对应的教学周和星期几',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: '日期，格式 YYYY-MM-DD，如 2026-07-12'
          }
        },
        required: ['date']
      }
    }
  }
]

// ========== 工具执行器 ==========

/** 获取今天的日期字符串 YYYY-MM-DD */
function getTodayStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 获取本周的日期范围 { start: 周一, end: 周日 } */
function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=周日, 1=周一, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek

  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  const sunday = new Date(now)
  sunday.setDate(now.getDate() + sundayOffset)

  const fmt = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return { start: fmt(monday), end: fmt(sunday) }
}

/** 根据日期字符串计算星期几 (1=周一, ..., 7=周日) */
function getWeekdayFromDate(dateStr: string): number {
  const d = new Date(dateStr)
  const day = d.getDay()
  return day === 0 ? 7 : day
}

/** 根据日期计算教学周数 */
function getWeekNumFromDate(dateStr: string): number {
  const repo = repository.get()
  const cfg = repo.getSemesterConfig()
  const startDate = new Date(cfg.startDate.replace(/\//g, '-'))
  // 找到学期开始日期所在周的周日
  const startSunday = new Date(startDate)
  startSunday.setDate(startDate.getDate() - startDate.getDay())
  startSunday.setHours(0, 0, 0, 0)

  const target = new Date(dateStr)
  const targetSunday = new Date(target)
  targetSunday.setDate(target.getDate() - target.getDay())
  targetSunday.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((targetSunday.getTime() - startSunday.getTime()) / (1000 * 60 * 60 * 24))
  return Math.floor(diffDays / 7) + 1
}

/**
 * 工具执行器
 * 接收工具名和参数，返回 JSON 字符串结果
 */
export async function aiToolExecutor(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const repo = repository.get()

  switch (name) {
    case 'get_today_schedule': {
      const today = getTodayStr()
      const schedules = repo.getSchedulesByDate(today)
      return JSON.stringify({
        date: today,
        count: schedules.length,
        schedules: schedules.map(s => ({
          title: s.title,
          time: s.time,
          location: s.location,
          isCountdown: s.isCountdown
        }))
      })
    }

    case 'get_today_courses': {
      const today = getTodayStr()
      const weekday = getWeekdayFromDate(today)
      const weekNum = getWeekNumFromDate(today)
      const courses = repo.getCoursesByWeekAndDay(weekNum, weekday)
      return JSON.stringify({
        date: today,
        weekday: getWeekdayLabel(weekday),
        weekNum,
        count: courses.length,
        courses: courses.map(c => ({
          name: c.name,
          teacher: c.teacher,
          location: c.location,
          period: `${c.periodStart}-${c.periodEnd}节`,
          timeRange: getPeriodTimeRange(c.periodStart, c.periodEnd),
          weeks: c.weeks
        }))
      })
    }

    case 'get_week_schedule': {
      const { start, end } = getWeekRange()
      const schedules = repo.getSchedulesByDateRange(start, end)
      return JSON.stringify({
        weekRange: { start, end },
        count: schedules.length,
        schedules: schedules.map(s => ({
          date: s.date,
          title: s.title,
          time: s.time,
          location: s.location,
          isCountdown: s.isCountdown
        }))
      })
    }

    case 'get_week_courses': {
      const weekNum = repo.getCurrentWeek()
      const courses = repo.getCoursesByWeek(weekNum)
      // 按星期几分组
      const grouped: Record<number, ReturnType<typeof mapCourse>[]> = {}
      for (const c of courses) {
        if (!grouped[c.weekday]) {
          grouped[c.weekday] = []
        }
        grouped[c.weekday].push(mapCourse(c))
      }
      return JSON.stringify({
        weekNum,
        totalCount: courses.length,
        coursesByDay: Object.entries(grouped).map(([day, list]) => ({
          weekday: getWeekdayLabel(Number(day)),
          courses: list
        }))
      })
    }

    case 'get_schedule_by_date': {
      const date = args.date as string
      if (!date) return JSON.stringify({ error: '缺少 date 参数' })
      const schedules = repo.getSchedulesByDate(date)
      return JSON.stringify({
        date,
        count: schedules.length,
        schedules: schedules.map(s => ({
          title: s.title,
          time: s.time,
          location: s.location,
          isCountdown: s.isCountdown
        }))
      })
    }

    case 'get_courses_by_date': {
      const date = args.date as string
      if (!date) return JSON.stringify({ error: '缺少 date 参数' })
      const weekday = getWeekdayFromDate(date)
      const weekNum = getWeekNumFromDate(date)
      const courses = repo.getCoursesByWeekAndDay(weekNum, weekday)
      return JSON.stringify({
        date,
        weekday: getWeekdayLabel(weekday),
        weekNum,
        count: courses.length,
        courses: courses.map(mapCourse)
      })
    }

    default:
      return JSON.stringify({ error: `未知工具: ${name}` })
  }
}

/** 课程数据映射辅助函数 */
function mapCourse(c: { name: string; teacher: string; location: string; periodStart: number; periodEnd: number; weeks: number[] }) {
  return {
    name: c.name,
    teacher: c.teacher,
    location: c.location,
    period: `${c.periodStart}-${c.periodEnd}节`,
    timeRange: getPeriodTimeRange(c.periodStart, c.periodEnd),
    weeks: c.weeks
  }
}