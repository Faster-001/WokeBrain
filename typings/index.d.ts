/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    contentPaddingBottom?: number,
    schedules: any[],
    courses: any[],
    semesterConfig: { startDate: string, totalWeeks: number },
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
  initSchedules(): void,
  updateSchedules(schedules: any[]): void,
  initCourses(): void,
  updateCourses(courses: any[]): void,
  syncAllData(): void,
}
