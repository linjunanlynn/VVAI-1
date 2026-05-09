/**
 * AI 课堂浮层的实时态 store。
 *
 * - 浮层内的 mic / camera / handRaised / slideIndex / classMessages 等都是 demo 态，
 *   关闭浮层后自动复位，不持久化（避免被误读为真实业务数据）。
 * - 仅 VVAI 会话区与子 CUI 共享 thread，通过 `aiClassroomLiveSharedThread` 单独同步。
 *
 * 实现策略：单例 store + `useSyncExternalStore`，多组件共享同一份 state。
 */

import * as React from "react"
import {
  type AiClassroomLiveClassMessage,
  type AiClassroomLiveStudentDemo,
  type AiClassroomLiveTeacherDemo,
  DEMO_LIVE_CLASS_MESSAGES_INITIAL,
  DEMO_LIVE_STUDENTS,
  DEMO_LIVE_TEACHER,
} from "./aiClassroomLiveDemo"

export interface AiClassroomLiveState {
  /** 自己的麦 / 摄像头开关（demo 态） */
  selfMicOn: boolean
  selfCameraOn: boolean
  /** 自己是否举手（仅学生有意义） */
  selfHandRaised: boolean
  /** 当前 slide 索引（1-based，与 DEMO_LIVE_SLIDES.index 对齐） */
  currentSlideIndex: number
  /** 课堂消息流（不持久化，关闭即清；初次打开载入 DEMO_LIVE_CLASS_MESSAGES_INITIAL 副本） */
  classMessages: AiClassroomLiveClassMessage[]
  /** 老师 / 学生底表（demo，可被局部更新——例如学生举手） */
  teacher: AiClassroomLiveTeacherDemo
  students: AiClassroomLiveStudentDemo[]
  /** 进入课堂后的「已上 MM:SS」秒数 */
  elapsedSec: number
}

function buildInitialState(): AiClassroomLiveState {
  return {
    selfMicOn: false,
    selfCameraOn: true,
    selfHandRaised: false,
    currentSlideIndex: 1,
    classMessages: [...DEMO_LIVE_CLASS_MESSAGES_INITIAL],
    teacher: { ...DEMO_LIVE_TEACHER },
    students: DEMO_LIVE_STUDENTS.map((s) => ({ ...s })),
    elapsedSec: 0,
  }
}

let state: AiClassroomLiveState = buildInitialState()
const listeners = new Set<() => void>()

function emit() {
  for (const cb of listeners) cb()
}

function set(updater: (prev: AiClassroomLiveState) => AiClassroomLiveState) {
  state = updater(state)
  emit()
}

function get(): AiClassroomLiveState {
  return state
}

/* ============================================================
 * 订阅 hook
 * ============================================================ */

export function useAiClassroomLiveState(): AiClassroomLiveState {
  return React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    get,
    get,
  )
}

/* ============================================================
 * Action 集合
 * ============================================================ */

export function aiClassroomLiveActions() {
  return {
    /** 浮层打开时由 LiveWindow 调用：复位 state（每次打开新会话） */
    reset(): void {
      set(() => buildInitialState())
    },
    /** 仅 elapsedSec 自增（每秒由 LiveWindow 内 setInterval 触发） */
    tickElapsed(): void {
      set((prev) => ({ ...prev, elapsedSec: prev.elapsedSec + 1 }))
    },
    setSelfMic(on: boolean): void {
      set((prev) => ({ ...prev, selfMicOn: on }))
    },
    setSelfCamera(on: boolean): void {
      set((prev) => ({ ...prev, selfCameraOn: on }))
    },
    setSelfHandRaised(on: boolean): void {
      set((prev) => ({ ...prev, selfHandRaised: on }))
    },
    setSlideIndex(index: number): void {
      set((prev) => ({ ...prev, currentSlideIndex: index }))
    },
    /** 老师 / 学生 / 系统统一 push 一条课堂消息 */
    pushClassMessage(msg: AiClassroomLiveClassMessage): void {
      set((prev) => ({ ...prev, classMessages: [...prev.classMessages, msg] }))
    },
  }
}
