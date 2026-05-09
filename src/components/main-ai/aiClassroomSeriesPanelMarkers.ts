/**
 * 系列课子 CUI 内的自定义消息 marker 集。
 *
 * 与单课子 CUI 的 marker（`<<<RENDER_AI_SKILL_CARD>>>` 等）正交：
 * - 这里都是系列课特有的整套交互（课次概览、调课、请假、回执）
 * - 单课子 CUI 不会复用这些 marker
 *
 * 序列化协议：`<<<MARKER>>>:<json>`，json 里塞 ID / 索引等元数据。
 */

import type {
  AiClassroomLessonSeries,
  AiClassroomSeriesLessonOutline,
} from "./aiClassroomLessonSeriesDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"
import type { SeriesLeaveType } from "./aiClassroomLessonSeriesPersistence"

/* ==============================
 * 课次概览卡（panel 主开场后由 chip 触发）
 * ============================== */
export const AIC_SERIES_OUTLINE_MARKER = "<<<AIC_SERIES_OUTLINE>>>"

export interface SeriesOutlinePayload {
  seriesId: string
  role: EduLessonAttendingRole
}

export function buildSeriesOutlineCardContent(payload: SeriesOutlinePayload): string {
  return `${AIC_SERIES_OUTLINE_MARKER}:${JSON.stringify(payload)}`
}

export function parseSeriesOutlineCardContent(content: string): SeriesOutlinePayload | null {
  if (!content.startsWith(`${AIC_SERIES_OUTLINE_MARKER}:`)) return null
  try {
    return JSON.parse(content.slice(`${AIC_SERIES_OUTLINE_MARKER}:`.length)) as SeriesOutlinePayload
  } catch {
    return null
  }
}

/* ==============================
 * 调课表单卡（教师专属）
 * ============================== */
export const AIC_SERIES_RESCHEDULE_FORM_MARKER = "<<<AIC_SERIES_RESCHEDULE_FORM>>>"

export interface SeriesRescheduleFormPayload {
  seriesId: string
  /** 默认要调的课次（用户在概览卡里点了某节课的"调课"按钮 → 直接预选） */
  outlineIndex: number
}

export function buildSeriesRescheduleFormContent(payload: SeriesRescheduleFormPayload): string {
  return `${AIC_SERIES_RESCHEDULE_FORM_MARKER}:${JSON.stringify(payload)}`
}

export function parseSeriesRescheduleFormContent(
  content: string,
): SeriesRescheduleFormPayload | null {
  if (!content.startsWith(`${AIC_SERIES_RESCHEDULE_FORM_MARKER}:`)) return null
  try {
    return JSON.parse(
      content.slice(`${AIC_SERIES_RESCHEDULE_FORM_MARKER}:`.length),
    ) as SeriesRescheduleFormPayload
  } catch {
    return null
  }
}

/* ==============================
 * 调课已完成回执卡
 * ============================== */
export const AIC_SERIES_RESCHEDULE_DONE_MARKER = "<<<AIC_SERIES_RESCHEDULE_DONE>>>"

export interface SeriesRescheduleDonePayload {
  seriesId: string
  outlineIndex: number
  fromLabel: string
  toLabel: string
  reason?: string
}

export function buildSeriesRescheduleDoneContent(payload: SeriesRescheduleDonePayload): string {
  return `${AIC_SERIES_RESCHEDULE_DONE_MARKER}:${JSON.stringify(payload)}`
}

export function parseSeriesRescheduleDoneContent(
  content: string,
): SeriesRescheduleDonePayload | null {
  if (!content.startsWith(`${AIC_SERIES_RESCHEDULE_DONE_MARKER}:`)) return null
  try {
    return JSON.parse(
      content.slice(`${AIC_SERIES_RESCHEDULE_DONE_MARKER}:`.length),
    ) as SeriesRescheduleDonePayload
  } catch {
    return null
  }
}

/* ==============================
 * 请假表单卡（学生 / 家长）
 * ============================== */
export const AIC_SERIES_LEAVE_FORM_MARKER = "<<<AIC_SERIES_LEAVE_FORM>>>"

export interface SeriesLeaveFormPayload {
  seriesId: string
  outlineIndex: number
  /** 谁在请假：student（自己） / parent（代孩子） */
  byRole: "student" | "parent"
}

export function buildSeriesLeaveFormContent(payload: SeriesLeaveFormPayload): string {
  return `${AIC_SERIES_LEAVE_FORM_MARKER}:${JSON.stringify(payload)}`
}

export function parseSeriesLeaveFormContent(content: string): SeriesLeaveFormPayload | null {
  if (!content.startsWith(`${AIC_SERIES_LEAVE_FORM_MARKER}:`)) return null
  try {
    return JSON.parse(
      content.slice(`${AIC_SERIES_LEAVE_FORM_MARKER}:`.length),
    ) as SeriesLeaveFormPayload
  } catch {
    return null
  }
}

/* ==============================
 * 请假已完成回执卡
 * ============================== */
export const AIC_SERIES_LEAVE_DONE_MARKER = "<<<AIC_SERIES_LEAVE_DONE>>>"

export interface SeriesLeaveDonePayload {
  seriesId: string
  outlineIndex: number
  byRole: "student" | "parent"
  type: SeriesLeaveType
  needMakeUp: boolean
  reason?: string
}

export function buildSeriesLeaveDoneContent(payload: SeriesLeaveDonePayload): string {
  return `${AIC_SERIES_LEAVE_DONE_MARKER}:${JSON.stringify(payload)}`
}

export function parseSeriesLeaveDoneContent(content: string): SeriesLeaveDonePayload | null {
  if (!content.startsWith(`${AIC_SERIES_LEAVE_DONE_MARKER}:`)) return null
  try {
    return JSON.parse(
      content.slice(`${AIC_SERIES_LEAVE_DONE_MARKER}:`.length),
    ) as SeriesLeaveDonePayload
  } catch {
    return null
  }
}

/* ==============================
 * 「下一课次预设新时间」生成器（demo）
 * - 为避免做完整日期选择器，给 3 个固定候选：
 *   · 原时间 + 2 天 同一时间
 *   · 原时间 + 3 天 提前 1 小时
 *   · 周末 10:00（同周或下周）
 * ============================== */
export interface RescheduleOption {
  id: string
  label: string
  /** ISO 时间（用于持久化） */
  scheduledAt: string
}

export function buildRescheduleOptions(
  outline: AiClassroomSeriesLessonOutline,
): RescheduleOption[] {
  /** 极简 demo：直接基于 outline.scheduleLabel 生成 3 个候选标签 */
  const base = outline.scheduleLabel
  const week = base.match(/周[一二三四五六日]/)?.[0] ?? "周三"
  const time = base.match(/(\d{1,2}:\d{2})/)?.[1] ?? "19:00"
  const date = base.match(/^\d{1,2}\/\d{1,2}/)?.[0] ?? "3/14"
  const [m, d] = date.split("/").map((n) => parseInt(n, 10))
  const fmt = (mo: number, da: number, w: string, t: string) => `${mo}/${da} ${w} ${t}`
  /** 周序循环 */
  const WEEK_ORDER = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
  const wIdx = WEEK_ORDER.indexOf(week)
  const next = (delta: number, time: string) => {
    /** 仅为演示用：跨月不算精准，统一加 delta 天 */
    const newDay = d + delta
    const newWeekIdx = (wIdx + delta) % 7
    return fmt(m, newDay, WEEK_ORDER[newWeekIdx], time)
  }
  return [
    {
      id: "opt-plus2",
      label: `${next(2, time)}（+2 天 · 同时段）`,
      scheduledAt: `${next(2, time)}`,
    },
    {
      id: "opt-plus3-earlier",
      label: `${next(3, shiftHour(time, -1))}（+3 天 · 提前 1 小时）`,
      scheduledAt: `${next(3, shiftHour(time, -1))}`,
    },
    {
      id: "opt-weekend",
      label: `${nextWeekend(m, d, wIdx)}（最近周末上午 10:00）`,
      scheduledAt: `${nextWeekend(m, d, wIdx)}`,
    },
  ]
}

function shiftHour(t: string, h: number): string {
  const [hh, mm] = t.split(":")
  const next = String(Math.max(0, parseInt(hh, 10) + h)).padStart(2, "0")
  return `${next}:${mm}`
}

function nextWeekend(m: number, d: number, wIdx: number): string {
  /** wIdx 0=周一 … 5=周六 6=周日；找下一个周六 */
  const SAT = 5
  const delta = (SAT - wIdx + 7) % 7 || 7
  return `${m}/${d + delta} 周六 10:00`
}
