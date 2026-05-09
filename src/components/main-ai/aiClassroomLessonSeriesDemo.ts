/**
 * 系列课 / 课包 demo 数据。
 *
 * 设计动机
 * ----------------------------------------------------
 * 真实机构里大多数课程是"系列课 / 课包"，不是孤立的单次课。
 * - 进行中：周期内陆续上完，每节课进入时和现有单次课子 CUI 一致；但课表上希望以系列粒度出现一行
 * - 已结课：整期已完结，看的是整期归档（结课报告 / 错题汇总 / 续报由家长订单管理走，本模块不做）
 * - 未开课：未来某天开课，看的是大纲 / 预习 / 加日历
 *
 * 与单次课的关系
 * ----------------------------------------------------
 * - 系列课包含 N 节具体课次（lessonId 列表），N 节里**部分** lessonId 与现有 `DEMO_LESSONS` 同 id
 *   → 主对话课表卡渲染时只显示系列课 row，不再显示已绑入系列的单次课 row（避免重复）
 *   → 系列课子 CUI 内部"课次概览"列表里则会列出全部课次（含未绑现有单次课的 demo 占位）
 * - 已结课 / 未开课的系列：内部所有课次都不绑现有 DEMO_LESSONS（避免污染主线 18 卡数据）
 */

import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export type AiClassroomSeriesStatus = "ongoing" | "completed" | "upcoming"

export interface AiClassroomSeriesLessonOutline {
  /** 课次序号（从 1 起） */
  index: number
  /** 课次标题 */
  title: string
  /** "3/04 周一 19:00 - 19:45" 等可读时间标签 */
  scheduleLabel: string
  /** 用于排序的 ISO date 字符串（YYYY-MM-DD HH:mm） */
  scheduledAt: string
  /** 若该课次绑定到 DEMO_LESSONS 中某节，则给出对应 lessonId（点击行可下钻到单课子 CUI） */
  boundLessonId: string | null
  /** 静态状态（系列课内每节课的归档状态；主线课会被 educationStage 覆盖） */
  staticStatus: "past" | "upcoming"
}

export interface AiClassroomLessonSeries {
  /** "series-phy-mech-2026spring" */
  id: string
  /** 显示名 */
  name: string
  subject: string
  teacher: string
  className: string
  classroom: string
  /** "2026.03.04 - 2026.05.20" */
  periodLabel: string
  totalLessons: number
  completedLessons: number
  staticStatus: AiClassroomSeriesStatus
  /** 下一课次的 lessonId（若该课次绑现有单课）或 outline.index（未绑时仍能定位到内部第 N 次） */
  nextLessonOutlineIndex: number | null
  /** 课次大纲（length === totalLessons） */
  outlines: AiClassroomSeriesLessonOutline[]
  /** 按身份的副标（与单次课的 briefSubtitleByRole 同构） */
  briefSubtitleByRole: Record<EduLessonAttendingRole, string>
  /** 进入子 CUI 时的开场副文案（按身份分流，与状态无关；状态由 panel 内部分流） */
  openingSubtitleByRole: Record<EduLessonAttendingRole, string>
}

/* ============================================================
 * 三个系列 demo
 *   1) 进行中：力学专题（春 12 节，已上 4）
 *   2) 已结课：寒假衔接（10 节）
 *   3) 未开课：暑期口语营（8 节）
 * ============================================================ */

const SERIES_PHY_MECH: AiClassroomLessonSeries = {
  id: "series-phy-mech-2026spring",
  name: "初一物理 · 力学专题（春 12 节）",
  subject: "物理",
  teacher: "王老师",
  className: "初一(3)班",
  classroom: "线上互动教室 A1",
  periodLabel: "2026.03.04 - 2026.05.20",
  totalLessons: 12,
  completedLessons: 4,
  staticStatus: "ongoing",
  nextLessonOutlineIndex: 5,
  outlines: [
    {
      index: 1,
      title: "牛顿三大定律 · 综合应用",
      scheduleLabel: "3/04 周一 19:00",
      scheduledAt: "2026-03-04 19:00",
      boundLessonId: "lesson-phy-3-1-2026w19",
      staticStatus: "past",
    },
    {
      index: 2,
      title: "重力与弹力 · 章末测",
      scheduleLabel: "3/05 周二 19:00",
      scheduledAt: "2026-03-05 19:00",
      boundLessonId: "lesson-phy-2-3-2026w19",
      staticStatus: "past",
    },
    {
      index: 3,
      title: "摩擦力 · 实验回顾",
      scheduleLabel: "3/07 周四 19:00",
      scheduledAt: "2026-03-07 19:00",
      boundLessonId: null,
      staticStatus: "past",
    },
    {
      index: 4,
      title: "受力分析 · 综合训练",
      scheduleLabel: "3/10 周一 19:00",
      scheduledAt: "2026-03-10 19:00",
      boundLessonId: null,
      staticStatus: "past",
    },
    {
      index: 5,
      title: "力的合成与分解",
      scheduleLabel: "3/12 周三 19:00",
      scheduledAt: "2026-03-12 19:00",
      /** 主线课：boundLessonId 指向 DEMO_LESSON.id，单课子 CUI 拥有 18 张卡 */
      boundLessonId: "lesson-phy-3-2-2026w19",
      staticStatus: "upcoming",
    },
    {
      index: 6,
      title: "浮力与压强 · 概念入门",
      scheduleLabel: "3/14 周五 19:00",
      scheduledAt: "2026-03-14 19:00",
      boundLessonId: "lesson-phy-3-3-2026w19",
      staticStatus: "upcoming",
    },
    {
      index: 7,
      title: "动能与势能 · 公开课",
      scheduleLabel: "3/15 周六 10:00",
      scheduledAt: "2026-03-15 10:00",
      boundLessonId: "lesson-phy-3-4-2026w19",
      staticStatus: "upcoming",
    },
    {
      index: 8,
      title: "功率 · 公式与计算",
      scheduleLabel: "3/17 周一 19:00",
      scheduledAt: "2026-03-17 19:00",
      boundLessonId: null,
      staticStatus: "upcoming",
    },
    {
      index: 9,
      title: "机械能守恒 · 入门",
      scheduleLabel: "3/19 周三 19:00",
      scheduledAt: "2026-03-19 19:00",
      boundLessonId: null,
      staticStatus: "upcoming",
    },
    {
      index: 10,
      title: "机械能守恒 · 综合",
      scheduleLabel: "3/21 周五 19:00",
      scheduledAt: "2026-03-21 19:00",
      boundLessonId: null,
      staticStatus: "upcoming",
    },
    {
      index: 11,
      title: "本期错题集中突破",
      scheduleLabel: "3/24 周一 19:00",
      scheduledAt: "2026-03-24 19:00",
      boundLessonId: null,
      staticStatus: "upcoming",
    },
    {
      index: 12,
      title: "力学专题 · 收官与总结",
      scheduleLabel: "3/26 周三 19:00",
      scheduledAt: "2026-03-26 19:00",
      boundLessonId: null,
      staticStatus: "upcoming",
    },
  ],
  briefSubtitleByRole: {
    teacher: "进度 4 / 12 · 平均到课 96% · 课后报告全部签收",
    student: "已上 4 节 · 你这期得分均值 88 · 错题已沉淀 12 道",
    parent: "孩子已上 4 节 · 位次 +3 ↑ · 整体专注度 88",
  },
  openingSubtitleByRole: {
    teacher: "整套 12 节按节追踪学情 / 错题 / 备课节奏；可以从下一节起手，或回看已上节的复盘。",
    student: "看你这期成绩走势、做下一节预习、重做这期错题；上一节没听懂的也能在这里翻回去。",
    parent: "看孩子这期进步、提醒下次预习、给孩子请假；想和老师沟通 IM 入口在右上。",
  },
}

const SERIES_PHY_WINTER: AiClassroomLessonSeries = {
  id: "series-phy-winter-2026",
  name: "初一物理 · 寒假衔接（10 节）",
  subject: "物理",
  teacher: "王老师",
  className: "初一(3)班",
  classroom: "线上互动教室 A1",
  periodLabel: "2026.01.20 - 2026.02.18",
  totalLessons: 10,
  completedLessons: 10,
  staticStatus: "completed",
  nextLessonOutlineIndex: null,
  outlines: Array.from({ length: 10 }, (_, idx) => ({
    index: idx + 1,
    title:
      [
        "运动学起步 · 位置与速度",
        "匀变速直线运动",
        "自由落体 · 实验",
        "牛顿第一定律",
        "牛顿第二定律",
        "牛顿第三定律",
        "重力与弹力 · 入门",
        "弹簧测力计 · 实验",
        "摩擦力 · 入门",
        "寒假衔接 · 章末综合",
      ][idx],
    scheduleLabel: `1/${20 + Math.floor(idx * 3)} ${
      ["周二", "周五", "周一", "周四", "周日", "周三", "周六", "周二", "周五", "周一"][idx]
    } 19:00`,
    scheduledAt: `2026-01-${String(20 + Math.floor(idx * 3)).padStart(2, "0")} 19:00`,
    boundLessonId: null,
    staticStatus: "past" as const,
  })),
  briefSubtitleByRole: {
    teacher: "已结课 · 班均 88 · 课后报告 100% 签收 · 错题汇总 36 道",
    student: "已结课 · 你这期得分 92 · 进步 +12 名 · 错题已收集 18 道",
    parent: "已结课 · 孩子位次 +5 ↑ · 完整学情报告已生成",
  },
  openingSubtitleByRole: {
    teacher: "本期 10 节已全部上完。你可以一键看完整结课报告 / 错题汇总，或导出本期记录归档。",
    student: "本期 10 节都上完了，错题本已沉淀。继续做错题、看完整报告，下期开课提前预习。",
    parent: "本期已完结，孩子整体进步明显。可以看完整报告，或归档本期记录。",
  },
}

const SERIES_ENG_SUMMER: AiClassroomLessonSeries = {
  id: "series-eng-summer-2026",
  name: "初一英语 · 暑期口语营（8 节）",
  subject: "英语",
  teacher: "Lisa",
  className: "初一(3)班",
  classroom: "线上互动教室 C1",
  periodLabel: "2026.07.10 - 2026.07.31",
  totalLessons: 8,
  completedLessons: 0,
  staticStatus: "upcoming",
  nextLessonOutlineIndex: 1,
  outlines: Array.from({ length: 8 }, (_, idx) => ({
    index: idx + 1,
    title:
      [
        "破冰：自我介绍与日常问候",
        "校园生活 · 描述一天",
        "兴趣爱好 · 表达喜恶",
        "出行问路 · 情境对话",
        "餐厅点餐 · 角色扮演",
        "节日文化 · 主题分享",
        "旅行计划 · 结对讨论",
        "结营展示 · 情景剧",
      ][idx],
    scheduleLabel: `7/${10 + idx * 3} ${
      ["周五", "周一", "周四", "周日", "周三", "周六", "周二", "周五"][idx]
    } 10:00`,
    scheduledAt: `2026-07-${String(10 + idx * 3).padStart(2, "0")} 10:00`,
    boundLessonId: null,
    staticStatus: "upcoming" as const,
  })),
  briefSubtitleByRole: {
    teacher: "未开课 · 备课进度 30% · 课件就位 5 / 8",
    student: "未开课 · 预习 0 / 8 · 还有 18 天开课",
    parent: "未开课 · 孩子还没开预习 · 要提醒一下吗？",
  },
  openingSubtitleByRole: {
    teacher: "暑期 8 节口语营，目前 30% 备课。可以提前看大纲、补完最后 3 节课件、给学员发预习。",
    student: "暑期口语营 18 天后开课。可以看课程大纲，或开始第 1 节的预习材料。",
    parent: "孩子的暑期口语营 7 月 10 日开课。可以加入家庭日历、或提前提醒孩子开预习。",
  },
}

export const DEMO_SERIES_LIST: AiClassroomLessonSeries[] = [
  SERIES_PHY_MECH,
  SERIES_PHY_WINTER,
  SERIES_ENG_SUMMER,
]

/** 通过 seriesId 取系列 */
export function findLessonSeries(seriesId: string): AiClassroomLessonSeries | null {
  return DEMO_SERIES_LIST.find((s) => s.id === seriesId) ?? null
}

/**
 * 通过 lessonId 反查所属系列（若被绑定）；用于：
 * 1. 课表卡过滤——绑定到任何系列的单次课不再单独以"单课 row"出现
 * 2. 单课子 CUI header 上展示"所属系列"标签（可选）
 */
export function findSeriesByLessonId(lessonId: string): AiClassroomLessonSeries | null {
  for (const s of DEMO_SERIES_LIST) {
    if (s.outlines.some((o) => o.boundLessonId === lessonId)) return s
  }
  return null
}

/**
 * 系列课在主对话课表里的"代表时间"（取下一课次的 scheduledAt）：
 * - 进行中 / 未开课：取 nextLessonOutlineIndex 对应 outline.scheduledAt
 * - 已结课：返回 null（不参与课表混排）
 */
export function getSeriesNextScheduledAt(series: AiClassroomLessonSeries): string | null {
  if (series.staticStatus === "completed") return null
  if (series.nextLessonOutlineIndex == null) return null
  const outline = series.outlines.find((o) => o.index === series.nextLessonOutlineIndex)
  return outline?.scheduledAt ?? null
}

/**
 * 系列课在主对话课表里的"下一课次"展示文本：
 * "3 月 12 日 周三 19:00《力的合成与分解》"
 */
export function getSeriesNextLessonLabel(series: AiClassroomLessonSeries): string | null {
  if (series.staticStatus === "completed") return null
  if (series.nextLessonOutlineIndex == null) return null
  const outline = series.outlines.find((o) => o.index === series.nextLessonOutlineIndex)
  if (!outline) return null
  return `${outline.scheduleLabel}《${outline.title}》`
}

/**
 * 系列课的"代表行内副标"：按身份返回静态副标。
 * 与单次课 row 对齐（briefSubtitleByRole）。
 */
export function getSeriesRowSubtitle(
  series: AiClassroomLessonSeries,
  role: EduLessonAttendingRole,
): string {
  return series.briefSubtitleByRole[role]
}

/**
 * 系列课内某课次的"等效状态"：
 * - 主线课次（boundLessonId === DEMO_LESSON.id）：随 educationStage 在 pre / in / post 切
 * - 其它课次：等于 outline.staticStatus（past / upcoming）
 *
 * 与单次课的 4 态一一对齐：past → 已完成；upcoming → 即将上课；
 * pre / in / post 则交由调用方按主线 stage 渲染相应徽章。
 */
export function getSeriesOutlineEffectiveStatus(
  outline: AiClassroomSeriesLessonOutline,
  educationStage: EducationStage,
  mainLessonId: string,
): "past" | "upcoming" | "pre" | "in" | "post" {
  if (outline.boundLessonId === mainLessonId) return educationStage
  return outline.staticStatus
}

/**
 * 系列课"下一节课"的 weekday 文字（从 outline.scheduleLabel 解析）。
 * 用于课表 today 维度过滤："周三"匹配演示当下。
 */
export function getSeriesNextWeekdayLabel(series: AiClassroomLessonSeries): string | null {
  if (series.staticStatus === "completed" || series.nextLessonOutlineIndex == null) return null
  const outline = series.outlines.find((o) => o.index === series.nextLessonOutlineIndex)
  if (!outline) return null
  const m = outline.scheduleLabel.match(/周[一二三四五六日]/)
  return m ? m[0] : null
}

/**
 * 系列课"下一节课"的开始时间（HH:mm），用于课表混排排序。
 */
export function getSeriesNextStartTime(series: AiClassroomLessonSeries): string | null {
  if (series.staticStatus === "completed" || series.nextLessonOutlineIndex == null) return null
  const outline = series.outlines.find((o) => o.index === series.nextLessonOutlineIndex)
  if (!outline) return null
  const m = outline.scheduleLabel.match(/(\d{1,2}:\d{2})/)
  return m ? m[1] : null
}

/**
 * 系列课"下一节课"对应的 boundLessonId（若该课次绑定到现有 DEMO_LESSONS）。
 *
 * 调用方（课表卡 / agenda）拿到后可与 `DEMO_LESSON.id` 比对，
 * 判断"系列的下一节就是顶栏 demo 切换驱动的主线课"，从而把
 * 课级（pre / in / post）状态徽章顶替掉系列级（ongoing / upcoming / completed）静态徽章，
 * 让用户在课表里直接读到顶栏 demo 状态。
 */
export function getSeriesNextOutlineBoundLessonId(
  series: AiClassroomLessonSeries,
): string | null {
  if (series.nextLessonOutlineIndex == null) return null
  const outline = series.outlines.find((o) => o.index === series.nextLessonOutlineIndex)
  return outline?.boundLessonId ?? null
}

/**
 * 系列课在"本周课表"里是否出现（demo 简化）：仅"进行中"系列纳入本周。
 * 已结课不出现；未开课也不出现（远期系列由"全部系列"或"未来课"另起入口）。
 */
export function isSeriesAppearsInThisWeek(series: AiClassroomLessonSeries): boolean {
  return series.staticStatus === "ongoing"
}

/**
 * 系列课在"今日课表"里是否出现：在本周基础上，下一节 weekday === 演示当天 weekday。
 */
export function isSeriesAppearsToday(
  series: AiClassroomLessonSeries,
  todayWeekdayLabel: string,
): boolean {
  if (!isSeriesAppearsInThisWeek(series)) return false
  const wd = getSeriesNextWeekdayLabel(series)
  return wd === todayWeekdayLabel
}
