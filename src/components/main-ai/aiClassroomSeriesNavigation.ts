/**
 * 系列课子 CUI 的"智能定位 + thread key + 单节状态映射"。
 *
 * 设计动机
 * ----------------------------------------------------
 * 系列子 CUI = 一个统一窗口；进入时按 (系列状态 × 当前 stage × role × 上节待办完成度)
 * 自动定位到某一节；该节的对话内容（清单卡、Skill 卡执行历史、调课请假表单等）
 * 由 inline 的单课 panel 在 embedded 模式下原地呈现。
 *
 * 这里集中实现：
 * 1. `decideInitialActiveOutlineIndex`：入场定位
 * 2. `getOutlineThreadKey`：每节 outline 的 thread storage key
 *    - 主线节 = `DEMO_LESSON.id` → 与单课子 CUI 同一份会话存储（在系列里能看到主线 18 卡历史）
 *    - 非主线节 = `${seriesId}__outline_${index}` → 独立 demo 线
 * 3. `getOutlineEffectiveStatus`：单节有效状态映射（主线随 stage / 非主线按 staticStatus）
 *
 * 旧版"buildOutlineOpeningReply / 跳转到独立单课 panel"的 chip 引导已废弃：
 * 系列子 CUI 内部已统一由 inline 单课 panel 渲染所有能力，不再需要外部跳转引导。
 */

import { DEMO_LESSON } from "./aiClassroomLessonDemo"
import { getAiClassroomChecklist } from "./aiClassroomChecklist"
import { loadChecklistDoneIds } from "./aiClassroomSidePersistence"
import {
  type AiClassroomLessonSeries,
  type AiClassroomSeriesLessonOutline,
} from "./aiClassroomLessonSeriesDemo"
import type { EducationStage } from "./educationStageDemo"
import type { EduLessonAttendingRole } from "./homeScenarioLayout"

/* ============================================================
 * thread key
 * ============================================================ */

export function getOutlineThreadKey(
  series: AiClassroomLessonSeries,
  outline: AiClassroomSeriesLessonOutline,
): string {
  /**
   * 主线 outline → 直接复用单课子 CUI 的 lessonId 作为 key，
   * 这样系列 panel 内看到的"本节" thread 与从课表点单课进入的 thread 是同一份。
   */
  if (outline.boundLessonId === DEMO_LESSON.id) return DEMO_LESSON.id
  /**
   * 其它 outline（含绑了非主线占位 lessonId 的节、或完全未绑的节）→
   * 走系列内独立 key，避免与"未来真的接入"的单课 panel 互相污染。
   */
  return `${series.id}__outline_${outline.index}`
}

/* ============================================================
 * 上节待办判定（demo 简化版）
 *
 * 仅当上节 outline 是主线 lesson 时，才能用 `loadChecklistDoneIds + getAiClassroomChecklist`
 * 拿到真实勾选数据；其它节没有 demo checklist，按"已完成"处理（即默认推用户去下节）。
 * ============================================================ */

function isMainOutline(outline: AiClassroomSeriesLessonOutline): boolean {
  return outline.boundLessonId === DEMO_LESSON.id
}

/**
 * 学生 / 家长视角：上节课后清单是否全部完成？
 * - 上节非主线：true（demo 没数据 → 默认完成，让用户进下节）
 * - 上节主线：检查 post stage 的 checklist
 */
function isStudentParentLastLessonChecklistDone(
  outline: AiClassroomSeriesLessonOutline,
  role: "student" | "parent",
): boolean {
  if (!isMainOutline(outline)) return true
  const checklist = getAiClassroomChecklist(role, "post")
  if (!checklist) return true
  const doneIds = loadChecklistDoneIds(role, DEMO_LESSON.id, "post")
  return checklist.items.every((it) => doneIds.includes(it.id))
}

/**
 * 教师视角：上节"课后报告"是否已发？
 * - 上节非主线：true（demo 默认推教师进下节备课）
 * - 上节主线：检查 post stage 的 checklist 中是否包含 `tcpost-report-send` / `ta-report` 等已勾项
 *   demo 简化：检查 checklist 全部完成度即可（教师 post 清单包含发报告动作）
 */
function isTeacherLastLessonReportDone(outline: AiClassroomSeriesLessonOutline): boolean {
  if (!isMainOutline(outline)) return true
  const checklist = getAiClassroomChecklist("teacher", "post")
  if (!checklist) return true
  const doneIds = loadChecklistDoneIds("teacher", DEMO_LESSON.id, "post")
  return checklist.items.every((it) => doneIds.includes(it.id))
}

/* ============================================================
 * 入场定位规则
 * ============================================================ */

export function decideInitialActiveOutlineIndex(
  series: AiClassroomLessonSeries,
  role: EduLessonAttendingRole,
  stage: EducationStage,
): number {
  /** 已结课 → 最后一节（看复盘） */
  if (series.staticStatus === "completed") {
    const last = series.outlines[series.outlines.length - 1]
    return last?.index ?? 1
  }
  /** 未开课 → 第 1 节（看大纲 / 预习） */
  if (series.staticStatus === "upcoming") {
    return series.outlines[0]?.index ?? 1
  }
  /** 进行中 */
  const nextIdx = series.nextLessonOutlineIndex ?? series.outlines[0]?.index ?? 1

  /** 课中阶段 → 当前节（即"下一节"已变成"正在上的"） */
  if (stage === "in") return nextIdx

  /** 课前 / 课后 → 看上节是否还有未完成的事 */
  const prevIdx = nextIdx - 1
  const prevOutline = series.outlines.find((o) => o.index === prevIdx)
  if (!prevOutline) return nextIdx

  if (role === "student" || role === "parent") {
    /** 学生 / 家长：上节课后清单未做完 → 回上节；否则去下节 */
    const done = isStudentParentLastLessonChecklistDone(prevOutline, role)
    return done ? nextIdx : prevIdx
  }
  /** 教师：上节课后报告未发 → 回上节；否则去下节 */
  const reported = isTeacherLastLessonReportDone(prevOutline)
  return reported ? nextIdx : prevIdx
}

/* ============================================================
 * outline 等效状态（panel 内 Header / 抽屉 / 开场都用同一份）
 * ============================================================ */

export type OutlineEffectiveStatus =
  | "past" // 已完成
  | "upcoming" // 未开课（即将上课）
  | "pre" // 主线·课前
  | "in" // 主线·上课中
  | "post" // 主线·课后

export function getOutlineEffectiveStatus(
  outline: AiClassroomSeriesLessonOutline,
  stage: EducationStage,
): OutlineEffectiveStatus {
  /** 主线：随全局 stage 走 */
  if (outline.boundLessonId === DEMO_LESSON.id) return stage
  /** 其它：按 outline.staticStatus（只有 past / upcoming） */
  return outline.staticStatus
}

/* ============================================================
 * 旧版 buildOutlineOpeningReply 已删除
 *
 * 历史：曾用于在系列 panel 自己的消息流中 push 一条"单节开场 reply"，并通过
 * "打开本节完整 AI 课堂" chip 引导用户跳到独立单课 panel。
 *
 * 重构后系列 panel 直接 inline 单课 panel（embedded 模式），所有能力原地可用，
 * 不再需要任何跳转引导，故 buildOutlineOpeningReply 与其 5 个 helper 全部移除。
 * 单节进入时的 AI 主动开场由 inline 单课 panel 自身的 ensureOpeningOnce 完成。
 * ============================================================ */

