/**
 * 系列课子 CUI 持久化（demo / sessionStorage）。
 *
 * 设计：
 * - 系列课级别独立 1 个会话线程（与单课子 CUI 不同 key），
 *   关闭再打开仍延续；同 series × 不同身份各自独立。
 * - 调课 / 请假 demo 状态：
 *   · 调课记录：series × outlineIndex → { from, to, reason }
 *   · 请假记录：series × outlineIndex × role → { reason, makeUp }
 *   · 用于课次概览卡 / 系列课 row 展示"已调课 to 03/16"、"我已请假"等徽章
 */

import type { Message } from "../chat/data"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

const SERIES_THREAD_KEY_PREFIX = "vvai.ai-classroom-series.side-thread.v1"
const SERIES_RESCHEDULE_KEY = "vvai.ai-classroom-series.reschedule.v1"
const SERIES_LEAVE_KEY = "vvai.ai-classroom-series.leave.v1"

function buildThreadKey(role: EduLessonAttendingRole, seriesId: string): string {
  return `${SERIES_THREAD_KEY_PREFIX}.${role}.${seriesId}`
}

export function loadAiClassroomSeriesSideThread(
  role: EduLessonAttendingRole,
  seriesId: string,
): Message[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.sessionStorage.getItem(buildThreadKey(role, seriesId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Message[]) : []
  } catch {
    return []
  }
}

export function saveAiClassroomSeriesSideThread(
  role: EduLessonAttendingRole,
  seriesId: string,
  messages: Message[],
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(buildThreadKey(role, seriesId), JSON.stringify(messages))
  } catch {
    /* noop */
  }
}

export function clearAiClassroomSeriesSideThread(
  role: EduLessonAttendingRole,
  seriesId: string,
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(buildThreadKey(role, seriesId))
  } catch {
    /* noop */
  }
}

/* ============================================================
 * 调课记录
 * ============================================================ */

export interface SeriesRescheduleRecord {
  seriesId: string
  outlineIndex: number
  /** 原计划时间标签（"3/14 周五 19:00") */
  fromLabel: string
  /** 改约时间标签（"3/16 周日 10:00") */
  toLabel: string
  /** 改约 ISO 时间（用于排序） */
  toScheduledAt: string
  reason?: string
  /** 操作时间戳 */
  at: number
}

interface RescheduleStore {
  records: SeriesRescheduleRecord[]
}

function loadRescheduleStore(): RescheduleStore {
  if (typeof window === "undefined") return { records: [] }
  try {
    const raw = window.sessionStorage.getItem(SERIES_RESCHEDULE_KEY)
    if (!raw) return { records: [] }
    const parsed = JSON.parse(raw) as RescheduleStore
    if (!parsed || !Array.isArray(parsed.records)) return { records: [] }
    return parsed
  } catch {
    return { records: [] }
  }
}

function saveRescheduleStore(store: RescheduleStore): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SERIES_RESCHEDULE_KEY, JSON.stringify(store))
  } catch {
    /* noop */
  }
}

export function addSeriesRescheduleRecord(record: SeriesRescheduleRecord): void {
  const store = loadRescheduleStore()
  /** 同一 (series, index) 二次调课覆盖前一条 */
  const next = store.records.filter(
    (r) => !(r.seriesId === record.seriesId && r.outlineIndex === record.outlineIndex),
  )
  next.push(record)
  saveRescheduleStore({ records: next })
}

export function getSeriesRescheduleRecord(
  seriesId: string,
  outlineIndex: number,
): SeriesRescheduleRecord | null {
  const store = loadRescheduleStore()
  return (
    store.records.find((r) => r.seriesId === seriesId && r.outlineIndex === outlineIndex) ?? null
  )
}

/* ============================================================
 * 请假记录
 * ============================================================ */

export type SeriesLeaveType = "sick" | "personal" | "schedule"

export interface SeriesLeaveRecord {
  seriesId: string
  outlineIndex: number
  role: "student" | "parent"
  type: SeriesLeaveType
  /** 是否需要排补课 */
  needMakeUp: boolean
  reason?: string
  at: number
}

interface LeaveStore {
  records: SeriesLeaveRecord[]
}

function loadLeaveStore(): LeaveStore {
  if (typeof window === "undefined") return { records: [] }
  try {
    const raw = window.sessionStorage.getItem(SERIES_LEAVE_KEY)
    if (!raw) return { records: [] }
    const parsed = JSON.parse(raw) as LeaveStore
    if (!parsed || !Array.isArray(parsed.records)) return { records: [] }
    return parsed
  } catch {
    return { records: [] }
  }
}

function saveLeaveStore(store: LeaveStore): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(SERIES_LEAVE_KEY, JSON.stringify(store))
  } catch {
    /* noop */
  }
}

export function addSeriesLeaveRecord(record: SeriesLeaveRecord): void {
  const store = loadLeaveStore()
  const next = store.records.filter(
    (r) =>
      !(
        r.seriesId === record.seriesId &&
        r.outlineIndex === record.outlineIndex &&
        r.role === record.role
      ),
  )
  next.push(record)
  saveLeaveStore({ records: next })
}

export function getSeriesLeaveRecord(
  seriesId: string,
  outlineIndex: number,
  role: "student" | "parent",
): SeriesLeaveRecord | null {
  const store = loadLeaveStore()
  return (
    store.records.find(
      (r) => r.seriesId === seriesId && r.outlineIndex === outlineIndex && r.role === role,
    ) ?? null
  )
}

export const SERIES_LEAVE_TYPE_LABEL: Record<SeriesLeaveType, string> = {
  sick: "身体不适",
  personal: "个人事务",
  schedule: "时间冲突",
}
