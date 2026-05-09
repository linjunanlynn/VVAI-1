/**
 * AI课堂侧边子 CUI 的会话持久化（demo / sessionStorage）。
 *
 * 设计：
 * - 一节课 = 一个对话线程；以 `lessonId` 为 key 存储 messages。
 * - 关闭子 CUI 不丢消息；下次再点 dock·AI课堂 / Hero / 待办 chip 仍然回到原对话。
 * - 三身份的会话相互独立（同一节课老师 / 学生 / 家长 看到不同视角，分开 key）。
 */

import type { Message } from "../chat/data"
import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

const STORAGE_KEY_PREFIX = "vvai.ai-classroom.side-thread.v1"
/**
 * 「本节清单」打勾状态独立 key：
 * - 与会话线程分开：清单进度跨刷新仍稳定，不被消息裁剪策略影响
 * - 颗粒度：role × lessonId × stage（同一节课在 pre/in/post 各自独立计数）
 */
const CHECKLIST_DONE_KEY_PREFIX = "vvai.ai-classroom.checklist-done.v1"

function buildStorageKey(role: EduLessonAttendingRole, lessonId: string): string {
  return `${STORAGE_KEY_PREFIX}.${role}.${lessonId}`
}

function buildChecklistDoneKey(
  role: EduLessonAttendingRole,
  lessonId: string,
  stage: EducationStage,
): string {
  return `${CHECKLIST_DONE_KEY_PREFIX}.${role}.${lessonId}.${stage}`
}

export function loadAiClassroomSideThread(
  role: EduLessonAttendingRole,
  lessonId: string,
): Message[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.sessionStorage.getItem(buildStorageKey(role, lessonId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Message[]) : []
  } catch {
    return []
  }
}

export function saveAiClassroomSideThread(
  role: EduLessonAttendingRole,
  lessonId: string,
  messages: Message[],
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      buildStorageKey(role, lessonId),
      JSON.stringify(messages),
    )
  } catch {
    /* 写入失败（如配额已满）不阻断 UI；下次写入时再试 */
  }
}

export function clearAiClassroomSideThread(
  role: EduLessonAttendingRole,
  lessonId: string,
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(buildStorageKey(role, lessonId))
  } catch {
    /* noop */
  }
}

/**
 * 读取「本节清单」当前已完成的 item id 集合。
 * - 找不到 / 解析失败 → 空数组（视作"全部未做"）
 * - 同 role × lessonId × stage 颗粒度（与 `saveChecklistDoneIds` 对齐）
 */
export function loadChecklistDoneIds(
  role: EduLessonAttendingRole,
  lessonId: string,
  stage: EducationStage,
): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.sessionStorage.getItem(buildChecklistDoneKey(role, lessonId, stage))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

export function saveChecklistDoneIds(
  role: EduLessonAttendingRole,
  lessonId: string,
  stage: EducationStage,
  doneIds: ReadonlyArray<string>,
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(
      buildChecklistDoneKey(role, lessonId, stage),
      JSON.stringify(doneIds),
    )
  } catch {
    /* 写入失败（如配额已满）不阻断 UI */
  }
}

export function clearChecklistDoneIds(
  role: EduLessonAttendingRole,
  lessonId: string,
  stage: EducationStage,
): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.removeItem(buildChecklistDoneKey(role, lessonId, stage))
  } catch {
    /* noop */
  }
}
