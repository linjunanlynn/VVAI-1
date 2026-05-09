/**
 * 多课程 demo 数据：用于课表 GUI 列表渲染。
 * - 每条课程绑定一个固定的"演示当下"展示状态（pre / live / post）
 * - 「today」是 DEMO_LESSON 主线（与 18 张卡完全联动；状态由 educationStage 驱动）
 * - 其他课程为辅助场景，进入侧 CUI 时使用通用 lesson briefing（无 18 卡完整数据）
 *
 * 设计原则：
 * - 所有身份共享同一份课表（教师 / 学生 / 家长 看到的「这周的课」一致）
 * - 字段简单，便于 agenda 列表渲染
 *
 * 状态徽章 / 副文案语义梳理（与 `AiClassroomLessonRow` 配色对齐）：
 * - past · 已完成   → 灰底（done），过往课归档
 * - upcoming · 即将开课 → 浅 info 蓝（soon），未来课
 * - pre · 课前准备中  → 主色（focus），仅"本节"主线在课前阶段
 * - in · 上课中     → 绿色脉冲（live），仅"本节"主线在课中阶段
 * - post · 本节·已结束 → 主色（focus），仅"本节"主线在课后阶段，与"已完成"在语义上区分（仍有课后流程）
 *
 * 副文案严格"不与徽章前缀重复"（不再写"已完成 · …"/"即将开课 · …"，避免双重信息）。
 */

import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import { DEMO_LESSON } from "./aiClassroomLessonDemo"
import { DEMO_SERIES_LIST } from "./aiClassroomLessonSeriesDemo"

export interface AiClassroomLessonSummary {
  /** 唯一 id，作为侧 CUI lessonId */
  id: string
  /** 是否是 18 张卡完整联动的主线课程（仅 DEMO_LESSON 为 true） */
  isMain: boolean
  /**
   * 若该单次课已绑入某系列课（课包），seriesId 指向 `AiClassroomLessonSeries.id`。
   * 课表卡渲染时会用它过滤掉"已绑入系列"的单课 row，
   * 避免与系列课 row 重复展现；点系列课 row 进系列子 CUI，再下钻到单课。
   */
  seriesId?: string | null
  subject: string
  title: string
  /** "周三 19:00 - 19:45" / "周四 19:30 - 20:15" 等 */
  weekdayLabel: string
  startTime: string
  endTime: string
  classroom: string
  className: string
  teacher: string
  /**
   * 静态状态（不随 educationStage 变）：
   * - past：已完成（含课后报告）
   * - upcoming：未开课（pre）
   * 主线 main 的状态会被 educationStage 覆盖
   */
  staticStatus: "past" | "upcoming"
  /**
   * 简要副标题（agenda 列表展示），按身份分流。
   *
   * 为什么按身份：原本只有一个 `briefSubtitle: string`，文案全是教师视角
   * （"平均分 88 · 课后报告 31/32 已签收"、"备课进度 60%"），学生 / 家长打开
   * 课表时看到的也是这套老师味数据，明显错位。改为每身份一份，由调用方按 role 取。
   *
   * 约束：**不要**以"已完成 · "/"即将开课 · " 开头；徽章已承担状态语义，副标只承担"额外信息"。
   */
  briefSubtitleByRole: Record<EduLessonAttendingRole, string>
  /** 课时编号 */
  index: number
  /** 是否是当前周 */
  thisWeek: boolean
}

/**
 * 七节课组合（其中周三 = 今日，覆盖多状态）：
 * - 周一 物理 第 18 课（已完成 · past）
 * - 周二 物理 第 19 课（已完成 · past）
 * - 周三 16:00 数学 第 20 课（已完成 · past）
 * - 周三 17:10 英语 第 21 课（已完成 · past）
 * - 周三 19:00 物理 第 22 课《力的合成与分解》（主线 → 由 stage 驱动 pre/in/post）
 * - 周三 20:10 语文 第 23 课（即将开课 · upcoming）
 * - 周五/周六 物理扩展课（即将开课 · upcoming）
 */
export const DEMO_LESSONS: AiClassroomLessonSummary[] = [
  {
    id: "lesson-phy-3-1-2026w19",
    isMain: false,
    seriesId: "series-phy-mech-2026spring",
    subject: "物理",
    title: "牛顿三大定律 · 综合应用",
    weekdayLabel: "周一",
    startTime: "19:00",
    endTime: "19:45",
    classroom: "线上互动教室 A1",
    className: "初一(3)班",
    teacher: "王老师",
    staticStatus: "past",
    briefSubtitleByRole: {
      teacher: "平均分 88 · 课后报告 31 / 32 已签收",
      student: "你得分 92 · 错题 3 道已收集",
      parent: "孩子得分 92 · 课后报告已收",
    },
    index: 18,
    thisWeek: true,
  },
  {
    id: "lesson-phy-2-3-2026w19",
    isMain: false,
    seriesId: "series-phy-mech-2026spring",
    subject: "物理",
    title: "重力与弹力 · 章末测",
    weekdayLabel: "周二",
    startTime: "19:00",
    endTime: "19:45",
    classroom: "线上互动教室 A1",
    className: "初一(3)班",
    teacher: "王老师",
    staticStatus: "past",
    briefSubtitleByRole: {
      teacher: "平均分 82 · 课后报告 32 / 32 已签收",
      student: "你得分 85 · 错题 1 道已收集",
      parent: "孩子得分 85 · 课后报告已收",
    },
    index: 19,
    thisWeek: true,
  },
  {
    id: "lesson-math-1-3-2026w19",
    isMain: false,
    subject: "数学",
    title: "一元一次方程 · 专题训练",
    weekdayLabel: "周三",
    startTime: "16:00",
    endTime: "16:45",
    classroom: "线上互动教室 B2",
    className: "初一(3)班",
    teacher: "陈老师",
    staticStatus: "past",
    briefSubtitleByRole: {
      teacher: "到课 31 / 32 · 当堂订正完成 26 人",
      student: "你得分 90 · 方程移项错 1 题",
      parent: "孩子数学得分 90 · 已完成订正",
    },
    index: 20,
    thisWeek: true,
  },
  {
    id: "lesson-eng-1-3-2026w19",
    isMain: false,
    subject: "英语",
    title: "阅读理解 · 关键信息定位",
    weekdayLabel: "周三",
    startTime: "17:10",
    endTime: "17:55",
    classroom: "线上互动教室 C1",
    className: "初一(3)班",
    teacher: "Lisa",
    staticStatus: "past",
    briefSubtitleByRole: {
      teacher: "课堂互动率 84% · 课后小测已发布",
      student: "你正确率 78% · 2 道词义题待复习",
      parent: "孩子英语完成度 78% · 今晚可复盘 10 分钟",
    },
    index: 21,
    thisWeek: true,
  },
  {
    id: DEMO_LESSON.id,
    isMain: true,
    seriesId: "series-phy-mech-2026spring",
    subject: DEMO_LESSON.subject,
    title: DEMO_LESSON.title,
    weekdayLabel: DEMO_LESSON.weekday,
    startTime: DEMO_LESSON.startTime,
    endTime: DEMO_LESSON.endTime,
    classroom: DEMO_LESSON.classroom,
    className: DEMO_LESSON.className,
    teacher: DEMO_LESSON.teacher,
    staticStatus: "upcoming",
    /**
     * 主线副文案在 `getAgendaLessonSubtitle` 中按 (stage × role) 动态覆盖；
     * 此处仅作为"未传 stage 的旧调用路径"的兜底，不再写"即将开课"前缀。
     */
    briefSubtitleByRole: {
      teacher: "本节主线 · 18 张 Skill 卡完整联动",
      student: "本节主线 · 你的预习 / 课中 / 重做错题都在这里",
      parent: "本节主线 · 课前小事 / 一眼直播 / 课后报告都在这里",
    },
    index: 22,
    thisWeek: true,
  },
  {
    id: "lesson-cn-1-3-2026w19",
    isMain: false,
    subject: "语文",
    title: "古诗文阅读 · 意象理解",
    weekdayLabel: "周三",
    startTime: "20:10",
    endTime: "20:55",
    classroom: "线上互动教室 B1",
    className: "初一(3)班",
    teacher: "刘老师",
    staticStatus: "upcoming",
    briefSubtitleByRole: {
      teacher: "已布置课前导读 · 完成率 14 / 32",
      student: "导读任务已下发 · 预计 8 分钟完成",
      parent: "孩子语文导读未完成 · 建议课前提醒",
    },
    index: 23,
    thisWeek: true,
  },
  {
    id: "lesson-phy-3-3-2026w19",
    isMain: false,
    seriesId: "series-phy-mech-2026spring",
    subject: "物理",
    title: "浮力与压强 · 概念入门",
    weekdayLabel: "周五",
    startTime: "19:00",
    endTime: "19:45",
    classroom: "线上互动教室 A1",
    className: "初一(3)班",
    teacher: "王老师",
    staticStatus: "upcoming",
    briefSubtitleByRole: {
      teacher: "课前预习已派发 · 完成率 6 / 32",
      student: "预习包已就位 · 你还没开始",
      parent: "孩子还没开始预习 · 提醒一下？",
    },
    index: 24,
    thisWeek: true,
  },
  {
    id: "lesson-phy-3-4-2026w19",
    isMain: false,
    seriesId: "series-phy-mech-2026spring",
    subject: "物理",
    title: "动能与势能 · 公开课",
    weekdayLabel: "周六",
    startTime: "10:00",
    endTime: "10:45",
    classroom: "线上公开课厅",
    className: "初一(3)班 · 公开课",
    teacher: "王老师",
    staticStatus: "upcoming",
    briefSubtitleByRole: {
      teacher: "公开课节奏 · 欢迎家长旁听",
      student: "公开课节奏 · 可以邀请爸妈一起看",
      parent: "公开课节奏 · 欢迎旁听 · 提前加入",
    },
    index: 25,
    thisWeek: true,
  },
]

/**
 * 主线课程的有效状态（取自当前 educationStage）：
 * - main lesson：pre / in / post 由 stage 决定
 * - 非 main lesson：永远是 staticStatus
 */
export type AgendaLessonStatus = "past" | "upcoming" | "pre" | "in" | "post"

export function getAgendaLessonStatus(
  lesson: AiClassroomLessonSummary,
  educationStage: EducationStage,
): AgendaLessonStatus {
  if (lesson.isMain) {
    return educationStage
  }
  return lesson.staticStatus
}

/**
 * agenda 列表里展示用的状态徽章配置。
 *
 * 配色策略（与 `AiClassroomLessonRow.BADGE_TONE` 对应）：
 * - `done`  → 已完成（灰，归档）
 * - `soon`  → 未来课（浅 info 蓝，弱）
 * - `focus` → "本节"主线·课前/课后（主色，与"本节"语境同层最强）
 * - `live`  → "本节"主线·课中（绿色 + 脉冲）
 *
 * 已废弃：`neutral`（"刚下课"用 warning 黄打架）。
 */
export const AGENDA_STATUS_BADGE: Record<
  AgendaLessonStatus,
  { label: string; tone: "done" | "soon" | "focus" | "live" }
> = {
  past: { label: "已完成", tone: "done" },
  upcoming: { label: "即将开课", tone: "soon" },
  pre: { label: "课前准备中", tone: "focus" },
  in: { label: "上课中", tone: "live" },
  post: { label: "本节 · 已结束", tone: "focus" },
}

/**
 * 主线 lesson 在 (stage × role) 矩阵下的副文案。
 *
 * 9 格说明：
 * - teacher：备课进度 / 课堂助手 / 报告草稿（B 端"我在做事"视角）
 * - student：你的预习 / 你被点 / 你拿了多少分（C 端"我自己"视角）
 * - parent：孩子准备 / 孩子专注度 / 孩子位次（C 端"我家孩子"视角）
 */
const MAIN_LESSON_SUBTITLE: Record<EducationStage, Record<EduLessonAttendingRole, string>> = {
  pre: {
    teacher: "本节主线 · 18 张 Skill 卡完整联动 · 备课进度 60%",
    student: "本节预习 2 / 3 · 矢量方向再练 5 分钟就稳",
    parent: "课前 3 件小事约 5 分钟 · 您不必陪学",
  },
  in: {
    teacher: "正在上课 · 互动出题 / 智能分组 进行中",
    student: "正在上课 · 第 2 题等你抢答",
    parent: "孩子专注度 92% · 30 秒一眼直播可用",
  },
  post: {
    teacher: "本节已结束 · 课后报告草稿已生成",
    student: "本节得分 +3 · 错题 1 道待挑战",
    parent: "孩子位次 +3 ↑ · 课后报告已生成",
  },
}

/**
 * 课表行副文案：主线随 (`educationStage` × `role`) 双维度动态切换，
 * 非主线按 role 取静态 `briefSubtitleByRole[role]`。
 *
 * 调用方（`AiClassroomScheduleCard` / `AiClassroomScheduleAgendaPanel` / `EduLessonPickerCard`）
 * 须以此函数取副文案，不要直接读 `lesson.briefSubtitleByRole`，避免主线在课中 / 课后还显示"备课"。
 */
export function getAgendaLessonSubtitle(
  lesson: AiClassroomLessonSummary,
  educationStage: EducationStage,
  role: EduLessonAttendingRole,
): string {
  if (!lesson.isMain) return lesson.briefSubtitleByRole[role]
  return MAIN_LESSON_SUBTITLE[educationStage][role]
}

/** 通过 lessonId 找到 summary（侧 CUI 头部展示用） */
export function findLessonSummary(lessonId: string): AiClassroomLessonSummary | null {
  return DEMO_LESSONS.find((l) => l.id === lessonId) ?? findSeriesOutlineLessonSummary(lessonId)
}

/* ============================================================
 * 系列合成 outline lessonId → 即时 LessonSummary
 *
 * 系列子 CUI 内非主线节会用合成 lessonId（如 `series-phy-mech-2026spring__outline_3`）
 * 作为 inline 单课 panel 的 lessonId / threadKey。这些 lessonId **不在 DEMO_LESSONS** 里，
 * 但单课 panel 内部多处依赖 findLessonSummary 拿到 title / weekday / className 等渲染元信息
 * （Header、buildLessonOpeningReply 的 fallback、ChatSender placeholder 等）。
 *
 * 这里在不污染 DEMO_LESSONS 数组的前提下，从 series demo 数据动态合成一份 summary 返回。
 * 这样所有调用方都不需要改，外观与"非主线 demo lesson"一致。
 * ============================================================ */
function findSeriesOutlineLessonSummary(lessonId: string): AiClassroomLessonSummary | null {
  const m = lessonId.match(/^(.+?)__outline_(\d+)$/)
  if (!m) return null
  const seriesId = m[1]
  const outlineIndex = Number.parseInt(m[2], 10)
  if (!Number.isFinite(outlineIndex)) return null
  const series = DEMO_SERIES_LIST.find((s) => s.id === seriesId)
  if (!series) return null
  const outline = series.outlines.find((o) => o.index === outlineIndex)
  if (!outline) return null

  /** scheduleLabel 形如「周三 19:00 - 19:45」/「周四 19:30 - 20:15」；解析失败给占位 */
  const tm = outline.scheduleLabel.match(
    /(周[一二三四五六日])\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/,
  )
  const weekday = tm?.[1] ?? "—"
  const startTime = tm?.[2] ?? "—"
  const endTime = tm?.[3] ?? "—"

  const isPast = outline.staticStatus === "past"
  const subtitle = isPast ? "本节已完成" : "本节即将开课"

  return {
    id: lessonId,
    isMain: false,
    seriesId: series.id,
    subject: series.subject,
    title: outline.title,
    weekdayLabel: weekday,
    startTime,
    endTime,
    classroom: series.classroom,
    className: series.className,
    teacher: series.teacher,
    staticStatus: isPast ? "past" : "upcoming",
    briefSubtitleByRole: {
      teacher: subtitle,
      student: subtitle,
      parent: subtitle,
    },
    index: outline.index,
    thisWeek: false,
  }
}
