/**
 * 课表卡片（教育主对话内联消息卡形态）—— "我的课表 / 孩子课表" dock 入口的主路径。
 *
 * 设计：
 * - 用户点 dock 课表 → 教育主对话里 push 一条用户气泡（"我的课表"）+ 一条 AI 气泡（含本卡片的 marker）
 * - 卡片视觉与 `AiClassroomScheduleAgendaPanel`（保留作侧面板兜底）一致，但作为消息卡：
 *   · 不带 close 按钮、不带 sheet chrome；外层用 `GenericCard` 与其他业务卡保持视觉对齐
 *   · 用户点某节"单次课"行 → `onPickLesson(lessonId)` → 父组件 `openAiClassroomSidePanel({ lessonId })`
 *   · 用户点某节"系列课"行 → `onPickSeries(seriesId)` → 父组件打开"系列课子 CUI"
 * - 历史保留：用户在主对话里能往上翻，看到自己什么时候打开过课表
 *
 * 单次课 + 系列课混排策略：
 * - 凡 `lesson.seriesId` 非空（即已绑入系列）的单次课，**不**单独以"单课 row"出现，
 *   避免"力学专题（系列）"和"力的合成与分解（单次）"重复
 * - 单次课 / 系列课各取"代表时间"（单课为 weekday + startTime；系列课为下一课次 outline 的 weekday + startTime）
 *   后按周序号 → HH:mm 升序混排
 */

import * as React from "react"
import { GenericCard } from "./GenericCard"
import { LessonRow } from "./AiClassroomLessonRow"
import { LessonSeriesRow } from "./AiClassroomLessonSeriesRow"
import {
  DEMO_LESSONS,
  getAgendaLessonStatus,
  getAgendaLessonSubtitle,
  type AiClassroomLessonSummary,
} from "./aiClassroomLessonsDemo"
import { DEMO_LESSON } from "./aiClassroomLessonDemo"
import {
  DEMO_SERIES_LIST,
  isSeriesAppearsInThisWeek,
  isSeriesAppearsToday,
  getSeriesNextWeekdayLabel,
  getSeriesNextStartTime,
  getSeriesNextOutlineBoundLessonId,
  getSeriesRowSubtitle,
  type AiClassroomLessonSeries,
} from "./aiClassroomLessonSeriesDemo"
import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

/** 与三身份场景的「孩子课表 / 我的课表」副标对齐 */
const ROLE_TITLE: Record<EduLessonAttendingRole, string> = {
  teacher: "我的课表",
  student: "我的课表",
  parent: "孩子课表",
}

/**
 * 列表头副标按身份切——动机与 `briefSubtitleByRole` 一致：
 * 教师视角是"上 AI 课堂助手做事"；学生 / 家长进入只是"看自己 / 孩子的课程详情"。
 *
 * 文案不再写死"5 节"——动态 count 由调用处 replace 注入；
 * 同时显式提示"含系列课"以匹配混排展现。
 */
const ROLE_LIST_HINT: Record<EduLessonAttendingRole, string> = {
  teacher: "本周共 N 节·点单次课进 AI 课堂助手；点系列课进系列课子 CUI",
  student: "本周共 N 节·点单次课看你的状态；点系列课看整期进度",
  parent: "本周共 N 节·点单次课看孩子状态；点系列课看整期进度与请假",
}

/**
 * marker 协议：`<<<RENDER_AI_CLASSROOM_SCHEDULE>>>:<role>:<scope>`
 * - 解析：`MainAIChatWindow` 的渲染分支按前缀识别，role 用于卡片标题与点击行为分流
 */
export const AI_CLASSROOM_SCHEDULE_CARD_MARKER = "<<<RENDER_AI_CLASSROOM_SCHEDULE>>>" as const
export type AiClassroomScheduleScope = "today" | "week"

/**
 * 用户气泡侧的"打开课表"指令文本——按身份分流：
 * 教师 / 学生 → "我的课表"；家长 → "孩子课表"。
 * 与 dock 二级标签保持完全一致，避免出现"显示一套，点了说另一套"。
 */
export function buildOpenScheduleUserCommand(
  role: EduLessonAttendingRole,
  scope: AiClassroomScheduleScope = "week",
): string {
  if (scope === "today") return "今日课表"
  if (scope === "week") return "本周课表"
  return ROLE_TITLE[role]
}

/** 把 marker 序列化为 AI 气泡 content（写入 educationMessages） */
export function buildAiClassroomScheduleCardContent(
  role: EduLessonAttendingRole,
  scope: AiClassroomScheduleScope = "week",
): string {
  return `${AI_CLASSROOM_SCHEDULE_CARD_MARKER}:${role}:${scope}`
}

/** 解析 marker 的 role；非课表 marker 返回 null */
export function parseAiClassroomScheduleCardRole(
  content: string,
): { role: EduLessonAttendingRole; scope: AiClassroomScheduleScope } | null {
  const prefix = `${AI_CLASSROOM_SCHEDULE_CARD_MARKER}:`
  if (!content.startsWith(prefix)) return null
  const rest = content.slice(prefix.length)
  const [roleRaw, scopeRaw] = rest.split(":")
  if (roleRaw !== "teacher" && roleRaw !== "student" && roleRaw !== "parent") return null
  const scope: AiClassroomScheduleScope = scopeRaw === "today" ? "today" : "week"
  return { role: roleRaw, scope }
}

function titleByScope(role: EduLessonAttendingRole, scope: AiClassroomScheduleScope): string {
  if (scope === "today") return "今日课表"
  if (scope === "week" && role === "parent") return "孩子本周课表"
  if (scope === "week") return "本周课表"
  return ROLE_TITLE[role]
}

/* ============================================================
 * 混排排序
 * - 单次课的代表时间：weekday + startTime
 * - 系列课的代表时间：下一课次 outline 的 weekday + startTime
 * - sortKey = `${weekdayOrder}-${HH:mm}`
 * ============================================================ */

const WEEKDAY_ORDER: Record<string, number> = {
  周一: 1,
  周二: 2,
  周三: 3,
  周四: 4,
  周五: 5,
  周六: 6,
  周日: 7,
}

function lessonSortKey(l: AiClassroomLessonSummary): string {
  const order = WEEKDAY_ORDER[l.weekdayLabel] ?? 99
  return `${String(order).padStart(2, "0")}-${l.startTime}`
}

function seriesSortKey(s: AiClassroomLessonSeries): string {
  const wd = getSeriesNextWeekdayLabel(s)
  const t = getSeriesNextStartTime(s)
  if (!wd || !t) return "99-99:99"
  const order = WEEKDAY_ORDER[wd] ?? 99
  return `${String(order).padStart(2, "0")}-${t}`
}

type ScheduleRow =
  | { kind: "lesson"; lesson: AiClassroomLessonSummary; sortKey: string }
  | { kind: "series"; series: AiClassroomLessonSeries; sortKey: string }

function buildScheduleRows(scope: AiClassroomScheduleScope): ScheduleRow[] {
  /** 单次课：本周全部；today 只取与主线 weekday 一致 */
  const lessons = (scope === "today"
    ? DEMO_LESSONS.filter((l) => l.weekdayLabel === DEMO_LESSON.weekday)
    : DEMO_LESSONS
  )
    /** 已绑入系列的单课不单独出现，由系列 row 承载 */
    .filter((l) => !l.seriesId)

  /** 系列课：进行中始终参与本周；today 仅当下一节 weekday === 主线 weekday 时出现 */
  const series = DEMO_SERIES_LIST.filter((s) => {
    if (scope === "today") return isSeriesAppearsToday(s, DEMO_LESSON.weekday)
    return isSeriesAppearsInThisWeek(s)
  })

  const rows: ScheduleRow[] = [
    ...lessons.map<ScheduleRow>((l) => ({ kind: "lesson", lesson: l, sortKey: lessonSortKey(l) })),
    ...series.map<ScheduleRow>((s) => ({ kind: "series", series: s, sortKey: seriesSortKey(s) })),
  ]

  rows.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))
  return rows
}

export interface AiClassroomScheduleCardProps {
  role: EduLessonAttendingRole
  scope?: AiClassroomScheduleScope
  stage: EducationStage
  /** 用户点某节单次课 → 父组件打开该课子 CUI */
  onPickLesson: (lessonId: string) => void
  /** 用户点某节系列课 → 父组件打开系列课子 CUI（不进 18 卡） */
  onPickSeries: (seriesId: string) => void
  className?: string
}

export function AiClassroomScheduleCard({
  role,
  scope = "week",
  stage,
  onPickLesson,
  onPickSeries,
  className,
}: AiClassroomScheduleCardProps) {
  const rows = buildScheduleRows(scope)
  const totalCount = rows.length

  return (
    <div className={className}>
      <GenericCard title={titleByScope(role, scope)}>
        <p className="m-0 mb-[var(--space-200)] text-[length:var(--font-size-xs)] text-text-tertiary">
          {scope === "today"
            ? `今天共 ${totalCount} 节·点单次课进入子 CUI；点系列课进入系列课主线`
            : ROLE_LIST_HINT[role].replace("本周共 N 节", `本周共 ${totalCount} 节`)}
        </p>
        <ul className="m-0 flex w-full list-none flex-col gap-[var(--space-200)] p-0">
          {rows.map((row) => {
            if (row.kind === "lesson") {
              const status = getAgendaLessonStatus(row.lesson, stage)
              const subtitle = getAgendaLessonSubtitle(row.lesson, stage, role)
              return (
                <li key={`l-${row.lesson.id}`} className="w-full">
                  <LessonRow
                    lesson={row.lesson}
                    status={status}
                    subtitle={subtitle}
                    onPick={() => onPickLesson(row.lesson.id)}
                  />
                </li>
              )
            }
            const subtitle = getSeriesRowSubtitle(row.series, role)
            /**
             * 系列的"下一节"若恰好绑定到主线 DEMO_LESSON：把课级状态徽章顶替系列级静态徽章。
             * 这样课表里能直接读到顶栏 demo 切换的 pre / in / post 状态——
             * 修复"顶栏在课前，但课表里系列还显示进行中"的语义错配。
             */
            const seriesNextBound = getSeriesNextOutlineBoundLessonId(row.series)
            const nextLessonStageStatus =
              seriesNextBound === DEMO_LESSON.id ? stage : undefined
            return (
              <li key={`s-${row.series.id}`} className="w-full">
                <LessonSeriesRow
                  series={row.series}
                  subtitle={subtitle}
                  nextWeekdayLabel={getSeriesNextWeekdayLabel(row.series)}
                  nextStartTime={getSeriesNextStartTime(row.series)}
                  nextLessonStageStatus={nextLessonStageStatus}
                  onPickSeries={() => onPickSeries(row.series.id)}
                />
              </li>
            )
          })}
        </ul>
        <p className="m-0 mt-[var(--space-300)] rounded-[var(--radius-md)] border border-dashed border-border bg-[var(--color-bg-subtle)] px-[var(--space-300)] py-[var(--space-300)] text-[length:var(--font-size-xs)] text-text-tertiary">
          单次课：课前 / 课中 / 课后所有 Skill 都在该节子 CUI 内累积；
          系列课：进入即定位到当下应聚焦的那一节，所有节次都能在顶部「看其它节」展开切换。
        </p>
      </GenericCard>
    </div>
  )
}
