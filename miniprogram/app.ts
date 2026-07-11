App<IAppOption>({
  globalData: {
    contentPaddingBottom: 0,
    schedules: [],
    courses: [],
    semesterConfig: {
      startDate: '2026/03/02',
      totalWeeks: 20
    }
  },
  onLaunch() {
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    const sysInfo = wx.getSystemInfoSync()
    const tabBarHeight = 60
    const tabBarBottom = 35
    const extraGap = 10
    const safeAreaBottom = sysInfo.screenHeight - sysInfo.safeArea.bottom

    this.globalData.contentPaddingBottom = tabBarBottom + tabBarHeight + extraGap + safeAreaBottom

    this.initSchedules()
    this.initCourses()

    if (this.globalData.courses.length === 0) {
      wx.showToast({
        title: '记忆似乎被清除了TAT~',
        icon: 'none',
        duration: 2000
      })
    }

    wx.login({
      success: res => {
        console.log(res.code)
      },
    })
  },

  initSchedules() {
    const cached = wx.getStorageSync('schedules')
    if (cached && cached.length > 0) {
      this.globalData.schedules = cached
    }
  },

  updateSchedules(schedules: any[]) {
    this.globalData.schedules = schedules
    wx.setStorageSync('schedules', schedules)
  },

  initCourses() {
    const cached = wx.getStorageSync('courses')
    if (cached && cached.length > 0) {
      this.globalData.courses = cached
    }
    const cachedSemester = wx.getStorageSync('semesterConfig')
    if (cachedSemester) {
      this.globalData.semesterConfig = cachedSemester
    }
  },

  updateCourses(courses: any[]) {
    this.globalData.courses = courses
    wx.setStorageSync('courses', courses)
  },

  syncAllData() {
    const defaultSchedules = [
      { title: '小组会议', date: '2026-07-04', time: '14:00', location: '会议室A301', isCountdown: false },
      { title: '项目评审', date: '2026-07-05', time: '10:00', location: '报告厅2F', isCountdown: true },
      { title: '生日聚会', date: '2026-07-07', time: '18:30', location: '市中心餐厅', isCountdown: false },
      { title: '数据结构实验：深度优先搜索与广度优先搜索，上机测试限时2小时', date: '2026-07-08', time: '08:30', location: '实验楼C102xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', isCountdown: true },
      { title: '英语四级考试', date: '2026-07-09', time: '09:00', location: '教学楼B201', isCountdown: true },
      { title: '社团例会', date: '2026-07-10', time: '19:00', location: '学生活动中心', isCountdown: false },
      { title: '导师面谈', date: '2026-07-11', time: '15:30', location: '理工楼508', isCountdown: false },
      { title: '篮球训练', date: '2026-07-12', time: '16:00', location: '体育馆', isCountdown: false },
      { title: '志愿者活动', date: '2026-07-13', time: '08:00', location: '社区服务中心', isCountdown: false },
      { title: '期中考试复习', date: '2026-07-14', time: '14:00', location: '图书馆3楼', isCountdown: true },
      { title: '高等数学期中考', date: '2026-07-15', time: '10:00', location: '教学楼A101', isCountdown: true },
      { title: '班会', date: '2026-07-16', time: '18:30', location: '教室205', isCountdown: false },
      { title: '编程竞赛', date: '2026-07-17', time: '13:00', location: '计算机实验室', isCountdown: true },
      { title: '学术讲座', date: '2026-07-18', time: '19:00', location: '报告厅1F', isCountdown: false },
      { title: '团队建设', date: '2026-07-19', time: '15:00', location: '户外拓展基地', isCountdown: false },
      { title: '实习面试', date: '2026-07-20', time: '10:00', location: '科技园B座', isCountdown: true },
      { title: '家庭聚餐', date: '2026-07-21', time: '18:00', location: '家乡饭店', isCountdown: false },
      { title: '论文开题', date: '2026-07-22', time: '14:30', location: '研究生院会议室', isCountdown: true },
      { title: '健身私教课', date: '2026-07-23', time: '17:00', location: '健身房', isCountdown: false },
      { title: '毕业典礼彩排', date: '2026-07-24', time: '09:00', location: '大礼堂', isCountdown: true }
    ]
    this.globalData.schedules = defaultSchedules
    wx.setStorageSync('schedules', defaultSchedules)

    const defaultCourses = [
      { name: '自卫防身术 II', teacher: '唐莉', location: '中区搏击馆', periodStart: 3, periodEnd: 4, weekday: 1, weeks: [1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16] },
      { name: '计算方法', teacher: '陈先进', location: '1201', periodStart: 6, periodEnd: 7, weekday: 1, weeks: [1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14, 15] },
      { name: '深度学习基础', teacher: '王文杰、冯福利', location: '3C203', periodStart: 8, periodEnd: 10, weekday: 1, weeks: [1, 2, 3, 4, 5, 7, 8, 9, 11, 12, 13, 14] },
      { name: '深度学习基础', teacher: '王文杰、冯福利', location: '西区电一楼机房 1 厅', periodStart: 11, periodEnd: 13, weekday: 1, weeks: [3, 4, 5, 7, 8, 9, 11, 12, 13, 14] },
      { name: '数据库系统概论', teacher: '黄振亚', location: '3C104', periodStart: 3, periodEnd: 4, weekday: 2, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15] },
      { name: '金融机构与金融市场', teacher: '何欣', location: '5505', periodStart: 6, periodEnd: 7, weekday: 2, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15] },
      { name: '毛泽东思想和中国特色社会主义理论体系概论', teacher: '虎旭昕', location: '3C302', periodStart: 8, periodEnd: 10, weekday: 2, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16] },
      { name: '计算方法', teacher: '陈先进', location: '1201', periodStart: 3, periodEnd: 4, weekday: 3, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      { name: '量子物理', teacher: '崔金明', location: '3C303', periodStart: 6, periodEnd: 7, weekday: 3, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
      { name: '数据分析及实践', teacher: '程明月、刘祺', location: '3C202', periodStart: 8, periodEnd: 10, weekday: 4, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
      { name: '量子物理', teacher: '崔金明', location: '3C303', periodStart: 1, periodEnd: 2, weekday: 5, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15] },
      { name: '随机过程 B', teacher: '庄玮玮', location: '3C204', periodStart: 3, periodEnd: 4, weekday: 5, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15] },
      { name: '随机过程 B', teacher: '庄玮玮', location: '3C204', periodStart: 5, periodEnd: 5, weekday: 5, weeks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
      { name: '金融机构与金融市场', teacher: '何欣', location: '5505', periodStart: 6, periodEnd: 7, weekday: 5, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15] },
      { name: '数据库系统概论', teacher: '黄振亚', location: '3C104', periodStart: 8, periodEnd: 9, weekday: 5, weeks: [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15] },
      { name: '数据分析及实践', teacher: '程明月、刘祺', location: '西区科技楼 717', periodStart: 11, periodEnd: 13, weekday: 5, weeks: [4, 5, 6, 8, 9, 10, 11, 12, 13, 15] }
    ]

    const fridayRandomProcess = defaultCourses.find(course => course.weekday === 5 && course.periodStart === 5 && course.periodEnd === 5)
    if (fridayRandomProcess) {
      fridayRandomProcess.weeks = [2, 4, 6, 8, 10, 12, 14]
    }

    const fridayDataAnalysis = defaultCourses.find(course => course.weekday === 5 && course.periodStart === 11 && course.periodEnd === 13)
    if (fridayDataAnalysis) {
      fridayDataAnalysis.weeks = [4, 5, 6, 8, 10, 11, 12, 13, 14, 15]
    }

    defaultCourses.push(
      { name: '自卫防身术 II', teacher: '唐莉', location: '中区搏击馆', periodStart: 3, periodEnd: 4, weekday: 6, weeks: [10] },
      { name: '计算方法', teacher: '陈先进', location: '1201', periodStart: 6, periodEnd: 7, weekday: 6, weeks: [10] },
      { name: '深度学习基础', teacher: '王文杰', location: '3C203', periodStart: 8, periodEnd: 9, weekday: 6, weeks: [10] },
      { name: '深度学习基础', teacher: '王文杰', location: '西区电一楼机房 1 厅', periodStart: 11, periodEnd: 13, weekday: 6, weeks: [10] }
    )
    this.globalData.courses = defaultCourses
    wx.setStorageSync('courses', defaultCourses)

    const defaultSemester = { startDate: '2026/03/02', totalWeeks: 20 }
    this.globalData.semesterConfig = defaultSemester
    wx.setStorageSync('semesterConfig', defaultSemester)
  }
})
