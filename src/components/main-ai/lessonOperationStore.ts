import * as React from "react"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

export type LessonAttendanceStatus = "unsigned" | "signed" | "leave"

export interface LessonStudentAttendance {
  id: string
  name: string
  status: LessonAttendanceStatus
}

export interface LessonLeaveRecord {
  id: string
  /** "teacher" 代表老师代请假（按学员逐条登记） */
  byRole: "student" | "parent" | "teacher"
  studentName: string
  reason: string
  createdAt: number
}

export interface LessonRescheduleRequest {
  id: string
  byRole: "student" | "parent"
  studentName: string
  fromLabel: string
  toLabel: string
  reason: string
  status: "pending" | "approved" | "rejected"
  createdAt: number
}

export interface LessonTeacherRescheduleRecord {
  id: string
  studentName: string
  fromLabel: string
  toLabel: string
  reason: string
  createdAt: number
}

export interface LessonOperationSnapshot {
  lessonId: string
  attendees: LessonStudentAttendance[]
  leaves: LessonLeaveRecord[]
  rescheduleRequests: LessonRescheduleRequest[]
  teacherReschedules: LessonTeacherRescheduleRecord[]
}

interface PersistedState {
  lessons: Record<string, Omit<LessonOperationSnapshot, "lessonId">>
}

const STORAGE_KEY = "vvai_lesson_operation_store_v1"
const CHANGE_EVENT = "vvai-lesson-operation-store"
const DEFAULT_SLOT_LABEL = "2026-05-11 周一 14:00 - 15:00"

const DEFAULT_ATTENDEES: ReadonlyArray<{ id: string; name: string }> = [
  { id: "stu-lin-xiaoan", name: "林小安" },
  { id: "stu-zhou-yutong", name: "周予桐" },
  { id: "stu-huang-siqi", name: "黄思齐" },
  { id: "stu-zhao-xinyu", name: "赵欣宇" },
  { id: "stu-liu-yiming", name: "刘一鸣" },
  { id: "stu-chen-ke", name: "陈可" },
]

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function emitChange() {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

function loadRawState(): PersistedState {
  if (!isBrowser()) return { lessons: {} }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { lessons: {} }
    const parsed = JSON.parse(raw) as PersistedState
    if (!parsed || typeof parsed !== "object" || !parsed.lessons || typeof parsed.lessons !== "object") {
      return { lessons: {} }
    }
    return parsed
  } catch {
    return { lessons: {} }
  }
}

function saveRawState(next: PersistedState) {
  if (!isBrowser()) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // noop
  }
}

function ensureLessonState(lessonId: string): Omit<LessonOperationSnapshot, "lessonId"> {
  const state = loadRawState()
  const existing = state.lessons[lessonId]
  if (existing) return existing
  const created: Omit<LessonOperationSnapshot, "lessonId"> = {
    attendees: DEFAULT_ATTENDEES.map((s) => ({
      id: s.id,
      name: s.name,
      status: "unsigned" as LessonAttendanceStatus,
    })),
    leaves: [],
    rescheduleRequests: [],
    teacherReschedules: [],
  }
  state.lessons[lessonId] = created
  saveRawState(state)
  return created
}

function updateLessonState(
  lessonId: string,
  updater: (prev: Omit<LessonOperationSnapshot, "lessonId">) => Omit<LessonOperationSnapshot, "lessonId">,
) {
  const state = loadRawState()
  const prev = state.lessons[lessonId] ?? ensureLessonState(lessonId)
  state.lessons[lessonId] = updater(prev)
  saveRawState(state)
  emitChange()
}

export function getLessonOperationSnapshot(lessonId: string): LessonOperationSnapshot {
  const lesson = ensureLessonState(lessonId)
  return { lessonId, ...lesson }
}

export function markStudentSigned(lessonId: string, studentId: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    attendees: prev.attendees.map((s) =>
      s.id === studentId ? { ...s, status: "signed" as LessonAttendanceStatus } : s,
    ),
  }))
}

export function markAllStudentsSigned(lessonId: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    attendees: prev.attendees.map((s) =>
      s.status === "leave" ? s : { ...s, status: "signed" as LessonAttendanceStatus },
    ),
  }))
}

/** 教师纠错：将单个学员从 signed 撤销回 unsigned。leave 状态保持不变。 */
export function markStudentUnsigned(lessonId: string, studentId: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    attendees: prev.attendees.map((s) =>
      s.id === studentId && s.status === "signed"
        ? { ...s, status: "unsigned" as LessonAttendanceStatus }
        : s,
    ),
  }))
}

/** 教师批量撤销：所有 signed 回到 unsigned，leave 不动。 */
export function markAllStudentsUnsigned(lessonId: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    attendees: prev.attendees.map((s) =>
      s.status === "signed" ? { ...s, status: "unsigned" as LessonAttendanceStatus } : s,
    ),
  }))
}

export function submitLessonLeave(input: {
  lessonId: string
  byRole: "student" | "parent" | "teacher"
  studentName: string
  reason: string
}) {
  updateLessonState(input.lessonId, (prev) => {
    const now = Date.now()
    return {
      ...prev,
      attendees: prev.attendees.map((s) =>
        s.name === input.studentName ? { ...s, status: "leave" as LessonAttendanceStatus } : s,
      ),
      leaves: [
        ...prev.leaves,
        {
          id: `leave-${now}-${Math.floor(Math.random() * 1000)}`,
          byRole: input.byRole,
          studentName: input.studentName,
          reason: input.reason,
          createdAt: now,
        },
      ],
    }
  })
}

export function submitLessonRescheduleRequest(input: {
  lessonId: string
  byRole: "student" | "parent"
  studentName: string
  toLabel: string
  reason: string
}) {
  updateLessonState(input.lessonId, (prev) => {
    const now = Date.now()
    return {
      ...prev,
      rescheduleRequests: [
        ...prev.rescheduleRequests,
        {
          id: `resq-${now}-${Math.floor(Math.random() * 1000)}`,
          byRole: input.byRole,
          studentName: input.studentName,
          fromLabel: DEFAULT_SLOT_LABEL,
          toLabel: input.toLabel,
          reason: input.reason,
          status: "pending",
          createdAt: now,
        },
      ],
    }
  })
}

export function approveLessonRescheduleRequest(lessonId: string, requestId: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    rescheduleRequests: prev.rescheduleRequests.map((r) =>
      r.id === requestId ? { ...r, status: "approved" as const } : r,
    ),
  }))
}

export function rejectLessonRescheduleRequest(lessonId: string, requestId: string) {
  updateLessonState(lessonId, (prev) => ({
    ...prev,
    rescheduleRequests: prev.rescheduleRequests.map((r) =>
      r.id === requestId ? { ...r, status: "rejected" as const } : r,
    ),
  }))
}

export function teacherDirectReschedule(input: {
  lessonId: string
  studentName: string
  toLabel: string
  reason: string
}) {
  updateLessonState(input.lessonId, (prev) => {
    const now = Date.now()
    return {
      ...prev,
      teacherReschedules: [
        ...prev.teacherReschedules,
        {
          id: `trs-${now}-${Math.floor(Math.random() * 1000)}`,
          studentName: input.studentName,
          fromLabel: DEFAULT_SLOT_LABEL,
          toLabel: input.toLabel,
          reason: input.reason,
          createdAt: now,
        },
      ],
    }
  })
}

export function getRoleSelfStudentName(role: EduLessonAttendingRole): string {
  if (role === "teacher") return "林小安"
  if (role === "student") return "林小安"
  return "林小安"
}

export function useLessonOperationSnapshot(lessonId: string): LessonOperationSnapshot {
  const [snapshot, setSnapshot] = React.useState<LessonOperationSnapshot>(() =>
    getLessonOperationSnapshot(lessonId),
  )

  React.useEffect(() => {
    setSnapshot(getLessonOperationSnapshot(lessonId))
    if (!isBrowser()) return () => undefined
    const refresh = () => setSnapshot(getLessonOperationSnapshot(lessonId))
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [lessonId])

  return snapshot
}

