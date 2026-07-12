/**
 * 数据仓库 — 抽象数据访问层
 *
 * 设计意图：
 * - IRepository 定义统一接口，页面/工具层只依赖接口，不感知数据来源
 * - LocalRepository 从 wx.Storage / globalData 读取
 * - RemoteRepository 为未来后端 API 预留（阶段四仅占位）
 * - repository 单例支持运行时切换数据源
 */
import { Schedule, Course, SemesterConfig, getSemesterWeek, getCoursesForWeek } from '../utils/util'

// ========== 接口定义 ==========

export interface IRepository {
  /** 获取所有日程 */
  getSchedules(): Schedule[]

  /** 获取指定日期的日程（date 格式 YYYY-MM-DD） */
  getSchedulesByDate(date: string): Schedule[]

  /** 获取日期范围内的日程 */
  getSchedulesByDateRange(startDate: string, endDate: string): Schedule[]

  /** 获取所有课程 */
  getCourses(): Course[]

  /** 获取指定周的课程 */
  getCoursesByWeek(weekNum: number): Course[]

  /** 获取指定周、指定星期几的课程 */
  getCoursesByWeekAndDay(weekNum: number, weekday: number): Course[]

  /** 获取学期配置 */
  getSemesterConfig(): SemesterConfig

  /** 获取当前学期周数 */
  getCurrentWeek(): number
}

// ========== 本地实现 ==========

export class LocalRepository implements IRepository {
  private getApp(): IAppOption {
    return getApp<IAppOption>()
  }

  getSchedules(): Schedule[] {
    return this.getApp().globalData.schedules || []
  }

  getSchedulesByDate(date: string): Schedule[] {
    return this.getSchedules().filter(s => s.date === date)
  }

  getSchedulesByDateRange(startDate: string, endDate: string): Schedule[] {
    return this.getSchedules().filter(s => s.date >= startDate && s.date <= endDate)
  }

  getCourses(): Course[] {
    return this.getApp().globalData.courses || []
  }

  getCoursesByWeek(weekNum: number): Course[] {
    return getCoursesForWeek(this.getCourses(), weekNum)
  }

  getCoursesByWeekAndDay(weekNum: number, weekday: number): Course[] {
    return this.getCoursesByWeek(weekNum).filter(c => c.weekday === weekday)
  }

  getSemesterConfig(): SemesterConfig {
    return this.getApp().globalData.semesterConfig || { startDate: '2026/03/02', totalWeeks: 20 }
  }

  getCurrentWeek(): number {
    return getSemesterWeek(this.getSemesterConfig(), 0)
  }
}

// ========== 远程实现（占位） ==========

/**
 * 未来接入后端 API 时实现此 class
 *
 * 示例：
 * class RemoteRepository implements IRepository {
 *   async getSchedules(): Promise<Schedule[]> {
 *     const res = await wx.request({ url: 'https://api.example.com/schedules' })
 *     return res.data
 *   }
 *   // ...
 * }
 */
export class RemoteRepository implements IRepository {
  getSchedules(): Schedule[] {
    console.warn('[RemoteRepository] 尚未实现，返回空数组')
    return []
  }

  getSchedulesByDate(_date: string): Schedule[] {
    return []
  }

  getSchedulesByDateRange(_startDate: string, _endDate: string): Schedule[] {
    return []
  }

  getCourses(): Course[] {
    return []
  }

  getCoursesByWeek(_weekNum: number): Course[] {
    return []
  }

  getCoursesByWeekAndDay(_weekNum: number, _weekday: number): Course[] {
    return []
  }

  getSemesterConfig(): SemesterConfig {
    return { startDate: '2026/03/02', totalWeeks: 20 }
  }

  getCurrentWeek(): number {
    return 1
  }
}

// ========== 单例 ==========

let currentRepo: IRepository = new LocalRepository()

export const repository = {
  /** 获取当前数据源 */
  get(): IRepository {
    return currentRepo
  },

  /** 切换到指定数据源（未来切换 RemoteRepository 时使用） */
  switchTo(repo: IRepository): void {
    currentRepo = repo
  },

  /** 重置为本地数据源 */
  resetToLocal(): void {
    currentRepo = new LocalRepository()
  }
}