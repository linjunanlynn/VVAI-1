/**
 * 教育四身份场景下的「全局待办带」数据（复用主 VVAI 的 `PinnedTaskCard`）。
 *
 * ## 业务规则（v4 · 多课程聚合 + 强提示排序）
 *
 * 1. 同一条带里**同时**展示「今日课程」（schedule，日历 icon）和「今日待办」（todo，教育 icon）。
 * 2. 排序：每条 chip 都带 `anchorMinutes`（schedule = 开课时间；todo = 截止时间），
 *    按「越接近 now 越靠前」升序展示——最快要发生的事永远在最前。
 * 3. 仅展示**今天**的 schedule 和 todo（demo 中以 `周三` 锚定 today）。
 * 4. 已开始的 schedule（`startTime <= now`）整条**剔除**。
 * 5. 已完成的 todo 不在该区域展示（`tone === "completed"` 直接过滤）。
 * 6. 已逾期未完成的 todo 前置到最前，且按截止时间升序（越早越在前）强提示。
 * 7. 教育语境定义（按用户最新一次明确）：
 *    - schedule = 一节课（lesson）；icon 用日历
 *    - todo = 该角色在课前/课后要做的事（课中无待办）
 *      默认截止时间：
 *        - 课前 todo → 该课的开课时间
 *        - 课后 todo → 「下一次课」的开始时间（当天最后一节课的课后 todo 退到当天 23:59）
 *
 * ## 多课程聚合（v3 新增）
 *
 * 之前只为「主线物理课」生成 chip，导致语文 / 数学 / 英语等今日其它课程的待办看不见。
 * 现按下列规则**逐课聚合**：
 *
 *   for each L in todayLessons (按开课时间升序):
 *     if now < L.startTime         → 输出 L 的 schedule chip + 该角色 L 的「课前 todo」
 *     elif L.endTime <= now        → 输出该角色 L 的「课后 todo」（不含 schedule chip）
 *     else (in-progress)           → 不输出（per "课中：待办：无"）
 *
 * 这样能直观看到：
 *   - 当前未开始的所有课程（含主线 + 其它）的课前事项
 *   - 已结束课程仍未做完的课后事项（已完成不展示）
 *
 * ## chip 文案模板
 *
 *   schedule：`{subject}《{lessonTitle}》[ · 本节]`，副文案 `HH:mm - HH:mm`
 *   todo    ：`{seed.title} · {subject}《{lessonTitle}》`，副文案 `截止 HH:mm` / `已逾期 · 原截止 HH:mm` / `已完成`
 */

import calendarIcon from "figma:asset/e653b0a7cada3ea08e52cb29bc4bd546be59d3d5.png"
import educationIcon from "figma:asset/8449365f45bb140bf269f6769f74387249864ed8.png"

import type { EduSceneRole } from "./homeScenarioLayout"
import type { EducationStage } from "./educationStageDemo"
import {
  DEMO_LESSON,
  DEMO_NOW_BY_STAGE,
  getLessonRuntimeState,
} from "./aiClassroomLessonDemo"
import {
  DEMO_LESSONS,
  type AiClassroomLessonSummary,
} from "./aiClassroomLessonsDemo"

export type EducationPinnedTone = "active" | "completed" | "overdue"
export type EducationPinnedKind = "schedule" | "todo"

/**
 * 与 `PinnedTaskCard` 的 `TaskChipProps` 字段一一对应（不直接 import，避免循环依赖）。
 *
 * - `skillId`：与 `aiClassroomSkillTree` 的 item.id 严格一致；点击 chip 时优先按 id 路由
 *    到 AI课堂侧 CUI 内对应业务卡片，避免字符串模糊匹配的失败。
 * - `command`：用户气泡显示文案 + 后备模糊匹配。
 * - `tone`：active / completed / overdue。
 * - `kind`：schedule（一节课）或 todo（该角色课前/课后该做的事）。
 * - `anchorMinutes`：自当天 00:00 起的分钟数；schedule = 开课时间；todo = 截止时间。
 * - `lessonId`：该 chip 关联到的具体课程 id；用于点击后路由该课的子 CUI / 复用 done 反查。
 * - `uniqueId`：稳定唯一 id（`<schedule|seed>__<lessonId>` 或 admin 的 `<seedId>`），用于 doneIds 反查。
 */
export interface EducationPinnedChip {
  iconSrc: string
  alt: string
  title: string
  time?: string
  skillId: string
  command: string
  tone: EducationPinnedTone
  kind: EducationPinnedKind
  anchorMinutes: number
  lessonId?: string
  uniqueId: string
}

/* ============================================================
 * 时间工具
 * ============================================================ */

function parseHHMM(s: string): number {
  const [hStr, mStr] = s.split(":")
  const h = parseInt(hStr ?? "0", 10)
  const m = parseInt(mStr ?? "0", 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  return h * 60 + m
}

function formatMinutesOfDay(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

const END_OF_DAY = 23 * 60 + 59

/* ============================================================
 * 待办 seed —— 课前 / 课后；逐课程实例化时与 lesson 拼成 uniqueId
 *
 * 命名约定：seed.id 短稳，配合 lessonId 拼出全局唯一的 uniqueId。
 * ============================================================ */

interface TodoSeed {
  id: string
  /** 短名（不含课程名）；展示时拼成 `${seed.title} · ${subject}《${lessonTitle}》` */
  title: string
  alt: string
  skillId: string
  /** 用户气泡显示文案 + 兜底模糊匹配 */
  command: string
}

/* ---- 老师（场景 6） ----
 *
 * 课前：课前准备检查、课件预览确认、预习内容推送
 * 课后：布置作业、发送学情报告、发送课堂风采、查看批改作业
 */
const TEACHER_PRE_SEEDS: TodoSeed[] = [
  {
    id: "tt-prep-check",
    title: "课前准备检查",
    alt: "课前准备检查",
    skillId: "tt-ready",
    command: "课前准备检查",
  },
  {
    id: "tt-courseware",
    title: "课件预览确认",
    alt: "课件预览确认",
    skillId: "tt-prep",
    command: "课件预览确认",
  },
  {
    id: "tt-preview-push",
    title: "预习内容推送",
    alt: "预习内容推送",
    skillId: "tt-preview",
    command: "推送预习包",
  },
]

const TEACHER_POST_SEEDS: TodoSeed[] = [
  {
    id: "ta-asgn-publish",
    title: "布置作业",
    alt: "布置作业",
    skillId: "ta-asgmt",
    command: "布置作业",
  },
  {
    id: "ta-report-send",
    title: "发送学情报告",
    alt: "发送学情报告",
    skillId: "ta-report",
    command: "发送学情报告",
  },
  {
    id: "ta-photo-share",
    title: "发送课堂风采",
    alt: "发送课堂风采",
    skillId: "ta-photo",
    command: "发送课堂风采",
  },
  {
    id: "ta-asgn-review",
    title: "查看批改作业",
    alt: "查看批改作业",
    skillId: "ta-asgmt",
    command: "查看批改作业",
  },
]

/* ---- 学生（场景 7） ----
 *
 * 课前：课前预习
 * 课后：课后作业
 */
const STUDENT_PRE_SEEDS: TodoSeed[] = [
  {
    id: "sp-pack",
    title: "课前预习",
    alt: "课前预习",
    skillId: "sp-pack",
    command: "开始预习",
  },
]

const STUDENT_POST_SEEDS: TodoSeed[] = [
  {
    id: "sa-hw",
    title: "课后作业",
    alt: "课后作业",
    skillId: "sa-asgmt",
    command: "我的作业",
  },
]

/* ---- 家长（场景 8） ----
 *
 * 课前：无
 * 课后：查看学情报告
 */
const PARENT_PRE_SEEDS: TodoSeed[] = []

const PARENT_POST_SEEDS: TodoSeed[] = [
  {
    id: "pa-report",
    title: "查看学情报告",
    alt: "查看学情报告",
    skillId: "pa-report",
    command: "查看学情报告",
  },
]

function getRoleSeeds(role: EduSceneRole, phase: "pre" | "post"): TodoSeed[] {
  if (role === "teacher") return phase === "pre" ? TEACHER_PRE_SEEDS : TEACHER_POST_SEEDS
  if (role === "student") return phase === "pre" ? STUDENT_PRE_SEEDS : STUDENT_POST_SEEDS
  if (role === "parent") return phase === "pre" ? PARENT_PRE_SEEDS : PARENT_POST_SEEDS
  return []
}

/* ---- 管理者（场景 9） ----
 *
 * admin 没有「具体一节课」上下文；用三段合成锚点：早间 12:00 / 高峰 18:00 / 晚间 22:30。
 * uniqueId = `admin__<seedId>`（不绑 lessonId）。
 */

interface AdminTodoSeed {
  id: string
  title: string
  alt: string
  skillId: string
  command: string
  /** 锚定的截止 HH:mm */
  deadline: string
}

const ADMIN_SEEDS: AdminTodoSeed[] = [
  {
    id: "aq_teacher",
    title: "排课与课表管理 · 冲突 7 处",
    alt: "排课与课表管理",
    skillId: "aq_teacher",
    command: "处理排课冲突",
    deadline: "12:00",
  },
  {
    id: "ab_metrics",
    title: "课程商品 · 低转化 2 个",
    alt: "课程商品",
    skillId: "ab_metrics",
    command: "调整商品价格",
    deadline: "12:00",
  },
  {
    id: "ao_today",
    title: "成员管理 · 待开通账号 3 人",
    alt: "成员管理",
    skillId: "ao_today",
    command: "新增成员",
    deadline: "12:00",
  },
  {
    id: "aq_research",
    title: "教学质量 · 低分课 3 节",
    alt: "教学质量",
    skillId: "aq_research",
    command: "查看低分课堂",
    deadline: "18:00",
  },
  {
    id: "ao_classroom",
    title: "教室与资源 · 工单 4 条待处理",
    alt: "教室与资源",
    skillId: "ao_classroom",
    command: "派单维修设备",
    deadline: "18:00",
  },
  {
    id: "ab_renew",
    title: "订单管理 · 待支付 6 笔",
    alt: "订单管理",
    skillId: "ab_renew",
    command: "查看待支付订单",
    deadline: "18:00",
  },
  {
    id: "ab_workforce",
    title: "续费与流失 · 高风险 6 人",
    alt: "续费与流失",
    skillId: "ab_workforce",
    command: "跟进高风险名单",
    deadline: "22:30",
  },
  {
    id: "ao_schedule",
    title: "班级与分班 · 转班申请 6 条",
    alt: "班级与分班",
    skillId: "ao_schedule",
    command: "处理转班申请",
    deadline: "22:30",
  },
  {
    id: "aq_supervise",
    title: "课程与教案 · 本周改版 9 份",
    alt: "课程与教案",
    skillId: "aq_supervise",
    command: "发布本周教学目标",
    deadline: "22:30",
  },
]

/* ============================================================
 * 演示 doneIds：每个 (role × stage) 演示哪些 chip 已完成。
 *
 * uniqueId 形态：
 *   - schedule chip：`schedule__<lessonId>`（schedule 默认不会被勾「完成」，这里仅占位）
 *   - 课前/课后 todo：`<seedId>__<lessonId>`
 *   - admin todo：`admin__<seedId>`
 *
 * 为让 demo 同时能看到 active / overdue / completed 三态，按 stage 推进逐步累计完成。
 * ============================================================ */

const LESSON_MATH = "lesson-math-1-3-2026w19"
const LESSON_ENG = "lesson-eng-1-3-2026w19"
const LESSON_PHY = DEMO_LESSON.id // "lesson-phy-3-2-2026w19"
const LESSON_CN = "lesson-cn-1-3-2026w19"

const DEMO_DONE_IDS: Record<EduSceneRole, Record<EducationStage, string[]>> = {
  teacher: {
    pre: [
      /** 数学课已结束 (16:45)，老师已发了作业和复核了批改；学情报告 / 课堂风采还没发 → 留作 overdue 演示 */
      `ta-asgn-publish__${LESSON_MATH}`,
      `ta-asgn-review__${LESSON_MATH}`,
      /** 主线物理课的预习包已经在白天推完 */
      `tt-preview-push__${LESSON_PHY}`,
    ],
    in: [
      /** 数学课同上 */
      `ta-asgn-publish__${LESSON_MATH}`,
      `ta-asgn-review__${LESSON_MATH}`,
      /** 英语课已结束 (17:55)，老师已布置 / 已查批改 / 已发学情报告，但课堂风采未发 */
      `ta-asgn-publish__${LESSON_ENG}`,
      `ta-asgn-review__${LESSON_ENG}`,
      `ta-report-send__${LESSON_ENG}`,
      /** 主线物理课课前 3 件事全部完成 */
      `tt-prep-check__${LESSON_PHY}`,
      `tt-courseware__${LESSON_PHY}`,
      `tt-preview-push__${LESSON_PHY}`,
    ],
    post: [
      `ta-asgn-publish__${LESSON_MATH}`,
      `ta-asgn-review__${LESSON_MATH}`,
      `ta-asgn-publish__${LESSON_ENG}`,
      `ta-asgn-review__${LESSON_ENG}`,
      `ta-report-send__${LESSON_ENG}`,
      /** 主线物理课刚下课，课后 4 件还都没做（active 演示） */
      /** 语文课 (20:10) 老师已先把预习推送出去 */
      `tt-preview-push__${LESSON_CN}`,
    ],
  },
  student: {
    pre: [
      /** 数学课课后作业还没交（→ overdue 演示） */
      /** 物理课预习已开始（视为完成） */
      `sp-pack__${LESSON_PHY}`,
    ],
    in: [
      `sp-pack__${LESSON_PHY}`,
      /** 数学已交、英语在做 */
      `sa-hw__${LESSON_MATH}`,
    ],
    post: [
      `sp-pack__${LESSON_PHY}`,
      `sa-hw__${LESSON_MATH}`,
      `sa-hw__${LESSON_ENG}`,
      /** 语文课预习也开始了 */
      `sp-pack__${LESSON_CN}`,
    ],
  },
  parent: {
    pre: [
      /** 数学课的学情报告还没看（→ overdue 演示） */
    ],
    in: [
      /** 数学课的学情报告今天上午已看 */
      `pa-report__${LESSON_MATH}`,
    ],
    post: [
      `pa-report__${LESSON_MATH}`,
      `pa-report__${LESSON_ENG}`,
      /** 主线物理课学情报告还没看（active） */
    ],
  },
  admin: {
    pre: [`admin__ao_today`],
    in: [`admin__ao_today`, `admin__aq_teacher`],
    post: [`admin__ao_today`, `admin__aq_teacher`, `admin__ab_renew`],
  },
}

/* ============================================================
 * 主入口
 * ============================================================ */

interface BuiltChipDraft {
  chip: EducationPinnedChip
}

function makeTone(
  isDone: boolean,
  anchorMinutes: number,
  nowMin: number,
): EducationPinnedTone {
  if (isDone) return "completed"
  if (anchorMinutes < nowMin) return "overdue"
  return "active"
}

function timeLabelForTodo(
  tone: EducationPinnedTone,
  anchorMinutes: number,
): string {
  const deadline = formatMinutesOfDay(anchorMinutes)
  if (tone === "completed") return "已完成"
  if (tone === "overdue") return `已逾期 · 原截止 ${deadline}`
  return `截止 ${deadline}`
}

function buildLessonChips(
  role: EduSceneRole,
  nowMin: number,
  doneIds: Set<string>,
): BuiltChipDraft[] {
  const todayLessons = DEMO_LESSONS.filter(
    (l) => l.weekdayLabel === DEMO_LESSON.weekday,
  ).sort((a, b) => parseHHMM(a.startTime) - parseHHMM(b.startTime))

  const drafts: BuiltChipDraft[] = []

  for (let i = 0; i < todayLessons.length; i++) {
    const L: AiClassroomLessonSummary = todayLessons[i]
    const startMin = parseHHMM(L.startTime)
    const endMin = parseHHMM(L.endTime)
    const next = todayLessons[i + 1]
    const nextStartMin = next ? parseHHMM(next.startTime) : END_OF_DAY

    if (nowMin < startMin) {
      /** 1) 未开始的课程：输出 schedule chip（日历 icon） */
      const scheduleUid = `schedule__${L.id}`
      drafts.push({
        chip: {
          iconSrc: calendarIcon,
          alt: `${L.subject}《${L.title}》`,
          title: `${L.subject}《${L.title}》${L.isMain ? " · 本节" : ""}`,
          time: `${L.startTime} - ${L.endTime}`,
          skillId: "ts_today",
          command: `打开 ${L.subject}《${L.title}》`,
          tone: "active",
          kind: "schedule",
          anchorMinutes: startMin,
          lessonId: L.id,
          uniqueId: scheduleUid,
        },
      })

      /** 2) 该角色对该课的「课前 todo」：截止 = 该课开课时间 */
      const preSeeds = getRoleSeeds(role, "pre")
      for (const seed of preSeeds) {
        const uid = `${seed.id}__${L.id}`
        const isDone = doneIds.has(uid)
        const tone = makeTone(isDone, startMin, nowMin)
        drafts.push({
          chip: {
            iconSrc: educationIcon,
            alt: `${seed.alt} · ${L.subject}`,
            title: `${seed.title} · ${L.subject}《${L.title}》`,
            time: timeLabelForTodo(tone, startMin),
            skillId: seed.skillId,
            command: `${seed.command}（${L.subject}）`,
            tone,
            kind: "todo",
            anchorMinutes: startMin,
            lessonId: L.id,
            uniqueId: uid,
          },
        })
      }
    } else if (endMin <= nowMin) {
      /** 已结束的课程：仅输出该角色对该课的「课后 todo」（无 schedule chip） */
      const postSeeds = getRoleSeeds(role, "post")
      for (const seed of postSeeds) {
        const uid = `${seed.id}__${L.id}`
        const isDone = doneIds.has(uid)
        /** 课后 todo 截止时间 = 下一节课开课时间（最后一节课退到当天 23:59） */
        const anchor = nextStartMin
        const tone = makeTone(isDone, anchor, nowMin)
        drafts.push({
          chip: {
            iconSrc: educationIcon,
            alt: `${seed.alt} · ${L.subject}`,
            title: `${seed.title} · ${L.subject}《${L.title}》`,
            time: timeLabelForTodo(tone, anchor),
            skillId: seed.skillId,
            command: `${seed.command}（${L.subject}）`,
            tone,
            kind: "todo",
            anchorMinutes: anchor,
            lessonId: L.id,
            uniqueId: uid,
          },
        })
      }
    }
    /** 进行中的课程：待办：无 → 跳过 */
  }

  return drafts
}

function buildAdminChips(
  nowMin: number,
  doneIds: Set<string>,
): BuiltChipDraft[] {
  return ADMIN_SEEDS.map((seed) => {
    const uid = `admin__${seed.id}`
    const anchor = parseHHMM(seed.deadline)
    const isDone = doneIds.has(uid)
    const tone = makeTone(isDone, anchor, nowMin)
    return {
      chip: {
        iconSrc: educationIcon,
        alt: seed.alt,
        title: seed.title,
        time: timeLabelForTodo(tone, anchor),
        skillId: seed.skillId,
        command: seed.command,
        tone,
        kind: "todo",
        anchorMinutes: anchor,
        uniqueId: uid,
      } as EducationPinnedChip,
    }
  })
}

/**
 * 教育语境下的待办带 chips（直接传给 `PinnedTaskCard` 的 `chips`）。
 *
 * 展示顺序（强提示版）：
 * 1) overdue（按 anchorMinutes 升序；越早越前）
 * 2) active（按 anchorMinutes 升序）
 * 3) completed（不展示）
 */
export function buildEducationPinnedTaskChips(
  role: EduSceneRole,
  stage: EducationStage,
): EducationPinnedChip[] {
  const nowMin = parseHHMM(DEMO_NOW_BY_STAGE[stage])
  const doneIds = new Set(DEMO_DONE_IDS[role]?.[stage] ?? [])

  const drafts: BuiltChipDraft[] =
    role === "admin"
      ? buildAdminChips(nowMin, doneIds)
      : buildLessonChips(role, nowMin, doneIds)

  const overdue = drafts
    .filter((d) => d.chip.tone === "overdue")
    .sort((a, b) => a.chip.anchorMinutes - b.chip.anchorMinutes)
    .map((d) => d.chip)
  const active = drafts
    .filter((d) => d.chip.tone === "active")
    .sort((a, b) => a.chip.anchorMinutes - b.chip.anchorMinutes)
    .map((d) => d.chip)

  return [...overdue, ...active]
}

/**
 * 教育语境下的问候语（替换 `PinnedTaskCard` 的 `greeting`）。
 *
 * 数字以「待处理」为口径（active count），完成 / 逾期不计入主问候。
 */
export function buildEducationPinnedGreeting(
  role: EduSceneRole,
  stage: EducationStage,
): string {
  const rt = getLessonRuntimeState(stage)
  const chips = buildEducationPinnedTaskChips(role, stage)
  const active = chips.filter((c) => c.tone === "active").length
  if (role === "teacher") {
    if (stage === "pre")
      return `王老师，距 ${DEMO_LESSON.startTime} 物理课 ${formatMinutesHuman(rt.minutesToStart)}，今天还有 ${active} 件教育相关的事 👇`
    if (stage === "in")
      return `直播中 · 已 ${rt.liveElapsed}，您可以在课堂助手里处理这 ${active} 件即时事项 👇`
    return `本节课已结束 · 今晚还有 ${active} 件教育收尾要处理 👇`
  }
  if (role === "student") {
    if (stage === "pre")
      return `小明同学，距上课 ${formatMinutesHuman(rt.minutesToStart)}，今天还有 ${active} 件要处理的事 👇`
    if (stage === "in")
      return `上课中 · 已 ${rt.liveElapsed}，需要你即时处理 ${active} 件课堂事项 👇`
    return `本节课结束 · 今晚还有 ${active} 件教育线的小事要做 👇`
  }
  if (role === "parent") {
    if (stage === "pre")
      return `李爸爸，距孩子上课 ${formatMinutesHuman(rt.minutesToStart)}，今天还有 ${active} 件教育相关的事 👇`
    if (stage === "in")
      return `孩子上课中 · 已 ${rt.liveElapsed}，您只需要看 ${active} 件即时事项 👇`
    return `本节课报告已生成 · 今晚还有 ${active} 件家庭教育事项 👇`
  }
  /** admin（场景九） */
  if (stage === "pre") return `校长好，今早全校待开 12 节课，您有 ${active} 件运营事项要盘 👇`
  if (stage === "in") return `课时高峰中 · 5 节在课，您需要关注 ${active} 件实时事项 👇`
  return `今日已完结 · 晚间还有 ${active} 件经营/质量事项要复盘 👇`
}

function formatMinutesHuman(min: number): string {
  if (min <= 0) return "0 分钟"
  if (min < 60) return `${min} 分钟`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} 小时` : `${h}h${m}m`
}
