/**
 * AI 课堂示例课 fixture：教师 / 学生 / 家长 三身份共用同一节课，
 * 在 9 宫格 18 张卡片间形成 B/C 联动主线（该 demo 数据仅用于本地演示）。
 *
 * 主线：初一(3)班 · 物理 · 第三章第二节《力的合成与分解》· 周三 19:00 - 19:45
 */

export interface DemoLesson {
  id: string
  className: string
  subject: string
  chapter: string
  title: string
  weekday: string
  startTime: string
  endTime: string
  classroom: string
  teacher: string
  studentCount: number
  attendanceForecast: number
  prevHomeworkCompletion: number
  preTestAverage: number
  weakKnowledgePoints: { id: string; label: string; mastery: number }[]
  /** 备课包推荐 */
  preparePackages: {
    id: string
    name: string
    fitness: number
    coverage: string
    summary: string
  }[]
}

export interface DemoStudent {
  id: string
  name: string
  attentionScore: number
  interactionScore: number
  homeworkScore: number
  classRank: number
  rankTrend: "up" | "down" | "flat"
  weakPoints: string[]
  notableQuote: string
}

export interface DemoFocusStudent extends DemoStudent {
  /** 报告审核里展示的逐生建议 */
  riskTag: "亮点" | "风险" | "待跟进"
  suggestion: string
}

export interface DemoMistakeQuestion {
  id: string
  index: number
  prompt: string
  myAnswer: string
  correctAnswer: string
  knowledgePoint: string
  variantPreviews: { id: string; label: string }[]
}

export interface DemoParentChild {
  childName: string
  parentName: string
  parentRole: string
  /** 家长端可见的孩子表现摘要 */
  lessonScore: number
  classAverage: number
  rank: number
  rankDelta: number
  rankTrend: "up" | "down" | "flat"
  teacherComment: string
  reinforcePlan: string
}

export const DEMO_LESSON: DemoLesson = {
  id: "lesson-phy-3-2-2026w19",
  className: "初一(3)班",
  subject: "物理",
  chapter: "第三章 第二节",
  title: "力的合成与分解",
  weekday: "周三",
  startTime: "19:00",
  endTime: "19:45",
  classroom: "线上互动教室 A1",
  teacher: "王老师",
  studentCount: 32,
  attendanceForecast: 31,
  prevHomeworkCompletion: 81,
  preTestAverage: 76,
  weakKnowledgePoints: [
    { id: "kp-vector-direction", label: "矢量方向判断", mastery: 58 },
    { id: "kp-force-decomp", label: "力的正交分解", mastery: 64 },
    { id: "kp-equilibrium", label: "三力平衡条件", mastery: 71 },
  ],
  preparePackages: [
    {
      id: "pp-standard",
      name: "标准课件包 · 力的合成与分解 v3.2",
      fitness: 92,
      coverage: "覆盖大纲 8/8",
      summary: "包含 3 段微视频、5 道前测、1 个虚拟实验",
    },
    {
      id: "pp-thin",
      name: "精简课件包 · 公开课节奏",
      fitness: 78,
      coverage: "覆盖大纲 6/8",
      summary: "节奏更紧凑，适合复习课/公开课",
    },
  ],
}

export const DEMO_STUDENT_SELF: DemoStudent = {
  id: "stu-li-xiaoming",
  name: "李小明",
  attentionScore: 86,
  interactionScore: 74,
  homeworkScore: 92,
  classRank: 8,
  rankTrend: "up",
  weakPoints: ["矢量方向判断", "三力平衡条件"],
  notableQuote: "今天分解力的题做得好，方向判断比上节稳！",
}

export const DEMO_FOCUS_STUDENTS: DemoFocusStudent[] = [
  {
    id: "stu-li-xiaoming",
    name: "李小明",
    attentionScore: 86,
    interactionScore: 74,
    homeworkScore: 92,
    classRank: 8,
    rankTrend: "up",
    weakPoints: ["矢量方向判断"],
    notableQuote: "课堂第 3 次抢答正确",
    riskTag: "亮点",
    suggestion: "推 2 道方向判断变式题巩固，避免应试时反向出错",
  },
  {
    id: "stu-zhang-nan",
    name: "张楠",
    attentionScore: 92,
    interactionScore: 88,
    homeworkScore: 95,
    classRank: 2,
    rankTrend: "flat",
    weakPoints: [],
    notableQuote: "整堂课主动答题 4 次，全对",
    riskTag: "亮点",
    suggestion: "可以承担下节互助小组组长，带动后排同学",
  },
  {
    id: "stu-chen-ke",
    name: "陈可",
    attentionScore: 52,
    interactionScore: 38,
    homeworkScore: 60,
    classRank: 27,
    rankTrend: "down",
    weakPoints: ["矢量方向判断", "力的正交分解"],
    notableQuote: "课中走神 3 次，第 7 题答错",
    riskTag: "风险",
    suggestion: "今晚私聊家长 + 推送 5 分钟讲解视频，明日补强",
  },
  {
    id: "stu-wang-jiajia",
    name: "王佳佳",
    attentionScore: 68,
    interactionScore: 60,
    homeworkScore: 70,
    classRank: 18,
    rankTrend: "down",
    weakPoints: ["三力平衡条件"],
    notableQuote: "课堂笔记不完整，平衡判断卡顿",
    riskTag: "待跟进",
    suggestion: "推送笔记模板 + 1 道平衡条件变式题",
  },
  {
    id: "stu-liu-yifei",
    name: "刘一菲",
    attentionScore: 78,
    interactionScore: 66,
    homeworkScore: 85,
    classRank: 11,
    rankTrend: "up",
    weakPoints: [],
    notableQuote: "整体稳，板书工整",
    riskTag: "待跟进",
    suggestion: "可挑战拔高题包；下节增设 1 道难题",
  },
  {
    id: "stu-zhao-xinyu",
    name: "赵欣宇",
    attentionScore: 60,
    interactionScore: 45,
    homeworkScore: 55,
    classRank: 30,
    rankTrend: "down",
    weakPoints: ["矢量方向判断", "力的正交分解", "三力平衡条件"],
    notableQuote: "三次小测全部低于 60",
    riskTag: "风险",
    suggestion: "建议安排一对一辅导，并把家长拉入沟通",
  },
]

export const DEMO_MISTAKE_QUESTION: DemoMistakeQuestion = {
  id: "mq-phy-3-2-q7",
  index: 7,
  prompt:
    "如图，物体在水平桌面上受到三个共点力 F1=4N（向东）、F2=3N（向北）、F3=5N（与 F1 反向）。求合力的大小与方向。",
  myAnswer: "合力 = 2N，方向与 F1 同向",
  correctAnswer: "合力 = 3N，方向正北（即与 F2 同向）",
  knowledgePoint: "矢量方向判断",
  variantPreviews: [
    { id: "vq-1", label: "已知两个相互垂直力，求第三力使物体平衡" },
    { id: "vq-2", label: "30° 夹角下力的正交分解" },
    { id: "vq-3", label: "三力平衡时的方向判断" },
  ],
}

export const DEMO_PARENT_CHILD: DemoParentChild = {
  childName: "李小明",
  parentName: "李爸爸",
  parentRole: "父亲",
  lessonScore: 88,
  classAverage: 79,
  rank: 8,
  rankDelta: 3,
  rankTrend: "up",
  teacherComment: "课堂主动抢答 3 次，作业达成度高，仍需加强矢量方向判断。",
  reinforcePlan: "今晚 21:00-21:15 陪孩子重做错题 3 道 + 看预习视频 5 分钟",
}

export interface DemoQuickQuiz {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
  /** 全班作答分布（demo 数据） */
  distribution: number[]
  responseRate: number
}

export const DEMO_QUICK_QUIZ: DemoQuickQuiz = {
  id: "quiz-phy-3-2-q1",
  prompt: "两力 F1=3N（向东）、F2=4N（向北），合力的方向最接近哪一项？",
  options: ["东偏北 30°", "东偏北 53°", "正北", "正东"],
  correctIndex: 1,
  distribution: [4, 22, 3, 3],
  responseRate: 91,
}

export interface DemoSmartGroup {
  id: string
  name: string
  members: string[]
  focus: string
}

export const DEMO_SMART_GROUPS: DemoSmartGroup[] = [
  { id: "g1", name: "A 组 · 拔高", members: ["张楠", "刘一菲", "孙浩然"], focus: "进阶变式题" },
  { id: "g2", name: "B 组 · 巩固", members: ["李小明", "周晓", "杨柳"], focus: "方向判断巩固" },
  { id: "g3", name: "C 组 · 补强", members: ["陈可", "赵欣宇", "王佳佳"], focus: "正交分解基础" },
]

/* =========================================================
 * 演示运行态：把 EducationStage 映射到一个固定的"当下"，
 * 不依赖真实系统时间，方便 demo 演示稳定的 hero 卡 / 直播条 / ticker。
 * ========================================================= */

import type { EducationStage } from "./educationStageDemo"

/**
 * 进入门户后系统判定的细化课堂态。
 * - pre：常规课前
 * - imminent：临近开课（≤15min），UI 上加强提醒
 * - live：上课中
 * - post：下课后但本节未归档
 * - idle：今天无课（备用，本 demo 暂不触发）
 */
export type LessonRuntimeStatus = "pre" | "imminent" | "live" | "post" | "idle"

/** 每个 EducationStage 锁定的"演示当下"（HH:mm；周三 demo 课 19:00-19:45） */
export const DEMO_NOW_BY_STAGE: Record<EducationStage, string> = {
  pre: "17:42",
  in: "19:12",
  post: "19:48",
}

/** 演示运行时计算（基于 stage，不取系统时间） */
export interface LessonRuntimeState {
  status: LessonRuntimeStatus
  now: string
  /** 距开课分钟数（仅 pre/imminent 有意义；live/post 时为 0） */
  minutesToStart: number
  /** 已上时长 mm:ss（仅 live 有意义） */
  liveElapsed: string
  /** 已上百分比（0-100，仅 live 有意义） */
  liveProgress: number
  /** 已下课时长（min，仅 post 有意义） */
  minutesAfterEnd: number
}

export function getLessonRuntimeState(stage: EducationStage): LessonRuntimeState {
  if (stage === "pre") {
    const now = DEMO_NOW_BY_STAGE.pre
    const minutesToStart = 19 * 60 - (17 * 60 + 42)
    return {
      status: minutesToStart <= 15 ? "imminent" : "pre",
      now,
      minutesToStart,
      liveElapsed: "00:00",
      liveProgress: 0,
      minutesAfterEnd: 0,
    }
  }
  if (stage === "in") {
    const now = DEMO_NOW_BY_STAGE.in
    const elapsedSec = (19 * 60 + 12 - 19 * 60) * 60 + 30
    const totalSec = 45 * 60
    const m = Math.floor(elapsedSec / 60)
    const s = elapsedSec % 60
    return {
      status: "live",
      now,
      minutesToStart: 0,
      liveElapsed: `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      liveProgress: Math.round((elapsedSec / totalSec) * 100),
      minutesAfterEnd: 0,
    }
  }
  const now = DEMO_NOW_BY_STAGE.post
  const minutesAfterEnd = 19 * 60 + 48 - (19 * 60 + 45)
  return {
    status: "post",
    now,
    minutesToStart: 0,
    liveElapsed: "45:00",
    liveProgress: 100,
    minutesAfterEnd,
  }
}

/** 课中时间轴：5 段，刻度精确到秒（demo 用） */
export interface DemoLiveSegment {
  id: string
  label: string
  /** 自开课计起的开始秒 */
  startSec: number
  /** 自开课计起的结束秒 */
  endSec: number
  /** 当下知识点指针（讲到这一段时显示） */
  knowledgePoint: string
}

export const DEMO_LIVE_TIMELINE: DemoLiveSegment[] = [
  { id: "seg-intro", label: "导入", startSec: 0, endSec: 5 * 60, knowledgePoint: "为什么需要合力" },
  { id: "seg-ex1", label: "例题 1", startSec: 5 * 60, endSec: 12 * 60, knowledgePoint: "矢量方向判断" },
  { id: "seg-ex2", label: "例题 2", startSec: 12 * 60, endSec: 22 * 60, knowledgePoint: "矢量方向判断" },
  { id: "seg-drill", label: "习题", startSec: 22 * 60, endSec: 36 * 60, knowledgePoint: "力的正交分解" },
  { id: "seg-summary", label: "总结", startSec: 36 * 60, endSec: 45 * 60, knowledgePoint: "三力平衡条件" },
]

export function getCurrentLiveSegment(elapsedSec: number): DemoLiveSegment {
  const seg = DEMO_LIVE_TIMELINE.find((s) => elapsedSec >= s.startSec && elapsedSec < s.endSec)
  return seg ?? DEMO_LIVE_TIMELINE[0]
}

/** 课中事件 ticker：身份化滚动条（每次取一条循环） */
export const DEMO_LIVE_TICKER: Record<"teacher" | "student" | "parent", string[]> = {
  teacher: [
    "陈可第 3 次走神，建议点名提问",
    "张楠抢答方向题正确 +1",
    "课堂节奏比上节快 8%，建议进入习题前留 30 秒",
    "网络抖动 1 处（赵欣宇端 200ms）",
    "B 组讨论已超时 30 秒，可拉回主线",
  ],
  student: [
    "王老师正在讲第 7 题",
    "你被点名了，准备一下",
    "本节已答对 2 / 3",
    "举手队列前还有 2 人",
    "下一段：习题，预计 10 分钟",
  ],
  parent: [
    "孩子专注度 86%，状态良好",
    "孩子刚抢答正确 +1",
    "网络稳定，延迟 80ms",
    "本节剩余 33 分钟",
    "建议下课后再问，避免打扰",
  ],
}

/** 教师端课中辅助：举手队列（demo） */
export const DEMO_HAND_RAISE_QUEUE: { id: string; name: string; question: string; waitedSec: number }[] = [
  { id: "hr-1", name: "张楠", question: "想答第 7 题方向判断", waitedSec: 12 },
  { id: "hr-2", name: "李小明", question: "想答第 7 题", waitedSec: 6 },
  { id: "hr-3", name: "王佳佳", question: "求老师再讲一遍正交分解", waitedSec: 3 },
]

/** 家长端"30 秒一眼直播"配额（demo） */
export interface DemoParentLiveQuota {
  remainSec: number
  totalSec: number
  resetHint: string
}

export const DEMO_PARENT_LIVE_QUOTA: DemoParentLiveQuota = {
  remainSec: 30,
  totalSec: 30,
  resetHint: "下课前 5 分钟自动重置",
}

