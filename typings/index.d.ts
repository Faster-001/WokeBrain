/// <reference path="./types/index.d.ts" />

interface IAppOption {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo,
    contentPaddingBottom?: number,
    schedules: any[],
  }
  userInfoReadyCallback?: WechatMiniprogram.GetUserInfoSuccessCallback,
  initSchedules(): void,
  updateSchedules(schedules: any[]): void,
}
