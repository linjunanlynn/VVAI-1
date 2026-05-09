/**
 * 教育 dock 三级菜单 → 主对话内联卡片的「业务注册表」。
 *
 * 设计动机：
 * - 老师 / 学生 / 家长 / 管理者 4 身份各 3 个 dock，每个 dock 含 3-4 条三级菜单（共约 30 条）。
 * - 之前点三级菜单仅 push 一条占位文本气泡，不出卡片、不出后续指令——闭环断在第二步。
 * - 此处给每条菜单 id 配一份「卡片数据 + 后续推荐指令」，由统一的 `EduDockMenuCard` 渲染。
 *
 * 与子 CUI Skill 卡的边界：
 * - 子 CUI 卡 = 「这一节具体的课」业务（课前 / 课中 / 课后 18 卡）
 * - dock 菜单卡 = 「跨课程 / 长期资源 / 我的事务」业务，不进入某节课的上下文
 */

import { DEMO_LESSON } from "./aiClassroomLessonDemo"
import { DEMO_LESSONS, getAgendaLessonStatus } from "./aiClassroomLessonsDemo"
import type { EducationStage } from "./educationStageDemo"
import type { EduSceneRole } from "./homeScenarioLayout"

export interface EduDockMenuStat {
  /** 数据格标签（如「待批 3 份」「平均分 89」） */
  label: string
  /** 数据格主值 */
  value: string
  /** 颜色基调（与 hero 卡一致：default / warning / success / info） */
  tone?: "default" | "warning" | "success" | "info"
}

export interface EduDockMenuCardData {
  /** dock 中文名（如"我的课表"），用于卡头副标 */
  appName: string
  /** 三级菜单中文名（如"今日课程"），作为卡片标题 */
  menuName: string
  /** 1-2 句业务背景（"我为你准备好了什么 / 当下卡在哪一项"） */
  headline: string
  /** 4 个数据格（按重要度排列；可少于 4 个） */
  stats: EduDockMenuStat[]
  /** 3-4 条后续推荐指令（点击后 push user 气泡 + AI 占位回复，可继续推进） */
  prompts: string[]
}

function buildRoleAwareScheduleCardData(
  role: "teacher" | "student" | "parent" | "admin",
  menuId: string,
  stage: EducationStage,
): EduDockMenuCardData | null {
  const weekLessons = DEMO_LESSONS.filter((l) => l.thisWeek)
  const todayLessons = weekLessons.filter((l) => l.weekdayLabel === DEMO_LESSON.weekday)
  const summarize = (lessons: typeof weekLessons) => {
    let done = 0
    let live = 0
    let upcoming = 0
    for (const lesson of lessons) {
      const status = getAgendaLessonStatus(lesson, stage)
      if (status === "past" || status === "post") {
        done += 1
      } else if (status === "in") {
        live += 1
      } else {
        upcoming += 1
      }
    }
    return { done, live, upcoming }
  }
  const todayStat = summarize(todayLessons)
  const weekStat = summarize(weekLessons)
  const todayMain = todayLessons[0]
  const todayMainLabel = todayMain
    ? `${todayMain.startTime} ${todayMain.subject}《${todayMain.title}》`
    : "暂无课程"

  if (role === "teacher" || role === "admin") {
    /**
     * 老师（场景 6）与机构管理者（场景 9）共用同一份课表 dock；
     * 数据视角相同（看自己 / 看本校全体由后续业务卡决定），先共享一套展示。
     */
    if (menuId === "ts_today") {
      return {
        appName: "课表",
        menuName: "今日课表",
        headline: `今天共 ${todayLessons.length} 节课；当前主线课为 ${todayMainLabel}。`,
        stats: [
          { label: "今日节数", value: `${todayLessons.length} 节`, tone: "info" },
          { label: "已完成", value: `${todayStat.done} 节`, tone: "success" },
          { label: "进行中", value: `${todayStat.live} 节`, tone: todayStat.live > 0 ? "warning" : "default" },
          { label: "待上", value: `${todayStat.upcoming} 节`, tone: "default" },
        ],
        prompts: ["开始备课", "进入课堂签到", "查看本节学情", "调整课次时间"],
      }
    }
    if (menuId === "ts_week") {
      return {
        appName: "课表",
        menuName: "课表日历",
        headline: `本周共 ${weekLessons.length} 节课：已完成 ${weekStat.done} 节，进行中 ${weekStat.live} 节，待上 ${weekStat.upcoming} 节。`,
        stats: [
          { label: "本周节数", value: `${weekLessons.length} 节`, tone: "info" },
          { label: "已完成", value: `${weekStat.done} 节`, tone: "success" },
          { label: "进行中", value: `${weekStat.live} 节`, tone: weekStat.live > 0 ? "warning" : "default" },
          { label: "待上", value: `${weekStat.upcoming} 节`, tone: "default" },
        ],
        prompts: ["按学科筛选", "导出本周课表", "看冲突详情", "看下周课表"],
      }
    }
  }
  if (role === "student") {
    if (menuId === "ss_today") {
      return {
        appName: "课表",
        menuName: "今日课表",
        headline: `你今天有 ${todayLessons.length} 节课；当前主线课是 ${todayMainLabel}。`,
        stats: [
          { label: "今日节数", value: `${todayLessons.length} 节`, tone: "info" },
          { label: "已完成", value: `${todayStat.done} 节`, tone: "success" },
          { label: "进行中", value: `${todayStat.live} 节`, tone: todayStat.live > 0 ? "warning" : "default" },
          { label: "待上", value: `${todayStat.upcoming} 节`, tone: "default" },
        ],
        prompts: ["5 分钟做完预习", "知识点速览", "上课提醒我", "看上节回放"],
      }
    }
    if (menuId === "ss_week") {
      return {
        appName: "课表",
        menuName: "课表日历",
        headline: `你本周有 ${weekLessons.length} 节课：已完成 ${weekStat.done} 节，进行中 ${weekStat.live} 节，待上 ${weekStat.upcoming} 节。`,
        stats: [
          { label: "本周节数", value: `${weekLessons.length} 节`, tone: "info" },
          { label: "已完成", value: `${weekStat.done} 节`, tone: "success" },
          { label: "进行中", value: `${weekStat.live} 节`, tone: weekStat.live > 0 ? "warning" : "default" },
          { label: "待上", value: `${weekStat.upcoming} 节`, tone: "default" },
        ],
        prompts: ["按学科筛选", "导出周课表", "看下周课表", "看哪些课时间冲突"],
      }
    }
  }
  if (role === "parent") {
    if (menuId === "ps_today") {
      return {
        appName: "课表",
        menuName: "今日课表",
        headline: `孩子今天有 ${todayLessons.length} 节课；当前主线课是 ${todayMainLabel}。`,
        stats: [
          { label: "今日节数", value: `${todayLessons.length} 节`, tone: "info" },
          { label: "已完成", value: `${todayStat.done} 节`, tone: "success" },
          { label: "进行中", value: `${todayStat.live} 节`, tone: todayStat.live > 0 ? "warning" : "default" },
          { label: "待上", value: `${todayStat.upcoming} 节`, tone: "default" },
        ],
        prompts: ["看课前 3 件小事", "本节课预告", "提醒孩子准备", "看老师评语"],
      }
    }
    if (menuId === "ps_week") {
      return {
        appName: "课表",
        menuName: "课表日历",
        headline: `孩子本周有 ${weekLessons.length} 节课：已完成 ${weekStat.done} 节，进行中 ${weekStat.live} 节，待上 ${weekStat.upcoming} 节。`,
        stats: [
          { label: "本周节数", value: `${weekLessons.length} 节`, tone: "info" },
          { label: "已完成", value: `${weekStat.done} 节`, tone: "success" },
          { label: "进行中", value: `${weekStat.live} 节`, tone: weekStat.live > 0 ? "warning" : "default" },
          { label: "待上", value: `${weekStat.upcoming} 节`, tone: "default" },
        ],
        prompts: ["看周课表详情", "确认家长会出席", "导出周课表", "看月度安排"],
      }
    }
  }
  return null
}

/* ---------------------------------------------------------------
 * 老师（场景 6）& 机构管理者（场景 9）共享三级菜单：8 dock 共 21 条
 *   课表 / 教学管理 / 学员管理 / 老师管理 / 课程管理 / 商品管理 / 订单管理 / 财务管理
 * 旧 ID（tcs_* / tsi_* / ts_swap）保留为 Hero / pinned 联动兜底
 * --------------------------------------------------------------- */
const EDU_PRO_REGISTRY: Record<string, EduDockMenuCardData> = {
  ts_today: {
    appName: "课表",
    menuName: "今日课表",
    headline: "今天共 3 节课，下一节 19:00 物理《力的合成与分解》；课前检查已完成 2/3。",
    stats: [
      { label: "今日节数", value: "3 节", tone: "info" },
      { label: "下一节", value: "19:00", tone: "default" },
      { label: "课前就位", value: "2/3", tone: "warning" },
      { label: "距开课", value: "1h18m", tone: "info" },
    ],
    prompts: ["开始备课", "进入课堂签到", "查看本节学情", "调整课次时间"],
  },
  ts_week: {
    appName: "课表",
    menuName: "课表日历",
    headline: "本月排课 48 节：本周 12 节，下周 11 节；周五晚课有 1 处冲突需要处理。",
    stats: [
      { label: "本月节数", value: "48 节", tone: "info" },
      { label: "本周", value: "12 节", tone: "default" },
      { label: "冲突", value: "1 处", tone: "warning" },
      { label: "已完成", value: "20 节", tone: "success" },
    ],
    prompts: ["按学科筛选", "导出课表日历", "看冲突详情", "切换到周/月视图"],
  },
  /** ↓ 旧 dock 项保留为兜底（Hero / pinned 仍可能引用） */
  ts_swap: {
    appName: "课表",
    menuName: "调课与代课",
    headline: "本月调课 4 次、代课 2 次；当前有 1 条待审批请求（周五 19:00 调到周日 10:00）。",
    stats: [
      { label: "本月调课", value: "4 次", tone: "default" },
      { label: "本月代课", value: "2 次", tone: "info" },
      { label: "待审批", value: "1 条", tone: "warning" },
      { label: "已完成", value: "5 条", tone: "success" },
    ],
    prompts: ["发起调课申请", "审批待处理调课", "查看代课记录", "联系教务"],
  },
  tcs_class: {
    appName: "教学管理",
    menuName: "签到与考勤",
    headline: "本周共上 4 节课，平均出勤率 96%；本周累计缺勤 5 人次，1 名学员频繁请假需关注。",
    stats: [
      { label: "本周节数", value: "4 节", tone: "info" },
      { label: "平均出勤率", value: "96%", tone: "success" },
      { label: "本周缺勤", value: "5 人次", tone: "warning" },
      { label: "频繁请假", value: "1 人", tone: "warning" },
    ],
    prompts: ["看本周签到明细", "处理待补签申请", "联系频繁请假家长", "导出本周考勤报表"],
  },
  tcs_roster: {
    appName: "教学管理",
    menuName: "课堂记录",
    headline: "近 30 天课堂记录 12 节，本周新增 4 节；亮点片段 8 段、重点错点 6 处可一键归档。",
    stats: [
      { label: "近 30 天", value: "12 节", tone: "info" },
      { label: "本周新增", value: "4 节", tone: "success" },
      { label: "亮点片段", value: "8 段", tone: "default" },
      { label: "待归档", value: "2 段", tone: "warning" },
    ],
    prompts: ["看本节课堂记录", "浏览本周亮点片段", "归档关键时刻", "导出本周课堂日志"],
  },
  tcs_attendance: {
    appName: "教学管理",
    menuName: "教学模板",
    headline: "你的模板库共 18 套：出题模板 8 套、分组方案 4 套、术语表 6 份；本月新增 3 套可复用。",
    stats: [
      { label: "模板总数", value: "18 套", tone: "info" },
      { label: "出题模板", value: "8 套", tone: "default" },
      { label: "分组方案", value: "4 套", tone: "default" },
      { label: "术语表", value: "6 份", tone: "default" },
    ],
    prompts: ["新建出题模板", "套用上次分组方案", "同步术语表到全班", "浏览模板市场"],
  },
  tsi_parents: {
    appName: "学员与家校",
    menuName: "班级学情",
    headline: "A 班本节整体正确率 76%，B 班 69%；薄弱点集中在“矢量方向判断”。",
    stats: [
      { label: "A 班正确率", value: "76%", tone: "success" },
      { label: "B 班正确率", value: "69%", tone: "warning" },
      { label: "薄弱点", value: "矢量方向", tone: "warning" },
      { label: "需补练", value: "18 人", tone: "info" },
    ],
    prompts: ["查看本节学情", "对比 A/B 班学情", "给薄弱学员发补练", "导出班级学情"],
  },
  tsi_announce: {
    appName: "学员与家校",
    menuName: "重点学员",
    headline: "当前重点跟进 5 人：2 人连续走神、1 人连续缺勤、2 人作业完成率低于 60%。",
    stats: [
      { label: "重点学员", value: "5 人", tone: "warning" },
      { label: "连续走神", value: "2 人", tone: "warning" },
      { label: "连续缺勤", value: "1 人", tone: "warning" },
      { label: "作业偏低", value: "2 人", tone: "default" },
    ],
    prompts: ["查看重点学员名单", "标记本周必跟进", "联系重点学员家长", "导出跟进计划"],
  },
  tsi_archive: {
    appName: "学员与家校",
    menuName: "家校沟通",
    headline: "本周待发送家校消息 8 条，其中 3 条是重点学员个别沟通；已读回执率 82%。",
    stats: [
      { label: "待发送", value: "8 条", tone: "warning" },
      { label: "个别沟通", value: "3 条", tone: "info" },
      { label: "已读回执", value: "82%", tone: "success" },
      { label: "未读家长", value: "6 位", tone: "warning" },
    ],
    prompts: ["一键发送本节报告给家长", "提醒未读家长", "私聊重点学员家长", "查看沟通记录"],
  },

  /* ===== 教学管理：备课 / 作业 / 课堂风采 / 课后总结 ===== */
  etm_prep: {
    appName: "教学管理",
    menuName: "备课管理",
    headline: "本周需备 5 节课·已完成 3 套教案·下一节《力的合成与分解》待补 1 张分组卡",
    stats: [
      { label: "本周备课", value: "3 / 5", tone: "warning" },
      { label: "复用教案", value: "8 套", tone: "info" },
      { label: "待补素材", value: "1 张", tone: "warning" },
      { label: "教研组共享", value: "12 套", tone: "success" },
    ],
    prompts: ["开始备下一节", "复用上节教案", "把教案同步给同事", "导出本周备课包"],
  },
  etm_homework: {
    appName: "教学管理",
    menuName: "作业管理",
    headline: "本周已布置作业 3 次·待批阅 18 份·1 名学员连续 2 次未交需要跟进",
    stats: [
      { label: "本周布置", value: "3 次", tone: "info" },
      { label: "待批阅", value: "18 份", tone: "warning" },
      { label: "平均提交率", value: "94%", tone: "success" },
      { label: "未交跟进", value: "1 人", tone: "warning" },
    ],
    prompts: ["开始批阅作业", "再布置一次同类练习", "联系未交学员家长", "导出作业台账"],
  },
  etm_class_show: {
    appName: "教学管理",
    menuName: "课堂风采",
    headline: "本周课堂亮点 8 段（抢答 / 板书 / 讨论）·建议挑 2 段同步给家长群",
    stats: [
      { label: "本周亮点", value: "8 段", tone: "success" },
      { label: "已分享家长", value: "3 段", tone: "info" },
      { label: "已加入下节", value: "1 段", tone: "default" },
      { label: "待归档", value: "2 段", tone: "warning" },
    ],
    prompts: ["挑 2 段发家长群", "把亮点加入下节开场", "保存到学校素材库", "导出本周风采集"],
  },
  etm_summary: {
    appName: "教学管理",
    menuName: "课后总结",
    headline: "本节物理总均分 84·错点 3 处·待出复盘 2 节·建议把「矢量方向」导入下节开场",
    stats: [
      { label: "本节均分", value: "84", tone: "success" },
      { label: "错点", value: "3 处", tone: "warning" },
      { label: "待复盘", value: "2 节", tone: "warning" },
      { label: "归档亮点", value: "1 段", tone: "success" },
    ],
    prompts: ["生成本节复盘", "把高频错点导入下节开场", "把错点推送家长", "看上节复盘对比"],
  },

  /* ===== 学员管理：档案 / 学情分析 / 考勤 ===== */
  esm_profile: {
    appName: "学员管理",
    menuName: "学员档案",
    headline: "在册学员 64 人·近 30 天新加入 3 人·6 名重点学员需关注（学情 / 出勤 / 作业）",
    stats: [
      { label: "在册学员", value: "64 人", tone: "info" },
      { label: "本月新增", value: "3 人", tone: "success" },
      { label: "重点跟进", value: "6 人", tone: "warning" },
      { label: "本月离班", value: "1 人", tone: "default" },
    ],
    prompts: ["查看重点学员", "新增学员档案", "导出班级名册", "标记本周必跟进"],
  },
  esm_analytics: {
    appName: "学员管理",
    menuName: "学情分析",
    headline: "本周班级均分 84·薄弱章节集中「矢量方向」·12 名学员需要补练同类题",
    stats: [
      { label: "班级均分", value: "84", tone: "success" },
      { label: "薄弱章节", value: "矢量方向", tone: "warning" },
      { label: "需补练", value: "12 人", tone: "warning" },
      { label: "本周提升", value: "+3", tone: "success" },
    ],
    prompts: ["看薄弱章节学员", "给 12 人发补练", "对比上周学情", "导出班级学情报告"],
  },
  esm_attendance: {
    appName: "学员管理",
    menuName: "学员考勤",
    headline: "本周出勤率 96%·缺勤 5 人次·1 名学员连续 2 次缺勤建议联系家长",
    stats: [
      { label: "出勤率", value: "96%", tone: "success" },
      { label: "本周缺勤", value: "5 人次", tone: "warning" },
      { label: "连续缺勤", value: "1 人", tone: "warning" },
      { label: "请假申请", value: "2 条", tone: "info" },
    ],
    prompts: ["处理待补签", "联系连续缺勤家长", "审批请假申请", "导出本周考勤"],
  },

  /* ===== 老师管理：档案 / 考勤 / 绩效 ===== */
  etea_profile: {
    appName: "老师管理",
    menuName: "老师档案",
    headline: "在职老师 18 人：物理 4 / 数学 5 / 英语 4 / 其他 5；本月新入职 1 人，待分配 2 人",
    stats: [
      { label: "在职老师", value: "18 人", tone: "info" },
      { label: "本月新入职", value: "1 人", tone: "success" },
      { label: "待分配班级", value: "2 人", tone: "warning" },
      { label: "本月离职", value: "0 人", tone: "default" },
    ],
    prompts: ["新增老师档案", "分配老师到班级", "查看任课分布", "导出老师花名册"],
  },
  etea_attendance: {
    appName: "老师管理",
    menuName: "老师考勤",
    headline: "本周老师出勤率 99%·1 位老师调课 1 次·暂无连续缺勤",
    stats: [
      { label: "出勤率", value: "99%", tone: "success" },
      { label: "本周调课", value: "1 次", tone: "default" },
      { label: "代课记录", value: "0 次", tone: "default" },
      { label: "异常打卡", value: "0 次", tone: "success" },
    ],
    prompts: ["看本周老师考勤", "审批调课申请", "派发代课任务", "导出考勤台账"],
  },
  etea_perf: {
    appName: "老师管理",
    menuName: "老师绩效",
    headline: "本月教学质量均分 84·课堂满意度 92%·3 位老师授课均分高于 90 可推荐分享",
    stats: [
      { label: "教学均分", value: "84", tone: "success" },
      { label: "满意度", value: "92%", tone: "success" },
      { label: "高分老师", value: "3 人", tone: "info" },
      { label: "需辅导", value: "2 人", tone: "warning" },
    ],
    prompts: ["看高分老师", "给低分老师派辅导", "导出本月绩效", "对比上月趋势"],
  },

  /* ===== 课程管理：课程课表 ===== */
  ecm_schedule: {
    appName: "课程管理",
    menuName: "课程课表",
    headline: "本周排课 186 节·时间冲突 7 处 / 教室冲突 2 处·晚高峰排班偏紧",
    stats: [
      { label: "本周课次", value: "186 节", tone: "info" },
      { label: "时间冲突", value: "7 处", tone: "warning" },
      { label: "教室冲突", value: "2 处", tone: "warning" },
      { label: "排班饱和", value: "92%", tone: "default" },
    ],
    prompts: ["处理排课冲突", "新建排课", "导出课表", "调整教室分配"],
  },
  ecm_fulfillment: {
    appName: "课程管理",
    menuName: "课程履约",
    headline: "本周履约率 95%：应上 186 节、已履约 177 节；9 节待完成主要集中在晚高峰。",
    stats: [
      { label: "应履约", value: "186 节", tone: "info" },
      { label: "已履约", value: "177 节", tone: "success" },
      { label: "履约率", value: "95%", tone: "success" },
      { label: "待完成", value: "9 节", tone: "warning" },
    ],
    prompts: ["看待完成课次", "查看履约明细", "处理履约异常", "导出履约报表"],
  },

  /* ===== 商品管理：课程商品 / 物料商品 ===== */
  egm_course: {
    appName: "商品管理",
    menuName: "课程商品",
    headline: "在售课程商品 36 个·本月新上 4 个·2 个低转化需要调整定价或包装",
    stats: [
      { label: "在售商品", value: "36 个", tone: "info" },
      { label: "本月新上", value: "4 个", tone: "success" },
      { label: "低转化", value: "2 个", tone: "warning" },
      { label: "下架待审", value: "1 个", tone: "default" },
    ],
    prompts: ["新建课包商品", "调整商品价格", "上下架商品", "看商品转化漏斗"],
  },
  egm_material: {
    appName: "商品管理",
    menuName: "物料商品",
    headline: "物料商品 SKU 128 个：安全库存以下 9 个，教材与实验耗材本周需优先补货。",
    stats: [
      { label: "在库 SKU", value: "128 个", tone: "info" },
      { label: "库存预警", value: "9 个", tone: "warning" },
      { label: "近 7 天出库", value: "356 件", tone: "success" },
      { label: "待补货单", value: "3 单", tone: "warning" },
    ],
    prompts: ["查看库存预警", "创建补货单", "查看出入库流水", "同步库存到商品页"],
  },
  egm_promo: {
    appName: "商品管理",
    menuName: "优惠策略",
    headline: "当前生效优惠 6 组：新客券转化 18%，续费券转化 27%；有 1 组将于明晚到期。",
    stats: [
      { label: "生效策略", value: "6 组", tone: "info" },
      { label: "新客转化", value: "18%", tone: "success" },
      { label: "续费转化", value: "27%", tone: "success" },
      { label: "即将到期", value: "1 组", tone: "warning" },
    ],
    prompts: ["新建优惠策略", "延长即将到期策略", "看策略转化效果", "关闭低效策略"],
  },

  /* ===== 订单管理：订单查询 / 订单排课 / 账单管理 ===== */
  eom_query: {
    appName: "订单管理",
    menuName: "订单查询",
    headline: "今日订单 28 笔·待支付 6 笔 / 退款中 2 笔·1 笔跨校区订单待人工确认",
    stats: [
      { label: "今日订单", value: "28 笔", tone: "info" },
      { label: "待支付", value: "6 笔", tone: "warning" },
      { label: "退款中", value: "2 笔", tone: "warning" },
      { label: "异常订单", value: "1 笔", tone: "default" },
    ],
    prompts: ["处理待支付订单", "审批退款", "确认异常订单", "导出对账单"],
  },
  eom_arrange: {
    appName: "订单管理",
    menuName: "订单排课",
    headline: "本周排课订单 64 单·已落座 58 单·6 单待确认（多为时段冲突）·建议优先处理",
    stats: [
      { label: "本周排课", value: "64 单", tone: "info" },
      { label: "已落座", value: "58 单", tone: "success" },
      { label: "待确认", value: "6 单", tone: "warning" },
      { label: "时段冲突", value: "3 单", tone: "warning" },
    ],
    prompts: ["处理待确认订单", "查看时段冲突", "通知学员调整时段", "导出排课表"],
  },
  eom_billing: {
    appName: "订单管理",
    menuName: "账单管理",
    headline: "本月账单 412 笔·已收 386 笔 / 待收 26 笔·总应收 ¥ 38.6w·待开发票 18 张",
    stats: [
      { label: "本月账单", value: "412 笔", tone: "info" },
      { label: "待收", value: "26 笔", tone: "warning" },
      { label: "总应收", value: "¥ 38.6w", tone: "success" },
      { label: "待开发票", value: "18 张", tone: "warning" },
    ],
    prompts: ["催收逾期账单", "批量开发票", "导出本月账单", "对账核对"],
  },

  /* ===== 财务管理：收入 / 支出 / 账号管理 / 财务报表 ===== */
  efm_income: {
    appName: "财务管理",
    menuName: "收入",
    headline: "本月收入 ¥ 386,420（+12% MoM）·课包占 78% / 物料 14% / 活动 8%",
    stats: [
      { label: "本月收入", value: "¥ 38.6w", tone: "success" },
      { label: "环比", value: "+12%", tone: "success" },
      { label: "课包收入", value: "¥ 30.1w", tone: "info" },
      { label: "活动收入", value: "¥ 3.1w", tone: "default" },
    ],
    prompts: ["看收入明细", "对比上月", "导出本月收入表", "拆分校区收入"],
  },
  efm_expense: {
    appName: "财务管理",
    menuName: "支出",
    headline: "本月支出 ¥ 218,560·人力 62% / 房租 18% / 物料 12% / 营销 8%·人力略高于预算",
    stats: [
      { label: "本月支出", value: "¥ 21.9w", tone: "info" },
      { label: "人力支出", value: "¥ 13.6w", tone: "warning" },
      { label: "房租", value: "¥ 3.9w", tone: "default" },
      { label: "营销", value: "¥ 1.7w", tone: "default" },
    ],
    prompts: ["看支出明细", "对比预算", "导出支出报表", "拆分项目支出"],
  },
  efm_account: {
    appName: "财务管理",
    menuName: "账号管理",
    headline: "对接账户 3 个：对公 1 / 第三方支付 2·本周新增提现 1 笔·暂无异常",
    stats: [
      { label: "对接账户", value: "3 个", tone: "info" },
      { label: "本周提现", value: "1 笔", tone: "default" },
      { label: "异常账户", value: "0 个", tone: "success" },
      { label: "余额合计", value: "¥ 65.2w", tone: "success" },
    ],
    prompts: ["看账户明细", "发起提现", "新增对接账户", "查看交易流水"],
  },
  efm_report: {
    appName: "财务管理",
    menuName: "财务报表",
    headline: "本月财报 1 份待审·季度报 1 份已发布·年度预算执行 67%·建议提前 review Q4",
    stats: [
      { label: "待审报表", value: "1 份", tone: "warning" },
      { label: "已发布", value: "3 份", tone: "info" },
      { label: "预算执行", value: "67%", tone: "default" },
      { label: "异常项", value: "0 项", tone: "success" },
    ],
    prompts: ["审月度报表", "导出季度报", "对比去年同期", "把报表发管理层"],
  },
}

/* ---------------------------------------------------------------
 * 学生（场景七）三级菜单：3 dock × 3 menu = 9 条
 * --------------------------------------------------------------- */
const STUDENT_REGISTRY: Record<string, EduDockMenuCardData> = {
  ss_today: {
    appName: "我的课表",
    menuName: "今日课程",
    headline: "今天 19:00 物理《力的合成与分解》— 预习已完成 2/3，差矢量方向判断 2 道",
    stats: [
      { label: "今日节数", value: "1 节", tone: "info" },
      { label: "预习进度", value: "67%", tone: "default" },
      { label: "距上课", value: "1h18m", tone: "info" },
      { label: "上节得分", value: "+3", tone: "success" },
    ],
    prompts: ["5 分钟做完预习", "知识点速览", "上课提醒我", "看上节回放"],
  },
  ss_week: {
    appName: "课表",
    menuName: "课表日历",
    headline: "本月还有 14 节·物理 / 数学 / 英语·本周占 4 节，可切到月视图全览",
    stats: [
      { label: "本月节数", value: "14 节", tone: "info" },
      { label: "本周", value: "4 节", tone: "default" },
      { label: "需预习", value: "3 节", tone: "warning" },
      { label: "已完成", value: "8 节", tone: "success" },
    ],
    prompts: ["按学科筛选", "导出周课表", "看下周课表", "看哪些课时间冲突"],
  },
  ss_replay: {
    appName: "我的课表",
    menuName: "历史回看",
    headline: "近 30 天可回看课程 12 节·上节物理获得 3 个亮点片段",
    stats: [
      { label: "可回看", value: "12 节", tone: "info" },
      { label: "亮点片段", value: "8 段", tone: "success" },
      { label: "未观看", value: "5 节", tone: "warning" },
      { label: "已收藏", value: "2 段", tone: "default" },
    ],
    prompts: ["看上节亮点", "搜索矢量分解", "下载回放（离线也能看）", "收藏更多片段"],
  },
  sh_pending: {
    appName: "作业练习",
    menuName: "待完成作业",
    headline: "今晚作业 10 道（约 30 分钟）+ 数学 5 道 — 优先做物理",
    stats: [
      { label: "今晚物理", value: "10 道", tone: "warning" },
      { label: "数学", value: "5 道", tone: "info" },
      { label: "预计耗时", value: "45m", tone: "default" },
      { label: "已完成", value: "0/15", tone: "default" },
    ],
    prompts: ["开始做物理作业", "先做最简单的", "提交今晚作业", "向老师提问"],
  },
  sh_mistakes: {
    appName: "作业练习",
    menuName: "错题本",
    headline: "新增错题 3 道（都是矢量方向类）·总错题库 28 道·掌握率 65%",
    stats: [
      { label: "新增", value: "3 道", tone: "warning" },
      { label: "总错题", value: "28 道", tone: "info" },
      { label: "掌握率", value: "65%", tone: "default" },
      { label: "本周复习", value: "12 道", tone: "success" },
    ],
    prompts: ["重做 1 道错题", "看我经常错的点", "再来 1 道同类的", "导出错题集"],
  },
  /** 新版 dock：AI 答疑 —— 学生跨课程的"我有哪里没懂"统一入口 */
  sh_qa: {
    appName: "作业练习",
    menuName: "AI 答疑",
    headline: "今晚 3 个题待你提问·上次「矢量方向」AI 已生成 30 秒讲解·你还能直接拍照问",
    stats: [
      { label: "待答疑题", value: "3 道", tone: "warning" },
      { label: "本周已答疑", value: "12 道", tone: "info" },
      { label: "AI 平均回答", value: "8 秒", tone: "success" },
      { label: "未读老师评", value: "1 条", tone: "warning" },
    ],
    prompts: ["拍照问 AI", "问矢量方向那道题", "把上次答疑加入错题本", "@王老师 帮我看一下"],
  },
  sc_fulfillment: {
    appName: "课程管理",
    menuName: "课程履约",
    headline: "你本周应上 4 节，已完成 2 节；今晚和周五各 1 节待完成。",
    stats: [
      { label: "应上课次", value: "4 节", tone: "info" },
      { label: "已完成", value: "2 节", tone: "success" },
      { label: "待上", value: "2 节", tone: "warning" },
      { label: "履约率", value: "50%", tone: "default" },
    ],
    prompts: ["看今晚待上课程", "设下一节课提醒", "查看缺勤记录", "联系教务"],
  },
  sc_leave: {
    appName: "课程管理",
    menuName: "学生请假",
    headline: "本月你有 1 次请假记录；今晚课程如需请假，建议至少提前 30 分钟提交。",
    stats: [
      { label: "本月请假", value: "1 次", tone: "default" },
      { label: "可补课", value: "1 次", tone: "info" },
      { label: "审批时长", value: "约 10m", tone: "default" },
      { label: "课时扣减", value: "按规则", tone: "warning" },
    ],
    prompts: ["提交请假申请", "查看请假规则", "申请补课", "联系教务"],
  },
  sg_my_orders: {
    appName: "商品管理",
    menuName: "我的订单",
    headline: "你名下订单 3 笔：进行中 2 笔（课包/教材），待支付 1 笔。",
    stats: [
      { label: "订单总数", value: "3 笔", tone: "info" },
      { label: "进行中", value: "2 笔", tone: "default" },
      { label: "待支付", value: "1 笔", tone: "warning" },
      { label: "已完成", value: "0 笔", tone: "success" },
    ],
    prompts: ["完成待支付订单", "查看课包进度", "下载订单详情", "联系教务"],
  },
  sm_family: {
    appName: "成员管理",
    menuName: "家庭成员",
    headline: "当前绑定家庭成员 2 位（爸爸 / 妈妈）；学习动态默认同步给爸爸。",
    stats: [
      { label: "已绑定", value: "2 位", tone: "info" },
      { label: "主联系人", value: "爸爸", tone: "default" },
      { label: "待确认", value: "0 位", tone: "success" },
      { label: "同步状态", value: "正常", tone: "success" },
    ],
    prompts: ["新增家庭成员", "切换主联系人", "管理消息同步", "邀请家长绑定"],
  },
  sr_reward: {
    appName: "奖励管理",
    menuName: "奖励管理",
    headline: "本周学习奖励 3 项：已领取 2 项、待领取 1 项（连续打卡奖励）。",
    stats: [
      { label: "本周奖励", value: "3 项", tone: "info" },
      { label: "已领取", value: "2 项", tone: "success" },
      { label: "待领取", value: "1 项", tone: "warning" },
      { label: "连续打卡", value: "6 天", tone: "success" },
    ],
    prompts: ["领取待领奖励", "查看奖励规则", "看本周打卡明细", "分享奖励给家长"],
  },
  /** ===== 学生 · 学情管理（新 dock：课后报告 / 课堂风采） ===== */
  sl_after_report: {
    appName: "学情管理",
    menuName: "课后报告",
    headline: "上节物理拿到 +3 ↑·本周累计 4 份课后报告·能量守恒章节有薄弱信号",
    stats: [
      { label: "本节得分", value: "+3 ↑", tone: "success" },
      { label: "本周报告", value: "4 份", tone: "info" },
      { label: "薄弱章节", value: "能量守恒", tone: "warning" },
      { label: "未读", value: "1 份", tone: "warning" },
    ],
    prompts: ["看上节物理报告", "看薄弱章节详情", "对比上周", "把进步发给爸妈看"],
  },
  sl_class_show: {
    appName: "学情管理",
    menuName: "课堂风采",
    headline: "本节亮点 1 段（你在抢答里答对了「东偏北 53°」）·近 30 天累计 8 段",
    stats: [
      { label: "本节亮点", value: "1 段", tone: "success" },
      { label: "近 30 天", value: "8 段", tone: "info" },
      { label: "本周新增", value: "3 段", tone: "default" },
      { label: "已收藏", value: "2 段", tone: "default" },
    ],
    prompts: ["看本节亮点片段", "保存到我的相册", "分享给爸妈", "看更多抢答镜头"],
  },
  /** ↓ 旧 dock 菜单（学过的知识点 / 本周报告 / 学期报告 / 进步对比 / 历史回看）已移出 dock，
   *   为 Hero / pinned chip / 跨应用 handoff 引用兜底，仍保留卡片数据。 */
  sh_mastery: {
    appName: "作业练习",
    menuName: "学过的知识点",
    headline: "已掌握知识点 86 个·本周新学会矢量分解 / 力的合成 2 个",
    stats: [
      { label: "已掌握", value: "86 个", tone: "success" },
      { label: "本周新增", value: "2 个", tone: "info" },
      { label: "学习时长", value: "12h", tone: "default" },
      { label: "勋章", value: "5 枚", tone: "success" },
    ],
    prompts: ["看新增知识点", "看我学过什么", "查看勋章", "下一步学什么"],
  },
  sr_week: {
    appName: "学习报告",
    menuName: "本周报告",
    headline: "本周物理位次 +3 ↑·数学持平·英语下降 1 位（建议补强单词记忆）",
    stats: [
      { label: "物理位次", value: "+3 ↑", tone: "success" },
      { label: "数学", value: "持平", tone: "default" },
      { label: "英语", value: "-1 ↓", tone: "warning" },
      { label: "总学时", value: "12h", tone: "info" },
    ],
    prompts: ["看物理细节", "英语怎么提分", "对比上周", "发给爸爸看"],
  },
  sr_term: {
    appName: "学习报告",
    menuName: "学期报告",
    headline: "学期物理总分 92（年级前 15%）·薄弱：能量守恒 / 强项：力学",
    stats: [
      { label: "总分", value: "92", tone: "success" },
      { label: "年级位次", value: "前 15%", tone: "success" },
      { label: "薄弱章节", value: "2 章", tone: "warning" },
      { label: "强项章节", value: "5 章", tone: "success" },
    ],
    prompts: ["看薄弱章节详情", "重点练能量守恒", "对比上学期", "下载学期报告"],
  },
  sr_progress: {
    appName: "学习报告",
    menuName: "进步对比",
    headline: "近 8 周物理趋势：稳定上升 +5 名·错题修正速度提升 30%",
    stats: [
      { label: "8 周位次", value: "+5 ↑", tone: "success" },
      { label: "修正速度", value: "+30%", tone: "success" },
      { label: "平均得分", value: "89", tone: "info" },
      { label: "波动", value: "低", tone: "success" },
    ],
    prompts: ["看趋势图", "对比同班同学", "导出进步证书", "把进步发给爸妈看"],
  },
}

/* ---------------------------------------------------------------
 * 家长（场景八）三级菜单：4 dock = 课表 / 学情管理 / 请假调课 / 家长服务
 * 旧 ID（prc_* / psv_balance）保留为 Hero / pinned 联动兜底
 * --------------------------------------------------------------- */
const PARENT_REGISTRY: Record<string, EduDockMenuCardData> = {
  ps_today: {
    appName: "课表",
    menuName: "今日课表",
    headline: "今天 19:00 物理《力的合成与分解》— 孩子预习 2/3·课前 3 件小事约 5 分钟",
    stats: [
      { label: "今日节数", value: "1 节", tone: "info" },
      { label: "预习进度", value: "67%", tone: "default" },
      { label: "距上课", value: "1h18m", tone: "info" },
      { label: "课前小事", value: "3 件", tone: "warning" },
    ],
    prompts: ["看课前 3 件小事", "本节课预告", "提醒孩子准备", "看老师评语"],
  },
  ps_week: {
    appName: "课表",
    menuName: "课表日历",
    headline: "本月共 14 节·本周还有 4 节·下周一线下家长会 18:30，可在月视图查看全部安排",
    stats: [
      { label: "本月节数", value: "14 节", tone: "info" },
      { label: "本周", value: "4 节", tone: "default" },
      { label: "线下", value: "1 场", tone: "default" },
      { label: "已完成", value: "8 节", tone: "success" },
    ],
    prompts: ["切换到周/月视图", "确认家长会出席", "导出课表日历", "看下月安排"],
  },
  /** ===== 家长 · 学情管理（新 dock：学情报告 / 课堂风采） ===== */
  pll_report: {
    appName: "学情管理",
    menuName: "学情报告",
    headline: "本周物理位次 +3 ↑·能量守恒章节有薄弱信号·近 30 天报告 12 份可回看",
    stats: [
      { label: "本周位次", value: "+3 ↑", tone: "success" },
      { label: "薄弱章节", value: "能量守恒", tone: "warning" },
      { label: "近 30 天", value: "12 份", tone: "info" },
      { label: "未读", value: "2 份", tone: "warning" },
    ],
    prompts: ["看本周物理报告", "看老师长期评价", "今晚怎么陪孩子", "把进步发给爱人"],
  },
  pll_class_show: {
    appName: "学情管理",
    menuName: "课堂风采",
    headline: "本节亮点片段 1 段（抢答正确）·近 30 天累计 8 段·本周新增 3 段",
    stats: [
      { label: "本节亮点", value: "1 段", tone: "success" },
      { label: "近 30 天", value: "8 段", tone: "info" },
      { label: "本周新增", value: "3 段", tone: "default" },
      { label: "已分享", value: "2 段", tone: "default" },
    ],
    prompts: ["看本节亮点片段", "分享给爱人", "保存到相册", "和王老师道谢"],
  },
  pc_fulfillment: {
    appName: "课程管理",
    menuName: "课程履约",
    headline: "孩子本周应上 4 节、已完成 2 节；今晚还有 1 节主线物理课待完成。",
    stats: [
      { label: "应上课次", value: "4 节", tone: "info" },
      { label: "已完成", value: "2 节", tone: "success" },
      { label: "待完成", value: "2 节", tone: "warning" },
      { label: "履约率", value: "50%", tone: "default" },
    ],
    prompts: ["看孩子待上课程", "提醒课前准备", "查看缺勤记录", "联系教务"],
  },
  pc_student_leave: {
    appName: "课程管理",
    menuName: "学生请假",
    headline: "孩子近 30 天请假 1 次；本节若需请假建议开课前 30 分钟提交。",
    stats: [
      { label: "近 30 天", value: "1 次", tone: "default" },
      { label: "可补课", value: "1 次", tone: "info" },
      { label: "审批时长", value: "约 10m", tone: "default" },
      { label: "课时扣减", value: "按规则", tone: "warning" },
    ],
    prompts: ["代孩子请假", "查看请假规则", "申请补课", "联系教务"],
  },
  /** ===== 家长 · 请假调课（新 dock：请假 / 调课） ===== */
  plv_leave: {
    appName: "请假调课",
    menuName: "请假",
    headline: "近 1 个月请假 1 次；本节课请假需在开课前 30 分钟提交，越晚审批越紧",
    stats: [
      { label: "本月请假", value: "1 次", tone: "default" },
      { label: "可补课", value: "1 次", tone: "info" },
      { label: "审批时长", value: "约 10m", tone: "default" },
      { label: "课时不扣", value: "是", tone: "success" },
    ],
    prompts: ["给本节课请假", "提前给下周请假", "查看请假规则", "联系教务"],
  },
  plv_swap: {
    appName: "请假调课",
    menuName: "调课",
    headline: "本月调课 0 次·剩余可调 3 次·下周二 19:00 与下周四 19:00 都有名额",
    stats: [
      { label: "本月已调", value: "0 次", tone: "default" },
      { label: "剩余可调", value: "3 次", tone: "info" },
      { label: "可选时段", value: "2 个", tone: "success" },
      { label: "课时余额", value: "12 课时", tone: "success" },
    ],
    prompts: ["把本节调到下周", "看可选时段", "联系教务", "查看调课规则"],
  },
  /** 旧入口"请假调课"合卡保留为兼容 */
  ps_leave: {
    appName: "请假调课",
    menuName: "请假调课",
    headline: "近 1 个月请假 1 次·可申请补课 1 次·调课记录 0",
    stats: [
      { label: "请假", value: "1 次", tone: "default" },
      { label: "可补课", value: "1 次", tone: "info" },
      { label: "调课记录", value: "0 次", tone: "default" },
      { label: "课时余额", value: "12 课时", tone: "success" },
    ],
    prompts: ["代孩子请假", "申请补课", "联系教务", "查看请假规则"],
  },
  prc_latest: {
    appName: "学习报告",
    menuName: "最新报告",
    headline: "本节孩子位次 +3 ↑·课堂亮点 1 段（抢答正确）·薄弱点 1 项（矢量方向）",
    stats: [
      { label: "本节位次", value: "+3 ↑", tone: "success" },
      { label: "亮点", value: "1 段", tone: "success" },
      { label: "薄弱点", value: "1 项", tone: "warning" },
      { label: "今晚陪孩子", value: "约 15m", tone: "default" },
    ],
    prompts: ["看亮点片段", "今晚怎么陪孩子", "和王老师私聊", "分享给爱人"],
  },
  prc_archive: {
    appName: "学习报告",
    menuName: "历史报告",
    headline: "近 30 天报告 12 份·物理 5 份 / 数学 4 份 / 英语 3 份·本周已出 4 份",
    stats: [
      { label: "近 30 天", value: "12 份", tone: "info" },
      { label: "本周", value: "4 份", tone: "default" },
      { label: "未读", value: "2 份", tone: "warning" },
      { label: "已收藏", value: "3 份", tone: "default" },
    ],
    prompts: ["看本周物理报告", "标记已读全部", "导出近 30 天", "搜索某个章节"],
  },
  prc_profile: {
    appName: "学习报告",
    menuName: "学情画像",
    headline: "孩子学情：力学强 / 能量守恒弱·学习习惯：晚 8 点专注度最高·建议巩固能量章节",
    stats: [
      { label: "强项学科", value: "物理", tone: "success" },
      { label: "薄弱章节", value: "能量守恒", tone: "warning" },
      { label: "最佳时段", value: "20:00", tone: "info" },
      { label: "稳定性", value: "高", tone: "success" },
    ],
    prompts: ["看老师长期评价", "推荐陪练方案", "学习时间建议", "对比同年级"],
  },
  psv_teachers: {
    appName: "家长服务",
    menuName: "老师沟通",
    headline: "任课老师 3 位·班主任王老师 / 物理王老师 / 英语 Lisa·上次沟通 3 天前",
    stats: [
      { label: "任课老师", value: "3 位", tone: "info" },
      { label: "班主任", value: "王老师", tone: "default" },
      { label: "未读", value: "1 条", tone: "warning" },
      { label: "上次沟通", value: "3 天前", tone: "default" },
    ],
    prompts: ["私聊王老师", "私聊 Lisa", "联系班主任", "查看历史"],
  },
  /** 旧 dock 项保留为兜底（Hero / pinned 仍可能引用） */
  psv_balance: {
    appName: "家长服务",
    menuName: "课时余额",
    headline: "剩余 12 课时·按当前频率约可上 6 周·建议在剩 6 课时前续费",
    stats: [
      { label: "余课时", value: "12 节", tone: "warning" },
      { label: "可用周数", value: "约 6 周", tone: "default" },
      { label: "本月已用", value: "8 节", tone: "info" },
      { label: "续费建议", value: "1 周后", tone: "warning" },
    ],
    prompts: ["查看课时明细", "立即续费", "暂缓提醒", "联系教务"],
  },
  /** ===== 家长 · 家长服务 · 订单管理（新 dock：订单管理） ===== */
  psv_orders: {
    appName: "商品管理",
    menuName: "我的订单",
    headline: "近 30 天订单 4 笔：进行中 2 笔（30 课时套餐 / 教材包）·待支付 1 笔·已退 1 笔",
    stats: [
      { label: "近 30 天", value: "4 笔", tone: "info" },
      { label: "进行中", value: "2 笔", tone: "default" },
      { label: "待支付", value: "1 笔", tone: "warning" },
      { label: "已退", value: "1 笔", tone: "default" },
    ],
    prompts: ["完成待支付订单", "查看 30 课时套餐进度", "申请退款", "下载发票"],
  },
  pm_family: {
    appName: "成员管理",
    menuName: "家庭成员",
    headline: "家庭成员 3 位（爸爸 / 妈妈 / 孩子）；当前学习消息默认同步给爸爸与妈妈。",
    stats: [
      { label: "家庭成员", value: "3 位", tone: "info" },
      { label: "已绑定孩子", value: "1 位", tone: "success" },
      { label: "主联系人", value: "爸爸", tone: "default" },
      { label: "同步状态", value: "正常", tone: "success" },
    ],
    prompts: ["新增家庭成员", "切换主联系人", "管理消息同步", "解绑成员"],
  },
  pr_reward: {
    appName: "奖励管理",
    menuName: "奖励管理",
    headline: "孩子本周获得 3 项奖励：已领取 2 项、待领取 1 项；建议今晚和孩子一起领取并复盘。",
    stats: [
      { label: "本周奖励", value: "3 项", tone: "info" },
      { label: "已领取", value: "2 项", tone: "success" },
      { label: "待领取", value: "1 项", tone: "warning" },
      { label: "连胜记录", value: "4 次", tone: "success" },
    ],
    prompts: ["帮孩子领取奖励", "查看奖励规则", "看本周表现趋势", "和老师沟通激励方式"],
  },
  /** ===== 家长 · 家长服务 · 账单管理（新 dock 替代旧"续费"位） ===== */
  psv_billing: {
    appName: "家长服务",
    menuName: "账单管理",
    headline: "近 30 天账单 5 笔·应付 1 笔（¥ 980 教材包，3 天后到期）·已开发票 3 张",
    stats: [
      { label: "应付账单", value: "1 笔", tone: "warning" },
      { label: "本月已付", value: "¥ 4,820", tone: "default" },
      { label: "已开发票", value: "3 张", tone: "success" },
      { label: "待开发票", value: "1 张", tone: "info" },
    ],
    prompts: ["现在去支付", "申请开发票", "下载本月对账单", "看消费明细"],
  },
  /** 旧 dock 项保留为兜底（旧版"续费"分支被合并到账单管理 / 家长服务，但仍可能被 Hero / pinned 引用） */
  psv_renew: {
    appName: "家长服务",
    menuName: "续费",
    headline: "续费窗口已开·15 课时套餐 9 折 / 30 课时 8 折·剩余 12 课时建议本周决策",
    stats: [
      { label: "续费优惠", value: "9 折起", tone: "success" },
      { label: "热门套餐", value: "30 课时", tone: "info" },
      { label: "余课时", value: "12 节", tone: "warning" },
      { label: "可用周数", value: "约 6 周", tone: "default" },
    ],
    prompts: ["选 30 课时套餐", "看课时明细", "查看续费政策", "联系教务"],
  },
}

/* ---------------------------------------------------------------
 * 机构管理者（场景九）历史 dock 三级菜单：3 dock × 3 menu = 9 条
 * 现已与场景六共用 EDU_PRO_REGISTRY，但这些旧 ID 仍被以下入口引用：
 *   - AdminCampusOverviewHeroCard / AdminTodaySnapshotCard 的 drillSkillId
 *   - educationPinnedTaskData 中的 skillId
 * 因此保留卡片数据，作为 Hero / pinned 联动的兜底（dock 不再展示这些 ID）
 * --------------------------------------------------------------- */
const ADMIN_LEGACY_REGISTRY: Record<string, EduDockMenuCardData> = {
  ao_today: {
    appName: "管理",
    menuName: "成员管理",
    headline: "当前在职成员 42 人：教师 18、助教 9、班主任 6、教务 9；本周有 2 位老师待分配班级。",
    stats: [
      { label: "成员总数", value: "42 人", tone: "info" },
      { label: "待分班老师", value: "2 人", tone: "warning" },
      { label: "待开通账号", value: "3 人", tone: "warning" },
      { label: "本月离职", value: "1 人", tone: "default" },
    ],
    prompts: ["新增成员", "调整角色权限", "分配老师到班级", "处理离职停用"],
  },
  ao_schedule: {
    appName: "管理",
    menuName: "班级与分班",
    headline: "当前 26 个班：满班预警 3 个、低出勤班 2 个；本周新增转班申请 6 条。",
    stats: [
      { label: "班级总数", value: "26 个", tone: "info" },
      { label: "满班预警", value: "3 个", tone: "warning" },
      { label: "转班申请", value: "6 条", tone: "warning" },
      { label: "低出勤班", value: "2 个", tone: "default" },
    ],
    prompts: ["处理转班申请", "查看满班预警", "同步分班通知", "导出班级名单"],
  },
  ao_classroom: {
    appName: "管理",
    menuName: "教室与资源",
    headline: "教室资源总览：12 间可用、2 间维修中；本周设备故障工单 4 条待处理。",
    stats: [
      { label: "可用教室", value: "12 间", tone: "success" },
      { label: "维修中", value: "2 间", tone: "warning" },
      { label: "待处理工单", value: "4 条", tone: "warning" },
      { label: "物资充足度", value: "90%", tone: "default" },
    ],
    prompts: ["派单维修设备", "补充教学物资", "查看教室占用", "导出资源日报"],
  },
  aq_supervise: {
    appName: "教学",
    menuName: "课程与教案",
    headline: "课程库共 42 门：本周更新教案 9 份，2 门课程缺课后练习，需补齐发布。",
    stats: [
      { label: "课程总数", value: "42 门", tone: "info" },
      { label: "本周改版", value: "9 份", tone: "default" },
      { label: "缺练习", value: "2 门", tone: "warning" },
      { label: "待审核", value: "3 份", tone: "warning" },
    ],
    prompts: ["新建课程模板", "复制教案到新班", "补齐课后练习", "发布本周教学目标"],
  },
  aq_teacher: {
    appName: "教学",
    menuName: "排课与课表管理",
    headline: "本周排课 186 节，存在 7 处时间冲突和 2 处教室冲突；晚高峰教师排班偏紧。",
    stats: [
      { label: "本周课次", value: "186 节", tone: "info" },
      { label: "时间冲突", value: "7 处", tone: "warning" },
      { label: "教室冲突", value: "2 处", tone: "warning" },
      { label: "排班饱和", value: "92%", tone: "default" },
    ],
    prompts: ["新建排课", "调整课表", "处理排课冲突", "导出课表"],
  },
  aq_research: {
    appName: "教学",
    menuName: "教学质量",
    headline: "本周课堂质量均分 84；低分课 3 节（<75）；随机听课任务待完成 5 节。",
    stats: [
      { label: "质量均分", value: "84", tone: "default" },
      { label: "低分课", value: "3 节", tone: "warning" },
      { label: "待听课", value: "5 节", tone: "warning" },
      { label: "完成整改", value: "6 条", tone: "success" },
    ],
    prompts: ["随机听 1 节", "查看低分课堂", "派发改进任务", "导出教学质量周报"],
  },
  ab_metrics: {
    appName: "经营",
    menuName: "课程商品",
    headline: "当前在售课程商品 36 个，本月新上架 4 个；2 个低转化商品需要调整定价或包装。",
    stats: [
      { label: "在售商品", value: "36 个", tone: "info" },
      { label: "本月上新", value: "4 个", tone: "success" },
      { label: "低转化", value: "2 个", tone: "warning" },
      { label: "下架待审", value: "1 个", tone: "default" },
    ],
    prompts: ["新建课包商品", "调整商品价格", "上下架课程商品", "查看商品转化"],
  },
  ab_renew: {
    appName: "经营",
    menuName: "订单管理",
    headline: "今日新增订单 28 笔：待支付 6 笔、退款处理中 2 笔；有 1 笔跨校区订单待人工确认。",
    stats: [
      { label: "今日订单", value: "28 笔", tone: "info" },
      { label: "待支付", value: "6 笔", tone: "warning" },
      { label: "退款中", value: "2 笔", tone: "warning" },
      { label: "异常订单", value: "1 笔", tone: "default" },
    ],
    prompts: ["查看待支付订单", "处理退款申请", "确认异常订单", "导出今日对账单"],
  },
  ab_workforce: {
    appName: "经营",
    menuName: "续费与流失",
    headline: "本周到期学员 32 人：已续费 21、人群高风险 6、人群流失 2；建议优先跟进高风险名单。",
    stats: [
      { label: "本周到期", value: "32 人", tone: "info" },
      { label: "已续费", value: "21 人", tone: "success" },
      { label: "高风险", value: "6 人", tone: "warning" },
      { label: "已流失", value: "2 人", tone: "warning" },
    ],
    prompts: ["跟进高风险名单", "发续费方案", "查看流失原因", "导出续费漏斗"],
  },
}

/**
 * 4 身份合并表：
 * - 场景 6 (teacher) & 场景 9 (admin) 共享 EDU_PRO_REGISTRY（按业务方截图统一为 8 dock）
 * - admin 同时叠加 ADMIN_LEGACY_REGISTRY（保留旧 ao_x / aq_x / ab_x 卡数据，供 Hero / pinned 联动兜底）
 * - 场景 7 (student) / 场景 8 (parent) 各自独立
 */
const FULL_REGISTRY: Record<EduSceneRole, Record<string, EduDockMenuCardData>> = {
  teacher: { ...EDU_PRO_REGISTRY, ...ADMIN_LEGACY_REGISTRY },
  student: STUDENT_REGISTRY,
  parent: PARENT_REGISTRY,
  admin: { ...EDU_PRO_REGISTRY, ...ADMIN_LEGACY_REGISTRY },
}

/**
 * 查询：按 (role, menuId) 取卡片数据；找不到时返回 null（调用方可走老 fallback：占位文本）。
 * 不限定 role 时（如 dock 老视角误命中）按全身份匹配第一项。
 */
export function getEduDockMenuCardData(
  role: EduSceneRole | null,
  menuId: string,
  stage: EducationStage = "pre",
): EduDockMenuCardData | null {
  if (role === "teacher" || role === "student" || role === "parent" || role === "admin") {
    const dynamic = buildRoleAwareScheduleCardData(role, menuId, stage)
    if (dynamic) return dynamic
  }
  if (role) {
    return FULL_REGISTRY[role][menuId] ?? null
  }
  for (const r of Object.keys(FULL_REGISTRY) as EduSceneRole[]) {
    const hit = FULL_REGISTRY[r][menuId]
    if (hit) return hit
  }
  return null
}

/* ============================================================
 * marker / 编解码工具：
 *   marker 协议 `<<<RENDER_EDU_DOCK_MENU_CARD>>>:<role>:<menuId>`
 *   - role 用于卡数据分流（避免 menu id 跨身份命名冲突时的回退误差）
 *   - menuId 是三级菜单的 id（与 organizationDockConfig 中的 id 一一对应）
 * ============================================================ */

export const EDU_DOCK_MENU_CARD_MARKER = "<<<RENDER_EDU_DOCK_MENU_CARD>>>" as const

export function buildEduDockMenuCardContent(
  role: EduSceneRole,
  menuId: string,
  stage: EducationStage = "pre",
): string {
  return `${EDU_DOCK_MENU_CARD_MARKER}:${role}:${menuId}:${stage}`
}

export interface ParsedEduDockMenuCard {
  role: EduSceneRole
  menuId: string
  stage?: EducationStage
}

export function parseEduDockMenuCardContent(
  content: string,
): ParsedEduDockMenuCard | null {
  const prefix = `${EDU_DOCK_MENU_CARD_MARKER}:`
  if (!content.startsWith(prefix)) return null
  const rest = content.slice(prefix.length)
  const parts = rest.split(":")
  const role = parts[0] ?? ""
  const maybeStage = parts[parts.length - 1]
  const stage: EducationStage | undefined =
    maybeStage === "pre" || maybeStage === "in" || maybeStage === "post"
      ? maybeStage
      : undefined
  const menuId = stage ? parts.slice(1, -1).join(":") : parts.slice(1).join(":")
  if (
    role !== "teacher" &&
    role !== "student" &&
    role !== "parent" &&
    role !== "admin"
  ) {
    return null
  }
  if (!menuId) return null
  return { role: role as EduSceneRole, menuId, stage }
}
