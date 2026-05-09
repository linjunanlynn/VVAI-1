/**
 * 教育三身份场景 · 课堂任务总线（demo 用 sessionStorage）
 *
 * 解决的痛点：
 * - 老师在课堂子 CUI 里点「出一道随堂题」时，目前只是单边渲染了一张技能卡，
 *   学生切到自己的身份场景（场景七）时既看不到任务气泡、也没有待办，
 *   联动闭环是缺的。
 *
 * 该总线提供：
 * - `pushClassTask(...)` 老师推送一份课堂任务（默认 demo 用 `DEMO_QUICK_QUIZ`）
 * - `submitClassTaskAnswer(taskId, optionIndex)` 学生交卷
 * - `closeClassTask(taskId)` 老师关闭（或学生超时收卷）
 * - `useClassTasksForLesson(lessonId)` 学生 / 老师订阅同一节课的任务流
 * - `useOpenClassTaskCountForStudent(lessonId, studentName)` 学生未交计数
 *
 * 与真实推送的差别（仅 demo）：
 * - 不跨标签页、不真正鉴权、不持久化到后端
 * - 只在同一会话切身份场景时生效，刷新页面后清空
 */
import * as React from "react"

const STORAGE_KEY = "vvai_demo_edu_class_task_bus_v1"
const EVENT_NAME = "vvai-edu-class-task-bus"

export type ClassTaskKind = "quick-quiz"

export interface ClassTaskQuestion {
  /** 题面正文 */
  prompt: string
  /** 选项（A/B/C/D 等），由 UI 自动加字母前缀 */
  options: string[]
  /** 正解下标 */
  correctIndex: number
  /** 知识点（用于卡片副标） */
  knowledgePoint?: string
  /** 答题倒计时（秒），默认 90 */
  durationSec?: number
}

export interface ClassTaskSubmission {
  /** 学生选了哪个 */
  optionIndex: number
  /** 是否正确（demo 即时判分） */
  isCorrect: boolean
  /** 提交时间戳 */
  submittedAt: number
}

export interface ClassTaskEvent {
  id: string
  kind: ClassTaskKind
  /** 哪节课 */
  lessonId: string
  /** 课程展示名（用于学生主 CUI 待办行） */
  lessonTitle: string
  /** 发起人 */
  fromName: string
  /** 题目 */
  question: ClassTaskQuestion
  /** 学生提交记录（key = studentName，demo 单生 demo 用） */
  submissions: Record<string, ClassTaskSubmission>
  /** 老师/系统是否已关闭收卷 */
  closed: boolean
  /** 推送时间戳 */
  pushedAt: number
}

interface BusState {
  events: ClassTaskEvent[]
}

const isBrowser = typeof window !== "undefined"

function loadState(): BusState {
  if (!isBrowser) return { events: [] }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { events: [] }
    const parsed = JSON.parse(raw) as BusState
    if (!parsed || !Array.isArray(parsed.events)) return { events: [] }
    return parsed
  } catch {
    return { events: [] }
  }
}

function saveState(next: BusState) {
  if (!isBrowser) return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* noop */
  }
}

function emitChange() {
  if (!isBrowser) return
  window.dispatchEvent(new CustomEvent(EVENT_NAME))
}

/** 老师推送一份课堂任务。1.5s 内同 lesson + kind 视为重复点击，去重。 */
export function pushClassTask(
  input: Omit<
    ClassTaskEvent,
    "id" | "submissions" | "closed" | "pushedAt"
  >,
): ClassTaskEvent {
  const now = Date.now()
  const state = loadState()
  const dedupeWindowMs = 1500
  const recent = state.events.find(
    (e) =>
      e.lessonId === input.lessonId &&
      e.kind === input.kind &&
      now - e.pushedAt < dedupeWindowMs,
  )
  if (recent) return recent
  const next: ClassTaskEvent = {
    id: `class-task-${now}-${Math.floor(Math.random() * 1000)}`,
    submissions: {},
    closed: false,
    pushedAt: now,
    ...input,
  }
  saveState({ events: [...state.events, next] })
  emitChange()
  return next
}

/** 学生交卷：写入 submissions[studentName] 并对答案是否正确做即时判分。 */
export function submitClassTaskAnswer(
  taskId: string,
  studentName: string,
  optionIndex: number,
): ClassTaskEvent | null {
  const state = loadState()
  let updated: ClassTaskEvent | null = null
  const events = state.events.map((e) => {
    if (e.id !== taskId) return e
    if (e.submissions[studentName]) return e
    const isCorrect = optionIndex === e.question.correctIndex
    const submission: ClassTaskSubmission = {
      optionIndex,
      isCorrect,
      submittedAt: Date.now(),
    }
    updated = { ...e, submissions: { ...e.submissions, [studentName]: submission } }
    return updated
  })
  saveState({ events })
  emitChange()
  return updated
}

/** 老师/系统关闭收卷 */
export function closeClassTask(taskId: string) {
  const state = loadState()
  const events = state.events.map((e) =>
    e.id === taskId ? { ...e, closed: true } : e,
  )
  saveState({ events })
  emitChange()
}

/** 清空全部任务（开发调试 / 演示重置） */
export function clearClassTasks() {
  saveState({ events: [] })
  emitChange()
}

/** 订阅指定课程下的全部任务（按推送时间正序）。 */
export function useClassTasksForLesson(lessonId: string | null): ClassTaskEvent[] {
  const [snapshot, setSnapshot] = React.useState<ClassTaskEvent[]>(() =>
    lessonId
      ? loadState()
          .events.filter((e) => e.lessonId === lessonId)
          .sort((a, b) => a.pushedAt - b.pushedAt)
      : [],
  )
  React.useEffect(() => {
    if (!lessonId) {
      setSnapshot([])
      return
    }
    const refresh = () => {
      setSnapshot(
        loadState()
          .events.filter((e) => e.lessonId === lessonId)
          .sort((a, b) => a.pushedAt - b.pushedAt),
      )
    }
    refresh()
    if (!isBrowser) return
    window.addEventListener(EVENT_NAME, refresh)
    window.addEventListener("storage", refresh)
    return () => {
      window.removeEventListener(EVENT_NAME, refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [lessonId])
  return snapshot
}

/** 某学生在某节课下未交卷数量（用于学生主 CUI 待办带 / banner） */
export function useOpenClassTaskCountForStudent(
  lessonId: string | null,
  studentName: string,
): number {
  const events = useClassTasksForLesson(lessonId)
  return events.filter((e) => !e.closed && !e.submissions[studentName]).length
}

/** 第一个还没交卷的任务（学生主 CUI banner 文案要拿到题号 / 题面预览） */
export function useNextOpenClassTaskForStudent(
  lessonId: string | null,
  studentName: string,
): ClassTaskEvent | null {
  const events = useClassTasksForLesson(lessonId)
  return (
    events.find((e) => !e.closed && !e.submissions[studentName]) ?? null
  )
}
